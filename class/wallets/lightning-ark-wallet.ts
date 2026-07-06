import BigNumber from 'bignumber.js';
import { sha256 } from '@noble/hashes/sha256';
import {
  ArkadeSwaps,
  BoltzSubmarineSwap,
  BoltzSwap,
  BoltzSwapProvider,
  SubmarineRefundOutcome,
  decodeInvoice,
  isChainSwapClaimable,
  isChainSwapRefundable,
  isReverseClaimableStatus,
  isReverseSwapClaimable,
  isSubmarineSwapRefundable,
} from '@arkade-os/boltz-swap';
import { RealmSwapRepository } from '@arkade-os/boltz-swap/repositories/realm';
import { RestDelegatorProvider, SingleKey, Wallet, ExtendedCoin, ArkTransaction, TxType } from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
import { RealmContractRepository, RealmWalletRepository } from '@arkade-os/sdk/repositories/realm';

import BIP32Factory from 'bip32';

import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { LightningTransaction, Transaction } from './types.ts';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import assert from 'assert';
import ecc from '../../blue_modules/noble_ecc.ts';
import { Measure } from '../measure.ts';
import { deleteArkadeRealm, getArkadeRealm } from '../../blue_modules/arkade-adapters/realm/realmInstance';
import { registerArkPaymentPush } from '../../blue_modules/notifications';
import { transactionTimeToReadable } from '../../loc';
const { bech32m } = require('bech32');

const bip32 = BIP32Factory(ecc);

// Delegate-service URL per Ark network. Mirrors the canonical wallet's map
// (../master/wallet/src/lib/constants.ts:27): mainnet has a delegator,
// mutinynet/regtest each have their own, and signet/testnet have none — for
// those we must skip `delegatorProvider` on Wallet.create entirely instead of
// falling back to the mainnet URL, which would build the wrong offchain
// tapscript and hide funds from the indexer.
const DELEGATOR_URLS = {
  bitcoin: 'https://delegate.arkade.money',
  mutinynet: 'https://delegator.mutinynet.arkade.sh',
  regtest: 'http://localhost:7012',
  signet: null,
  testnet: null,
} as const;

const staticWalletCache: Record<string, Wallet> = {};
const staticSwapsCache: Record<string, ArkadeSwaps> = {};
const initInFlight: Map<string, Promise<{ wallet: Wallet; arkadeSwaps: ArkadeSwaps }>> = new Map();
const boardingLock: Record<string, boolean> = {};
// Coalesce concurrent restoreSwaps() calls per namespace so a manual tap
// during init (or two screens triggering it together) does not double-fetch
// from Boltz.
const restoreInFlight: Map<string, Promise<void>> = new Map();

// Test-only: exposes module-private caches so unit tests can observe / reset
// them and verify deletion-vs-init race behavior. Not part of the public API.
export const __testing__ = {
  staticWalletCache,
  staticSwapsCache,
  initInFlight,
  boardingLock,
  restoreInFlight,
};

export class LightningArkWallet extends LightningCustodianWallet {
  static readonly type = 'lightningArkWallet';
  static readonly typeReadable = 'Lightning Arkade';
  static readonly subtitleReadable = 'Arkade';
  // @ts-ignore: override
  public readonly type = LightningArkWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = LightningArkWallet.typeReadable;

  // Runtime SDK objects. The constructor re-defines these as non-enumerable so
  // saveToDisk's `Object.assign({}, key)` skips them and JSON.stringify never
  // sees a partially-initialized SDK snapshot. We avoid the `declare` modifier
  // here because @babel/preset-typescript in the React Native pipeline requires
  // `allowDeclareFields: true` for it, and tightening that setting is out of
  // scope.
  private _wallet: Wallet | undefined;
  private _arkadeSwaps: ArkadeSwaps | undefined;
  // sha256(secret) is cheap but getNamespace is called on every init, delete,
  // boarding poll, and background-task pass. Memoize keyed by `secret` so a
  // future setSecret() with a different mnemonic self-invalidates without us
  // having to override the inherited setter. Defined non-enumerable in the
  // constructor for the same saveToDisk serialization reason as the SDK refs.
  private _namespaceCache: { secret: string; namespace: string } | undefined;

  private _arkServerUrl: string = 'https://arkade.computer';
  // Network this wallet speaks. Drives the delegator URL lookup below; today
  // the Ark server URL is fixed to mainnet, so this is always 'bitcoin', but
  // the indirection keeps a future testnet/mutinynet/regtest switch from
  // silently shipping the mainnet delegator URL to the wrong network.
  private _network: keyof typeof DELEGATOR_URLS = 'bitcoin';

  private _swapHistory: BoltzSwap[] = [];
  private _transactionsHistory: ArkTransaction[] = [];
  private _privateKeyCache = '';
  private _boardingUtxos: ExtendedCoin[] = [];

  // limits/fees from Boltz reverse-swap (Lightning → Arkade) bracket:
  private _limitMin: number = 0;
  private _limitMax: number = 0;
  private _feePercentage: number = 0;

  // Submarine-swap (Arkade → Lightning) fee bracket — the PAY side, surfaced on
  // the Lightning pay screen. Distinct from `_feePercentage` above (reverse leg).
  private _submarineFeePercentage: number = 0;
  private _submarineMinerFees: number = 0;
  // Runtime "fetched fees this session" flag. Redefined non-enumerable in the
  // constructor so saveToDisk never persists it — see the constructor for why.
  private _feesLoaded: boolean = false;

