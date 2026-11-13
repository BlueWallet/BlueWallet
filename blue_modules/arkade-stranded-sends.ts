import bolt11 from 'bolt11';
import { ripemd160 } from '@noble/hashes/legacy';
import { ArkAddress, CreateContractParams, IContractManager, RelativeTimelock, VHTLCContractHandler, Wallet } from '@arkade-os/sdk';
import type Realm from 'realm';

import { hexToUint8Array, uint8ArrayToHex } from './uint8array-extras/index';
import { errorMessage } from '../helpers/errorMessage';
import { BoltzSwapSchema } from './arkade-adapters/realm/boltzSwapSchema';

/**
 * Recovers Lightning swaps Boltz never resolved. Past its refund locktime a
 * send's `refundWithoutReceiver` leaf needs only the Ark operator, and the
 * lockup parameters survive only in the rows boltz-swap stored. A row is
 * deleted only once its funds provably cannot move again.
 */

export type BoltzSwapRow = { id: string; type: string; data: string };

// Boltz paid the invoice, so the lockup is its claim, never ours to refund.
const PAID_STATUSES = ['invoice.paid', 'transaction.claim.pending', 'transaction.claimed'];

// A send at these statuses has no lockup left: we took it back, or Boltz did.
const SETTLED_SEND_STATUSES = ['transaction.claimed', 'transaction.refunded'];

// A receive at these statuses has no lockup of ours: never funded, already
// settled, or Boltz took its own back. `swap.created` is kept: a payment the
// app never saw leaves that status on a lockup only its preimage can claim.
const SETTLED_RECEIVE_STATUSES = [
  'invoice.settled',
  'invoice.expired',
  'invoice.failedToPay',
  'transaction.lockupFailed',
  'transaction.refunded',
];

type StoredSubmarineSwap = {
  status: string;
  refunded?: boolean;
  /** App-owned: the lockup held a coin right before a recovery. */
  lockupFunded?: boolean;
  preimageHash?: string;
  request?: { invoice?: string };
  response?: {
    address?: string;
    claimPublicKey?: string;
    timeoutBlockHeights?: {
      refund: number;
      unilateralClaim: number;
      unilateralRefund: number;
      unilateralRefundWithoutReceiver: number;
    };
  };
};

const toXOnly = (key: Uint8Array): Uint8Array => (key.length === 33 ? key.subarray(1) : key);

// boltz-swap's encoding: values under 512 count blocks, the rest seconds.
const toRelativeTimelock = (value: number): RelativeTimelock => ({ type: value < 512 ? 'blocks' : 'seconds', value: BigInt(value) });

/**
 * One `vhtlc` contract per stored send that may still hold refundable sats.
 * A row is skipped unless its rebuild matches the stored address exactly.
 */
export function strandedSendContracts(rows: BoltzSwapRow[], senderXOnly: Uint8Array): CreateContractParams[] {
  const contracts: CreateContractParams[] = [];
  for (const row of rows) {
    if (row.type !== 'submarine') continue;
    try {
      const swap: StoredSubmarineSwap = JSON.parse(row.data);
      if (swap.refunded || PAID_STATUSES.includes(swap.status)) continue;

      const address = swap.response?.address;
      const claimPublicKey = swap.response?.claimPublicKey;
      const timeouts = swap.response?.timeoutBlockHeights;
      const paymentHash = swap.request?.invoice ? bolt11.decode(swap.request.invoice).tagsObject.payment_hash : swap.preimageHash;
      if (!address || !claimPublicKey || !timeouts || !paymentHash) continue;

      // The lockup address carries the operator key it was made under, which
      // may be a signer the operator has since rotated away from.
      const lockup = ArkAddress.decode(address);
      const params = VHTLCContractHandler.serializeParams({
        sender: senderXOnly,
        receiver: toXOnly(hexToUint8Array(claimPublicKey)),
        server: lockup.serverPubKey,
        preimageHash: ripemd160(hexToUint8Array(paymentHash)),
        refundLocktime: BigInt(timeouts.refund),
        unilateralClaimDelay: toRelativeTimelock(timeouts.unilateralClaim),
        unilateralRefundDelay: toRelativeTimelock(timeouts.unilateralRefund),
        unilateralRefundWithoutReceiverDelay: toRelativeTimelock(timeouts.unilateralRefundWithoutReceiver),
      });

      const script = VHTLCContractHandler.createScript(params);
      if (script.address(lockup.hrp, lockup.serverPubKey).encode() !== address) {
        console.log(`[ARK] stranded send ${row.id} does not rebuild to its lockup address, skipped`);
        continue;
      }
      contracts.push({ type: 'vhtlc', params, script: uint8ArrayToHex(script.pkScript), address, metadata: { boltzSwapId: row.id } });
    } catch (e) {
      console.log(`[ARK] cannot rebuild stranded send ${row.id}:`, errorMessage(e));
    }
  }
  return contracts;
}

