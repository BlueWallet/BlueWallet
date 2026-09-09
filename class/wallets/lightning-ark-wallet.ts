import { sha256 } from '@noble/hashes/sha256';
import {
  assetSwapIdOf,
  quoteIdOfSwapId,
  familyOfSwapId,
  type AssetSwapId,
  type CorridorSwapRecord,
  type Outcome,
  type Quote,
  type Swap,
  type SwapClient,
  type SwapRecord,
  type SwapUpdate,
} from '@arkade-os/swap';
import { readLockupFate } from '@arkade-os/swap/protocol';
import { RealmAssetSwapRepository } from '@arkade-os/swap/repositories/realm';
import { sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery';
import { RestDelegateProvider, SingleKey, Wallet, ExtendedCoin, ArkTransaction, TxType } from '@arkade-os/sdk';
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
import { discoverMarkets } from '../../blue_modules/arkade-markets';
import { makeSwapClient } from '../../blue_modules/arkade-swap-client';
import { InvoiceRejected, toInvoiceFacts } from '../../blue_modules/arkade-bolt11';
const { bech32m } = require('bech32');

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

const staticWalletCache: Record<string, Wallet> = {};
const staticSwapClientCache: Record<string, SwapClient> = {};
const staticSwapRepositoryCache: Record<string, RealmAssetSwapRepository> = {};
const initInFlight: Map<string, Promise<{ wallet: Wallet; swapClient: SwapClient; repository: RealmAssetSwapRepository }>> = new Map();
const boardingLock: Record<string, boolean> = {};
// Live wallet instances per namespace, so the Realm after-write listener can
// refresh the record cache on the instance the screens render from.
const namespaceInstances: Map<string, Set<LightningArkWallet>> = new Map();
const realmListenerAttached: Set<string> = new Set();

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
  direction: -1 | 1;
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
  const takeInstrument = (record.route as any)?.take?.instrument;
  if (takeInstrument?.kind === 'invoice' && typeof takeInstrument.bolt11 === 'string') return takeInstrument.bolt11;
  const giveInstrument = (record.route as any)?.give?.instrument;
  if (giveInstrument?.kind === 'invoice' && typeof giveInstrument.bolt11 === 'string') return giveInstrument.bolt11;
  return '';
};