  constructor() {
    super();
    Object.defineProperty(this, '_wallet', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_arkadeSwaps', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_namespaceCache', { value: undefined, writable: true, enumerable: false, configurable: true });
    // Non-enumerable so saveToDisk's Object.assign({}, wallet) does not persist
    // it. Persisting `true` would make a restored wallet skip the per-session
    // Boltz fee refresh in ensureLightningFeesLoaded() (init() also skips it
    // because _limitMin/_limitMax are serialized truthy), pinning a stale fee
    // estimate on the pay screen across restarts. Resetting to false each
    // process forces exactly one refresh per session. The fee *values* stay
    // enumerable (cached like the reverse-leg fields) but are gated behind this
    // flag — getSubmarineFeeEstimate() returns undefined until it flips true.
    Object.defineProperty(this, '_feesLoaded', { value: false, writable: true, enumerable: false, configurable: true });
  }

  hashIt = (s: string): string => {
    return uint8ArrayToHex(sha256(s));
  };

  _getIdentity() {
    assert(this.secret, 'No secret provided');

    if (!this._privateKeyCache) {
      const mnemonic = this.secret.replace('arkade://', '').trim();
      const seed = bip39.mnemonicToSeedSync(mnemonic);

      const index = 0;
      const internal = 0;
      const accountNumber = 0;
      const root = bip32.fromSeed(seed);
      const path = `m/86'/0'/${accountNumber}'/${internal}/${index}`;
      const child = root.derivePath(path);
      assert(child.privateKey, 'Internal error: no private key for child');

      this._privateKeyCache = uint8ArrayToHex(child.privateKey);
    }

    return SingleKey.fromPrivateKey(hexToUint8Array(this._privateKeyCache));
  }

  getNamespace(): string {
    assert(this.secret, 'No secret provided');
    if (this._namespaceCache?.secret === this.secret) return this._namespaceCache.namespace;
    const namespace = this.hashIt(this.secret);
    this._namespaceCache = { secret: this.secret, namespace };
    return namespace;
  }

  async init() {
    const namespace = this.getNamespace();

    if (this._wallet && this._arkadeSwaps) return;

    const cachedWallet = staticWalletCache[namespace];
    const cachedSwaps = staticSwapsCache[namespace];
    if (cachedWallet && cachedSwaps) {
      this._wallet = cachedWallet;
      this._arkadeSwaps = cachedSwaps;
      if (!this._limitMin || !this._limitMax) await this._fetchLightningFeesAndLimits();
      return;
    }

    let inFlight = initInFlight.get(namespace);
    if (!inFlight) {
      inFlight = (async () => {
        const realm = await getArkadeRealm(namespace);
        const walletRepository = new RealmWalletRepository(realm as any);
        const contractRepository = new RealmContractRepository(realm as any);
        const swapRepository = new RealmSwapRepository(realm as any);

        // Resolve the delegator URL up front and preflight it. A mismatched
        // URL silently builds the wrong offchain tapscript, and a flaky
        // delegator turns into a generic mid-init Wallet.create rejection.
        // Networks with no delegator (signet/testnet) skip the provider
        // entirely.
        const delegatorUrl = DELEGATOR_URLS[this._network];
        let delegatorProvider: RestDelegatorProvider | undefined;
        if (delegatorUrl !== null) {
          delegatorProvider = new RestDelegatorProvider(delegatorUrl);
          try {
            await delegatorProvider.getDelegateInfo();
          } catch (e: any) {
            throw new Error(`Delegate service unreachable (${delegatorUrl}): ${e?.message ?? e}`);
          }
        }

        const mm = new Measure('Wallet.create()');
        const wallet = await Wallet.create({
          identity: this._getIdentity(),
          arkProvider: new ExpoArkProvider(this._arkServerUrl),
          indexerProvider: new ExpoIndexerProvider(this._arkServerUrl),
          storage: { walletRepository, contractRepository },
          delegatorProvider,
        });
        staticWalletCache[namespace] = wallet;
        mm.end();

        // apiUrl omitted: @arkade-os/boltz-swap defaults to the production
        // mainnet URL when network is 'bitcoin'.
        const swapProvider = new BoltzSwapProvider({ network: 'bitcoin', referralId: 'arkade-blue-wallet' });

        const arkadeSwaps = new ArkadeSwaps({
          wallet,
          swapProvider,
          swapRepository,
        });
        staticSwapsCache[namespace] = arkadeSwaps;

        // Push refresh on swap lifecycle events so balance and history
        // reflect SwapManager's autonomous claim/refund actions without
        // waiting for the next user-driven fetchBalance tick.
        this._subscribeToSwapEvents(arkadeSwaps);

        return { wallet, arkadeSwaps };
      })();

      initInFlight.set(namespace, inFlight);
      inFlight
        .finally(() => {
          if (initInFlight.get(namespace) === inFlight) initInFlight.delete(namespace);
        })
        .catch(() => {
          // The same rejection is delivered to `await inFlight` callers below; silence here so
          // the discarded cleanup chain does not become an unhandled rejection.
        });
    }

    const { wallet, arkadeSwaps } = await inFlight;
    this._wallet = wallet;
    this._arkadeSwaps = arkadeSwaps;

    if (!this._limitMin || !this._limitMax) await this._fetchLightningFeesAndLimits();
  }

