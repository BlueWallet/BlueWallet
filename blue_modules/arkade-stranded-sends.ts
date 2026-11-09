import bolt11 from 'bolt11';
import { ripemd160 } from '@noble/hashes/legacy';
import { ArkAddress, CreateContractParams, IContractManager, RelativeTimelock, VHTLCContractHandler, Wallet } from '@arkade-os/sdk';
import type Realm from 'realm';

import { hexToUint8Array, uint8ArrayToHex } from './uint8array-extras/index';
import { errorMessage } from '../helpers/errorMessage';
import { BoltzSwapSchema } from './arkade-adapters/realm/boltzSwapSchema';

/**
 * Refunds Lightning sends that Boltz never resolved before shutting down.
 *
 * A send locked the user's sats in a VHTLC that Boltz could claim with the
 * preimage. Once its refund locktime passes, the `refundWithoutReceiver` leaf
 * lets the sender take an unclaimed lockup back with only the Ark operator.
 * The lockup parameters exist only in the rows @arkade-os/boltz-swap stored,
 * so each one is rebuilt here and handed to the SDK as a `vhtlc` contract;
 * `recoverVtxos()` then settles the matured ones back to the wallet.
 */

export type BoltzSwapRow = { id: string; type: string; data: string };

// Boltz paid the invoice, so the lockup is its claim, never ours to refund.
const PAID_STATUSES = ['invoice.paid', 'transaction.claim.pending', 'transaction.claimed'];

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
 * One `vhtlc` contract for each stored send that may still hold refundable
 * sats. A row is skipped unless its rebuilt lockup matches the stored address
 * exactly.
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

      // Rebuilt from the serialized params, as the contract manager will.
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

/** Scripts of the given lockups that still hold an unspent coin. */
async function fundedLockups(contractManager: IContractManager, contracts: CreateContractParams[]): Promise<Set<string>> {
  const held = await contractManager.getContractsWithVtxos({ script: contracts.map(c => c.script) }, undefined, { unspentOnly: true });
  return new Set(held.filter(({ vtxos }) => vtxos.length > 0).map(({ contract }) => contract.script));
}

function markRows(realm: Realm, rows: BoltzSwapRow[], ids: Set<string>, fields: Partial<StoredSubmarineSwap>) {
  realm.write(() => {
    for (const row of rows) {
      if (ids.has(row.id)) row.data = JSON.stringify({ ...JSON.parse(row.data), ...fields });
    }
  });
}

/**
 * Registers the stranded sends with the wallet, settles the matured ones and
 * marks the sends whose lockup it emptied as refunded.
 * Safe to repeat: registration is an upsert and nothing settles twice.
 *
 * @returns whether it settled or marked a send, so the caller knows to refresh.
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

  // Counts only what recoverVtxos() would settle now: swept lockups past
  // their refund locktime, plus any other swept coins of this wallet.
  const vtxoManager = await wallet.getVtxoManager();
  const { recoverable } = await vtxoManager.getRecoverableBalance();
  const swapId = (c: CreateContractParams) => c.metadata?.boltzSwapId as string;
  const swapIds = (keep: (c: CreateContractParams) => boolean) => new Set(contracts.filter(keep).map(swapId));
  const registered = swapIds(() => true);
  const seenFunded = new Set(rows.filter(row => registered.has(row.id) && JSON.parse(row.data).lockupFunded).map(row => row.id));
  if (recoverable === 0n && seenFunded.size === 0) return false;

  if (recoverable > 0n) {
    // Recorded before settling, so a refund this launch cannot confirm is
    // still marked on a later one. Only recoverVtxos() spends these lockups:
    // renewal leaves contract coins alone and Boltz is gone.
    const funded = await fundedLockups(contractManager, contracts);
    const fundedIds = swapIds(c => funded.has(c.script));
    markRows(realm, rows, fundedIds, { lockupFunded: true });
    fundedIds.forEach(id => seenFunded.add(id));
    await vtxoManager.recoverVtxos();
  }

  // A lockup seen funded that is now empty was refunded: mark its send so it
  // stops offering a Refund button and is not registered again.
  const stillFunded = await fundedLockups(contractManager, contracts);
  const refunded = swapIds(c => seenFunded.has(swapId(c)) && !stillFunded.has(c.script));
  markRows(realm, rows, refunded, { refunded: true });
  return recoverable > 0n || refunded.size > 0;
}