const isReceiveKind = (kind: CorridorSwapRecord['kind']): boolean => kind === 'lightning_receive';

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

  // The read cache, and why it is three fields: `client.swaps()` returns the
  // derived `Swap` view (id, outcome, route, give/take/fee — no kind,
  // refundTxid, lockupSpendTxids, lockupPkScript, state or rfqId), while the
  // repository's `SwapRecord` carries the correlation and reconstruction
  // fields (and no outcome, which only the drive derives). Neither shape
  // alone serves the render paths, so the cache is a join:
  // - `_swapRecords`: correlation + reconstruction, refreshed on the
  //   after-write signal (Realm listener) with `fetchTransactions()` as the
  //   coarse backstop;
  // - `_swaps` / `_outcomes`: status, from `client.swaps()` and kept current
  //   by `onUpdate` (which fires before the repository write lands, so it is
  //   never used as evidence the record on disk has caught up).
  // Canonical key is the tagged `AssetSwapId`; conversions at the boundary:
  // record -> public via `assetSwapIdOf(record.family, record.id)`, public ->
  // repository via `quoteIdOfSwapId(id)`.
  private _swapRecords: CorridorSwapRecord[] = [];
  private _swaps: Map<AssetSwapId, Swap> = new Map();
  private _outcomes: Map<AssetSwapId, Outcome> = new Map();
  // The discovered market set: one filtered set feeds the client snapshot
  // and the synchronous fee estimate alike, so the UI and the quote path
  // provably agree.
  private _markets: DiscoveredMarket[] = [];
  // Swap ids accepted for a given payer invoice (lowercased), so a retry
  // path consults the existing swap before re-quoting the same bolt11 —
  // re-quoting mints a NEW quote id and accepting it funds a SECOND lockup
  // for the same invoice. Restart-safe read is `client.swaps()`.
  private _acceptedInvoiceMap: Map<string, AssetSwapId> = new Map();
  private _recordsRefreshInFlight: Promise<void> | null = null;

  private _transactionsHistory: ArkTransaction[] = [];
  private _privateKeyCache = '';
  private _boardingUtxos: ExtendedCoin[] = [];

  constructor() {
    super();
    Object.defineProperty(this, '_wallet', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swapClient', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swapRepository', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_namespaceCache', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swapRecords', { value: [], writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_swaps', { value: new Map(), writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_outcomes', { value: new Map(), writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_markets', { value: [], writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_acceptedInvoiceMap', { value: new Map(), writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_recordsRefreshInFlight', { value: null, writable: true, enumerable: false, configurable: true });
  }

  /**
   * Drops legacy Boltz-era keys restored from an old encrypted blob.
   * `AbstractWallet.fromJson` copies every stored key onto a fresh instance
   * with no schema, so a Boltz-era blob restores `_swapHistory`, `_limitMin`,
   * `_limitMax`, `_feePercentage`, `_submarineFeePercentage` and
   * `_submarineMinerFees` as stray enumerable properties — and the next
   * `Object.assign` would write them straight back out. Runs on the live
   * wallet immediately before the clone; one save cycle and the blob is
   * clean.
   */
  prepareForSerialization(): void {
    for (const key of [
      '_swapHistory',
      '_limitMin',
      '_limitMax',
      '_feePercentage',
      '_submarineFeePercentage',
      '_submarineMinerFees',
      '_feesLoaded',
    ]) {
      if (key in this) delete (this as any)[key];
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
      await this._ensureMarkets();
      await this.refreshSwapCaches();
      return;
    }

    let inFlight = initInFlight.get(namespace);
    if (!inFlight) {
      inFlight = (async () => {
        const realm = await getArkadeRealm(namespace);
        const walletRepository = new RealmWalletRepository(realm as any);
        const contractRepository = new RealmContractRepository(realm as any);
        const repository = new RealmAssetSwapRepository(realm as any);

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
          delegateProvider,
        });
        staticWalletCache[namespace] = wallet;
        mm.end();

        // One filtered market set feeds the client snapshot and the limits
        // UI alike (see arkade-markets.ts). Discovery failure is not fatal
        // here: the client resolves against an empty snapshot and quotes
        // surface the refusal, while a later refresh heals silently.
        let markets: DiscoveredMarket[] = [];
        try {
          markets = await discoverMarkets({ repository, network: this._network });
        } catch (e: any) {
          console.log('[ARK] market discovery failed during init:', e?.message ?? e);
        }

        // No covclaimd deployment exists yet (release prerequisite,
        // infrastructure work outside this repository): the field stays
        // `undefined`, the package's own ephemeral self-claim seal. Passing
        // a real compressed-hex deployment key here is what turns delegated
        // claim on. `emulatorPubkey: undefined` on mainnet takes the
        // package's own pin. No server URL anywhere: the wallet is the
        // operator seam.
        const swapClient = makeSwapClient({ wallet: wallet as any, repository, markets });
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

    this._subscribeToSwapEvents(swapClient);
    this._attachRecordListener(namespace);
    await this._ensureMarkets();
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

  private async _ensureMarkets(): Promise<void> {
    if (this._markets.length > 0) return;
    if (!this._swapRepository) return;
    try {
      this._markets = await discoverMarkets({ repository: this._swapRepository, network: this._network });
    } catch (e: any) {
      console.log('[ARK] market discovery refresh failed:', e?.message ?? e);
    }
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
      const repository = this._swapRepository as any;
      const realm = (repository as any)?.realm ?? (repository as any)?._realm;
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

  /** Re-read the repository half of the join. Converges even when a save was deferred or rejected once. */
  async refreshSwapRecords(): Promise<void> {
    if (!this._swapRepository) return;
    if (this._recordsRefreshInFlight) return this._recordsRefreshInFlight;
    this._recordsRefreshInFlight = (async () => {
      try {
        const records = await this._swapRepository!.getAllSwapRecords();
        this._swapRecords = (records as SwapRecord[]).filter(r => r.family === 'rfq') as CorridorSwapRecord[];
      } catch (e: any) {
        console.log('[ARK] refreshSwapRecords failed:', e?.message ?? e);
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
      this._swaps.clear();
      this._outcomes.clear();
      for (const swap of swaps) {
        this._swaps.set(swap.id, swap);
        this._outcomes.set(swap.id, swap.outcome);
      }
    } catch (e: any) {
      console.log('[ARK] refreshSwapStatuses failed:', e?.message ?? e);
    }
  }

  async refreshSwapCaches(): Promise<void> {
    await Promise.all([this.refreshSwapRecords(), this.refreshSwapStatuses()]);
  }

  private _subscribeToSwapEvents(swapClient: SwapClient) {
    // Subscribing replays the current outcome of every known swap and then
    // streams transitions, so the existing "refresh balance + history on a
    // swap event" handler maps over directly. `onUpdate` is authoritative
    // about the outcome it carries and needs nothing from disk — the record
    // half refreshes on the after-write signal, not here.
    try {
      swapClient.onUpdate(update => {
        try {
          if (this._swapClient !== swapClient) return; // stale subscription after onDelete
          this._swaps.set(update.swap.id, update.swap);
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
            } catch (e: any) {
              console.log('[ARK] swap-event refresh failed:', e?.message ?? e);
            }
          })().catch(() => {});
        } catch (e: any) {
          console.log('[ARK] swap-event handler failed:', e?.message ?? e);
        }
      });
    } catch {
      // Client without a drive (tests) — history refresh stays manual.
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
  // Swap reads: three lookups, three keys. All read the record cache directly,
  // never the display list (a settled swap's row keeps its `swap-` identity,
  // but the answer must not depend on how the display list coalesces).
  // ---------------------------------------------------------------------------

  /** Swap -> outcome, from Phase 2's cached map. */
  getSwapOutcome(id: string): Outcome | undefined {
    const tagged = (familyOfSwapId(id) ? id : assetSwapIdOf('rfq', id as any)) as AssetSwapId;
    return this._outcomes.get(tagged);
  }

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
    const receive = isReceiveKind(record.kind);
    const direction = receive ? 1 : -1;
    const leg = (receive ? record.take : record.give) as { amount: string };
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
      direction: direction as -1 | 1,
      bolt11,
      paymentHash: (record as any)?.lock?.hash ?? '',
      expiresAt,
      createdAt: record.createdAt,
      refundLocktime: (record as any)?.refundLocktime,
      fundingTxid: (record as any)?.fundingTxid,
      refundTxid: (record as any)?.refundTxid,
      failure: (record as any)?.failure,
      blockedReason: (record as any)?.blockedReason,
      record,
    };
  }

  /**
   * Invoice -> swap ("did we generate this invoice?"). Receive-only, matching
   * today's semantics. Joins on `lock.hash` — `sha256(P)` on both legs, equal
   * to the invoice's payment hash — because hex is canonical where a bolt11
   * string is not (bech32 is case-insensitive, and the string round-trips
   * through the record store). Falls back to a case-insensitive bolt11 scan
   * when the invoice cannot be decoded.
   */
  isInvoiceGeneratedByWallet(paymentRequest: string) {
    // "Did we generate this invoice?" is a swap-history question: receives
    // are the invoices we create. Check the cached records directly so the
    // answer is independent of how the display list coalesces a settled swap.
    let paymentHash = '';
    try {
      paymentHash = this.decodeInvoice(paymentRequest)?.payment_hash ?? '';
    } catch {}
    const normalized = paymentRequest.trim().toLowerCase();
    return this._swapRecords.some(record => {
      if (!isReceiveKind(record.kind)) return false;
      if (paymentHash) {
        const lockHash = ((record as any)?.lock?.hash ?? '') as string;
        if (lockHash && lockHash.toLowerCase() === paymentHash.toLowerCase()) return true;
      }
      const bolt11 = recordBolt11(record);
      return !!bolt11 && bolt11.trim().toLowerCase() === normalized;
    });
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
   *    across the whole in-flight window, and an unpaid or `lapsed` receive
   *    never has a transaction of ours at all. The record-derived row covers
   *    both. Amount is the swap's (give leg for a send, take leg for a
   *    receive), timestamp the record's `createdAt`, so a row neither moves
   *    nor changes identity when evidence arrives. Terminal swaps keep their
   *    rows: a refund returns the money through a transaction that nets to
   *    zero the same way, so dropping terminal records would make a payment
   *    vanish at the moment it comes back.
   *
   * Stable row ids survive status transitions: `boarding-<txid>`,
   * `boarding-utxo-<txid>:<vout>`, `ark-<arkTxid|commitmentTxid>`,
   * `swap-rfq:<quoteId>`.
   *
   * Hidden states: unpaid receives (`open`) with no payment in flight are
   * dropped unless `includeUnpaidInvoices` — display-only, so a just-created
   * invoice stays discoverable by the receive-screen poll and the clipboard
   * heuristic. `getUserInvoices()` and `isInvoiceGeneratedByWallet()` call
   * with `includeUnpaidInvoices=true`.
   *
   * Settlement signal is `LightningTransaction.ispaid`; we never invent a
   * `confirmations` field for an LN/Ark row.
   */
  getTransactions(includeUnpaidInvoices = false): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const ret: any[] = [];

    // Pass 1 — base rows from the SDK transaction history (single source of
    // truth). `key.boardingTxid` is set only on boarding outputs, so it is an
    // exclusive refill discriminator; every other entry is a native Ark leg a
    // swap may later suppress.
    type NativeLeg = { row: any; idKey: string; consumed: boolean };
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
      const anyRecord = record as any;
      if (anyRecord.fundingTxid) txids.push(anyRecord.fundingTxid);
      if (anyRecord.refundTxid) txids.push(anyRecord.refundTxid);
      const spends = anyRecord.lockupSpendTxids;
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
      const receive = isReceiveKind(record.kind);
      const direction = receive ? 1 : -1;

      let memo = '';
      const bolt11invoice = recordBolt11(record);
      let paymentHash = ((record as any)?.lock?.hash ?? '') as string;
      let expiry = 3600;
      try {
        if (bolt11invoice) {
          const invoiceDetails = this.decodeInvoice(bolt11invoice);
          if (!paymentHash) paymentHash = invoiceDetails.payment_hash ?? '';
          if (invoiceDetails.description) memo = invoiceDetails.description;
          if (invoiceDetails.expiry) expiry = invoiceDetails.expiry;
        }
      } catch {}

      // Amount is the swap's, not a net of its transactions: the give leg
      // for a send, the take leg for a receive. A refunded send's member
      // transactions net to zero, and a zero-amount row would read as
      // "nothing happened" when what happened is "you tried to pay and the
      // money came back".
      const leg = (receive ? record.take : record.give) as { amount: string };
      const absValue = atomicDecimalToSats(leg?.amount ?? '0');
      const value = absValue * direction;
      const timestamp = record.createdAt;

      let type: 'user_invoice' | 'payment_request' | 'paid_invoice';
      let memoPrefix = '';
      let ispaid = false;

      if (receive) {
        type = 'user_invoice';
        if (!memo || memo === 'Send to Arkade address') memo = 'Received via Arkade';
        if (SETTLED_OUTCOMES.has(outcome)) {
          ispaid = true;
        } else if (REFUNDED_OUTCOMES.has(outcome)) {
          // Unreachable for receives (the trader funds nothing), kept for
          // symmetry with the status table.
          memoPrefix = 'Refunded: ';
        } else if (FAILED_OUTCOMES.has(outcome)) {
          // `lapsed` = the solver took the lockup back; the incoming payment
          // never arrived. Say it out loud: every non-claim leaf on a
          // receive leg is the solver's.
          memoPrefix = 'Failed: ';
        } else if (outcome === 'needs_recovery') {
          // Receives hold no trader funds; recovery here is diagnosis.
          memoPrefix = '';
        }
        // `open` = invoice shown and unpaid. Hidden from the history list
        // unless explicitly asked (display-only drop — registry callers pass
        // includeUnpaidInvoices=true).
        if (!includeUnpaidInvoices && outcome === 'open' && !ispaid && memoPrefix === '') continue;
      } else {
        if (SETTLED_OUTCOMES.has(outcome)) {
          ispaid = true;
          type = 'paid_invoice';
        } else if (REFUNDED_OUTCOMES.has(outcome)) {
          memoPrefix = 'Refunded: ';
          type = 'payment_request';
        } else if (FAILED_OUTCOMES.has(outcome)) {
          memoPrefix = 'Failed: ';
          type = 'payment_request';
        } else {
          type = 'payment_request';
        }
      }

      const settlingTxid = ((record as any)?.refundTxid ?? (record as any)?.fundingTxid) as string | undefined;

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
        payment_preimage: (record as any)?.settlementPreimageHex,
        expire_time: expiry,
        ...(settlingTxid ? { settlingTxid } : {}),
      });
    }

    return ret;
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

  // ---------------------------------------------------------------------------
  // Limits and fees. The bounds and the fee rate live on the discovered card,
  // read live — never from a constant. A disabled side (`sideLimits` -> null)
  // means the flow is unavailable, and the UI must say that rather than
  // showing an impossible range.
  // ---------------------------------------------------------------------------

  private _marketForSide(side: 'base' | 'quote'): DiscoveredMarket | undefined {
    for (const market of this._markets) {
      try {
        if (sideLimits(market as any, side)) return market;
      } catch {}
    }
    return undefined;
  }

  /** Send-leg (Lightning / quote side) bounds in sats, or null when disabled. */
  getSendLimits(): { min: number; max: number } | null {
    const market = this._marketForSide('quote');
    if (!market) return null;
    try {
      const limits = sideLimits(market as any, 'quote');
      if (!limits) return null;
      return { min: Number(limits.min), max: Number(limits.max) };
    } catch {
      return null;
    }
  }

  /** Receive-leg (arkade / base side) bounds in sats, or null when disabled. */
  getReceiveLimits(): { min: number; max: number } | null {
    const market = this._marketForSide('base');
    if (!market) return null;
    try {
      const limits = sideLimits(market as any, 'base');
      if (!limits) return null;
      return { min: Number(limits.min), max: Number(limits.max) };
    } catch {
      return null;
    }
  }

  /**
   * Estimated swap fee in sats for paying a Lightning invoice of
   * `amountSats` (Arkade -> Lightning): synchronous off the card's `fee_bps`
   * plus the card's flat fee where one is advertised. Returns `undefined`
   * until discovery has run — call `ensureLightningFeesLoaded()` first. The
   * exact fee comes from the real quote at the confirm step.
   */
  getSubmarineFeeEstimate(amountSats: number): number | undefined {
    const market = this._marketForSide('quote');
    if (!market) return undefined;
    const feeBps = Number((market as any)?.fee_bps ?? NaN);
    if (!Number.isFinite(feeBps)) return undefined;
    const serviceFee = Math.ceil((amountSats * feeBps) / 10_000);
    let flat = 0;
    const feeFlat = (market as any)?.fee_flat;
    if (feeFlat !== undefined && feeFlat !== null && feeFlat !== '') {
      try {
        flat = Number(BigInt(String(feeFlat)));
      } catch {
        flat = 0;
      }
    }
    return serviceFee + flat;
  }

  /** Warm the cached market set so getSubmarineFeeEstimate() returns a value. */
  async ensureLightningFeesLoaded(): Promise<void> {
    if (this._markets.length > 0) return;
    await this.init(); // guarantees the swap client is set (or throws)
    // init() can return without markets, so refresh explicitly if still cold.
    if (this._markets.length === 0) await this._ensureMarkets();
  }

  // ---------------------------------------------------------------------------
  // Send: quote-then-accept, never the `pay` verb.
  //
  // The user confirmed a number, and the verb re-quotes internally and would
  // fund whatever came back. `accept()` is funding, not settlement: it
  // returns once the record is durable, so the send leg awaits `paid` (or a
  // terminal outcome) on the client's own event stream before reporting
  // success. That is a read of the client's events, not a status poller.
  // ---------------------------------------------------------------------------

  private _invoiceKey(invoice: string): string {
    return invoice.trim().toLowerCase();
  }

  /**
   * A live swap already accepted for this bolt11, if any — consulted before
   * re-quoting the same invoice, with `client.swaps()` as the restart-safe
   * read. A retry path that starts again at `quote()` locks funds twice.
   */
  async findLiveSwapForInvoice(invoice: string): Promise<AssetSwapId | undefined> {
    const key = this._invoiceKey(invoice);
    const known = this._acceptedInvoiceMap.get(key);
    const liveIds = new Set<AssetSwapId>();
    try {
      if (this._swapClient) {
        for (const swap of await this._swapClient.swaps()) liveIds.add(swap.id);
      }
    } catch {}
    if (known && (liveIds.size === 0 || liveIds.has(known))) {
      const outcome = this._outcomes.get(known);
      if (outcome && (SETTLED_OUTCOMES.has(outcome) || REFUNDED_OUTCOMES.has(outcome) || FAILED_OUTCOMES.has(outcome))) {
        this._acceptedInvoiceMap.delete(key);
        return undefined;
      }
      return known;
    }
    // Restart-safe: the map is in-process, the swaps are not. Match the
    // invoice against known send records.
    const normalized = invoice.trim().toLowerCase();
    for (const record of this._swapRecords) {
      if (isReceiveKind(record.kind)) continue;
      const bolt11 = recordBolt11(record);
      if (bolt11 && bolt11.trim().toLowerCase() === normalized) {
        const swapId = assetSwapIdOf(record.family, record.id);
        const outcome = this._outcomes.get(swapId);
        if (!outcome || (!SETTLED_OUTCOMES.has(outcome) && !REFUNDED_OUTCOMES.has(outcome) && !FAILED_OUTCOMES.has(outcome))) {
          this._acceptedInvoiceMap.set(key, swapId);
          return swapId;
        }
      }
    }
    return undefined;
  }

  /**
   * Quote a Lightning invoice for the confirm step: the screen displays the
   * total, the fee and the expiry from the returned object, then passes THAT
   * object to `payQuotedInvoice`. A held `Quote` carries `bigint` amounts —
   * keep it in screen state, never on `this` as an enumerable field. It
   * binds one invoice, one wallet and a deadline: wallet switches and
   * destination changes must drop it, and past `quote.expiresAt` the client
   * throws `QuoteExpired` (the client never re-quotes) — expiry is a UI
   * state (re-quote and re-confirm), not an error to alert on.
   */
  async quoteInvoice(invoice: string): Promise<Quote> {
    if (!this._swapClient) await this.init();
    if (!this._swapClient) throw new Error('Swap client not initialized');

    // Our own gates first: contacting a solver with an invoice that cannot
    // be paid burns a quote and leaks the invoice for nothing.
    let facts;
    try {
      facts = toInvoiceFacts(invoice, 'bitcoin');
    } catch (e: any) {
      if (e instanceof InvoiceRejected) throw new Error(e.message);
      throw e;
    }

    const limits = this.getSendLimits();
    if (!limits) throw new Error('Lightning send is unavailable for this solver right now');
    if (facts.amountSats < limits.min) throw new Error(`Minimum you can send is ${limits.min} sat`);
    if (facts.amountSats > limits.max) throw new Error(`Maximum you can send is ${limits.max} sat`);

    const live = await this.findLiveSwapForInvoice(invoice);
    if (live) throw new Error(`This invoice already has a live swap (${live}). Wait for its outcome instead of quoting again.`);

    // The offline pre-disclosure read: what the active snapshot would serve
    // with no round trip and no invoice disclosed. A refusal for a knowable
    // reason surfaces here, before quote().
    try {
      await this._swapClient.resolve({ to: invoice });
    } catch (e: any) {
      throw new Error(e?.message ?? String(e));
    }

    return this._swapClient.quote({ to: invoice });
  }

  /**
   * Accept exactly the quoted object — never a re-quote. Where one quote is
   * displayed and then accepted unchanged a fee ceiling is redundant; it is
   * load-bearing on the re-quote paths (expiry-then-retry, the one-shot
   * `payInvoice`), which carry `feeCeiling` derived from the number last
   * shown. Refusal is free: nothing has been funded yet.
   */
  async payQuotedInvoice(quote: Quote, feeCeilingSats?: number): Promise<void> {
    if (!this._swapClient || !this._swapRepository) await this.init();
    if (!this._swapClient || !this._swapRepository) throw new Error('Swap client not initialized');

    if (feeCeilingSats !== undefined && quote.fee?.amount !== undefined) {
      const feeSats = Number(quote.fee.amount);
      if (feeSats > feeCeilingSats) {
        throw new Error(`Swap fee ${feeSats} sats exceeds the confirmed maximum of ${feeCeilingSats} sats`);
      }
    }

    const swap = await this._swapClient.accept(quote);
    const swapId = swap.id;
    const takeInstrument = (quote as any)?.route?.take?.instrument;
    const bolt11 = typeof takeInstrument?.bolt11 === 'string' ? takeInstrument.bolt11 : undefined;
    if (bolt11) this._acceptedInvoiceMap.set(this._invoiceKey(bolt11), swapId);
    await this.refreshSwapStatuses();

    const outcome = await this._awaitSettlement(swapId);
    if (outcome !== 'paid') {
      throw new Error(this._sendFailureMessage(outcome, swapId));
    }

    const preimageHex = await this._settlementPreimage(swapId);
    let paymentHash = '';
    try {
      const record = await this._swapRepository.getSwapRecord(quoteIdOfSwapId(swapId));
      paymentHash = ((record as any)?.lock?.hash ?? '') as string;
    } catch {}
    if (!paymentHash && bolt11) {
      try {
        paymentHash = this.decodeInvoice(bolt11)?.payment_hash ?? '';
      } catch {}
    }
    this.last_paid_invoice_result = {
      payment_preimage: preimageHex,
      payment_hash: paymentHash,
      payment_request: bolt11 ?? '',
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

  /** Await `paid` (or a terminal outcome) on the client's own event stream. */
  private _awaitSettlement(swapId: AssetSwapId): Promise<Outcome> {
    const client = this._swapClient;
    if (!client) return Promise.reject(new Error('Swap client not initialized'));
    const current = this._outcomes.get(swapId);
    if (
      current &&
      (SETTLED_OUTCOMES.has(current) || REFUNDED_OUTCOMES.has(current) || FAILED_OUTCOMES.has(current) || current === 'needs_recovery')
    ) {
      return Promise.resolve(current);
    }
    return new Promise<Outcome>((resolve, reject) => {
      let unsubscribe: (() => void) | undefined;
      const done = (outcome: Outcome) => {
        try {
          unsubscribe?.();
        } catch {}
        resolve(outcome);
      };
      try {
        unsubscribe = client.onUpdate(update => {
          if (update.swap.id !== swapId) return;
          const outcome = update.outcome;
          if (
            SETTLED_OUTCOMES.has(outcome) ||
            REFUNDED_OUTCOMES.has(outcome) ||
            FAILED_OUTCOMES.has(outcome) ||
            outcome === 'needs_recovery'
          ) {
            done(outcome);
          }
        });
        // The subscription replays the current outcome of every known swap,
        // so a swap that settled between accept() and subscribe() resolves
        // on replay rather than hanging.
      } catch (e: any) {
        reject(e);
      }
    });
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
      const record = (await this._swapRepository?.getSwapRecord(quoteIdOfSwapId(swapId))) as any;
      if (record?.settlementPreimageHex) return record.settlementPreimageHex as string;
      if (record && this._wallet) {
        const swapPkScript = record.lockupPkScript;
        const paymentHash = record?.lock?.hash;
        if (swapPkScript && paymentHash) {
          try {
            const indexer = (await this._wallet.getArkadeReader()) as any;
            const fate = await readLockupFate(indexer, { swapPkScript: hexToUint8Array(swapPkScript), paymentHash });
            if (fate?.fate === 'claimed' && (fate as any)?.preimage) {
              const preimage = (fate as any).preimage as Uint8Array;
              return uint8ArrayToHex(preimage);
            }
          } catch (e: any) {
            console.log('[ARK] preimage backfill read failed:', e?.message ?? e);
          }
        }
      }
    } catch (e: any) {
      console.log('[ARK] settlement preimage read failed:', e?.message ?? e);
    }
    return undefined;
  }

  /**
   * One-shot send for callers that cannot confirm (LNURL). Quotes, bounds
   * the quote by a ceiling derived from the last shown number — the
   * synchronous estimate plus a stated tolerance — and accepts. Refusal
   * funds nothing and names both numbers.
   */
  async payInvoice(invoice: string, freeAmount: number = 0) {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');

    if (this.isAddressValid(invoice)) {
      // its an ark address, so we need to do native ark-to-ark transfer
      await this._wallet.send({
        address: invoice,
        amount: freeAmount,
      });
      return;
    }

    if (!this._swapClient) throw new Error('Swap client not initialized');

    const live = await this.findLiveSwapForInvoice(invoice);
    if (live) {
      const outcome = await this._awaitSettlement(live);
      if (outcome !== 'paid') throw new Error(this._sendFailureMessage(outcome, live));
      const preimageHex = await this._settlementPreimage(live);
      let paymentHash = '';
      try {
        paymentHash = this.decodeInvoice(invoice)?.payment_hash ?? '';
      } catch {}
      this.last_paid_invoice_result = {
        payment_preimage: preimageHex,
        payment_hash: paymentHash,
        payment_request: invoice,
      };
      return;
    }

    let facts;
    try {
      facts = toInvoiceFacts(invoice, 'bitcoin');
    } catch (e: any) {
      if (e instanceof InvoiceRejected) throw new Error(e.message);
      throw e;
    }

    const limits = this.getSendLimits();
    if (!limits) throw new Error('Lightning send is unavailable for this solver right now');
    if (facts.amountSats < limits.min) throw new Error(`Minimum you can send is ${limits.min} sat`);
    if (facts.amountSats > limits.max) throw new Error(`Maximum you can send is ${limits.max} sat`);

    const quote = await this._swapClient.quote({ to: invoice });

    // Fee ceiling derived from the number last shown: the synchronous
    // estimate plus tolerance. The client-wide policy does not cover the
    // direct quote/accept path, so the check is inline.
    const estimate = this.getSubmarineFeeEstimate(facts.amountSats);
    let ceiling: number | undefined;
    if (estimate !== undefined) {
      ceiling = estimate + Math.max(10, Math.ceil(estimate * 0.5));
      const feeSats = Number(quote.fee?.amount ?? 0n);
      if (feeSats > ceiling) {
        throw new Error(`Swap fee ${feeSats} sats exceeds the estimated maximum of ${ceiling} sats`);
      }
    }

    await this.payQuotedInvoice(quote, ceiling);
  }

  async getUserInvoices(): Promise<LightningTransaction[]> {
    await this.fetchTransactions();
    const txs = this.getTransactions(true);
    return txs.filter(tx => tx.value! > 0);
  }

  /**
   * Receive: `client.receive` pins the TAKE leg — the trader is credited
   * `amount` and the payer is shown `give.amount`, fee included — so there
   * is no service fee to pre-add to the requested amount. The returned
   * artifact's bolt11 is the solver's hold invoice. The claim is the
   * client's: the drive claims the lockup, so no screen-driven claim effect.
   * The receive screen watches the swap's outcome instead — `lapsed` is the
   * outcome said out loud, since on a receive leg every non-claim leaf is
   * the solver's and the payment never arrived.
   */
  async addInvoice(amt: number, memo: string) {
    if (!this._swapClient) await this.init();
    if (!this._swapClient) throw new Error('Swap client not initialized');

    const limits = this.getReceiveLimits();
    if (!limits) throw new Error('Lightning receive is unavailable for this solver right now');
    if (!(amt > limits.min - 1 && amt < limits.max + 1)) {
      if (amt <= limits.min) throw new Error(`Minimum to receive is ${limits.min} sat`);
      throw new Error(`Maximum to receive is ${limits.max} sat`);
    }

    const request = await this._swapClient.receive({ amount: BigInt(amt), via: 'lightning' });
    await this.refreshSwapCaches();

    const artifact = (request as any)?.artifact as { bolt11?: string } | undefined;
    const bolt11 = artifact?.bolt11;
    if (!bolt11) throw new Error('Solver did not return a Lightning invoice');
    return bolt11;
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
    const tagged = (familyOfSwapId(swapId) ? swapId : assetSwapIdOf('rfq', swapId as any)) as AssetSwapId;
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
    try {
      if (!this._swapClient || !this._swapRepository) await this.init();
    } catch (e: any) {
      return { safe: false, message: `Cannot verify swap state while offline: ${e?.message ?? e}` };
    }
    if (!this._swapClient || !this._swapRepository || !this._wallet) {
      return { safe: false, message: 'Cannot verify swap state while offline' };
    }
    await this.refreshSwapCaches();

    const unsafe: ArkSwapView[] = [];
    for (const view of this.getSwapViews()) {
      if (isReceiveKind(view.kind)) continue;
      if (SAFE_SEND_OUTCOMES.has(view.outcome)) continue;
      unsafe.push(view);
    }
    if (unsafe.length === 0) return { safe: true };
    if (force) return { safe: true };

    let indexer: any;
    try {
      indexer = (await this._wallet.getArkadeReader()) as any;
    } catch (e: any) {
      return {
        safe: false,
        message: `Cannot verify ${unsafe.length} pending Lightning swap(s) while offline. Let them settle first, or delete anyway knowing the funds may become unrecoverable.`,
      };
    }

    for (const view of unsafe) {
      const swapPkScript = (view.record as any)?.lockupPkScript;
      const paymentHash = (view.record as any)?.lock?.hash;
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
      } catch (e: any) {
        return { safe: false, message: `Cannot verify pending Lightning swaps while offline: ${e?.message ?? e}` };
      }
    }
    return { safe: true };
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
    this._swaps = new Map();
    this._outcomes = new Map();
    this._markets = [];
    this._acceptedInvoiceMap = new Map();
    delete staticWalletCache[namespace];
    delete staticSwapClientCache[namespace];
    delete staticSwapRepositoryCache[namespace];
    initInFlight.delete(namespace);

    // Type guards: real SDK objects always have dispose; unit-test stubs may not.
    try {
      if (cachedClient && typeof (cachedClient as any)[Symbol.asyncDispose] === 'function') {
        await (cachedClient as any)[Symbol.asyncDispose]();
      }
    } catch (e: any) {
      console.log(`[LightningArkWallet] swapClient.dispose failed for ${namespace}:`, e?.message ?? e);
    }
    try {
      if (typeof (cachedWallet as any)?.dispose === 'function') await (cachedWallet as any).dispose();
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