  private _subscribeToSwapEvents(arkadeSwaps: ArkadeSwaps) {
    const swapManager = arkadeSwaps.getSwapManager();
    if (!swapManager) return;

    const refresh = async () => {
      try {
        if (this._arkadeSwaps !== arkadeSwaps) return; // stale subscription after onDelete
        this._swapHistory = await arkadeSwaps.getSwapHistory();
        if (this._wallet) {
          this._transactionsHistory = await this._wallet.getTransactionHistory();
          const balance = await this._wallet.getBalance();
          // Keep this in sync with fetchBalance(): SDK `total` minus boarding
          // (all offchain funds incl. pendingRecovery; see fetchBalance).
          this.balance = balance.total - balance.boarding.total;
        }
        this._lastBalanceFetch = +new Date();
        this._lastTxFetch = +new Date();
      } catch (e: any) {
        console.log('[ARK] swap-event refresh failed:', e?.message ?? e);
      }
    };

    swapManager.onSwapCompleted(refresh).catch(() => {});
    swapManager.onSwapFailed(refresh).catch(() => {});
    swapManager.onActionExecuted(refresh).catch(() => {});
  }

  private async _fetchLightningFeesAndLimits() {
    assert(this._arkadeSwaps, 'ArkadeSwaps must be initialized first');
    try {
      const [fees, limits] = await Promise.all([this._arkadeSwaps.getFees(), this._arkadeSwaps.getLimits()]);
      this._feePercentage = fees.reverse?.percentage ?? 0;
      this._submarineFeePercentage = fees.submarine?.percentage ?? 0;
      this._submarineMinerFees = fees.submarine?.minerFees ?? 0;
      this._limitMin = limits.min ?? 333;
      this._limitMax = limits.max ?? 1_000_000;
      this._feesLoaded = true;
      if (!fees.reverse?.percentage) {
        console.log('warning: unexpected fees response from boltz:', JSON.stringify(fees, null, 2));
      }
    } catch (e: any) {
      console.log('[ARK] Failed to fetch Boltz fees/limits:', e?.message ?? e);
    }
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'arkade://' + bip39.entropyToMnemonic(uint8ArrayToHex(buf));

    await this.init();
  }

  getSecret() {
    return this.secret;
  }

  /**
   * Single source of activity for the BlueWallet transaction list. The SDK's
   * `getTransactionHistory()` (`_transactionsHistory`) is the source of truth
   * for every settled row; swaps annotate those rows rather than producing
   * parallel ones. Three passes build the result:
   *
   * 1. `_transactionsHistory` (Ark SDK) — the base rows:
   *    - `key.boardingTxid` is set ONLY on boarding outputs, so it is an
   *      exclusive refill discriminator: RECEIVED && settled → "Refill"
   *      (`boarding-<txid>`); other boarding states are suppressed (pending
   *      boarding is surfaced from `_boardingUtxos` in pass 2).
   *    - no `boardingTxid` → native Ark leg (`ark-<arkTxid|commitmentTxid>`),
   *      SENT negative / RECEIVED positive. Labeled "Lightning" by
   *      TransactionListItem; a settled swap may enrich it in place (pass 3).
   *
   * 2. `_boardingUtxos` → "Pending refill" rows (boarding UTXO not yet swept),
   *    with a live timestamp.
   *
   * 3. `_swapHistory` (Boltz) — annotation + residual. A *settled* swap (reverse
   *    `invoice.settled`, submarine `transaction.claimed`) always has an
   *    Ark-side leg in pass 1 — reverse settles by Boltz claiming into our
   *    address, submarine by our lockup being claimed. We find the unconsumed
   *    native leg matching `(direction, on-chain amount)` within ±30 min, mark
   *    it consumed, and enrich it (memo, invoice, preimage, payment_hash,
   *    ispaid) and emit NO row for the swap itself. This is what eliminates the
   *    duplicate-row class: a settlement can no longer appear once as its native
   *    leg and once as a `swap-` row, regardless of timestamp skew. A settled
   *    swap with no matching leg emits nothing — the leg is present in virtually
   *    all cases (settling *is* creating it), and a fallback `swap-` row would
   *    re-introduce the duplicate. Non-settled swaps that still need visibility
   *    (claimable reverse, in-flight submarine, failed/refunded, and open
   *    invoices when `includeUnpaidInvoices`) are emitted as `swap-<id>` rows.
   *    Settlement signal is `LightningTransaction.ispaid`; we never invent a
   *    `confirmations` field for an LN/Ark row.
   *
   * Stable row ids survive status transitions: `boarding-<txid>`,
   * `boarding-utxo-<txid>:<vout>`, `ark-<arkTxid|commitmentTxid>`, `swap-<id>`.
   *
   * Hidden states:
   * - Submarine `invoice.set` → dropped (no funds at risk yet).
   * - Submarine `swap.expired` / `invoice.expired` → kept with a `Failed: `
   *   prefix; SDK classifies them as refundable so the user needs the row
   *   to recover an on-chain lockup.
   * - Unpaid reverse invoices with no payment in flight (`type === 'reverse'`
   *   AND `!ispaid` AND `!memoPrefix` AND NOT isReverseClaimableStatus) are
   *   dropped. This covers `swap.created` (invoice generated, never paid) and
   *   `invoice.expired` / `swap.expired` (unpaid & dead). Only claimable
   *   reverse swaps (`transaction.mempool` / `transaction.confirmed`, funds
   *   locked on-chain) survive as genuine pending receives. The guard is gated
   *   to (a) reverse only — submarine pending rows may have on-chain locked
   *   funds that need recovery visibility — and (b) non-terminal rows so a
   *   `Failed: ` / `Refunded: ` row is still preserved for diagnosis.
   *   This drop is display-only: `getUserInvoices()` and
   *   `isInvoiceGeneratedByWallet()` call with `includeUnpaidInvoices=true` so a
   *   just-created, unpaid invoice stays discoverable by the receive-screen poll
   *   and the clipboard heuristic, even though it is hidden from the history list.
   * - Failed/refunded swaps stay visible with `ispaid:false` and a
   *   `Failed: ` / `Refunded: ` memo prefix so support can diagnose them.
   */
  getTransactions(includeUnpaidInvoices = false): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const ret: any[] = [];
    const MATCH_WINDOW_SEC = 30 * 60;