async function fundedLockups(
  contractManager: IContractManager,
  contracts: CreateContractParams[],
  { requireSynced = false } = {},
): Promise<Set<string>> {
  const held = await contractManager.getContractsWithVtxos({ script: contracts.map(c => c.script) }, undefined, {
    unspentOnly: true,
    requireSynced,
  });
  return new Set(held.filter(({ vtxos }) => vtxos.length > 0).map(({ contract }) => contract.script));
}

/**
 * Stored sends whose lockup still holds a coin: deleting the wallet deletes the
 * only record that can refund them. Throws when that cannot be read fresh.
 */
export async function fundedStrandedSendCount(realm: Realm, wallet: Pick<Wallet, 'identity' | 'getContractManager'>): Promise<number> {
  const rows = Array.from(realm.objects<BoltzSwapRow>(BoltzSwapSchema.name));
  const contracts = strandedSendContracts(rows, await wallet.identity.xOnlyPublicKey());
  if (contracts.length === 0) return 0;
  const contractManager = await wallet.getContractManager();
  // An unregistered lockup reads as empty, so register first; here a failure must refuse, not under-count.
  for (const contract of contracts) await contractManager.createContract(contract);
  return (await fundedLockups(contractManager, contracts, { requireSynced: true })).size;
}

function markRows(realm: Realm, rows: BoltzSwapRow[], ids: Set<string>, fields: Partial<StoredSubmarineSwap>) {
  realm.write(() => {
    for (const row of rows) {
      if (ids.has(row.id)) row.data = JSON.stringify({ ...JSON.parse(row.data), ...fields });
    }
  });
}

/**
 * Registers the stranded sends, settles the matured ones and marks those whose
 * lockup it emptied. Safe to repeat; true when the caller should refresh.
 */
export async function refundStrandedSends(
  realm: Realm,
  wallet: Pick<Wallet, 'identity' | 'getContractManager' | 'getVtxoManager'>,
): Promise<boolean> {
  const rows = Array.from(realm.objects<BoltzSwapRow>(BoltzSwapSchema.name));
  const contracts = strandedSendContracts(rows, await wallet.identity.xOnlyPublicKey());
  if (contracts.length === 0) return false;

  const contractManager = await wallet.getContractManager();
  for (const contract of contracts) {
    try {
      await contractManager.createContract(contract);
    } catch (e) {
      console.log(`[ARK] cannot register stranded send ${contract.metadata?.boltzSwapId}:`, errorMessage(e));
    }
  }

  // Only what recoverVtxos() would settle now: lockups past their locktime.
  const vtxoManager = await wallet.getVtxoManager();
  const { recoverable } = await vtxoManager.getRecoverableBalance();
  const swapId = (c: CreateContractParams) => c.metadata?.boltzSwapId as string;
  const swapIds = (keep: (c: CreateContractParams) => boolean) => new Set(contracts.filter(keep).map(swapId));
  const registered = swapIds(() => true);
  const seenFunded = new Set(rows.filter(row => registered.has(row.id) && JSON.parse(row.data).lockupFunded).map(row => row.id));
  if (recoverable === 0n && seenFunded.size === 0) return false;

  if (recoverable > 0n) {
    // Recorded before settling, so a refund this launch cannot confirm is
    // still marked on a later one.
    const funded = await fundedLockups(contractManager, contracts);
    const fundedIds = swapIds(c => funded.has(c.script));
    markRows(realm, rows, fundedIds, { lockupFunded: true });
    fundedIds.forEach(id => seenFunded.add(id));
    await vtxoManager.recoverVtxos();
  }

  const stillFunded = await fundedLockups(contractManager, contracts);
  const refunded = swapIds(c => seenFunded.has(swapId(c)) && !stillFunded.has(c.script));
  markRows(realm, rows, refunded, { refunded: true });
  return recoverable > 0n || refunded.size > 0;
}

/**
 * Whether a row's funds have provably stopped moving. Anything unrecognised is
 * kept: a `chain` row's `ephemeralKey` is the only key left for its on-chain
 * leg, and a kept row costs bytes where a wrong delete costs funds.
 */
export function isSettledBoltzRow(row: BoltzSwapRow): boolean {
  try {
    const swap = JSON.parse(row.data);
    if (row.type === 'submarine') return swap.refunded === true || SETTLED_SEND_STATUSES.includes(swap.status);
    if (row.type === 'reverse') return SETTLED_RECEIVE_STATUSES.includes(swap.status);
    return false;
  } catch {
    return false;
  }
}

export function pruneSettledBoltzRows(realm: Realm): number {
  const settled = Array.from(realm.objects<BoltzSwapRow>(BoltzSwapSchema.name)).filter(isSettledBoltzRow);
  if (settled.length === 0) return 0;
  realm.write(() => {
    for (const row of settled) realm.delete(row);
  });
  return settled.length;
}

/** Recovers first, so a send this pass marks refunded is pruned by it too. */
export async function processStrandedBoltzSwaps(
  realm: Realm,
  wallet: Pick<Wallet, 'identity' | 'getContractManager' | 'getVtxoManager'>,
): Promise<boolean> {
  const refreshed = await refundStrandedSends(realm, wallet);
  pruneSettledBoltzRows(realm);
  return refreshed;
}
