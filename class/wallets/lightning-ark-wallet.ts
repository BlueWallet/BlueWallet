import { sha256 } from '@noble/hashes/sha256';
import {
  assetSwapIdOf,
  quoteIdOfSwapId,
  familyOfSwapId,
  createSwapClient,
  isSwapError,
  lightningRail,
  SwapPaymentFailedError,
  type AssetSwapId,
  type CorridorSwapRecord,
  type Outcome,
  type LockupSpendIndexer,
  type SwapClient,
  type SwapRecord,
  type SwapUpdate,
} from '@arkade-os/swap';
import { readLockupFate } from '@arkade-os/swap/protocol';
import { RealmAssetSwapRepository } from '@arkade-os/swap/repositories/realm';
import type { LocalCardInput } from '@arkade-os/solver-discovery';
import {
  ArkAddress,
  PaymentRouter,
  RestDelegateProvider,
  SingleKey,
  Wallet,
  ExtendedCoin,
  ArkTransaction,
  TxType,
  arkRail,
  arkTarget,
  collectPages,
  invoiceTarget,
  isValidArkAddress,
  type PaymentRail,
  type RouteQuote,
  type RouteResult,
} from '@arkade-os/sdk';
import { ExpoIndexerProvider, ExpoOperatorProvider } from '@arkade-os/sdk/adapters/expo';
import { RealmContractRepository, RealmWalletRepository } from '@arkade-os/sdk/repositories/realm';
import { createLnurlClient } from '@arkade-os/lnurl-client';
import { arkadeLnurl, firstQuote, lnurlRailLimits, lnurlRails, type Receiver } from '@arkade-os/lnurl-client/arkade';
import type Realm from 'realm';

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
import { errorMessage } from '../../helpers/errorMessage';
import bundledCard from '../../blue_modules/arkade-solver.card.json';

const bip32 = BIP32Factory(ecc);

// Delegate-service URL per Ark network. Mirrors the canonical wallet's map
// (../master/wallet/src/lib/constants.ts:27): mainnet has a delegator,
// mutinynet/regtest each have their own, and signet/testnet have none — for
// those we must skip `delegateProvider` on Wallet.create entirely instead of
// falling back to the mainnet URL, which would build the wrong offchain
// tapscript and hide funds from the indexer.
const DELEGATOR_URLS = {
  bitcoin: 'https://delegate.arkade.money',
  mutinynet: 'https://delegator.mutinynet.arkade.sh',
  regtest: 'http://localhost:7012',
  signet: null,
  testnet: null,
} as const;

// Issues this wallet's receive invoices: its solver pays into a covenant bound
// to our Arkade address, so funds land as plain VTXOs even with the app closed.
const LNURL_SERVER = 'https://lnurl.arkade.sh';

// Pinned for cold start and offline; the swap client merges it with the solver registry and caches what it reads.
const BUNDLED_CARDS: LocalCardInput[] = [{ card: bundledCard as LocalCardInput['card'], network: 'bitcoin' }];

// How long a screen waits on a send before handing its outcome to the history.
const SEND_SETTLE_WAIT_MS = 60_000;

type PaidReceipt = NonNullable<LightningCustodianWallet['last_paid_invoice_result']>;

/** A send still in flight when the wait ends. `receipt` resolves once it settles, and rejects if it fails. */
export class PaymentInProgressError extends Error {
  constructor(readonly receipt: Promise<PaidReceipt | undefined>) {
    super('The payment is still in progress');
    this.name = 'PaymentInProgressError';
    receipt.catch(() => {});
  }
}

const staticWalletCache: Record<string, Wallet> = {};
const staticSwapClientCache: Record<string, SwapClient> = {};
const staticSwapRepositoryCache: Record<string, RealmAssetSwapRepository> = {};
const initInFlight: Map<string, Promise<{ wallet: Wallet; swapClient: SwapClient; repository: RealmAssetSwapRepository }>> = new Map();
const boardingLock: Record<string, boolean> = {};
// Live wallet instances per namespace, so the Realm after-write listener can
// refresh the record cache on the instance the screens render from.
const namespaceInstances: Map<string, Set<LightningArkWallet>> = new Map();
const realmListenerAttached: Set<string> = new Set();
// One swap-event listener per shared client, fanned out like the Realm one: a listener per instance would pile up on rebuilds.
const swapListenerAttached = new WeakSet<SwapClient>();

// Test-only: exposes module-private caches so unit tests can observe / reset
// them and verify deletion-vs-init race behavior. Not part of the public API.
export const __testing__ = {
  staticWalletCache,
  staticSwapClientCache,
  staticSwapRepositoryCache,
  initInFlight,
  boardingLock,
  namespaceInstances,
  realmListenerAttached,
};

/** display row built from SDK history / boarding utxos / swaps; see getTransactions() */
type ArkTxRow = LightningTransaction & { txid: string; walletID: string; rail?: 'arkade' };
/** An invoice from the LNURL server, watched while the receive screen is open. */
type LnurlInvoice = { row: ArkTxRow; verify?: string };
/** Outcomes that read as settled on a history row. */
const SETTLED_OUTCOMES: ReadonlySet<Outcome> = new Set(['paid', 'claimed', 'filled']);
/** Outcomes where the trader's value came back (send legs). */
const REFUNDED_OUTCOMES: ReadonlySet<Outcome> = new Set(['refunded', 'cancelled']);
/** Outcomes where the payment never arrived. */
const FAILED_OUTCOMES: ReadonlySet<Outcome> = new Set(['failed', 'lapsed']);
/** Send-leg outcomes under which deletion is safe: the solver took the lockup, or it came back. */
const SAFE_SEND_OUTCOMES: ReadonlySet<Outcome> = new Set(['paid', 'claimed', 'refunded']);

/**
 * A swap as the screens read it: the durable record joined with the drive's
 * outcome. Keyed by the tagged `AssetSwapId` (`rfq:<quoteId>`), which is what
 * the row keys, the client verbs and `recover()` all speak.
 */
export interface ArkSwapView {
  id: AssetSwapId;
  kind: CorridorSwapRecord['kind'];
  outcome: Outcome;
  amountSats: number;
  bolt11: string;
  paymentHash: string;
  expiresAt: number;
  createdAt: number;
  refundLocktime?: number;
  fundingTxid?: string;
  refundTxid?: string;
  failure?: string;
  blockedReason?: string;
  record: CorridorSwapRecord;
}