    // Pass 1 — base rows from the SDK transaction history (single source of
    // truth). `key.boardingTxid` is set only on boarding outputs, so it is an
    // exclusive refill discriminator; every other entry is a native Ark leg a
    // settled swap may later enrich in place.
    type NativeLeg = { row: any; arkType: TxType; absAmount: number; matched: boolean };
    const nativeLegs: NativeLeg[] = [];

    // Boarding txids already surfaced as a settled "Refill" (pass 1). A boarding
    // UTXO leaves getBoardingUtxos() and its settled history entry appears on the
    // same on-chain signal (the boarding output being spent), so the two feeds
    // normally flip together — but if they disagree for a beat we must not show
    // one refill as BOTH a settled "Refill" and a "Pending refill" row. Pass 2
    // dedupes against this set.
    const settledRefillTxids = new Set<string>();

    for (const histTx of this._transactionsHistory) {
      if (histTx.key.boardingTxid) {
        // Settled refill only; pending boarding comes from _boardingUtxos (pass 2).
        if (histTx.type === TxType.TxReceived && histTx.settled) {
          settledRefillTxids.add(histTx.key.boardingTxid);
          ret.push({
            txid: `boarding-${histTx.key.boardingTxid}`,
            type: 'bitcoind_tx',
            walletID,
            description: 'Refill',
            memo: 'Refill',
            value: histTx.amount,
            timestamp: Math.floor(histTx.createdAt / 1000),
          });
        }
        continue;
      }

      const absAmount = Math.abs(histTx.amount);
      const createdAtSec = Math.floor(histTx.createdAt / 1000);
      const direction = histTx.type === TxType.TxSent ? -1 : 1;
      const idKey = histTx.key.arkTxid || histTx.key.commitmentTxid || `${histTx.type}-${createdAtSec}-${absAmount}`;
      const description = histTx.type === TxType.TxSent ? 'Sent' : 'Received';
      const row: any = {
        txid: `ark-${idKey}`,
        type: 'bitcoind_tx',
        walletID,
        description,
        memo: description,
        value: absAmount * direction,
        timestamp: createdAtSec,
      };
      ret.push(row);
      nativeLegs.push({ row, arkType: histTx.type, absAmount, matched: false });
    }

    // Pass 2 — pending refills (boarding UTXOs not yet swept), live timestamp.
    // These render as "Pending" (TransactionListItem) until settlement promotes
    // them into a settled "Refill" row (pass 1) and into the spendable balance.
    for (const boardingTx of this._boardingUtxos) {
      // Already shown as a settled "Refill" in pass 1 — don't also list it pending.
      if (settledRefillTxids.has(boardingTx.txid)) continue;
      ret.push({
        txid: `boarding-utxo-${boardingTx.txid}:${boardingTx.vout}`,
        type: 'bitcoind_tx',
        walletID,
        description: 'Pending refill',
        memo: 'Pending refill',
        value: boardingTx.value,
        timestamp: boardingTx.status.block_time ?? Math.floor(Date.now() / 1000),
      });
    }