const atomicDecimalToSats = (amount: string): number => {
  try {
    const v = BigInt(amount);
    return v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : Number.MAX_SAFE_INTEGER;
  } catch {
    return 0;
  }
};

const recordBolt11 = (record: CorridorSwapRecord): string => {
  if (record.artifact?.kind === 'invoice') return record.artifact.bolt11;
  const takeInstrument = record.route?.take?.instrument;
  if (takeInstrument?.kind === 'invoice' && typeof takeInstrument.bolt11 === 'string') return takeInstrument.bolt11;
  const giveInstrument = record.route?.give?.instrument;
  if (giveInstrument?.kind === 'invoice' && typeof giveInstrument.bolt11 === 'string') return giveInstrument.bolt11;
  return '';
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
  // sees a partially-initialized SDK snapshot — and never sees a `bigint`
  // (Swap/Quote carry five) inside the wallets loop, which would throw
  // `TypeError: Do not know how to serialize a BigInt` and silently lose
  // every wallet's changes. We avoid the `declare` modifier here because
  // @babel/preset-typescript in the React Native pipeline requires
  // `allowDeclareFields: true` for it, and tightening that setting is out of
  // scope.
  private _wallet: Wallet | undefined;
  private _swapClient: SwapClient | undefined;
  private _swapRepository: RealmAssetSwapRepository | undefined;
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

  // The read cache, and why it is two fields: `client.swaps()` returns the
  // derived `Swap` view (id, outcome, route, give/take/fee — no kind,
  // refundTxid, lockupSpendTxids, lockupPkScript, state or rfqId), while the
  // repository's `SwapRecord` carries the correlation and reconstruction
  // fields (and no outcome, which only the drive derives). Neither shape
  // alone serves the render paths, so the cache is a join:
  // - `_swapRecords`: correlation + reconstruction, refreshed on the
  //   after-write signal (Realm listener) with `fetchTransactions()` as the
  //   coarse backstop;
  // - `_outcomes`: status, from `client.swaps()` and kept current
  //   by `onUpdate` (which fires before the repository write lands, so it is
  //   never used as evidence the record on disk has caught up).
  // Canonical key is the tagged `AssetSwapId`; conversions at the boundary:
  // record -> public via `assetSwapIdOf(record.family, record.id)`, public ->
  // repository via `quoteIdOfSwapId(id)`.
  private _swapRecords: CorridorSwapRecord[] = [];
  private _outcomes: Map<AssetSwapId, Outcome> = new Map();
  private _recordsRefreshInFlight: Promise<boolean> | null = null;

  private _transactionsHistory: ArkTransaction[] = [];
  private _privateKeyCache = '';
  private _boardingUtxos: ExtendedCoin[] = [];
  private _lnurlReceiver: Promise<{ destinations: string; receiver: Receiver }> | undefined;
  // Saved with the wallet until they expire, so a restart keeps their paid mark and the self-payment check.
  private _lnurlInvoices: LnurlInvoice[] = [];

  constructor() {
    super();
    Object.defineProperty(this, '_wallet', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swapClient', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swapRepository', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_namespaceCache', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swapRecords', { value: [], writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_outcomes', { value: new Map(), writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_recordsRefreshInFlight', { value: null, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_lnurlReceiver', { value: undefined, writable: true, enumerable: false, configurable: true });
  }

  /**
   * Drops legacy Boltz-era keys restored from an old encrypted blob.
   * `AbstractWallet.fromJson` copies every stored key onto a fresh instance
   * with no schema, so a Boltz-era blob restores `_swapHistory`, `_limitMin`,
   * `_limitMax`, `_feePercentage`, `_submarineFeePercentage` and
   * `_submarineMinerFees` as stray enumerable properties — and the next
   * `Object.assign` would write them straight back out. Runs on the live
   * wallet immediately before the clone; one save cycle and the blob is
   * clean. Expired LNURL invoices are dropped here too.
   */
  prepareForSerialization(): void {
    const now = Date.now() / 1000;
    this._lnurlInvoices = this._lnurlInvoices.filter(({ row }) => (row.timestamp ?? 0) + (row.expire_time ?? 0) > now);
    for (const key of [
      '_swapHistory',
      '_limitMin',
      '_limitMax',
      '_feePercentage',
      '_submarineFeePercentage',
      '_submarineMinerFees',
      '_feesLoaded',
    ]) {
      if (key in this) delete (this as unknown as Record<string, unknown>)[key];
    }
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

    if (this._wallet && this._swapClient && this._swapRepository) {
      this._registerInstance(namespace);
      return;
    }

    const cachedWallet = staticWalletCache[namespace];
    const cachedClient = staticSwapClientCache[namespace];
    const cachedRepository = staticSwapRepositoryCache[namespace];
    if (cachedWallet && cachedClient && cachedRepository) {
      this._wallet = cachedWallet;
      this._swapClient = cachedClient;
      this._swapRepository = cachedRepository;
      this._registerInstance(namespace);
      this._attachSwapListener(namespace, cachedClient);
      await this.refreshSwapCaches();
      return;
    }

    let inFlight = initInFlight.get(namespace);
    if (!inFlight) {
      inFlight = (async () => {
        const realm = await getArkadeRealm(namespace);
        const walletRepository = new RealmWalletRepository(realm);
        const contractRepository = new RealmContractRepository(realm);
        const repository = new RealmAssetSwapRepository(realm);

        // Resolve the delegator URL up front and preflight it. A mismatched
        // URL silently builds the wrong offchain tapscript, and a flaky
        // delegator turns into a generic mid-init Wallet.create rejection.
        // Networks with no delegator (signet/testnet) skip the provider
        // entirely.
        const delegatorUrl = DELEGATOR_URLS[this._network];
        let delegateProvider: RestDelegateProvider | undefined;
        if (delegatorUrl !== null) {
          delegateProvider = new RestDelegateProvider(delegatorUrl);
          try {
            await delegateProvider.getDelegateInfo();
          } catch (e) {
            throw new Error(`Delegate service unreachable (${delegatorUrl}): ${errorMessage(e)}`);
          }
        }

        const mm = new Measure('Wallet.create()');
        const wallet = await Wallet.create({
          identity: this._getIdentity(),
          operatorProvider: new ExpoOperatorProvider(this._arkServerUrl),
          indexerProvider: new ExpoIndexerProvider(this._arkServerUrl),
          storage: { walletRepository, contractRepository },
          delegateProvider,
        });
        staticWalletCache[namespace] = wallet;
        mm.end();

        const swapClient = createSwapClient({ wallet, repository, discovery: { localCards: BUNDLED_CARDS, transportCards: null } });
        staticSwapClientCache[namespace] = swapClient;
        staticSwapRepositoryCache[namespace] = repository;

        // `await client.ready` performs the restore read and arms the drive
        // where there is live work. The client is idempotent about arming.
        await swapClient.ready;

        return { wallet, swapClient, repository };
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

    const { wallet, swapClient, repository } = await inFlight;
    this._wallet = wallet;
    this._swapClient = swapClient;
    this._swapRepository = repository;
    this._registerInstance(namespace);

    this._attachSwapListener(namespace, swapClient);
    this._attachRecordListener(namespace);
    await this.refreshSwapCaches();
  }

  private _registerInstance(namespace: string): void {
    let set = namespaceInstances.get(namespace);
    if (!set) {
      set = new Set();
      namespaceInstances.set(namespace, set);
    }
    set.add(this);
  }

  /**
   * The after-write signal for `_swapRecords`. BlueWallet owns the Realm, so
   * a change listener on the record objects is one by construction.
   * `onUpdate` fires before the repository write lands (and idempotent
   * redelivery means no second callback when the write finally lands), so it
   * is at most an invalidation hint for the records — never evidence the
   * record on disk has caught up. Those are exactly the fields history
   * dedupes on, so reading the repository on the event would double rows.
   */
  private _attachRecordListener(namespace: string): void {
    if (realmListenerAttached.has(namespace)) return;
    try {
      // the repository keeps its Realm private; read it structurally, mocks may hold it elsewhere or not at all
      const repository = this._swapRepository as unknown as { realm?: Realm; _realm?: Realm } | undefined;
      const realm = repository?.realm ?? repository?._realm;
      const objects = typeof realm?.objects === 'function' ? realm.objects('ArkadeSwapRecord') : undefined;
      if (objects && typeof objects.addListener === 'function') {
        objects.addListener(() => {
          const instances = namespaceInstances.get(namespace);
          if (instances) for (const instance of instances) instance.refreshSwapRecords().catch(() => {});
        });
        realmListenerAttached.add(namespace);
      }
    } catch {
      // Mock Realms and headless runtimes may not support listeners;
      // fetchTransactions() stays the coarse backstop for both halves.
    }
  }

  /** Re-read the repository half of the join; false when the read failed and the cache may be stale. */
  async refreshSwapRecords(): Promise<boolean> {
    if (!this._swapRepository) return false;
    if (this._recordsRefreshInFlight) return this._recordsRefreshInFlight;
    this._recordsRefreshInFlight = (async () => {
      try {
        const repository = this._swapRepository!;
        const records = await collectPages<SwapRecord, string>(page => repository.getSwapRecordsPage(page));
        this._swapRecords = records.filter(r => r.family === 'rfq') as CorridorSwapRecord[];
        return true;
      } catch (e) {
        console.log('[ARK] refreshSwapRecords failed:', errorMessage(e));
        return false;
      } finally {
        this._recordsRefreshInFlight = null;
      }
    })();
    return this._recordsRefreshInFlight;
  }

  /** Re-read the status half of the join from `client.swaps()`. */
  async refreshSwapStatuses(): Promise<void> {
    if (!this._swapClient) return;
    try {
      const swaps = await this._swapClient.swaps();
      this._outcomes.clear();
      for (const swap of swaps) {
        this._outcomes.set(swap.id, swap.outcome);
      }
    } catch (e) {
      console.log('[ARK] refreshSwapStatuses failed:', errorMessage(e));
    }
  }

  async refreshSwapCaches(): Promise<void> {
    await Promise.all([this.refreshSwapRecords(), this.refreshSwapStatuses()]);
  }

  // Subscribing replays the current outcome of every known swap and then
  // streams transitions. `onUpdate` is authoritative about the outcome it
  // carries and needs nothing from disk — the record half refreshes on the
  // after-write signal, not here.
  private _attachSwapListener(namespace: string, swapClient: SwapClient): void {
    if (swapListenerAttached.has(swapClient)) return;
    try {
      swapClient.onUpdate(update => {
        for (const instance of namespaceInstances.get(namespace) ?? []) instance._applySwapUpdate(swapClient, update);
      });
      swapListenerAttached.add(swapClient);
    } catch {
      // Client without a drive (tests) — history refresh stays manual.
    }
  }

  private _applySwapUpdate(swapClient: SwapClient, update: SwapUpdate): void {
    try {
      if (this._swapClient !== swapClient) return; // stale subscription after onDelete
      this._outcomes.set(update.swap.id, update.outcome);
      this.refreshSwapRecords().catch(() => {});
      (async () => {
        try {
          if (this._wallet) {
            this._transactionsHistory = await this._wallet.getTransactionHistory();
            const balance = await this._wallet.getBalance();
            // Keep this in sync with fetchBalance(): offchain spendable + recoverable,
            // boarding excluded (see fetchBalance for the double-count rationale).
            this.balance = balance.available + balance.recoverable;
          }
          this._lastBalanceFetch = +new Date();
          this._lastTxFetch = +new Date();
        } catch (e) {
          console.log('[ARK] swap-event refresh failed:', errorMessage(e));
        }
      })().catch(() => {});
    } catch (e) {
      console.log('[ARK] swap-event handler failed:', errorMessage(e));
    }
  }

  /**
   * Forward swap lifecycle transitions to a single UI callback so screens
   * can re-render the moment the drive observes a new outcome instead of
   * waiting for a polling tick. No-op (returns an inert unsubscribe) if init
   * hasn't run yet — callers re-subscribe whenever the wallet ref changes.
   */
  subscribeToSwapEvents(callback: (update: SwapUpdate) => void): () => void {
    if (!this._swapClient) return () => {};
    try {
      return this._swapClient.onUpdate(callback);
    } catch {
      return () => {};
    }
  }

  // ---------------------------------------------------------------------------
  // Swap reads. All read the record cache directly,
  // never the display list (a settled swap's row keeps its `swap-` identity,
  // but the answer must not depend on how the display list coalesces).
  // ---------------------------------------------------------------------------

  private _recordForId(id: string): CorridorSwapRecord | undefined {
    const quoteId = quoteIdOfSwapId(id);
    return this._swapRecords.find(r => r.id === quoteId);
  }

  /**
   * Row -> swap and detail-screen subject. Parses the tagged id with the
   * root's readers, never by splitting on `:` by hand — the remainder now
   * contains a colon.
   */
  getSwapById(id: string): ArkSwapView | undefined {
    const record = this._recordForId(id);
    if (!record) return undefined;
    const swapId = assetSwapIdOf(record.family, record.id);
    const outcome = this._outcomes.get(swapId) ?? 'funding';
    return this._viewOf(record, outcome);
  }

  getSwapViews(): ArkSwapView[] {
    return this._swapRecords.map(record => {
      const swapId = assetSwapIdOf(record.family, record.id);
      return this._viewOf(record, this._outcomes.get(swapId) ?? 'funding');
    });
  }

  private _viewOf(record: CorridorSwapRecord, outcome: Outcome): ArkSwapView {
    const swapId = assetSwapIdOf(record.family, record.id);
    const leg = record.give as { amount: string };
    const bolt11 = recordBolt11(record);
    let expiresAt = record.expiresAt;
    if (bolt11) {
      try {
        const decoded = this.decodeInvoice(bolt11);
        if (decoded?.timestamp && decoded?.expiry) expiresAt = decoded.timestamp + decoded.expiry;
      } catch {}
    }
    return {
      id: swapId,
      kind: record.kind,
      outcome,
      amountSats: atomicDecimalToSats(leg?.amount ?? '0'),
      bolt11,
      paymentHash: record.lock?.hash ?? '',
      expiresAt,
      createdAt: record.createdAt,
      refundLocktime: record.refundLocktime,
      fundingTxid: record.fundingTxid,
      refundTxid: record.refundTxid,
      failure: record.failure,
      blockedReason: record.blockedReason,
      record,
    };
  }

  isInvoiceGeneratedByWallet(paymentRequest: string) {
    const normalized = paymentRequest.trim().toLowerCase();
    return this._lnurlInvoices.some(({ row }) => row.payment_request?.trim().toLowerCase() === normalized);
  }

  // ---------------------------------------------------------------------------
  // History. Passes 1 (SDK history rows) and 2 (boarding UTXOs) are unchanged.
  // Pass 3 is the v2 swap pass: correlation by exact txid, one canonical
  // identity per swap, suppress-don't-enrich, record-derived rows, swap
  // amounts, terminal rows kept.
  // ---------------------------------------------------------------------------

  /**
   * Single source of activity for the BlueWallet transaction list. The SDK's
   * `getTransactionHistory()` (`_transactionsHistory`) is the source of truth
   * for settled non-swap rows; swaps correlate by exact txid and always render
   * as their own row:
   *
   * 1. `_transactionsHistory` (Ark SDK) — the base rows:
   *    - `key.boardingTxid` is set ONLY on boarding outputs, so it is an
   *      exclusive refill discriminator: RECEIVED && settled → "Refill"
   *      (`boarding-<txid>`); other boarding states are suppressed (pending
   *      boarding is surfaced from `_boardingUtxos` in pass 2).
   *    - no `boardingTxid` → native Ark leg (`ark-<arkTxid|commitmentTxid>`),
   *      SENT negative / RECEIVED positive.
   *
   * 2. `_boardingUtxos` → "Pending refill" rows (boarding UTXO not yet swept),
   *    with a live timestamp.
   *
   * 3. Swap records — one canonical identity, `swap-<AssetSwapId>`, for the
   *    whole lifecycle. Any pass-1 row whose txid belongs to a swap is
   *    dropped and the swap's own row stands in its place (N transactions to
   *    one row, never one row per txid). Funding the lockup is an ordinary
   *    Arkade transaction to a contract this wallet registered, so the SDK
   *    nets it as change and emits no row — a send shows nothing in pass 1
   *    across the whole in-flight window; the record-derived row covers it.
   *    Amount (give leg) and timestamp (`createdAt`) come from the record, so a
   *    row neither moves nor changes identity when evidence arrives. Terminal swaps keep their
   *    rows: a refund returns the money through a transaction that nets to
   *    zero the same way, so dropping terminal records would make a payment
   *    vanish at the moment it comes back.
   *
   * Stable row ids survive status transitions: `boarding-<txid>`,
   * `boarding-utxo-<txid>:<vout>`, `ark-<arkTxid|commitmentTxid>`,
   * `swap-rfq:<quoteId>`.
   *
   * Settlement signal is `LightningTransaction.ispaid`; we never invent a
   * `confirmations` field for an LN/Ark row.
   */
  getTransactions(includeUnpaidInvoices = false): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const ret: ArkTxRow[] = [];

    // Pass 1 — base rows from the SDK transaction history (single source of
    // truth). `key.boardingTxid` is set only on boarding outputs, so it is an
    // exclusive refill discriminator; every other entry is a native Ark leg a
    // swap may later suppress.
    type NativeLeg = { row: ArkTxRow; idKey: string; consumed: boolean };
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
      const row: ArkTxRow = {
        txid: `ark-${idKey}`,
        type: 'bitcoind_tx',
        walletID,
        description,
        memo: description,
        value: absAmount * direction,
        timestamp: createdAtSec,
        // A Lightning send funds a lockup this wallet registered, which nets as change and emits no sent row.
        ...(histTx.type === TxType.TxSent ? { rail: 'arkade' as const } : {}),
      };
      ret.push(row);
      nativeLegs.push({ row, idKey, consumed: false });
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

    // Pass 3 — swaps. Correlation: exact txids, never the activity API.
    // Index every record's fundingTxid / refundTxid / lockupSpendTxids and
    // suppress matching pass-1 rows; the swap's own row (one identity for the
    // whole lifecycle) stands in their place.
    const ownedTxids = new Map<string, CorridorSwapRecord>();
    for (const record of this._swapRecords) {
      const txids: string[] = [];
      if (record.fundingTxid) txids.push(record.fundingTxid);
      if (record.refundTxid) txids.push(record.refundTxid);
      const spends = record.lockupSpendTxids;
      if (Array.isArray(spends)) for (const txid of spends) if (typeof txid === 'string') txids.push(txid);
      for (const txid of txids) if (!ownedTxids.has(txid)) ownedTxids.set(txid, record);
    }
    for (const leg of nativeLegs) {
      if (ownedTxids.has(leg.idKey)) {
        leg.consumed = true;
        const idx = ret.indexOf(leg.row);
        if (idx !== -1) ret.splice(idx, 1);
      }
    }
    // Boarding rows are a separate namespace and no swap owns them.

    for (const record of this._swapRecords) {
      const swapId = assetSwapIdOf(record.family, record.id);
      const outcome = this._outcomes.get(swapId) ?? 'funding';

      let memo = '';
      const bolt11invoice = recordBolt11(record);
      let paymentHash = record.lock?.hash ?? '';
      let expiry = 3600;
      try {
        if (bolt11invoice) {
          const invoiceDetails = this.decodeInvoice(bolt11invoice);
          if (!paymentHash) paymentHash = invoiceDetails.payment_hash ?? '';
          if (invoiceDetails.description) memo = invoiceDetails.description;
          if (invoiceDetails.expiry) expiry = invoiceDetails.expiry;
        }
      } catch {}

      // Amount is the swap's give leg, not a net of its transactions. A
      // refunded send's member
      // transactions net to zero, and a zero-amount row would read as
      // "nothing happened" when what happened is "you tried to pay and the
      // money came back".
      const leg = record.give as { amount: string };
      const value = -atomicDecimalToSats(leg?.amount ?? '0');
      const timestamp = record.createdAt;

      let type: 'payment_request' | 'paid_invoice' = 'payment_request';
      let memoPrefix = '';
      let ispaid = false;

      if (SETTLED_OUTCOMES.has(outcome)) {
        ispaid = true;
        type = 'paid_invoice';
      } else if (REFUNDED_OUTCOMES.has(outcome)) {
        memoPrefix = 'Refunded: ';
      } else if (FAILED_OUTCOMES.has(outcome)) {
        memoPrefix = 'Failed: ';
      }

      const settlingTxid = record.refundTxid ?? record.fundingTxid;

      ret.push({
        txid: `swap-${swapId}`,
        type,
        walletID,
        description: memoPrefix + memo,
        memo: memoPrefix + memo,
        value,
        timestamp,
        ispaid,
        // A non-empty memoPrefix is set only for terminal refunded/failed
        // swaps. Surfacing it explicitly lets the UI tell "in flight"
        // (`ispaid:false`, no prefix) apart from "dead" (`ispaid:false`,
        // prefix set) without string-matching the memo.
        failed: memoPrefix !== '',
        payment_hash: paymentHash,
        payment_request: bolt11invoice,
        amt: value,
        payment_preimage: record.settlementPreimageHex,
        expire_time: expiry,
        ...(settlingTxid ? { settlingTxid } : {}),
      });
    }

    // Pass 4 — LNURL invoices, for the receive-screen poll only: a paid one is
    // already in history as the VTXO it delivered (pass 1).
    if (includeUnpaidInvoices) ret.push(...this._lnurlInvoices.map(({ row }) => row));

    // rows carry only the lightning fields; callers treat them as the on-chain shape too
    return ret as (Transaction & LightningTransaction)[];
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'arkade://' + bip39.entropyToMnemonic(uint8ArrayToHex(buf));

    await this.init();
  }

  getSecret() {
    // Shadow the custodial `secret@baseURI` shape: an Ark wallet's secret is
    // the bare `arkade://` mnemonic (no server suffix). Without this, getID()
    // and every other getSecret() consumer would see `...@undefined`.
    return this.secret;
  }

  async fetchUserInvoices() {
    // nop
  }

  async fetchTransactions() {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');
    if (!this._swapClient || !this._swapRepository) throw new Error('Swap client not initialized');

    await this.refreshSwapCaches();
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');

    await this._attemptBoardUtxos();

    const balance = await this._wallet.getBalance();
    this._lastBalanceFetch = +new Date();
    // Headline balance = spendable offchain + recoverable, i.e. SDK `total`
    // minus `boarding.total`. A refill stays OUT of the balance until the SDK
    // settles its boarding UTXO into a VTXO — the same moment its history row
    // flips from "Pending" to a confirmed "Refill". Two reasons boarding is
    // excluded here:
    //   1. A pending/unconfirmed refill must not inflate the balance before it
    //      is usable; it is surfaced as a "Pending" row instead (getTransactions).
    //   2. While settling, the SDK briefly reports BOTH the boarding UTXO (still
    //      unspent in getCoins) AND the freshly-minted preconfirmed VTXO, so
    //      `balance.total` transiently double-counts the refill. Counting only
    //      offchain+recoverable means each sat is counted once, at settlement.
    // Mirrors the reference wallets (trixie's headline is `available`).
    this.balance = balance.available + balance.recoverable;
  }

  /** Lightning send bounds in sats across the solvers' markets, or null when none serves Lightning. */
  async getSendLimits(): Promise<{ min: number; max: number } | null> {
    if (!this._swapClient) await this.init();
    if (!this._swapClient) throw new Error('Swap client not initialized');
    const bounds = (await this._swapClient.markets())
      .map(market => market.legs[1])
      .filter(leg => String(leg.asset ?? '').startsWith('bolt11:') && leg.limits)
      .map(leg => leg.limits!);
    if (!bounds.length) return null;
    const min = bounds.reduce((low, b) => (b.min < low ? b.min : low), bounds[0].min);
    const max = bounds.reduce((high, b) => (b.max > high ? b.max : high), bounds[0].max);
    return { min: Number(min), max: Number(max) };
  }

  /** The LNURL server's Lightning bounds in sats, or null when it offers none or cannot be reached. */
  async getReceiveLimits(): Promise<{ min: number; max: number } | null> {
    try {
      const receiver = await this._getLnurlReceiver();
      return lnurlRailLimits(await receiver.payRequest()).find(rail => rail.type === 'lightning') ?? null;
    } catch (e) {
      console.log('[ARK] LNURL receive limits failed:', errorMessage(e));
      return null;
    }
  }

  async getLightningAddress(): Promise<string | undefined> {
    try {
      return (await this._getLnurlReceiver()).lightningAddress;
    } catch (e) {
      console.log('[ARK] Lightning address unavailable:', errorMessage(e));
      return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Send. The screens show a quote, then send exactly that quote: rails never
  // re-quote, so the fee confirmed is the fee paid.
  // ---------------------------------------------------------------------------

  /** A live swap already paying this BOLT11: quoting it again would fund a second lockup. */
  async findLiveSwapForInvoice(invoice: string): Promise<AssetSwapId | undefined> {
    if (!this._swapClient) await this.init();
    if (!this._swapClient) throw new Error('Swap client not initialized');
    const normalized = invoice.trim().toLowerCase();
    for (const swap of await this._swapClient.swaps()) {
      const take = swap.route?.take?.instrument;
      const done = SETTLED_OUTCOMES.has(swap.outcome) || REFUNDED_OUTCOMES.has(swap.outcome) || FAILED_OUTCOMES.has(swap.outcome);
      if (!done && take?.kind === 'invoice' && take.bolt11.toLowerCase() === normalized) return swap.id;
    }
    return undefined;
  }

  /** `arkRail()` held to our operator: another's address fails only at send, after an LNURL could have fallen back to Lightning. */
  private _arkRail(ours: ArkAddress): PaymentRail {
    const rail = arkRail();
    const onOurOperator = (raw: string): boolean => {
      try {
        const theirs = ArkAddress.decode(arkTarget(raw) ?? '');
        return theirs.hrp === ours.hrp && uint8ArrayToHex(theirs.serverPubKey) === uint8ArrayToHex(ours.serverPubKey);
      } catch {
        return false;
      }
    };
    return { ...rail, match: (req, ctx) => rail.match(req, ctx) && onOurOperator(req.raw) };
  }

  /**
   * Quotes a send for the confirm step: a BOLT11 over the solver's Lightning rail, an Arkade
   * address, or an LNURL / Lightning address over its Arkade rail on our operator.
   */
  async quoteSend(target: string, { amountSat, comment }: { amountSat?: number; comment?: string } = {}): Promise<RouteQuote> {
    if (!this._wallet || !this._swapClient) await this.init();
    const wallet = this._wallet;
    const client = this._swapClient;
    if (!wallet || !client) throw new Error('Arkade wallet not initialized');
    const raw = target.trim();
    const ctx = { wallet, prefs: {} };

    const invoice = invoiceTarget(raw);
    if (invoice !== undefined) {
      const live = await this.findLiveSwapForInvoice(invoice);
      if (live) throw new Error(`This invoice already has a live swap (${live}). Wait for its outcome instead of paying again.`);
      try {
        return await lightningRail(client).quote({ raw }, ctx);
      } catch (e) {
        throw await this._boundsRefusal(e, invoice);
      }
    }

    const ark = this._arkRail(ArkAddress.decode(await wallet.getAddress()));
    const router = new PaymentRouter(ctx).use(ark);
    for (const rail of lnurlRails({ client: createLnurlClient(), arkade: ark, comment })) router.use(rail);
    const options = await router.options({ raw, amount: amountSat });
    if (!options.length) {
      throw new Error(isValidArkAddress(raw) ? 'This Arkade address is on another operator' : 'No Arkade route for this destination');
    }
    return firstQuote(options);
  }

  /** The solvers' min/max for an invoice outside them; any other refusal comes back as is. */
  private async _boundsRefusal(error: unknown, invoice: string): Promise<unknown> {
    if (!isSwapError(error, 'UnsupportedRoute')) return error;
    const limits = await this.getSendLimits().catch(() => null);
    const sats = Number(this.decodeInvoice(invoice).num_satoshis);
    if (limits && sats < limits.min) return new Error(`Minimum you can send is ${limits.min} sat`);
    if (limits && sats > limits.max) return new Error(`Maximum you can send is ${limits.max} sat`);
    return error;
  }

  /** Sends a confirmed quote and waits for it to settle; a Lightning payment's preimage lands in `last_paid_invoice_result`. */
  async sendQuote(quote: RouteQuote): Promise<void> {
    const handle = await quote.send();
    let result: RouteResult;
    try {
      result = await handle.settled({ timeoutMs: SEND_SETTLE_WAIT_MS });
    } catch (e) {
      if (e instanceof SwapPaymentFailedError) throw new Error(this._sendFailureMessage(e.outcome, e.swap.id));
      if (handle.status === 'pending' || handle.status === 'sent') {
        throw new PaymentInProgressError(handle.settled().then(late => this._paidReceipt(late)));
      }
      throw e;
    }
    const receipt = await this._paidReceipt(result);
    if (receipt) this.last_paid_invoice_result = receipt;
  }

  /** The preimage, payment hash and invoice of a settled Lightning payment; none for an Arkade send. */
  private async _paidReceipt(result: RouteResult): Promise<PaidReceipt | undefined> {
    this.refreshSwapCaches().catch(() => {});
    if (!result.swapId) return undefined;
    const swapId = result.swapId as AssetSwapId;
    let record: CorridorSwapRecord | undefined;
    try {
      record = (await this._swapRepository?.getSwapRecord(quoteIdOfSwapId(swapId))) as CorridorSwapRecord | undefined;
    } catch {}
    return {
      payment_preimage: await this._settlementPreimage(swapId),
      payment_hash: record?.lock?.hash ?? '',
      payment_request: record ? recordBolt11(record) : '',
    };
  }

  private _sendFailureMessage(outcome: Outcome, swapId: string): string {
    switch (outcome) {
      case 'failed':
        return 'Lightning payment failed. Your funds are safe — recover them from the transaction details if needed.';
      case 'refunded':
      case 'cancelled':
        return 'Lightning payment was refunded.';
      case 'lapsed':
        return 'Lightning payment expired before it could be claimed.';
      case 'needs_recovery':
        return `Lightning payment needs recovery (${swapId}). Open the transaction details to recover.`;
      case 'refunding':
        return 'Lightning payment is being refunded. Your funds are on their way back.';
      default:
        return `Lightning payment did not settle (outcome: ${outcome}).`;
    }
  }

  /**
   * The send-leg settlement receipt. Prefer `record.settlementPreimageHex`
   * (durable since the rc.5 build, read off the record after the write —
   * never from the event); fall back to a `readLockupFate` chain read for
   * swaps settled by an older build or while nothing was listening (terminal
   * records are not re-driven, so they are never stamped retroactively).
   */
  private async _settlementPreimage(swapId: AssetSwapId): Promise<string | undefined> {
    try {
      const record = (await this._swapRepository?.getSwapRecord(quoteIdOfSwapId(swapId))) as CorridorSwapRecord | undefined;
      if (record?.settlementPreimageHex) return record.settlementPreimageHex;
      if (record && this._wallet) {
        const swapPkScript = record.lockupPkScript;
        const paymentHash = record?.lock?.hash;
        if (swapPkScript && paymentHash) {
          try {
            const indexer = await this._wallet.getArkadeReader();
            const fate = await readLockupFate(indexer, { swapPkScript: hexToUint8Array(swapPkScript), paymentHash });
            if (fate?.fate === 'claimed' && fate.preimage) return uint8ArrayToHex(fate.preimage);
          } catch (e) {
            console.log('[ARK] preimage backfill read failed:', errorMessage(e));
          }
        }
      }
    } catch (e) {
      console.log('[ARK] settlement preimage read failed:', errorMessage(e));
    }
    return undefined;
  }

  /** One-shot send, used for Arkade addresses: invoices and LNURLs are quoted and confirmed on screen. */
  async payInvoice(invoice: string, freeAmount: number = 0) {
    await this.sendQuote(await this.quoteSend(invoice, freeAmount > 0 ? { amountSat: freeAmount } : {}));
  }

  async getUserInvoices(): Promise<LightningTransaction[]> {
    await this.fetchTransactions();
    await this._refreshLnurlInvoices();
    const txs = this.getTransactions(true);
    return txs.filter(tx => tx.value! > 0);
  }

  /**
   * Our Lightning address: a server-picked name bound to our Arkade and boarding addresses. The key
   * owns it, so a restore finds it again; `refresh` re-binds it if either address rotated, and an
   * earlier build's nameless receiver is named in place so its LNURL keeps working.
   */
  private _getLnurlReceiver(): Promise<Receiver> {
    // Chained so concurrent callers share one claim; an operator signer change rotates both addresses, so a new pair re-binds.
    const previous = this._lnurlReceiver;
    const current = (async () => {
      if (!this._wallet) await this.init();
      const wallet = this._wallet;
      if (!wallet) throw new Error('Arkade wallet not initialized');
      const destinations = `${await wallet.getAddress()} ${await wallet.getBoardingAddress()}`;
      const held = await previous?.catch(() => undefined);
      if (held?.destinations === destinations) return held;
      const lnurl = arkadeLnurl({ wallet, baseUrl: LNURL_SERVER });
      const owned = (await lnurl.owned({ refresh: true })) ?? (await lnurl.claim());
      return { destinations, receiver: owned.lightningAddress ? owned : await owned.upgrade() };
    })();
    this._lnurlReceiver = current;
    current.catch(() => {
      if (this._lnurlReceiver === current) this._lnurlReceiver = undefined;
    });
    return current.then(({ receiver }) => receiver);
  }

  async addInvoice(amt: number, memo: string) {
    const payRequest = await (await this._getLnurlReceiver()).payRequest();
    const option = payRequest.paymentOptions?.find(o => o.type === 'lightning' && o.available !== false);
    if (payRequest.paymentOptions && !option) throw new Error('Lightning receive is unavailable right now');

    const answer = await createLnurlClient().requestInvoice(payRequest, { amountSat: amt, paymentOption: option?.id });
    if (answer.kind !== 'bolt11') throw new Error('LNURL server did not return a Lightning invoice');

    const { payment_hash, expiry } = this.decodeInvoice(answer.pr);
    this._lnurlInvoices.push({
      verify: answer.verify,
      row: {
        txid: `lnurl-${payment_hash}`,
        type: 'user_invoice',
        walletID: this.getID(),
        description: memo,
        memo,
        value: amt,
        amt,
        timestamp: Math.floor(Date.now() / 1000),
        ispaid: false,
        payment_hash,
        payment_request: answer.pr,
        expire_time: expiry || 3600,
      },
    });
    return answer.pr;
  }

  private async _refreshLnurlInvoices(): Promise<void> {
    const now = Date.now() / 1000;
    const pending = this._lnurlInvoices.filter(({ row }) => !row.ispaid && (row.timestamp ?? 0) + (row.expire_time ?? 0) > now);
    await Promise.all(
      pending.map(async ({ row, verify }) => {
        if (!verify || !row.payment_request) return;
        try {
          // Resolves only when settled; a timeout of 0 makes this a single look.
          const status = await createLnurlClient().pollVerify(verify, { timeoutMs: 0, expect: { pr: row.payment_request } });
          row.ispaid = true;
          if (status.kind === 'bolt11') row.payment_preimage = status.preimage ?? undefined;
        } catch {
          // Not settled yet, or the server cannot say: the next poll asks again.
        }
      }),
    );
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
    // Mainnet only: the SDK accepts any network's Arkade address.
    return isValidArkAddress(address) && ArkAddress.decode(address).hrp === 'ark';
  }

  // ---------------------------------------------------------------------------
  // Recovery. Claim is automatic, so the only manual action left is
  // `client.recover(swapId)` — and `needs_recovery` is a diagnosis, not a
  // permission: recover() refuses under reason codes, two of which are the
  // ordinary case (`nothing-swept`, `refund-window-open`). The screen gates
  // on the local reason (refundLocktime vs clock) and reports the remote
  // one from the refusal.
  // ---------------------------------------------------------------------------

  /**
   * Attempt a recovery round for a swap. Resolves with the drive's answer;
   * `{ recovered: false, txid }` is a normal return meaning "not this
   * cycle" (the round reads the whole wallet and may sweep other outpoints
   * first), not a success. Throws `SwapDriveRefusedError` with
   * `nothing-swept` when there is nothing to recover yet.
   */
  async recoverSwap(swapId: string) {
    if (!this._swapClient) await this.init();
    if (!this._swapClient) throw new Error('Swap client not initialized');
    const tagged = (familyOfSwapId(swapId) ? swapId : assetSwapIdOf('rfq', swapId)) as AssetSwapId;
    const result = await this._swapClient.recover(tagged);
    await this.refreshSwapCaches();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Deletion guard. The repository is the only copy of the material a pending
  // swap needs — but by the time `onDelete()` runs the decision is already
  // made and recorded, and a refusal thrown from there lands in a
  // fire-and-forget `.catch` after the wallet has left the collection. So
  // refusal is an awaited preflight, before the collection is mutated; the
  // check inside `onDelete()` stays as defence in depth.
  //
  // The test is not "is the swap terminal" but "can a lockup of ours still
  // hold value", and it is leg-aware: send legs are unsafe unless paid,
  // claimed or refunded (a terminal `failed` can still hold an unspent
  // lockup); receive legs are safe at every outcome (the trader funded
  // nothing — `lapsed` and `failed` cost the incoming payment, never
  // principal). For an unsafe send, resolution evidence is required: a chain
  // read answering `returned` or `claimed` clears it; `open`, `exited` or
  // `unknown` does not. If the read cannot be made — offline, no indexer —
  // refuse and say why. An explicit destructive override (`force=true`) is
  // the only way past that.
  // ---------------------------------------------------------------------------

  async canDeleteWallet(force = false): Promise<{ safe: boolean; message?: string }> {
    // An empty swap history needs no network, so init's delegate preflight gets no vote on it.
    if (await this._swapHistoryIsEmpty()) return { safe: true };
    try {
      if (!this._swapClient || !this._swapRepository) await this.init();
    } catch (e) {
      return { safe: false, message: `Cannot verify swap state while offline: ${errorMessage(e)}` };
    }
    if (!this._swapClient || !this._swapRepository || !this._wallet) {
      return { safe: false, message: 'Cannot verify swap state while offline' };
    }
    const [recordsRead] = await Promise.all([this.refreshSwapRecords(), this.refreshSwapStatuses()]);
    if (!recordsRead && !force) return { safe: false, message: 'Cannot verify swap state: the swap records could not be read' };

    const unsafe: ArkSwapView[] = [];
    for (const view of this.getSwapViews()) {
      if (SAFE_SEND_OUTCOMES.has(view.outcome)) continue;
      unsafe.push(view);
    }
    if (unsafe.length === 0) return { safe: true };
    if (force) return { safe: true };

    let indexer: LockupSpendIndexer;
    try {
      indexer = await this._wallet.getArkadeReader();
    } catch {
      return {
        safe: false,
        message: `Cannot verify ${unsafe.length} pending Lightning swap(s) while offline. Let them settle first, or delete anyway knowing the funds may become unrecoverable.`,
      };
    }

    for (const view of unsafe) {
      const swapPkScript = view.record.lockupPkScript;
      const paymentHash = view.record.lock?.hash;
      if (!swapPkScript || !paymentHash) {
        return {
          safe: false,
          message: `This wallet has a pending Lightning swap (${view.outcome}). Deleting now may make its funds unrecoverable. Let it settle first.`,
        };
      }
      try {
        const fate = await readLockupFate(indexer, { swapPkScript: hexToUint8Array(swapPkScript), paymentHash });
        if (fate?.fate === 'returned' || fate?.fate === 'claimed') continue;
        return {
          safe: false,
          message: `This wallet has a pending Lightning swap (${view.outcome}). Deleting now may make its funds unrecoverable. Let it settle first.`,
        };
      } catch (e) {
        return { safe: false, message: `Cannot verify pending Lightning swaps while offline: ${errorMessage(e)}` };
      }
    }
    return { safe: true };
  }

  /** True only when the local swap records were read and there are none. */
  private async _swapHistoryIsEmpty(): Promise<boolean> {
    try {
      const namespace = this.getNamespace();
      const repository =
        this._swapRepository ?? staticSwapRepositoryCache[namespace] ?? new RealmAssetSwapRepository(await getArkadeRealm(namespace));
      const records = await collectPages<SwapRecord, string>(page => repository.getSwapRecordsPage(page));
      return records.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup hook invoked when the wallet is removed from BlueWallet storage.
   * Drains any in-flight init so its post-await tail can no longer repopulate
   * the static caches / realm instances after we've cleared them, releases
   * the swap client's live resources, then closes the per-wallet Realm,
   * deletes the Realm files, and resets the Keychain entry.
   *
   * Refusal is preflight and blocking (see `canDeleteWallet`, awaited before
   * the collection is mutated); cleanup failure here is post-hoc,
   * non-blocking, and reported. Errors stay scoped to the Ark wallet path
   * and never block deletion.
   */
  async onDelete(): Promise<void> {
    if (!this.secret) return; // nothing to clean
    const namespace = this.getNamespace();

    delete boardingLock[namespace];
    namespaceInstances.get(namespace)?.delete(this);
    if (namespaceInstances.get(namespace)?.size === 0) {
      namespaceInstances.delete(namespace);
      realmListenerAttached.delete(namespace);
    }

    // If init() is racing with us, await its settlement before clearing caches.
    // Without this drain, the IIFE in init() would write to the static caches
    // after our delete and the realm adapter would re-cache the open Realm,
    // resurrecting state for an already-deleted wallet. Note that the racing
    // init's `await inFlight` continuation runs *before* ours (it was
    // registered earlier), so when we resume here, init has already
    // re-assigned this._wallet / this._swapClient and populated the caches.
    // We then clear everything in one pass.
    const inFlightInit = initInFlight.get(namespace);
    if (inFlightInit) {
      try {
        await inFlightInit;
      } catch {
        // init's caller already received the rejection; we just need it to settle.
      }
    }

    // Release the drive's live resources (timers, contract subscription)
    // before tearing down storage so background passes don't keep running
    // against a wallet whose Realm we're about to delete.
    const cachedClient = staticSwapClientCache[namespace];
    const cachedWallet = staticWalletCache[namespace];

    this._wallet = undefined;
    this._swapClient = undefined;
    this._swapRepository = undefined;
    this._swapRecords = [];
    this._outcomes = new Map();
    this._lnurlReceiver = undefined;
    this._lnurlInvoices = [];
    delete staticWalletCache[namespace];
    delete staticSwapClientCache[namespace];
    delete staticSwapRepositoryCache[namespace];
    initInFlight.delete(namespace);

    // Type guards: real SDK objects always have dispose; unit-test stubs may not.
    try {
      if (cachedClient && typeof cachedClient[Symbol.asyncDispose] === 'function') {
        await cachedClient[Symbol.asyncDispose]();
      }
    } catch (e) {
      console.log(`[LightningArkWallet] swapClient.dispose failed for ${namespace}:`, errorMessage(e));
    }
    try {
      if (typeof cachedWallet?.dispose === 'function') await cachedWallet.dispose();
    } catch (e) {
      console.log(`[LightningArkWallet] wallet.dispose failed for ${namespace}:`, errorMessage(e));
    }

    try {
      await deleteArkadeRealm(namespace);
    } catch (e) {
      console.log(`[LightningArkWallet] onDelete cleanup failed for ${namespace}:`, errorMessage(e));
    }
  }
}