    // Pass 3 — swaps annotate a matching settled leg, or emit a residual row.
    for (const swap of this._swapHistory) {
      let memo = '';
      let value = 0;
      let bolt11invoice = '';
      let payment_hash = '';
      let expiry: number | undefined;
      const timestamp = swap.createdAt;

      try {
        // @ts-ignore: present on reverse and submarine variants
        bolt11invoice = swap.request.invoice || swap.response.invoice || '';
        if (bolt11invoice) {
          const invoiceDetails = this.decodeInvoice(bolt11invoice);
          value = invoiceDetails.num_satoshis;
          memo = invoiceDetails.description;
          payment_hash = invoiceDetails.payment_hash;
          expiry = invoiceDetails.expiry;
        }
      } catch {}

      let direction: -1 | 1;
      let ispaid = false;
      let type: 'user_invoice' | 'payment_request' | 'paid_invoice';
      let memoPrefix = '';

      if (swap.type === 'reverse') {
        direction = 1;
        type = 'user_invoice';
        // The SDK hardcodes "Send to Arkade address" as the default reverse-swap
        // invoice description, so matching that
        // exact literal is safe. A user-supplied description
        // is kept as-is.
        if (!memo || memo === 'Send to Arkade address') {
          memo = 'Received via Arkade';
        }
        switch (swap.status) {
          case 'invoice.settled':
            ispaid = true;
            break;
          case 'transaction.failed':
          case 'transaction.lockupFailed':
          case 'transaction.refunded':
            memoPrefix = 'Failed: ';
            break;
          // transaction.mempool / transaction.confirmed → payment in flight,
          //   genuine pending receive (isReverseClaimableStatus is true here)
          // swap.created → invoice made but nobody has paid; invoice.expired /
          //   swap.expired → unpaid & dead. Both are dropped by the
          //   unpaid-not-in-flight filter below — neither is "pending".
        }
      } else if (swap.type === 'submarine') {
        direction = -1;
        switch (swap.status) {
          case 'transaction.claimed':
            ispaid = true;
            type = 'paid_invoice';
            break;
          case 'invoice.set':
            // No funds at risk yet — user hasn't broadcast the lockup.
            continue;
          case 'transaction.refunded':
            memoPrefix = 'Refunded: ';
            type = 'payment_request';
            break;
          case 'invoice.failedToPay':
          case 'transaction.failed':
          case 'transaction.lockupFailed':
          case 'swap.expired':
          case 'invoice.expired':
            // SDK classifies swap.expired as a refundable submarine failure
            // (lockup is still on-chain). Keep the row visible so users can
            // recover funds. invoice.expired is not reachable per the SDK
            // lifecycle today; treated as failed for safety.
            memoPrefix = 'Failed: ';
            type = 'payment_request';
            break;
          default:
            // swap.created / invoice.pending / invoice.paid → pending send
            type = 'payment_request';
        }
      } else {
        // 'chain' — no LN-shaped UX surface yet.
        continue;
      }

      // Resolve effective amount: prefer the on-chain (Ark) leg, fall back to
      // the invoice amount, then to the swap-request invoiceAmount.
      // @ts-ignore properties exist on the variant union
      const rawValue = swap.response.onchainAmount || swap.response.expectedAmount || value || swap.request.invoiceAmount || 0;
      const absValue = Math.abs(rawValue);
      value = absValue * direction;

      // Settled swaps (reverse `invoice.settled` / submarine `transaction.claimed`)
      // are represented by their Ark-side leg from pass 1 — reverse settles by
      // Boltz claiming into our address, submarine by our lockup being claimed,
      // so the leg is in `getTransactionHistory()` in virtually all cases. We
      // enrich that leg in place (memo/invoice/preimage) and NEVER emit a
      // separate row for a settled swap: emitting no row here is the structural
      // guarantee that a settlement cannot appear twice (once as its native leg,
      // once as a `swap-` row), regardless of any timestamp skew between the
      // swap and its leg. Match on (direction, on-chain amount) within ±30 min
      // and consume each leg once. A leg that is briefly missing (sync lag)
      // reappears — enriched — on the next fetch; the only cost of a window/
      // amount miss is a generic memo on a row that already reads "Lightning".
      if (ispaid) {
        const arkType = direction < 0 ? TxType.TxSent : TxType.TxReceived;
        const leg = nativeLegs.find(
          l => !l.matched && l.arkType === arkType && l.absAmount === absValue && Math.abs(l.row.timestamp - timestamp) <= MATCH_WINDOW_SEC,
        );
        if (leg) {
          leg.matched = true;
          leg.row.description = memoPrefix + memo;
          leg.row.memo = memoPrefix + memo;
          leg.row.ispaid = true;
          leg.row.payment_hash = payment_hash;
          leg.row.payment_request = bolt11invoice;
          // @ts-ignore preimage is required for reverse, optional for submarine
          leg.row.payment_preimage = swap.preimage;
        }
        continue;
      }

      // Non-settled: hide unpaid reverse invoices with no payment in flight
      // (`swap.created`, `invoice.expired` / `swap.expired`). Claimable reverse
      // swaps and terminal `Failed: ` / `Refunded: ` rows survive; submarine rows
      // of any status survive (lockup may be on-chain and recoverable).
      // Display-only drop — registry callers pass includeUnpaidInvoices=true.
      if (!includeUnpaidInvoices && swap.type === 'reverse' && !memoPrefix && !isReverseClaimableStatus(swap.status)) continue;

      ret.push({
        txid: `swap-${swap.id}`,
        type,
        walletID,
        description: memoPrefix + memo,
        memo: memoPrefix + memo,
        value,
        timestamp,
        ispaid,
        // A non-empty memoPrefix is set only for terminal failed/refunded/expired
        // swaps (see status switches above). Surfacing it explicitly lets the UI
        // tell "in flight" (`ispaid:false`, no prefix) apart from "dead"
        // (`ispaid:false`, prefix set) without string-matching the memo.
        failed: memoPrefix !== '',
        payment_hash,
        payment_request: bolt11invoice,
        amt: value,
        // @ts-ignore preimage is required for reverse, optional for submarine
        payment_preimage: swap.preimage,
        expire_time: expiry ?? 3600,
      });
    }

    return ret;
  }

  async fetchUserInvoices() {
    // nop
  }

  async fetchTransactions() {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');
    if (!this._arkadeSwaps) throw new Error('ArkadeSwaps not initialized');

    this._swapHistory = await this._arkadeSwaps.getSwapHistory();
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');

    await this._attemptBoardUtxos();

    const balance = await this._wallet.getBalance();
    this._lastBalanceFetch = +new Date();
    // Headline balance = SDK `total` minus `boarding.total`, i.e. every offchain
    // sat the wallet owns (settled + preconfirmed + recoverable + pendingRecovery)
    // with boarding excluded. A refill stays OUT of the balance until the SDK
    // settles its boarding UTXO into a VTXO — the same moment its history row
    // flips from "Pending" to a confirmed "Refill". Two reasons boarding is
    // excluded here:
    //   1. A pending/unconfirmed refill must not inflate the balance before it
    //      is usable; it is surfaced as a "Pending" row instead (getTransactions).
    //   2. While settling, the SDK briefly reports BOTH the boarding UTXO (still
    //      unspent in getCoins) AND the freshly-minted preconfirmed VTXO, so
    //      `balance.total` transiently double-counts the refill. Subtracting
    //      `boarding.total` removes the boarding leg, so each sat counts once.
    // NOTE: `pendingRecovery` (funds under a now-deprecated server signer past
    // its cutoff, awaiting the SDK's automatic migration) MUST be included — it
    // is still the user's money and is what `total` counts. Summing only
    // `available + recoverable` here dropped it, so after a signer-rotation
    // cutoff an imported wallet whose funds are all deprecated-signer VTXOs
    // showed a balance of 0.
    this.balance = balance.total - balance.boarding.total;
  }

  async payInvoice(invoice: string, freeAmount: number = 0) {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');

    if (this.isAddressValid(invoice)) {
      // its an ark address, so we need to do native ark-to-ark transfer
      await this._wallet.sendBitcoin({
        address: invoice,
        amount: freeAmount,
      });
      return;
    }

    assert(this._arkadeSwaps, 'ArkadeSwaps not initialized');

    const invoiceDetails = decodeInvoice(invoice);

    console.log('Invoice amount:', invoiceDetails.amountSats, 'sats');
    console.log('Description:', invoiceDetails.description);
    console.log('Payment Hash:', invoiceDetails.paymentHash);

    assert(invoiceDetails.amountSats > this._limitMin, `Minimum you can send is ${this._limitMin} sat`);
    assert(invoiceDetails.amountSats < this._limitMax, `Maximum you can is ${this._limitMax} sat`);

    // Recovering-funds guard. The displayed balance includes `pendingRecovery`
    // (deprecated-signer funds past their rotation cutoff), but the SDK's send
    // coin-selection excludes them until the Ark server sweeps them. Without
    // this, sending against a balance that is mostly pendingRecovery fails with
    // a bare "insufficient funds" that contradicts the on-screen amount. Detect
    // that case and surface an honest message instead.
    const balance = await this._wallet.getBalance();
    const spendable = balance.available + balance.recoverable;
    const estFee = this.getSubmarineFeeEstimate(invoiceDetails.amountSats) ?? 0;
    if (balance.pendingRecovery > 0 && invoiceDetails.amountSats + estFee > spendable) {
      throw new Error(await this._recoveringFundsMessage(balance.pendingRecovery, spendable));
    }

    const paymentResult = await this._arkadeSwaps.sendLightningPayment({ invoice });

    this.last_paid_invoice_result = {
      payment_preimage: paymentResult.preimage,
      payment_hash: invoiceDetails.paymentHash,
      payment_request: invoice,
    };

    console.log('Payment successful!');
    console.log('Amount:', paymentResult.amount);
    console.log('Preimage:', paymentResult.preimage);
    console.log('Transaction ID:', paymentResult.txid);
  }

  /**
   * Human-readable "your funds are recovering" error for a send blocked by
   * pendingRecovery. Adds a concrete ETA when the SDK advertises one: each
   * deprecated-signer report carries `nextSweepEta` (ms epoch = the soonest
   * batch expiry, i.e. when the server sweeps those VTXOs and they become
   * spendable). We surface the earliest across signers; if none is advertised
   * (or it is already in the past), we fall back to open-ended wording.
   */
  private async _recoveringFundsMessage(pendingRecovery: number, spendable: number): Promise<string> {
    let whenClause = ' They will become available once recovery completes.';
    try {
      if (this._wallet) {
        const manager = await this._wallet.getVtxoManager();
        const reports = await manager.getDeprecatedSignerStatus();
        let soonest: number | undefined;
        for (const r of reports) {
          if (typeof r.nextSweepEta !== 'number') continue;
          soonest = soonest === undefined ? r.nextSweepEta : Math.min(soonest, r.nextSweepEta);
        }
        if (soonest !== undefined && soonest > Date.now()) {
          whenClause = ` They should become available ${transactionTimeToReadable(soonest)}.`;
        }
      }
    } catch {
      // ETA is best-effort; keep the open-ended wording on any failure.
    }
    return (
      `${pendingRecovery} sats are still recovering after a network upgrade and are not spendable yet.` +
      whenClause +
      ` Spendable now: ${spendable} sats.`
    );
  }

  /**
   * Estimated Boltz fee in sats for paying a Lightning invoice of `amountSats`
   * via a submarine swap (Arkade → Lightning): percentage fee + flat miner fee.
   * Returns `undefined` until fees have been fetched — call
   * `ensureLightningFeesLoaded()` first. This is the Boltz swap fee only; the
   * Ark-network overhead is negligible and not included.
   */
  getSubmarineFeeEstimate(amountSats: number): number | undefined {
    if (!this._feesLoaded) return undefined;
    const serviceFee = Math.ceil(new BigNumber(amountSats).multipliedBy(this._submarineFeePercentage).dividedBy(100).toNumber());
    return serviceFee + this._submarineMinerFees;
  }

  /** Warm the cached Boltz fee/limit params so getSubmarineFeeEstimate() returns a value. */
  async ensureLightningFeesLoaded(): Promise<void> {
    if (this._feesLoaded) return;
    await this.init(); // guarantees _arkadeSwaps is set (or throws)
    // init() can return without fetching fees, so fetch explicitly if still cold.
    if (!this._feesLoaded) await this._fetchLightningFeesAndLimits();
  }

  async getUserInvoices(): Promise<LightningTransaction[]> {
    await this.fetchTransactions();
    const txs = this.getTransactions(true);
    return txs.filter(tx => tx.value! > 0);
  }

  async addInvoice(amt: number, memo: string) {
    if (!this._wallet) await this.init();
    assert(this._arkadeSwaps, 'ArkadeSwaps not initialized');
    assert(amt > this._limitMin, `Minimum to receive is ${this._limitMin} sat`);
    assert(amt < this._limitMax, `Maximum to receive is ${this._limitMax} sat`);

    // fee percentage is smth like `0.01`, but its not 1%, its one-hundredth of a percent, rounded up
    const serviceFee = Math.ceil(new BigNumber(amt).multipliedBy(this._feePercentage).dividedBy(100).toNumber());

    const result = await this._arkadeSwaps.createLightningInvoice({
      amount: amt + serviceFee,
      description: memo,
    });

    console.log('Expiry (seconds):', result.expiry);
    console.log('Lightning Invoice:', result.invoice);
    console.log('Payment Hash:', result.paymentHash);
    console.log('Pending swap', result.pendingSwap);
    console.log('Preimage', result.preimage);

    registerArkPaymentPush(result.paymentHash, memo, result.pendingSwap); // fire-and-forget, never throws

    return result.invoice;
  }

  async getArkAddress(): Promise<string> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade not initialized');
    return await this._wallet.getAddress();
  }

  async fetchPendingTransactions() {
    // nop
  }

  async decodeInvoiceRemote(invoice: string) {
    throw new Error('decodeInvoiceRemote not implemented');
  }

  async allowOnchainAddress() {
    return true;
  }

  async fetchBtcAddress() {
    if (!this._wallet) await this.init();
    assert(this._wallet, 'Arkade wallet not initialized');

    this.refill_addressess = this.refill_addressess || [];
    const address = await this._wallet.getBoardingAddress();
    if (!this.refill_addressess.includes(address)) {
      this.refill_addressess.push(address);
    }
  }

  async refreshAcessToken() {
    // nop
  }

  async checkLogin() {
    // nop
  }

  async authorize() {
    // nop
  }

  isInvoiceGeneratedByWallet(paymentRequest: string) {
    // "Did we generate this invoice?" is a swap-history question: reverse swaps
    // are the invoices we create to receive. Check _swapHistory directly so the
    // answer is independent of how the display list coalesces a settled swap
    // (whose row is enriched onto its native Ark leg rather than kept as a
    // `swap-` row, and so would otherwise drop out of getTransactions()).
    return this._swapHistory.some(
      swap =>
        swap.type === 'reverse' &&
        ((swap.request as any)?.invoice === paymentRequest || (swap.response as any)?.invoice === paymentRequest),
    );
  }

  async createAccount() {
    // nop
  }

  accessTokenExpired() {
    return false;
  }

  refreshTokenExpired() {
    return false;
  }

  private async _attemptBoardUtxos() {
    // Refresh the boarding UTXO list so getTransactions() can render "Pending
    // refill" rows. The actual onboard intent is now driven by the SDK's
    // VtxoManager polling loop (enabled via settlementConfig on Wallet.create);
    // running Ramps.onboard here in parallel would double-submit the same
    // inputs and race the SDK's per-input cooldown bookkeeping.
    const namespace = this.getNamespace();
    if (boardingLock[namespace]) return;
    if (!this._wallet) return;

    boardingLock[namespace] = true;
    try {
      this._boardingUtxos = await this._wallet.getBoardingUtxos();
    } finally {
      boardingLock[namespace] = false;
    }
  }

  isAddressValid(address: string): boolean {
    try {
      const decoded = bech32m.decode(address, 1000);
      if (decoded.prefix !== 'ark') return false;
      if (decoded.words[0] !== 0) return false;
      if (decoded.words.length !== 104) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  // Per-swap refund + import-time restore + SDK event forwarding.
  // These are thin wrappers over `ArkadeSwaps`. We do not add app-side polling
  // or reliability layers — the SDK owns swap reliability internally
  // (auto-claims reverse swaps via SwapManager; refundVHTLC reports
  // swept/skipped). UI code calls refundSwap from the swap detail screen and
  // subscribes to status updates via subscribeToSwapEvents.

  getSwapById(id: string): BoltzSwap | undefined {
    return this._swapHistory.find(swap => swap.id === id);
  }

  isSwapClaimable(swap: BoltzSwap): boolean {
    return isReverseSwapClaimable(swap) || isChainSwapClaimable(swap);
  }

  isSwapRefundable(swap: BoltzSwap): boolean {
    return isSubmarineSwapRefundable(swap) || isChainSwapRefundable(swap);
  }

  // Forward SwapManager status transitions to a single UI callback so screens
  // can re-render the moment the SDK observes a new status (e.g. reverse
  // `transaction.mempool` → `invoice.settled` after the SDK's auto-claim),
  // instead of waiting for the 3s polling tick in the invoice viewer. No-op
  // (returns an inert unsubscribe) if init hasn't populated `_arkadeSwaps`
  // yet — callers re-subscribe whenever the wallet ref changes.
  subscribeToSwapEvents(callback: (swap: BoltzSwap) => void): () => void {
    const sm = this._arkadeSwaps?.getSwapManager();
    if (!sm) return () => {};
    sm.onSwapUpdate(callback).catch(() => {});
    return () => sm.offSwapUpdate(callback);
  }

  async refundSwap(swap: BoltzSubmarineSwap): Promise<SubmarineRefundOutcome> {
    if (!this._wallet) await this.init();
    if (!this._arkadeSwaps) throw new Error('ArkadeSwaps not initialized');
    const outcome = await this._arkadeSwaps.refundVHTLC(swap);
    await this.fetchTransactions();
    await this.fetchBalance();
    return outcome;
  }

  async restoreSwaps(): Promise<void> {
    const namespace = this.getNamespace();
    let inFlight = restoreInFlight.get(namespace);
    if (!inFlight) {
      inFlight = (async () => {
        if (!this._wallet) await this.init();
        if (!this._arkadeSwaps) throw new Error('ArkadeSwaps not initialized');
        await this._arkadeSwaps.restoreSwaps();
        this._swapHistory = await this._arkadeSwaps.getSwapHistory();
        this._lastTxFetch = +new Date();
      })();
      restoreInFlight.set(namespace, inFlight);
      inFlight
        .finally(() => {
          if (restoreInFlight.get(namespace) === inFlight) restoreInFlight.delete(namespace);
        })
        .catch(() => {
          // Same rejection is delivered to the awaiting caller below; silence
          // the cleanup chain so it isn't an unhandled rejection.
        });
      await inFlight;
    } else {
      // Join an in-flight restore. The IIFE only writes to the instance that
      // created it, so pull results into this instance once the shared work
      // completes.
      await inFlight;
      const cachedSwaps = staticSwapsCache[namespace];
      if (cachedSwaps) {
        this._swapHistory = await cachedSwaps.getSwapHistory();
        this._lastTxFetch = +new Date();
      }
    }
  }

  /**
   * Cleanup hook invoked when the wallet is removed from BlueWallet storage.
   * Drains any in-flight init so its post-await tail can no longer repopulate
   * staticWalletCache / staticSwapsCache / realmInstances after we've cleared
   * them, then closes the per-wallet Realm, deletes the Realm files, and
   * resets the Keychain entry. Errors are scoped here and never thrown to the
   * deletion path.
   */
  async onDelete(): Promise<void> {
    if (!this.secret) return; // nothing to clean
    const namespace = this.getNamespace();

    delete boardingLock[namespace];

    // If init() is racing with us, await its settlement before clearing caches.
    // Without this drain, the IIFE in init() would write to staticWalletCache /
    // staticSwapsCache after our delete and the realm adapter would re-cache the
    // open Realm, resurrecting state for an already-deleted wallet. Note that
    // the racing init's `await inFlight` continuation runs *before* ours (it
    // was registered earlier), so when we resume here, init has already
    // re-assigned this._wallet / this._arkadeSwaps and populated the caches.
    // We then clear everything in one pass.
    const inFlightInit = initInFlight.get(namespace);
    if (inFlightInit) {
      try {
        await inFlightInit;
      } catch {
        // init's caller already received the rejection; we just need it to settle.
      }
    }

    // Stop SwapManager + VtxoManager loops before tearing down storage so
    // their background timers / WebSocket / settlement polls don't keep
    // running against a wallet whose Realm we're about to delete.
    const cachedSwaps = staticSwapsCache[namespace];
    const cachedWallet = staticWalletCache[namespace];

    this._wallet = undefined;
    this._arkadeSwaps = undefined;
    delete staticWalletCache[namespace];
    delete staticSwapsCache[namespace];
    initInFlight.delete(namespace);

    // Type guards: real SDK objects always have dispose; unit-test stubs may not.
    try {
      if (typeof cachedSwaps?.dispose === 'function') await cachedSwaps.dispose();
    } catch (e: any) {
      console.log(`[LightningArkWallet] arkadeSwaps.dispose failed for ${namespace}:`, e?.message ?? e);
    }
    try {
      if (typeof cachedWallet?.dispose === 'function') await cachedWallet.dispose();
    } catch (e: any) {
      console.log(`[LightningArkWallet] wallet.dispose failed for ${namespace}:`, e?.message ?? e);
    }

    try {
      await deleteArkadeRealm(namespace);
    } catch (e: any) {
      console.log(`[LightningArkWallet] onDelete cleanup failed for ${namespace}:`, e?.message ?? e);
    }
  }
}
