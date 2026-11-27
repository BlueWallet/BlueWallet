/**
 * Base class for Neurai wallets.
 *
 * Wraps `@neuraiproject/neurai-jswallet` (key derivation, address scanning,
 * transaction building) and delegates all network access to a `NeuraiBackend`
 * (RPC today, ElectrumX in the future). Subclasses fix the chain kind
 * (`legacy` ECDSA vs `pq` ML-DSA-44).
 *
 * Persistence shape: extends `AbstractWallet` so `class/blue-app.ts` keeps
 * deserializing wallets via `fromJson` without changes. The engine and
 * backend are runtime-only and marked non-enumerable so they never end up in
 * the persisted JSON.
 */

import { InteractionManager } from 'react-native';
import NeuraiJsWallet from '@neuraiproject/neurai-jswallet';
import NeuraiKey, { type HDKey } from '@neuraiproject/neurai-key';
import { getHistory } from '@neuraiproject/neurai-history-list';
import { parseRawSats, parseMoneySats, satsToXna, amountFromInput } from '../../blue_modules/neurai/amounts';
import type { AddressDelta } from '../../blue_modules/neurai/NeuraiBackend';
import {
  computeTxid,
  createPaymentTransaction,
  createStandardAssetTransferTransaction,
  decimalToSatoshis,
  decodeAddress,
  encodeDestinationScript,
  parseTransaction,
  type DecimalAmount,
} from '@neuraiproject/neurai-create-transaction';

import { markerForChain } from '../../blue_modules/neurai/assetMarker';
import { sign as signNeuraiTransaction } from '@neuraiproject/neurai-sign-transaction';
import { checkCode, createOutputs, decodeWIF, type DerivedOutput } from '@neuraiproject/neurai-silent-payments';
import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';
import * as bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';

import {
  CHAIN_PARAMS,
  DEFAULT_NETWORK,
  NeuraiChainType,
  NeuraiNetwork,
  WalletKind,
  chainFor,
  createDefaultBackend,
  isOverridesLoaded,
  loadOverrides,
  isKindAvailable,
  isTestnetChain,
  kindOfChain,
  type NeuraiBackend,
} from '../../blue_modules/neurai';
import type { AddressChangedEvent } from '../../blue_modules/neurai/WssBackend';
import { walletIdV2 } from './wallet-id';
import { emitWalletChanged } from '../../blue_modules/neurai/eventBus';
import { LOCAL_FEE_RATE_RPC, LOCAL_FEE_RATE_XNA_PER_KB } from '../../blue_modules/neurai/feePolicy';
import { estimateNeuraiFeeSats } from '../../blue_modules/neurai/feeEstimate';
import { dustThresholdSats } from '../../blue_modules/neurai/dust';
import { looksLikeSilentPaymentCode, silentPaymentNetworkFor } from '../../blue_modules/neurai/silentPayments';
import { isSingleAddressForAll } from '../../blue_modules/neurai/addressPolicy';
import {
  ecdsaKeyNetworkFor,
  engineNetworkFor,
  legacyKeyNetworkFor,
  signerNetworkFor,
  type EngineNetwork,
} from '../../blue_modules/neurai/keyNetwork';
import { accountXpub, type ConnectAccountXpub } from '../../blue_modules/neurai/connect/xpub';
import { getAssetType, type NeuraiHeldAsset } from '../../blue_modules/neurai/assetUtils';
import { AbstractWallet } from './abstract-wallet';
import { chainedSendState, normalizeChainedSends, type ChainedSend, type ChainedSendState } from '../../blue_modules/neurai/chainedSends';
import { Transaction, Utxo } from './types';
import {
  PENDING_TX_TTL_MS,
  historyItemToTransaction,
  pendingSendEntry,
  prunePending,
  unconfirmedWithPending,
  withPendingFirst,
  type HistoryItem,
} from './neurai-history-projection';
type IDelta = AddressDelta;
type IHistoryItem = HistoryItem;

type NeuraiEngine = Awaited<ReturnType<typeof NeuraiJsWallet.createInstance>>;

/** Receive and change branch nodes of an engine's HD tree, derived once its window first grows. Runtime only. */
const branchNodes = new WeakMap<NeuraiEngine, [HDKey, HDKey]>();

const decimalToSats = (value: DecimalAmount): bigint => decimalToSatoshis(value);
const rawToSats = parseRawSats;
const FEE_TARGET_BLOCKS = 6;
const HISTORY_DELTA_BATCH_SIZE = 250;
const HISTORY_ITEM_BATCH_SIZE = 100;
const TX_CACHE_BATCH_SIZE = 100;
/** Genesis of the current testnet (reset): cached state from another one is discarded. */
const CURRENT_TESTNET_GENESIS = CHAIN_PARAMS['xna-test'].expectedGenesisHash ?? '';
/** Legacy P2PKH dust; other change types use {@link dustThresholdSats}. */
const SEND_DUST_SATS = 546n;

/** The private balance last read in a privacy pool, which the home shows until the pool is read again. */
export interface PrivacyPoolSnapshot {
  /** Pool instance (its commitment): another pool has other notes. */
  pool: string;
  /** Satoshis. */
  balanceAtomic: string;
  height: number;
  /** When it was read (ms). */
  at: number;
}

/** A reading this old is saved again even if the balance did not change, so "seen" stays close after a restart. */
const PRIVACY_POOL_RESAVE_MS = 10 * 60 * 1000;

/** One derived address as the addresses screen lists it. */
export interface NeuraiAddressEntry {
  address: string;
  /** Derivation index within its branch. */
  index: number;
  /** On the change branch (Legacy and ECDSA; PQ wallets have one chain). */
  change: boolean;
}

/** Most receive (and change) addresses the addresses screen derives on request. */
export const MAX_LISTED_ADDRESSES = 100;

/** Transaction ids per address in `deltas`, each once, in history order. */
const txidsByAddress = (deltas: IDelta[]): Record<string, string[]> => {
  const sets = new Map<string, Set<string>>();
  for (const d of deltas) {
    let txids = sets.get(d.address);
    if (!txids) sets.set(d.address, (txids = new Set()));
    txids.add(d.txid);
  }
  const out: Record<string, string[]> = {};
  sets.forEach((txids, address) => {
    out[address] = [...txids];
  });
  return out;
};

/** Minimal UTXO shape we need for selection / signing (matches engine `IUTXO`). */
export interface SpendableUtxo {
  txid: string;
  outputIndex: number;
  satoshis: bigint;
  address: string;
  assetName: string;
  script: string;
}

/** A coin the user can pick to spend (coin control). */
export type WalletCoin = SpendableUtxo & { height: number };

/** Where a payment goes: a silent payment code, whose address the inputs
 * derive, or a plain address. */
export type PaymentDestination = { code: string } | { address: string };

/** Output of a transaction that pays silent payment codes. */
export type SilentPaymentOutput = PaymentDestination & { valueSats: bigint };

/**
 * The XNA coins of `utxos` a send can use, largest first: neither empty nor
 * spent by a transaction in `mempool`.
 */
export function spendableCoins(
  utxos: Array<SpendableUtxo & { height?: number }>,
  mempool: Array<{ prevtxid: string; prevout: number }>,
): WalletCoin[] {
  const spentInMempool = new Set(mempool.map(m => `${m.prevtxid}:${m.prevout}`));
  return utxos
    .filter(u => (u.assetName === 'XNA' || !u.assetName) && u.satoshis > 0n && !spentInMempool.has(`${u.txid}:${u.outputIndex}`))
    .map(u => ({
      ...u,
      assetName: 'XNA',
      // The wallet service sends no scripts; the signer needs the prevout's.
      script: u.script || Buffer.from(encodeDestinationScript(u.address)).toString('hex'),
      height: u.height ?? 0,
    }))
    .sort((a, b) => (a.satoshis === b.satoshis ? 0 : a.satoshis < b.satoshis ? 1 : -1));
}

/** Greedy UTXO selection: accumulate until `neededSats` is covered. Throws if the
 * pool can't cover it. */
function selectUtxosForSats<T extends { satoshis: bigint }>(utxos: T[], neededSats: bigint): T[] {
  const selected: T[] = [];
  let sum = 0n;
  for (const u of utxos) {
    if (sum >= neededSats) break;
    selected.push(u);
    sum += u.satoshis;
  }
  if (sum < neededSats) throw new Error(`Insufficient funds — need ${neededSats} sats, have ${sum}`);
  return selected;
}

const yieldToEventLoop = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Build a human-readable string from a backend/RPC error. `@neuraiproject/neurai-rpc`
 * rejects node errors as `{ status, statusText, description, error: { code, message } }`
 * with NO `.message` of its own, so a naive `err.message` is empty — which is exactly
 * why the WSS service collapses node rejections to a useless "broadcast failed". Pull
 * the real reason out of `error` / `description` here.
 */
/**
 * The node's two NIP-040 rejections, and what each one actually means.
 *
 * The app picks the asset marker from a table (`markerForChain`), which states
 * something about the chain without looking at it. When the table and the node
 * disagree the rejection is a bare consensus code, so it gets translated here
 * — the cause is not something a user could guess from
 * "bad-txns-asset-marker-before-nip040".
 *
 * Both directions are covered because both are reachable:
 *
 *   before-nip040  the node has NOT activated the migration yet and we sent
 *                  `xna`. On testnet that means a node still syncing towards
 *                  block 303000. Waiting fixes it.
 *   after-nip040   the node HAS activated and we sent `rvn`. That is a bug in
 *                  the app, not a node problem: some build path is missing its
 *                  `assetMarker`.
 */
function explainAssetMarkerRejection(text: string): string | null {
  if (/bad-txns-asset-marker-before-nip040/i.test(text)) {
    return (
      'The node has not activated the NIP-040 asset migration yet, but this wallet built the ' +
      'transaction with the new "xna" marker. The node is most likely still syncing — on testnet ' +
      'the migration activates at block 303000. Wait for it to catch up, or point the wallet at an ' +
      'updated node, and try again.'
    );
  }
  if (/bad-txns-legacy-asset-marker-after-nip040/i.test(text)) {
    return (
      'The node requires the new "xna" asset marker but this transaction was built with the legacy ' +
      '"rvn" one. This is an app bug rather than a node problem: some asset build path is not ' +
      'passing its assetMarker. Please report it.'
    );
  }
  return null;
}

export function describeBackendError(e: unknown): string {
  if (e == null) return 'unknown error';
  const o = e as Record<string, unknown>;
  const parts: string[] = [];
  if (o.description) parts.push(`description=${String(o.description)}`);
  if (o.error) parts.push(`error=${typeof o.error === 'string' ? o.error : JSON.stringify(o.error)}`);
  if (o.status != null) parts.push(`status=${String(o.status)}`);
  if (o.statusText) parts.push(`statusText=${String(o.statusText)}`);
  if (o.message) parts.push(`message=${String(o.message)}`);
  if (o.code != null) parts.push(`code=${String(o.code)}`);
  if (o.type) parts.push(`type=${String(o.type)}`);
  if (parts.length === 0) {
    try {
      return JSON.stringify(o);
    } catch {
      return String(o);
    }
  }
  const detail = parts.join(' | ');
  // Prepend the explanation but keep the raw reason: whoever reads a bug
  // report still needs the node's own words.
  const explained = explainAssetMarkerRejection(detail);
  return explained ? `${explained} (${detail})` : detail;
}

/** Normalize the library's JSON-safe amounts at the wallet boundary. */
const getHistoryItem = (deltas: IDelta[], baseCurrency: string): IHistoryItem => {
  const [item] = getHistory(deltas, baseCurrency);
  return {
    ...item,
    fee: satsToXna(decimalToSats(item.fee)),
    assets: item.assets.map(asset => {
      const satoshis = parseRawSats(asset.satoshis);
      return { ...asset, satoshis, value: satsToXna(satoshis) };
    }),
  };
};

const getHistoryYielding = async (deltas: IDelta[], baseCurrency: string): Promise<IHistoryItem[]> => {
  if (!deltas) {
    throw Error('Argument deltas is mandatory and cannot be nullish');
  }

  const deltasByTransactionId = new Map<string, IDelta[]>();
  for (let i = 0; i < deltas.length; i += HISTORY_DELTA_BATCH_SIZE) {
    for (const delta of deltas.slice(i, i + HISTORY_DELTA_BATCH_SIZE)) {
      const txDeltas = deltasByTransactionId.get(delta.txid) || [];
      txDeltas.push(delta);
      deltasByTransactionId.set(delta.txid, txDeltas);
    }
    if (i + HISTORY_DELTA_BATCH_SIZE < deltas.length) {
      await yieldToEventLoop();
    }
  }

  const groupedDeltas = Array.from(deltasByTransactionId.values());
  const history: IHistoryItem[] = [];
  for (let i = 0; i < groupedDeltas.length; i += HISTORY_ITEM_BATCH_SIZE) {
    history.push(...groupedDeltas.slice(i, i + HISTORY_ITEM_BATCH_SIZE).map(items => getHistoryItem(items, baseCurrency)));
    if (i + HISTORY_ITEM_BATCH_SIZE < groupedDeltas.length) {
      await yieldToEventLoop();
    }
  }

  history.sort((h1, h2) => {
    const value1 = `${h1.blockHeight}_${h1.transactionId}`;
    const value2 = `${h2.blockHeight}_${h2.transactionId}`;
    if (value1 > value2) return -1;
    if (value1 < value2) return 1;
    return 0;
  });

  return history;
};

export interface NeuraiTransactionTarget {
  address: string;
  /** Amount in XNA (full units, not satoshis). */
  amount: string;
}

export interface NeuraiBuildTransactionResult {
  /** Signed raw transaction hex, ready to broadcast. */
  signedHex: string;
  /** Signed transaction that spends an output of `signedHex`, broadcast right
   * after it (silent payments from Legacy and PQ wallets). */
  chainedHex?: string;
  /** With `chainedHex`: the ECDSA bridge address it spends from (H17 record). */
  chainedBridge?: string;
  /** Unsigned raw transaction hex (pre-signature). */
  unsignedHex: string;
  /** Total fee in XNA full units. */
  feeSats: bigint;
  /** Amount sent to the recipient, in satoshis (for display). */
  sentAmountSats: bigint;
  /** Net amount leaving the wallet, in satoshis (amount sent + fee). For an
   * asset transfer this is just the XNA fee (the recipient asset output carries
   * ~0 XNA). */
  netDebitSats: bigint;
  /** Present only for asset transfers: the asset name and amount (full units)
   * being sent. Absent for plain XNA sends. */
  asset?: { name: string; amount: string };
  /** Engine-level debug payload (inputs, outputs, change, etc.). */
  debug: unknown;
}

/**
 * Material a Neurai wallet can hand out for local message signing. Legacy
 * wallets expose a WIF; post-quantum wallets expose the 32-byte ML-DSA-44 seed
 * and the public key it expands to.
 */
export type NeuraiSigningMaterial = { kind: 'legacy'; wif: string } | { kind: 'pq'; seedKey: string; publicKey: string };

export abstract class AbstractNeuraiWallet extends AbstractWallet {
  /** Chain identifier passed to the underlying engine. Persisted. */
  network: NeuraiChainType;
  /** Optional BIP39 passphrase ("25th word"). Persisted. */
  passphrase: string;
  /** Highest derivation index the engine must reach on startup: raised when
   * the addresses screen asks for more addresses, so they stay derived and
   * watched in later sessions. Persisted. */
  addressPosition: number;
  /** Use only the first address, to receive and for the change (Legacy and
   * ECDSA; PQ wallets always do). The general setting can turn it on for
   * every wallet, see {@link usesSingleAddress}. Persisted. */
  singleAddress: boolean;
  /** Testnet genesis the cached chain state belongs to. Persisted; see {@link AbstractNeuraiWallet.fromJson}. */
  testnetGenesis: string;
  /** Highest chain tip height covered by the last successful transaction scan. Persisted. */
  _lastTxBlockHeight: number;
  /** Cached `IHistoryItem[]` for the wallet list view. Persisted to disk so
   * the UI can render history immediately on app launch, before the refresh
   * RPC round-trip completes. Replaced wholesale on each `fetchTransactions`. */
  protected _historyItems: IHistoryItem[];
  /** Cached lightweight transactions for `getTransactions()`. Persisted to
   * disk so the wallet shows its known history before the next RPC fetch.
   * Replaced wholesale on each `fetchTransactions`. */
  protected _txCache: Transaction[];
  /** Cached list of assets (tokens) this wallet holds. Persisted to disk
   * (enumerable) like `_historyItems` so the wallet card on the home screen and
   * the in-wallet Assets tab can render a count/list immediately on app launch,
   * before the next refresh. Refreshed at the end of `fetchTransactions`. */
  protected _heldAssets: NeuraiHeldAsset[];
  /** Just-broadcast outgoing sends, shown optimistically as 0-conf "pending"
   * entries and subtracted from the balance until the backend surfaces them
   * confirmed. Persisted (enumerable) like `_txCache` so a pending send
   * survives an app restart; reconciled away in `fetchTransactions` once the
   * real tx confirms, or after {@link PENDING_TX_TTL_MS}. */
  protected _pendingTxs: Transaction[];
  /** Two-step silent payments not seen complete yet (H17). Persisted with the wallet. */
  protected _chainedSends: ChainedSend[];
  /** Last `status` hash the server reported per subscribed address.
   * Persisted to disk so the next app launch can call `subscribe.bulk` and
   * skip the heavy refetch when nothing changed while the app was closed —
   * the server compares the cached value against its current state and only
   * pushes a synthetic address.changed for diffs. */
  protected _addressStatus: Record<string, string>;
  /** Ids of the confirmed transactions that touched each own address, from
   * the last history fetch: what tells a used address from a fresh one, and
   * what the screen of one address lists. `null` until the first fetch that
   * records them. Persisted. */
  protected _addressTxids: Record<string, string[]> | null;
  /** The private balance last read in the privacy pool. Persisted; forgotten with the identity. */
  _privacyPool: PrivacyPoolSnapshot | null;
  /** Mempool transactions the server pushed per address since (the history
   * has only confirmed ones); dropped as they show up confirmed. Runtime only. */
  private _pushedAddressTxids: Record<string, string[]>;
  /** Derivation indexes of the receive and the change address of a Legacy
   * or ECDSA wallet: the ones after the last that received. Persisted. */
  protected _receiveIndex: number;
  protected _changeIndex: number;
  /** First address of a Legacy or ECDSA wallet, persisted for Receive when it
   * uses only that one. */
  protected _mainAddress: string;
  /** External address at `_receiveIndex`, persisted so Receive shows it
   * without deriving the whole address window again (seconds on Hermes).
   * Empty until an engine derives it; PQ wallets answer from
   * `_addressStatus`. */
  protected _receiveAddress: string;

  /** Lazy engine + backend; created on first use, cleared on network change. */
  private _engine: NeuraiEngine | null;
  /** Bootstrap in flight, shared so concurrent first callers derive once. */
  private _enginePromise: Promise<NeuraiEngine> | null;
  private _backend: NeuraiBackend | null;
  /** Disposer for the backend's address.changed listener, if the active
   * backend supports push (only WssBackend does today). */
  private _unsubscribeBackendPush: (() => void) | null;
  /** Coalesce burst pushes so a block touching many outputs runs one refetch. */
  private _pushFetchInFlight: boolean;
  private _pushFetchPending: boolean;

  abstract get walletKind(): WalletKind;

  constructor() {
    super();
    this.network = chainFor(DEFAULT_NETWORK, 'legacy');
    this.passphrase = '';
    this.addressPosition = 0;
    this.testnetGenesis = CURRENT_TESTNET_GENESIS;
    this._lastTxBlockHeight = 0;
    this._historyItems = [];
    this._txCache = [];
    this._heldAssets = [];
    this._pendingTxs = [];
    this._chainedSends = [];
    this._addressStatus = {};
    this._addressTxids = null;
    this._pushedAddressTxids = {};
    this._privacyPool = null;
    this.singleAddress = false;
    this._receiveIndex = 0;
    this._changeIndex = 0;
    this._mainAddress = '';
    this._receiveAddress = '';
    this._engine = null;
    this._enginePromise = null;
    this._backend = null;
    this._unsubscribeBackendPush = null;
    this._pushFetchInFlight = false;
    this._pushFetchPending = false;

    // Hide non-serializable runtime caches from JSON.stringify so they never
    // end up in persisted wallet JSON. `_historyItems` and `_txCache` are
    // intentionally left enumerable — they are plain JSON-serializable and
    // we want them on disk so the UI can render previous history instantly
    // on app launch, before the next refresh RPC completes.
    Object.defineProperty(this, '_engine', { writable: true, enumerable: false, value: null });
    Object.defineProperty(this, '_enginePromise', { writable: true, enumerable: false, value: null });
    Object.defineProperty(this, '_backend', { writable: true, enumerable: false, value: null });
    Object.defineProperty(this, '_unsubscribeBackendPush', { writable: true, enumerable: false, value: null });
    Object.defineProperty(this, '_pushFetchInFlight', { writable: true, enumerable: false, value: false });
    Object.defineProperty(this, '_pushFetchPending', { writable: true, enumerable: false, value: false });
    Object.defineProperty(this, '_pushedAddressTxids', { writable: true, enumerable: false, value: {} });
  }

  /**
   * Testnet was reset with a new genesis. A testnet wallet saved for another
   * genesis keeps only its words, passphrase and label: balances, history,
   * assets, pending sends, address statuses and the scanned position all
   * describe a chain that no longer exists, so they are dropped, not migrated.
   */
  static fromJson(obj: string): AbstractWallet {
    const wallet = super.fromJson(obj) as AbstractNeuraiWallet;
    wallet._chainedSends = normalizeChainedSends(wallet._chainedSends);
    const persisted = (JSON.parse(obj) as { testnetGenesis?: unknown }).testnetGenesis;
    if (isTestnetChain(wallet.network) && persisted !== CURRENT_TESTNET_GENESIS) wallet.discardTestnetChainState();
    return wallet;
  }

  protected discardTestnetChainState(): void {
    // Their transactions belong to the chain that was reset.
    this._chainedSends = [];
    this.balance = 0n;
    this.unconfirmed_balance = 0n;
    this.addressPosition = 0;
    this._receiveIndex = 0;
    this._changeIndex = 0;
    this._receiveAddress = '';
    this._lastTxBlockHeight = 0;
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this._utxo = [];
    this._historyItems = [];
    this._txCache = [];
    this._heldAssets = [];
    this._pendingTxs = [];
    this._addressStatus = {};
    this._addressTxids = null;
    this._pushedAddressTxids = {};
    this._privacyPool = null;
    this.testnetGenesis = CURRENT_TESTNET_GENESIS;
  }

  // ---------- network / passphrase ------------------------------------------------

  setNetwork(network: NeuraiChainType): void {
    if (network === this.network) return;
    this._enforceChainKind(network);
    this.network = network;
    if (this._unsubscribeBackendPush) {
      this._unsubscribeBackendPush();
      this._unsubscribeBackendPush = null;
    }
    this._engine = null;
    this._enginePromise = null;
    this._backend = null;
    this._forgetAddresses();
    this.balance = 0n;
    this.unconfirmed_balance = 0n;
    this.addressPosition = 0;
    this._lastTxBlockHeight = 0;
    this._historyItems = [];
    this._txCache = [];
    this._heldAssets = [];
    this._pendingTxs = [];
  }

  /** Other words, passphrase or network: other addresses. */
  private _forgetAddresses(): void {
    this._receiveIndex = 0;
    this._changeIndex = 0;
    this._mainAddress = '';
    this._receiveAddress = '';
    this._addressTxids = null;
    this._pushedAddressTxids = {};
    this._privacyPool = null;
  }

  getNetwork(): NeuraiChainType {
    return this.network;
  }

  getNeuraiNetwork(): NeuraiNetwork {
    return CHAIN_PARAMS[this.network].network;
  }

  /** jswallet network of this wallet's addresses (see `engineNetworkFor`). */
  getEngineNetwork(): EngineNetwork {
    return engineNetworkFor(this.network);
  }

  setPassphrase(passphrase: string): void {
    this.passphrase = passphrase || '';
    this._engine = null;
    this._enginePromise = null;
    this._forgetAddresses();
  }

  setSecret(newSecret: string): this {
    super.setSecret(newSecret);
    this._engine = null;
    this._enginePromise = null;
    this._forgetAddresses();
    return this;
  }

  /**
   * Generate a fresh BIP39 mnemonic and store it as this wallet's `secret`.
   * Uses `NeuraiKey.generateMnemonic()` so the wordlist matches what the
   * import flow expects.
   */
  generate(): string {
    const mnemonic = NeuraiKey.generateMnemonic();
    this.setSecret(mnemonic);
    return mnemonic;
  }

  getPassphrase(): string {
    return this.passphrase;
  }

  /**
   * Mainnet keeps the legacy ID byte for byte, so its per-wallet references
   * stay valid. Testnet adds the chain: the same words there are another
   * wallet, and sharing the mainnet ID made one of the two disappear on load.
   */
  getID(): string {
    if (!isTestnetChain(this.network)) return this.getLegacyID();
    return walletIdV2([this.type, this.network, this.getSecret(), this.getPassphrase() ?? '', this._derivationPath ?? '']);
  }

  protected _enforceChainKind(network: NeuraiChainType): void {
    const want = this.walletKind;
    const got = kindOfChain(network);
    if (want !== got) {
      throw new Error(`Wallet kind mismatch: ${this.type} expects ${want}, got network ${network}`);
    }
  }

  // ---------- engine / backend ----------------------------------------------------

  /**
   * The bootstrap derives the whole address window synchronously (seconds for
   * PQ wallets on Hermes), so callers that arrive while it runs share it
   * instead of each paying for their own: the privacy panel alone asks for
   * addresses and coins in parallel. A reset (network or passphrase change)
   * drops the shared promise, and a bootstrap started before it is not kept.
   */
  protected ensureEngine(): Promise<NeuraiEngine> {
    if (this._engine) return Promise.resolve(this._engine);
    if (!this._enginePromise) {
      const pending = this._createEngine();
      this._enginePromise = pending;
      pending.then(
        engine => {
          if (this._enginePromise !== pending) return;
          this._engine = engine;
          if (this.walletKind === 'pq') return;
          const external = this._externalAddresses(engine);
          this._mainAddress = external[0] ?? '';
          this._receiveAddress = external[this._receiveIndex] ?? '';
        },
        () => {},
      );
      pending
        .finally(() => {
          if (this._enginePromise === pending) this._enginePromise = null;
        })
        .catch(() => {});
    }
    return this._enginePromise;
  }

  private async _createEngine(): Promise<NeuraiEngine> {
    if (!this.secret) {
      throw new Error('Cannot initialise Neurai engine: wallet has no mnemonic');
    }
    this._enforceChainKind(this.network);
    const engine = await NeuraiJsWallet.createInstance({
      mnemonic: this.secret,
      passphrase: this.passphrase || undefined,
      network: this.getEngineNetwork(),
      offlineMode: true,
      // Past the receive and the change address too. The addresses screen's
      // longer window is added below: the library derives each address from
      // the root, three times slower.
      minAmountOfAddresses: Math.max(1, this._receiveIndex + 1, this._changeIndex + 1),
      // NIP-040. Without an override jswallet asks the node per build
      // (`resolveAssetMarker`); the app already knows the answer, so it passes
      // it and saves the round trip. Same source as the local builds, so both
      // paths cannot disagree.
      assetMarker: markerForChain(this.network),
    });
    // Resolve the backend at call time: changing settings must also change the motor.
    // jswallet 0.15.5 (including its asset builder) requests a rate through
    // this hook. Supply our local policy; the library selects inputs, sizes
    // serialized outputs and calculates the exact fee. No node fee quote.
    engine.rpc = (method, params = []) =>
      method === 'estimatesmartfee' ? Promise.resolve({ feerate: LOCAL_FEE_RATE_RPC }) : this.getBackend().rpc(method, params);
    if (this.canDeriveMoreAddresses() && engine.addressPosition <= this.addressPosition)
      this._extendEngine(engine, this.addressPosition + 1);
    return engine;
  }

  setBackend(backend: NeuraiBackend): void {
    if (backend.chain !== this.network) {
      throw new Error(`Backend chain ${backend.chain} does not match wallet network ${this.network}`);
    }
    this._backend = backend;
    this._seedBackendStatuses();
    this._wireBackendPushHandler();
  }

  /**
   * The wallet's backend, created on first use and kept. It is never created
   * before the saved node overrides were read: a backend built then would talk
   * to the default node for the rest of the session even though the user set
   * their own (H19). Callers see a transient error and retry on the next refresh.
   */
  getBackend(): NeuraiBackend {
    if (!this._backend) {
      if (!isOverridesLoaded()) {
        loadOverrides().catch(() => {});
        throw new Error('The network settings are still loading. Try again in a moment.');
      }
      this._backend = createDefaultBackend(this.getNeuraiNetwork(), this.walletKind);
      this._seedBackendStatuses();
      this._wireBackendPushHandler();
    }
    return this._backend;
  }

  /**
   * Seed the WSS backend's per-address status cache from disk so the first
   * `subscribe.bulk` after app cold start can suppress refetches when
   * nothing changed while the app was closed. No-op for backends that don't
   * implement the push protocol (RPC, ElectrumX stub).
   */
  private _seedBackendStatuses(): void {
    if (!this._backend) return;
    const seed = (this._backend as { seedKnownStatuses?: (s: Record<string, string>) => void }).seedKnownStatuses;
    if (typeof seed === 'function' && this._addressStatus) {
      seed.call(this._backend, this._addressStatus);
    }
  }

  /**
   * Snapshot the backend's current per-address status cache back onto the
   * wallet for persistence. Called after the wallet has just re-fetched
   * (post-push or post-pull-to-refresh) so the next session can pick up
   * where this one left off. Best-effort — silently no-op for non-WSS
   * backends.
   */
  private _persistBackendStatuses(): void {
    if (!this._backend) return;
    const get = (this._backend as { getKnownStatuses?: () => Record<string, string> }).getKnownStatuses;
    if (typeof get !== 'function') return;
    const snapshot = get.call(this._backend);
    if (snapshot && typeof snapshot === 'object') this._addressStatus = snapshot;
  }

  /**
   * Lightweight "I am here" handshake for use on screen focus: connects to
   * the WSS backend (if not already) and subscribes the wallet's addresses
   * so the server starts pushing address.changed events. Does NOT trigger
   * any balance/history fetch on its own — the subscribe.bulk response is
   * compared against the persisted status cache by the backend, and a
   * synthetic address.changed event is fired only when something actually
   * changed.
   *
   * Critically, this does NOT bootstrap the engine if we already have a
   * persisted address set from a previous session: PQ engines do ML-DSA
   * key derivation that can stall the JS thread for 1–2s per wallet, so
   * making the home screen wait for that just to send a subscribe is a
   * non-starter. The engine bootstraps lazily on the first Send/Receive
   * action or the first push-triggered refetch.
   */
  async ensureBackendConnected(options?: { reconnect?: boolean }): Promise<void> {
    const backend = this.getBackend();
    if (options?.reconnect) {
      await (backend as { resumeConnection?: () => Promise<void> }).resumeConnection?.();
    }
    // Skip entirely if the active backend has no push protocol (the
    // DisabledBackend mainnet stub, RpcBackend fallback, ElectrumX stub):
    // there's nothing to subscribe to, and creating the engine just to learn
    // there's nothing to do can cost 2+ seconds of blocked JS thread.
    const supportsPush = typeof (backend as { setSubscribedAddresses?: unknown }).setSubscribedAddresses === 'function';
    if (!supportsPush) return;

    const cachedAddresses = Object.keys(this._addressStatus || {});
    if (cachedAddresses.length > 0) {
      await this._notifyBackendAddresses(backend, cachedAddresses);
      return;
    }
    // First-ever run for this wallet: pay the engine bootstrap cost here.
    const engine = await this.ensureEngine();
    await this._notifyBackendAddresses(backend, engine.getAddresses());
  }

  /**
   * If the backend supports server-pushed address.changed events (WssBackend
   * does), register a handler that re-fetches the wallet whenever the server
   * tells us a subscribed address moved. Coalesces bursts so a block with
   * many touched outputs collapses into a single refetch.
   */
  getServiceStatus(): 'stale' | 'legacy' | 'exact' | undefined {
    return (this._backend as { getServiceStatus?: () => 'stale' | 'legacy' | 'exact' } | undefined)?.getServiceStatus?.();
  }

  private _wireBackendPushHandler(): void {
    if (!this._backend) return;
    if (this._unsubscribeBackendPush) {
      this._unsubscribeBackendPush();
      this._unsubscribeBackendPush = null;
    }
    const onAddressChanged = (this._backend as { onAddressChanged?: (cb: (event: AddressChangedEvent) => void) => () => void })
      .onAddressChanged;
    if (typeof onAddressChanged !== 'function') return;
    const unsubscribeChanged = onAddressChanged.call(this._backend, (event: AddressChangedEvent) => {
      // Apply whatever the server gave us synchronously and cheaply: balance
      // is in the payload for PQ-with-reuse (single subscribed address ==
      // wallet total). Doing this before yielding means the UI shows fresh
      // numbers immediately, even if the historical refetch is deferred or
      // never runs (e.g. when no new txids landed).
      this._applyPushEvent(event);

      // Decide whether a history refetch is actually needed. Pure status
      // bumps (confirmed_txids / removed_txids / touched_assets only) don't
      // add anything to the tx list — the existing entries already cover
      // those txids. Only new txids force a re-pull.
      const delta = event.delta;
      const hasNewTxids = !!delta?.added_txids && delta.added_txids.length > 0;
      const noDeltaInfo = !delta;
      // The history only has confirmed transactions: a payment still in the
      // mempool moves the receive or change address on here.
      if (hasNewTxids) {
        this._advanceAddresses([event.address]);
        this._notePushedTxids(event.address, delta?.added_txids ?? []);
      }
      if (!hasNewTxids && !noDeltaInfo) {
        // Balance was already applied above and nothing else needs fetching.
        emitWalletChanged(this.getID());
        return;
      }

      this._refetchInBackground();
    });
    const unsubscribeSync = (this._backend as { onSyncStatus?: (cb: () => void) => () => void }).onSyncStatus?.(() =>
      emitWalletChanged(this.getID()),
    );
    const unsubscribeTip = (this._backend as { onChainTip?: (cb: () => void) => () => void }).onChainTip?.(() => this._onNewBlock());
    this._unsubscribeBackendPush = () => {
      unsubscribeChanged();
      unsubscribeSync?.();
      unsubscribeTip?.();
    };
  }

  /** A new block was pushed by the backend. Nothing to do by default: a block
   * that touches the wallet's addresses arrives as `address.changed`. */
  protected _onNewBlock(): void {}

  /**
   * Re-fetch balance and history off the critical path and notify the UI.
   * Calls that arrive while one runs are coalesced into one more pass.
   */
  protected _refetchInBackground(): void {
    if (this._pushFetchInFlight) {
      this._pushFetchPending = true;
      return;
    }
    this._pushFetchInFlight = true;
    // Defer the heavy refetch until any current UI interaction (screen
    // transitions, taps, FlatList batches) settles. Without this the
    // synchronous tx-parse chunks compete with the user's first tap on
    // Send/Receive and the JS thread block makes the buttons feel dead.
    InteractionManager.runAfterInteractions(async () => {
      try {
        do {
          this._pushFetchPending = false;
          // Skip fetchBalance: `_applyPushEvent` already updated
          // `this.balance` from the server's pushed payload for the wallet
          // kinds where that's safe; for HD wallets we still need the
          // multi-address sum, so we keep fetching there.
          if (this.walletKind !== 'pq') {
            await this.fetchBalance();
          }
          await this.fetchTransactions();
          console.log('[NeuraiWallet] push refresh done, balance=', this.balance, 'txs=', this._txCache.length);
          // Notify the React state layer so `wallets`-consuming screens
          // (WalletsList, etc.) re-render. Internal wallet mutations are
          // invisible to React otherwise — useStorage hands out the same
          // array identity until something calls setWallets.
          emitWalletChanged(this.getID());
        } while (this._pushFetchPending);
      } catch (err) {
        console.warn('AbstractNeuraiWallet: push-triggered refetch failed', err);
      } finally {
        this._pushFetchInFlight = false;
      }
    });
  }

  /**
   * Apply the cheap, server-pushed fields from an `address.changed` event
   * directly to wallet state — no network round-trip, no engine touch. Only
   * the bits we can trust without re-summing across addresses are taken:
   *  - `balance`: safe only when one address represents the whole wallet
   *    (PQ-with-reuse). For HD we'd need to sum across the subscription set,
   *    so the deferred `fetchBalance` still owns that case.
   * Returning quickly lets the UI render the new number before the deferred
   * `fetchTransactions` runs (or in cases where no fetch is needed at all).
   */
  private _applyPushEvent(event: AddressChangedEvent): void {
    if (this.walletKind === 'pq' && event.balance && event.balance.confirmed !== undefined) {
      // The push payload's `confirmed` is already in satoshis (1e8 / coin).
      this.balance = parseMoneySats(event.balance.confirmed);
      this.unconfirmed_balance = parseRawSats(event.balance.unconfirmed ?? 0n);
      this._lastBalanceFetch = Date.now();
    }
  }

  // ---------- addresses ------------------------------------------------------------

  async getReceiveAddressAsync(): Promise<string> {
    // Fast path: the receive address is persisted (Legacy and ECDSA) or the
    // only address in the status cache (PQ wallets always reuse), so we can
    // answer without paying the engine bootstrap cost (seconds of key
    // derivation) that would otherwise freeze the ReceiveDetails screen.
    const cached = this._getCachedReceiveAddress();
    if (cached) return cached;
    const engine = await this.ensureEngine();
    // Legacy and ECDSA: set when the engine came up (the offline engine itself
    // always answers its first address).
    return this._getCachedReceiveAddress() ?? engine.getReceiveAddress();
  }

  /**
   * Whether a Legacy or ECDSA wallet uses only its first address: it is the
   * receive address and takes the change, like a PQ wallet, for services that
   * expect one address per wallet. On with its own setting or the general one.
   */
  usesSingleAddress(): boolean {
    return this.walletKind !== 'pq' && (this.singleAddress || isSingleAddressForAll());
  }

  /** Receive addresses of a Legacy or ECDSA engine, in derivation order: it
   * interleaves them with the change addresses. */
  private _externalAddresses(engine: NeuraiEngine): string[] {
    return engine.getAddresses().filter((_, i) => i % 2 === 0);
  }

  private _internalAddresses(engine: NeuraiEngine): string[] {
    return engine.getAddresses().filter((_, i) => i % 2 === 1);
  }

  /**
   * Where the change of a send goes unless the caller forces it: the first
   * address with a single address, else the change address after the last
   * used one. Undefined for PQ wallets, whose engine picks it.
   */
  private _defaultChangeAddress(engine: NeuraiEngine): string | undefined {
    if (this.walletKind === 'pq') return undefined;
    return this.usesSingleAddress() ? this._externalAddresses(engine)[0] : this._internalAddresses(engine)[this._changeIndex];
  }

  /**
   * Moves the receive and the change address of a Legacy or ECDSA wallet to
   * the ones after the last of `used`, addresses that received; they never
   * move back. Past the derived window the engine is dropped, so the next one
   * derives further, and the history of the new addresses is fetched. PQ
   * wallets keep their single address.
   */
  private _advanceAddresses(used: Iterable<string>): void {
    const engine = this._engine;
    if (this.walletKind === 'pq' || !engine) return;
    const external = this._externalAddresses(engine);
    const internal = this._internalAddresses(engine);
    const position = new Map<string, { change: boolean; i: number }>();
    external.forEach((address, i) => position.set(address, { change: false, i }));
    internal.forEach((address, i) => position.set(address, { change: true, i }));
    let receive = this._receiveIndex;
    let change = this._changeIndex;
    for (const address of used) {
      const p = position.get(address);
      if (p && p.change) change = Math.max(change, p.i + 1);
      else if (p) receive = Math.max(receive, p.i + 1);
    }
    if (receive === this._receiveIndex && change === this._changeIndex) return;
    this._receiveIndex = receive;
    this._changeIndex = change;
    this._receiveAddress = external[receive] ?? '';
    if (this._receiveAddress && change < internal.length) return;
    this._engine = null;
    this._enginePromise = null;
    this._refetchInBackground();
  }

  /** Own addresses that `rawHex` pays, among the derived ones. */
  private _paidOwnAddresses(rawHex: string): string[] {
    const engine = this._engine;
    if (this.walletKind === 'pq' || !engine) return [];
    const scripts = new Set(parseTransaction(rawHex).outputs.map(o => o.scriptPubKeyHex));
    return engine.getAddresses().filter(address => scripts.has(Buffer.from(encodeDestinationScript(address)).toString('hex')));
  }

  async getStaticReceiveAddress(): Promise<string> {
    // Same fast path as getReceiveAddressAsync for PQ-with-reuse wallets:
    // the address is in our persisted cache, no need to bootstrap the
    // engine just to render a QR. The change-address side effect below
    // is irrelevant for PQ-with-reuse (change collapses on the receive
    // address by design); legacy HD wallets still go through the engine.
    const cached = this._getCachedReceiveAddress();
    if (cached) return cached;
    const engine = await this.ensureEngine();
    const addrs = engine.getAddresses();
    if (addrs.length === 0) throw new Error('Engine has no addresses');
    // Mark this address as the active receive so the engine excludes it when
    // picking a change address; otherwise getChangeAddress() can return the
    // same index and trip "Change address cannot be the same as to address".
    (engine as unknown as { receiveAddress: string }).receiveAddress = addrs[0];
    return addrs[0];
  }

  /** Returns the wallet's cached receive address if we can answer without
   * the engine. Legacy and ECDSA wallets keep it in `_receiveAddress`. For
   * PQ-with-reuse, the only address the wallet ever uses is the key in
   * `_addressStatus` (populated from the previous session's subscribe.bulk).
   * Returns null when the cache is empty or when the PQ wallet has multiple
   * subscribed addresses. */
  private _getCachedReceiveAddress(): string | null {
    if (this.walletKind !== 'pq') return (this.usesSingleAddress() ? this._mainAddress : this._receiveAddress) || null;
    const keys = Object.keys(this._addressStatus || {});
    return keys.length === 1 ? keys[0] : null;
  }

  // The Bitcoin pipeline (ReceiveDetails, deeplink router, push-notifications)
  // calls `getAddress()` synchronously and `getAddressAsync()` for the slow
  // path. Wire both to the engine so freshly-created Neurai wallets show a QR
  // and copyable address as soon as they're prewarmed.
  getAddress(): string | false | undefined {
    // The persisted receive address first, so sync callers (ReceiveDetails
    // QR, clipboard checks) don't return false and trip a 2s engine bootstrap
    // on every entry to the wallet screen.
    const cached = this._getCachedReceiveAddress();
    if (cached) return cached;
    if (this._engine) {
      try {
        const addrs = this._engine.getAddresses();
        return addrs[0] ?? false;
      } catch {
        return false;
      }
    }
    return false;
  }

  async getAddressAsync(): Promise<string | false | undefined> {
    return this.getReceiveAddressAsync();
  }

  /**
   * The address Neurai Connect exposes to a site and signs messages with.
   *
   * A session or a login is bound to one address, and the signature the site
   * verifies must come from that address's key. For a software wallet every
   * address has its key at hand, so the current receive address is as good as
   * any. A hardware wallet overrides this: its device signs with one fixed
   * key, and Connect has to expose exactly that address, not whichever receive
   * address HD discovery currently points at.
   */
  async getConnectAddressAsync(): Promise<string> {
    return this.getReceiveAddressAsync();
  }

  async getChangeAddressAsync(): Promise<string> {
    const engine = await this.ensureEngine();
    return this._defaultChangeAddress(engine) ?? engine.getChangeAddress();
  }

  async getAddressesAsync(): Promise<string[]> {
    const engine = await this.ensureEngine();
    return engine.getAddresses();
  }

  /**
   * The set of addresses this wallet watches for balance/history/UTXO. Default
   * is the engine's derived address window. Subclasses that have no engine
   * (e.g. an external-signing hardware wallet that only knows its own address)
   * override this to provide their address(es) without bootstrapping an engine.
   */
  protected async _walletAddresses(): Promise<string[]> {
    const engine = await this.ensureEngine();
    return engine.getAddresses();
  }

  /** Base currency code used to interpret history deltas. Defaults to the
   * engine's; engine-less subclasses override it. */
  protected async _walletBaseCurrency(): Promise<string> {
    // What the engine would answer (it sets it from the same network), without
    // bootstrapping one for a constant.
    return NeuraiJsWallet.getBaseCurrencyByNetwork(this.getEngineNetwork());
  }

  /**
   * Initialise the engine without waiting for any blocking operation.
   * Safe to call right after `generate()`/`setSecret()` so callers that need
   * synchronous address access (carousels, QR display) can read the cached
   * `_engine.getAddresses()` immediately afterwards.
   */
  async prewarmEngine(): Promise<void> {
    await this.ensureEngine();
  }

  /**
   * Synchronously returns engine-derived addresses if the engine has been
   * initialised; otherwise returns an empty array. Bitcoin-pipeline screens
   * call this without awaiting, so they get whatever is cached.
   */
  getCachedAddresses(): string[] {
    return this._engine ? this._engine.getAddresses() : [];
  }

  /**
   * The derived addresses with their branch and index, in derivation order:
   * PQ wallets have one chain; Legacy and ECDSA interleave receive and change.
   * Empty until {@link loadAddresses} brings the engine up.
   */
  getAddressEntries(): NeuraiAddressEntry[] {
    const addresses = this.getCachedAddresses();
    if (this.walletKind === 'pq') return addresses.map((address, index) => ({ address, index, change: false }));
    return addresses.map((address, i) => ({ address, index: Math.floor(i / 2), change: i % 2 === 1 }));
  }

  /** Whether {@link loadAddresses} can derive past the current window. */
  canDeriveMoreAddresses(): boolean {
    return this.walletKind !== 'pq';
  }

  /**
   * Brings up the addresses the addresses screen lists. A Legacy or ECDSA
   * wallet also derives at least `perBranch` receive and change addresses (at
   * most {@link MAX_LISTED_ADDRESSES}): its engine is rebuilt with the larger
   * window, which later sessions keep, and the wallet watches the new
   * addresses too, so a payment to any address it showed is seen.
   */
  async loadAddresses(perBranch = 0): Promise<void> {
    const engine = await this.ensureEngine();
    if (!this.canDeriveMoreAddresses()) return;
    const want = Math.min(perBranch, MAX_LISTED_ADDRESSES);
    if (this._externalAddresses(engine).length >= want) return;
    this._extendEngine(engine, want);
    this.addressPosition = Math.max(this.addressPosition, want - 1);
    this._refetchInBackground();
  }

  /**
   * Derives the positions `engine` lacks up to `positions` as its startup
   * does (the receive then the change address of each), but from the branch
   * nodes of its tree rather than the root, and only the new ones: a rebuild
   * re-derives every address from the root, seconds per 20 positions on Hermes.
   */
  private _extendEngine(engine: NeuraiEngine, positions: number): void {
    const keyNetwork = legacyKeyNetworkFor(this.network) ?? ecdsaKeyNetworkFor(this.network);
    const first = engine.getAddressObjects()[0];
    // The account the engine derives under, from its own first address: m/44'/1'/0'/0/0 → m/44'/1'/0'.
    const account = first?.path.split('/').slice(0, -2).join('/');
    if (!keyNetwork || !account || !this.secret) throw new Error('This wallet cannot derive more addresses');
    let branches = branchNodes.get(engine);
    if (!branches) {
      const accountNode = NeuraiKey.getHDKey(keyNetwork, this.secret, this.passphrase).derive(account);
      branches = [accountNode.deriveChild(0), accountNode.deriveChild(1)];
      branchNodes.set(engine, branches);
    }
    for (let position = engine.addressPosition; position < positions; position++) {
      for (const change of [0, 1] as const) {
        const derived = NeuraiKey.getAddressByPath(keyNetwork, branches[change], `m/${position}`);
        engine.addressObjects.push({ ...derived, path: `${account}/${change}/${position}`, keyType: first.keyType });
      }
      engine.addressPosition = position + 1;
    }
  }

  /**
   * Keeps the private balance the privacy tab just read in `pool`, for the
   * home to show until the pool is read again. True when it is worth saving:
   * another balance, or the saved reading is getting old.
   */
  notePrivacyPoolBalance(pool: string, balanceAtomic: string, height = 0): boolean {
    const now = Date.now();
    const last = this._privacyPool;
    const worthSaving = !last || last.pool !== pool || last.balanceAtomic !== balanceAtomic || now - last.at > PRIVACY_POOL_RESAVE_MS;
    this._privacyPool = { pool, balanceAtomic, height, at: now };
    return worthSaving;
  }

  /** The private balance last read in `pool` and when, or null if it was never read on this device. */
  getPrivacyPoolBalance(pool: string): { sats: bigint; at: number } | null {
    const last = this._privacyPool;
    if (!last || last.pool !== pool) return null;
    try {
      return { sats: parseRawSats(last.balanceAtomic), at: last.at };
    } catch {
      return null;
    }
  }

  /** Whether the transactions of each address are known: fetched at least once. */
  addressActivityKnown(): boolean {
    return this._addressTxids !== null;
  }

  /** Ids of the transactions that touched `address`: the confirmed ones, then any pushed from the mempool. */
  getAddressTxids(address: string): string[] {
    const confirmed = this._addressTxids?.[address] ?? [];
    const pushed = this._pushedAddressTxids[address];
    if (!pushed || pushed.length === 0) return confirmed;
    return [...confirmed, ...pushed.filter(txid => !confirmed.includes(txid))];
  }

  /** Whether `address` has received or spent anything. */
  isAddressUsed(address: string): boolean {
    return this.getAddressTxids(address).length > 0;
  }

  private _notePushedTxids(address: string, txids: string[]): void {
    const known = this._pushedAddressTxids[address] ?? [];
    this._pushedAddressTxids[address] = [...known, ...txids.filter(txid => !known.includes(txid))];
  }

  /** Records the transactions of each address from a history fetch, and drops the pushed ones it now confirms. */
  private _recordAddressTxids(deltas: IDelta[]): void {
    const confirmed = txidsByAddress(deltas);
    this._addressTxids = confirmed;
    for (const [address, txids] of Object.entries(this._pushedAddressTxids)) {
      const left = txids.filter(txid => !confirmed[address]?.includes(txid));
      if (left.length > 0) this._pushedAddressTxids[address] = left;
      else delete this._pushedAddressTxids[address];
    }
  }

  getAllExternalAddresses(): string[] {
    // The engine bootstraps lazily (first Send/Receive), so until then answer
    // from the addresses the previous session subscribed to. Push
    // registration at app start and wallet deletion rely on this list and
    // must not pay the bootstrap cost.
    const engineAddresses = this.getCachedAddresses();
    return engineAddresses.length > 0 ? engineAddresses : Object.keys(this._addressStatus || {});
  }

  weOwnAddress(address: string): boolean {
    if (!this._engine) return false;
    return this._engine.getAddresses().includes(address);
  }

  /**
   * Validates that `address` is a syntactically correct Neurai address:
   * Base58Check Legacy (`N…`/`t…`) or any Bech32m witness family the node
   * encodes (AuthScript v1 `nc1p…`, PQ v2 `pq1z…`, ECDSA v3 `nq1r…`, and their
   * testnet forms). Accepted regardless of the wallet's own kind so callers
   * (clipboard detection, deeplinks, send screen) can pre-validate without
   * knowing which wallet they'll route through. The old `nq1p…` / `tnq1p…`
   * encoding is rejected, as the node does.
   */
  isAddressValid(address: string): boolean {
    if (typeof address !== 'string' || address.length === 0) return false;
    try {
      decodeAddress(address);
      return true;
    } catch {
      // P2SH (`R…`/`r…`) is not a decodeAddress destination but stays a valid recipient.
      return /^[Rr][1-9A-HJ-NP-Za-km-z]{25,42}$/.test(address);
    }
  }

  // ---------- UTXO surface (compat shim) -------------------------------------------
  // The Bitcoin-era pipeline expects every wallet to expose the methods below.
  // For Neurai wallets we delegate to the engine's UTXO list and cache it on
  // `_utxo` (inherited from AbstractWallet) so existing consumers keep working.

  async fetchUtxo(): Promise<void> {
    const utxos = await this.getBackend().getUtxos(await this._walletAddresses());
    this._utxo = utxos.map(u => ({
      height: u.height ?? 0,
      address: u.address,
      txid: u.txid,
      vout: u.outputIndex,
      value: u.satoshis,
      confirmations: u.height ? 1 : 0,
    })) as Utxo[];
  }

  getUtxo(_respectFrozen: boolean = false): Utxo[] {
    return this._utxo as Utxo[];
  }

  // ---------- privacy pool surface ------------------------------------------------

  /** Own addresses the engine derived (receive and change). */
  async listOwnAddresses(): Promise<string[]> {
    const engine = await this.ensureEngine();
    return engine.getAddresses();
  }

  /** Base-currency ticker the engine reports for native UTXOs. */
  async getBaseCurrencyName(): Promise<string> {
    const engine = await this.ensureEngine();
    return engine.getBaseCurrency();
  }

  /** Own UTXOs of the base currency, or of `assetName`, with their prevout scripts and exact raw amounts. */
  async listOwnUtxos(
    assetName?: string,
  ): Promise<Array<{ address: string; assetName: string; txid: string; outputIndex: number; script: string; satoshis: string }>> {
    const engine = await this.ensureEngine();
    const rows = assetName ? await engine.getAssetUTXOs(assetName) : await engine.getUTXOs();
    return rows.map(u => ({
      address: u.address,
      assetName: u.assetName,
      txid: u.txid,
      outputIndex: u.outputIndex,
      script: u.script,
      satoshis: String(rawToSats(u.satoshis)),
    }));
  }

  /**
   * Raw key of an own address for local transaction signing: a WIF, or the PQ
   * seed and public key. False when the address is not this wallet's. Callers
   * must not keep it beyond the signing call.
   */
  async getSigningKey(address: string): Promise<unknown> {
    if (!this.secret) return false;
    try {
      const engine = await this.ensureEngine();
      return engine.getPrivateKeyByAddress(address) || false;
    } catch {
      return false;
    }
  }

  /**
   * Returns the WIF private key for an address owned by this wallet, or
   * `false` if the address is unknown or this is a PQ wallet (PQ keys do not
   * have a WIF representation).
   */
  /**
   * Signing material for an address owned by this wallet, used by Neurai Connect
   * to sign messages locally (`blue_modules/neurai/connect/signer.ts`).
   *
   * Legacy and ECDSA wallets return their WIF (`kind: 'legacy'` means any
   * secp256k1 WIF); post-quantum wallets return the ML-DSA-44
   * seed plus public key, from which the signing key pair is expanded. Hardware
   * wallets return `false`: their key never leaves the device, so message
   * signing has to be routed through the device instead.
   */
  async getMessageSigningMaterial(address: string): Promise<NeuraiSigningMaterial | false> {
    if (!this.secret) return false;
    try {
      const engine = await this.ensureEngine();
      const material = engine.getPrivateKeyByAddress(address);
      if (typeof material === 'string' && material.length > 0) return { kind: 'legacy', wif: material };
      if (material && typeof material === 'object' && typeof material.seedKey === 'string' && typeof material.publicKey === 'string') {
        return { kind: 'pq', seedKey: material.seedKey, publicKey: material.publicKey };
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Extended public key of account 0, for Neurai Connect's
   * `neurai_getAccountXpub`: it lets a site see every receive and change
   * address of this wallet, never spend from them. False for wallets without
   * a secp256k1 HD tree of their own: post-quantum (hardened at every level)
   * and hardware (the key stays on the device).
   */
  async getConnectAccountXpub(): Promise<ConnectAccountXpub | false> {
    if (!this.secret) return false;
    const keyNetwork = legacyKeyNetworkFor(this.network) ?? ecdsaKeyNetworkFor(this.network);
    if (!keyNetwork) return false;
    try {
      return accountXpub(keyNetwork, this.secret, this.passphrase);
    } catch {
      return false;
    }
  }

  _getWIFbyAddress(address: string): string | false {
    if (!this._engine) return false;
    try {
      const material = this._engine.getPrivateKeyByAddress(address);
      if (typeof material === 'string') return material;
    } catch {
      return false;
    }
    return false;
  }

  // The Bitcoin HD-wallet inflate/offload code in `class/blue-app.ts` pokes at
  // these caches directly. Provide empty objects so structural typing matches
  // even though Neurai wallets short-circuit out of those code paths.
  _txs_by_external_index: Record<number, Transaction[]> = {};
  _txs_by_internal_index: Record<number, Transaction[]> = {};

  // Heuristics the Bitcoin pipeline uses to throttle fetches. We always say
  // "yes, it's time" — `fetchBalance`/`fetchTransactions` are cheap RPC calls.
  timeToRefreshBalance(): boolean {
    return Date.now() - this._lastBalanceFetch > 5 * 60 * 1000;
  }

  timeToRefreshTransaction(): boolean {
    return Date.now() - this._lastTxFetch > 5 * 60 * 1000;
  }

  async shouldRefreshTransactionsForNewBlock(): Promise<boolean> {
    const tipHeight = await this.getBackend().getTipHeight();
    return this._lastTxBlockHeight <= 0 || tipHeight > this._lastTxBlockHeight;
  }

  // Bitcoin HD wallets expose `addressIsChange` to mark internal addresses on
  // CoinControl. The Neurai engine differentiates external/internal via its
  // own derivation tree; for now we don't expose change addresses to coin
  // control so always answer false.
  addressIsChange(_address: string): boolean {
    return false;
  }

  // Custom coin selector. The Bitcoin pipeline checks for this on the wallet
  // and falls back to coinselect's default if absent. We do not expose one.
  coinselect: undefined;

  // ---------- balance / history ----------------------------------------------------

  async fetchBalance(): Promise<void> {
    const addresses = await this._walletAddresses();
    const backend = this.getBackend();
    this._notifyBackendAddresses(backend, addresses);
    const balance = await backend.getBalance(addresses);
    this.balance = parseMoneySats(balance);
    this.unconfirmed_balance = 0n;
    this._lastBalanceFetch = Date.now();
    this.amountsStale = false;
    this._persistBackendStatuses();
  }

  /** If the active backend supports server pushes, tell it which addresses
   * to subscribe to so address.changed events flow back here. Best-effort —
   * a missing or failing subscribe path must never break the fetch flow. */
  private async _notifyBackendAddresses(backend: NeuraiBackend, addresses: string[]): Promise<void> {
    const setSubscribed = (backend as { setSubscribedAddresses?: (addrs: string[]) => Promise<void> }).setSubscribedAddresses;
    if (typeof setSubscribed !== 'function') return;
    // PQ wallets currently always reuse the receive address (no change
    // address), so every state transition collapses on addresses[0] — no
    // need to subscribe to the rest of the derivation window. Legacy HD
    // wallets need every external/change address so a tx to any index
    // triggers a refresh.
    const target = this.walletKind === 'pq' && addresses.length > 0 ? [addresses[0]] : addresses;
    await setSubscribed.call(backend, target).catch(err => {
      console.debug('AbstractNeuraiWallet: setSubscribedAddresses failed', err);
    });
  }

  async fetchTransactions(): Promise<void> {
    const addresses = await this._walletAddresses();
    const backend = this.getBackend();
    this._notifyBackendAddresses(backend, addresses);
    const [rawDeltas, tipHeight] = await Promise.all([backend.getAddressHistory(addresses), backend.getTipHeight().catch(() => 0)]);
    const deltas = rawDeltas;
    await yieldToEventLoop();
    const baseCurrency = await this._walletBaseCurrency();
    const items = await getHistoryYielding(deltas, baseCurrency);
    await yieldToEventLoop();

    // Prefer per-delta block times (WSS backend embeds them in the history
    // payload); fall back to a `getBlockTimes` round-trip only for heights
    // not covered by the deltas, so the RPC backend keeps working.
    const blockTimes: Record<number, number> = {};
    for (const d of rawDeltas) {
      if (typeof d.time === 'number' && d.height > 0 && blockTimes[d.height] === undefined) {
        blockTimes[d.height] = d.time;
      }
    }
    const missingHeights = Array.from(new Set(items.map(i => i.blockHeight).filter(h => h > 0 && blockTimes[h] === undefined)));
    if (missingHeights.length > 0) {
      try {
        const fetched = await backend.getBlockTimes(missingHeights);
        Object.assign(blockTimes, fetched);
      } catch (err) {
        console.debug('fetchTransactions: getBlockTimes failed', err);
      }
    }

    const txCache: Transaction[] = [];
    for (let i = 0; i < items.length; i += TX_CACHE_BATCH_SIZE) {
      txCache.push(
        ...items.slice(i, i + TX_CACHE_BATCH_SIZE).map(item => this._historyItemToTransaction(item, deltas, blockTimes, tipHeight)),
      );
      if (i + TX_CACHE_BATCH_SIZE < items.length) {
        await yieldToEventLoop();
      }
    }
    this._historyItems = items;
    this._txCache = txCache;
    this._recordAddressTxids(rawDeltas);
    this._advanceAddresses(rawDeltas.map(d => d.address));
    // Reconcile optimistic pending sends against the fresh history: drop any
    // that have now confirmed (or aged out).
    this._prunePendingTxs();
    this._lastTxFetch = Date.now();
    this._lastTxBlockHeight = Math.max(tipHeight, this._lastTxBlockHeight, ...items.map(item => item.blockHeight));
    this._persistBackendStatuses();
    // Refresh the held-asset cache off the critical path: the engine is already
    // bootstrapped here (via `_walletAddresses`), so this is just one extra RPC.
    // Fire-and-forget so it never delays the transaction render; it emits its
    // own `walletChanged` when the list arrives.
    this.refreshHeldAssets().catch(err => console.debug('AbstractNeuraiWallet: refreshHeldAssets failed', err));
  }

  // ---------- assets ---------------------------------------------------------------

  /** Held assets (tokens) from the last refresh. Synchronous — reads the
   * persisted cache, so the home-screen card and the Assets tab can render
   * without bootstrapping the engine. */
  getHeldAssetsCached(): NeuraiHeldAsset[] {
    return this._heldAssets;
  }

  /**
   * Fetch the wallet's current asset balances via the engine and refresh the
   * cache. The engine's `getAssets()` returns base-currency (XNA) and
   * zero-balance rows too (its internal filter is a no-op), so we drop those
   * here. Amounts come back already divided by 1e8 in `value`.
   */
  async refreshHeldAssets(): Promise<void> {
    // Opening the Assets tab lands here. One balance RPC needs only the
    // addresses, and the ones the backend is subscribed to are persisted, so
    // a cold engine is not bootstrapped (seconds of frozen UI) just to list them.
    const subscribed = Object.keys(this._addressStatus || {});
    const addresses = this._engine ? this._engine.getAddresses() : subscribed.length > 0 ? subscribed : await this._walletAddresses();
    const baseCurrency = await this._walletBaseCurrency();
    const raw = (await this.getBackend().rpc('getaddressbalance', [{ addresses }, true])) as Array<{
      assetName?: string;
      balance?: string | number | bigint;
      value?: string | number;
    }> | null;
    const assets: NeuraiHeldAsset[] = (raw ?? [])
      .filter(a => typeof a?.assetName === 'string' && a.assetName !== baseCurrency && parseRawSats(a.balance) > 0n)
      .map(a => ({
        name: a.assetName as string,
        type: getAssetType(a.assetName as string),
        amount: satsToXna(parseRawSats(a.balance)),
      }))
      .sort((x, y) => x.name.localeCompare(y.name));
    // Every emit is a full save and re-render; an unchanged list needs neither.
    if (JSON.stringify(assets) === JSON.stringify(this._heldAssets)) return;
    this._heldAssets = assets;
    emitWalletChanged(this.getID());
  }

  /** Pending sends first, then the history; see `neurai-history-projection.ts`. */
  getTransactions(): Transaction[] {
    this._prunePendingTxs();
    return withPendingFirst(this._pendingTxs, this._txCache);
  }

  /**
   * Pending sends keep subtracting until they confirm: the backend's confirmed
   * balance does not drop until the transaction is mined.
   */
  getUnconfirmedBalance(): bigint {
    this._prunePendingTxs();
    return unconfirmedWithPending(this.unconfirmed_balance, this._pendingTxs, this._txCache);
  }

  /**
   * Record a just-broadcast outgoing transaction so it shows immediately as a
   * 0-conf "pending" entry and its value is subtracted from the balance,
   * without waiting for the backend to index the mempool. Reconciled away in
   * `fetchTransactions` once the real tx confirms (or after a TTL).
   * @param txid       broadcast transaction id
   * @param valueSats  net wallet debit in sats; negative (amount sent + fee)
   * @param asset      for an asset transfer, the token name and amount sent
   *                   (positive full units) so the pending row shows the asset.
   */
  addPendingTx(txid: string, valueSats: bigint, asset?: { name: string; amount: string }): void {
    if (!txid || this._pendingTxs.some(t => t.txid === txid)) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const pendingAsset = asset ? { name: asset.name, amountSats: decimalToSats(asset.amount) } : undefined;
    this._pendingTxs.unshift(pendingSendEntry(txid, valueSats, nowSec, pendingAsset));
    emitWalletChanged(this.getID());
  }

  /** Two-step silent payments recorded before sending and not seen complete yet (H17). */
  getChainedSends(): readonly ChainedSend[] {
    return this._chainedSends;
  }

  recordChainedSend(send: ChainedSend): void {
    if (this._chainedSends.some(s => s.firstTxid === send.firstTxid)) return;
    this._chainedSends = [...this._chainedSends, send];
    emitWalletChanged(this.getID());
  }

  forgetChainedSend(firstTxid: string): void {
    const kept = this._chainedSends.filter(s => s.firstTxid !== firstTxid);
    if (kept.length === this._chainedSends.length) return;
    this._chainedSends = kept;
    emitWalletChanged(this.getID());
  }

  /**
   * What the network has seen of each recorded payment, from its bridge
   * address (history and mempool): both transactions touch that address, and
   * it is not one the wallet itself watches.
   */
  async chainedSendStates(): Promise<Map<string, ChainedSendState>> {
    const states = new Map<string, ChainedSendState>();
    const backend = this.getBackend();
    for (const send of this._chainedSends) {
      const [history, mempool] = await Promise.all([backend.getAddressHistory([send.bridge]), backend.getMempool([send.bridge])]);
      const txids = new Set<string>([...history.map(d => d.txid), ...mempool.map(m => m.txid)]);
      states.set(send.firstTxid, chainedSendState(send, txids));
    }
    return states;
  }

  /** Forgets the payments the network shows complete. True when something was forgotten. */
  async reconcileChainedSends(): Promise<boolean> {
    if (this._chainedSends.length === 0) return false;
    const states = await this.chainedSendStates();
    const before = this._chainedSends.length;
    for (const [firstTxid, state] of states) if (state === 'done') this.forgetChainedSend(firstTxid);
    return this._chainedSends.length !== before;
  }

  /** Drop pending entries that have CONFIRMED in the cache or aged out (TTL). */
  private _prunePendingTxs(): void {
    if (this._pendingTxs.length === 0) return;
    this._pendingTxs = prunePending(this._pendingTxs, this._txCache, Math.floor((Date.now() - PENDING_TX_TTL_MS) / 1000));
  }

  /** Raw history items as returned by `@neuraiproject/neurai-history-list`. */
  getHistoryItems(): IHistoryItem[] {
    return this._historyItems;
  }

  // ---------- transactions ---------------------------------------------------------

  async buildSendTransaction(
    targets: NeuraiTransactionTarget[],
    opts?: { forcedChangeAddress?: string; assetName?: string },
  ): Promise<NeuraiBuildTransactionResult> {
    if (this.amountsStale) throw new Error('Refresh this wallet before sending');
    targets = targets.map(t => ({ ...t, amount: amountFromInput(t.amount) }));
    if (new Set(targets.map(t => t.address)).size !== targets.length) throw new Error('Duplicate recipient address');
    if (targets.length === 0) {
      throw new Error('buildSendTransaction requires at least one target');
    }
    const engine = await this.ensureEngine();
    const forcedChangeAddressBaseCurrency = opts?.forcedChangeAddress ?? this._defaultChangeAddress(engine);
    const assetName = opts?.assetName;
    const isAsset = !!assetName && assetName !== 'XNA';

    // Asset transfers go through `engine.transferAsset` (neurai-assets 1.6.2):
    // it supports multiple recipients and every asset type, and crucially does
    // the owner-token dance required to move soulbound DePIN / restricted assets
    // — which the plain engine send path does not. The legacy manual builder is
    // kept as a single-recipient fallback in case the engine path is
    // unavailable or fails.
    if (isAsset) {
      const name = assetName as string;
      try {
        return await this._buildAssetTransferViaEngine(targets, name, forcedChangeAddressBaseCurrency);
      } catch (err) {
        console.warn('[Neurai] engine.transferAsset failed, falling back to manual asset builder:', describeBackendError(err));
        if (targets.length !== 1) throw err;
        return this._buildAssetTransferTransaction(targets[0].address, targets[0].amount, name, forcedChangeAddressBaseCurrency);
      }
    }

    if (targets.length === 1) {
      const result = await engine.createTransaction({
        toAddress: targets[0].address,
        amount: targets[0].amount,
        forcedChangeAddressBaseCurrency,
      });
      return {
        signedHex: result.debug.signedTransaction ?? '',
        unsignedHex: result.debug.rawUnsignedTransaction ?? '',
        feeSats: decimalToSats(result.debug.fee),
        sentAmountSats: decimalToSats(result.debug.amount),
        netDebitSats: decimalToSats(result.debug.xnaAmount),
        debug: result.debug,
      };
    }

    const outputs: Record<string, string> = {};
    for (const t of targets) outputs[t.address] = t.amount;
    const result = await engine.createSendManyTransaction({ outputs, forcedChangeAddressBaseCurrency });
    return {
      signedHex: result.debug.signedTransaction ?? '',
      unsignedHex: result.debug.rawUnsignedTransaction ?? '',
      feeSats: decimalToSats(result.debug.fee),
      sentAmountSats: decimalToSats(result.debug.amount),
      netDebitSats: decimalToSats(result.debug.xnaAmount),
      debug: result.debug,
    };
  }

  /**
   * Build + sign an asset transfer via `engine.transferAsset` (neurai-assets
   * 1.6.2). Handles multiple recipients, every asset type, and the owner-token
   * spend/return needed to move soulbound DePIN / restricted assets. We pass
   * `broadcast: false` and let the caller broadcast through {@link broadcastTx}
   * through the selected backend. `amount` is in the
   * asset's display units (raw units always use a scale of 1e8).
   */
  private async _buildAssetTransferViaEngine(
    targets: NeuraiTransactionTarget[],
    assetName: string,
    forcedChangeAddress?: string,
  ): Promise<NeuraiBuildTransactionResult> {
    const engine = await this.ensureEngine();
    const recipients = targets.map(t => ({ address: t.address, amount: t.amount }));
    const result = await engine.transferAsset({
      assetName,
      recipients,
      broadcast: false,
      ...(forcedChangeAddress ? { changeAddress: forcedChangeAddress } : {}),
    });
    const signedHex = result.signedTransaction ?? '';
    if (!signedHex) throw new Error('engine.transferAsset returned no signed transaction');
    const feeSats = decimalToSats(result.fee ?? 0);
    const totalAmount = satsToXna(targets.reduce((sum, t) => sum + decimalToSats(t.amount), 0n));
    return {
      signedHex,
      unsignedHex: result.rawTx ?? '',
      feeSats,
      // An asset transfer sends ~0 XNA to the recipient; only the fee leaves the wallet.
      sentAmountSats: 0n,
      netDebitSats: feeSats,
      asset: { name: assetName, amount: totalAmount },
      debug: result,
    };
  }

  /**
   * Build + sign an asset transfer transaction, mirroring the reference web
   * wallet (`neurai-addon-sign`):
   *   - select asset UTXOs to cover the amount (asset change back to the wallet),
   *   - select XNA UTXOs to cover the locally configured fee,
   *   - emit recipient/asset-change `transfers` + an XNA-change `payment`,
   *   - assemble with `createStandardAssetTransferTransaction` and sign locally.
   * `amount` is in full asset units; asset amounts use the same 1e8 raw scaling
   * as XNA satoshis.
   */
  private async _buildAssetTransferTransaction(
    toAddress: string,
    amount: string,
    assetName: string,
    forcedChangeAddress?: string,
  ): Promise<NeuraiBuildTransactionResult> {
    const engine = await this.ensureEngine();
    // Asset UTXOs and native (XNA) UTXOs come from different RPC queries:
    // `getUTXOs()` is `getaddressutxos` with NO assetName (native only), while
    // `getAssetUTXOs(name)` passes the assetName. Filtering `getUTXOs()` by an
    // asset name therefore always yields nothing — fetch each from its source.
    const [assetUtxosRaw, xnaUtxosRaw, mempool] = await Promise.all([
      engine.getAssetUTXOs(assetName),
      engine.getUTXOs(),
      engine.getMempool(),
    ]);
    const spentInMempool = new Set(mempool.map(m => `${m.prevtxid}:${m.prevout}`));
    const spendable = (u: SpendableUtxo) => u.satoshis > 0 && !spentInMempool.has(`${u.txid}:${u.outputIndex}`);
    const assetUtxos = assetUtxosRaw
      .map(u => ({ ...u, satoshis: rawToSats(u.satoshis) }))
      .filter(u => u.assetName === assetName && spendable(u));
    const xnaUtxos = xnaUtxosRaw
      .map(u => ({ ...u, satoshis: rawToSats(u.satoshis) }))
      .filter(u => (u.assetName === 'XNA' || !u.assetName) && spendable(u));
    if (assetUtxos.length === 0) throw new Error(`No spendable ${assetName} to send`);
    if (xnaUtxos.length === 0) throw new Error('No spendable XNA to cover the network fee');

    const amountRaw = decimalToSats(amount);
    if (amountRaw <= 0n) throw new Error('Invalid asset amount');
    const totalAssetRaw = assetUtxos.reduce((sum, u) => sum + u.satoshis, 0n);
    if (totalAssetRaw < amountRaw) throw new Error(`Insufficient ${assetName} balance`);

    const selectedAsset = selectUtxosForSats(assetUtxos, amountRaw);
    const assetChangeRaw = selectedAsset.reduce((sum, u) => sum + u.satoshis, 0n) - amountRaw;

    const feeRate = await this.estimateFeeRate();
    const xnaChangeAddress = forcedChangeAddress ?? (await engine.getChangeAddress());
    const assetChangeAddress = forcedChangeAddress ?? (await engine.getAssetChangeAddress());

    // Two-pass fee: estimate with one XNA input, select to cover it, then
    // re-estimate with the chosen input count (and the change outputs present).
    const outputAddresses = (xnaChange: boolean) => [
      { address: toAddress, assetName },
      ...(assetChangeRaw > 0 ? [{ address: assetChangeAddress, assetName }] : []),
      ...(xnaChange ? [xnaChangeAddress] : []),
    ];
    let selectedXna = [xnaUtxos[0]];
    let feeSats = estimateNeuraiFeeSats(
      [...selectedAsset, ...selectedXna].map(u => u.script),
      outputAddresses(true),
      feeRate,
    );
    const xnaChangeDust = dustThresholdSats(xnaChangeAddress);
    selectedXna = selectUtxosForSats(xnaUtxos, feeSats + xnaChangeDust);
    feeSats = estimateNeuraiFeeSats(
      [...selectedAsset, ...selectedXna].map(u => u.script),
      outputAddresses(true),
      feeRate,
    );

    const xnaIn = selectedXna.reduce((sum, u) => sum + u.satoshis, 0n);
    let xnaChangeSats = xnaIn - feeSats;
    if (xnaChangeSats < 0) throw new Error('Balance too low to cover the network fee');
    // Fold a sub-dust change into the fee rather than emitting an unspendable output.
    if (xnaChangeSats > 0 && xnaChangeSats < xnaChangeDust) {
      feeSats += xnaChangeSats;
      xnaChangeSats = 0n;
    }

    const transfers: { address: string; assetName: string; amountRaw: bigint }[] = [
      { address: toAddress, assetName, amountRaw: BigInt(amountRaw) },
    ];
    if (assetChangeRaw > 0) transfers.push({ address: assetChangeAddress, assetName, amountRaw: BigInt(assetChangeRaw) });
    const payments: { address: string; valueSats: bigint }[] = [];
    if (xnaChangeSats > 0) payments.push({ address: xnaChangeAddress, valueSats: BigInt(xnaChangeSats) });

    const inputs = [...selectedAsset, ...selectedXna];
    const built = createStandardAssetTransferTransaction({
      inputs: inputs.map(u => ({ txid: u.txid, vout: u.outputIndex })),
      payments,
      transfers,
      // NIP-040. Omitting it is not a compile error: the library keeps `rvn`
      // and the chain rejects the transaction with
      // bad-txns-legacy-asset-marker-after-nip040.
      assetMarker: markerForChain(this.network),
    });

    const privateKeys: Record<string, unknown> = {};
    for (const u of inputs) {
      const material = engine.getPrivateKeyByAddress(u.address);
      if (material) privateKeys[u.address] = material;
    }
    const signedHex = signNeuraiTransaction(
      signerNetworkFor(this.getEngineNetwork()),
      built.rawTx,
      inputs as unknown as Parameters<typeof signNeuraiTransaction>[2],
      privateKeys as Parameters<typeof signNeuraiTransaction>[3],
    );
    if (!signedHex) throw new Error('Failed to sign the asset transfer');

    return {
      signedHex,
      unsignedHex: built.rawTx,
      feeSats,
      // An asset transfer sends 0 XNA to the recipient; only the fee leaves the wallet.
      sentAmountSats: 0n,
      netDebitSats: feeSats,
      asset: { name: assetName, amount },
      debug: { assetName, amountRaw, assetChangeRaw, feeSats, xnaChangeSats, inputs: inputs.length },
    };
  }

  /** Spend all available native UTXOs using the library's no-change builder. */
  async buildSendMaxTransaction(toAddress: string): Promise<NeuraiBuildTransactionResult> {
    if (this.amountsStale) throw new Error('Refresh this wallet before sending');
    const engine = await this.ensureEngine();
    const result = await engine.createTransaction({ toAddress, sendMax: true });
    if (!result.debug.signedTransaction) throw new Error('Failed to sign the send-all transaction');
    return {
      signedHex: result.debug.signedTransaction,
      unsignedHex: result.debug.rawUnsignedTransaction ?? '',
      feeSats: decimalToSats(result.debug.fee),
      sentAmountSats: decimalToSats(result.debug.amount),
      netDebitSats: decimalToSats(result.debug.xnaAmount),
      debug: result.debug,
    };
  }

  /**
   * Build + sign a payment to a NIP-047 silent payment code (`tnsp1…`). The
   * output address is derived from the inputs, so they are chosen first and
   * never change afterwards. Receivers only find payments whose inputs are all
   * strict ECDSA v3 coins spent with the default template, in a version 2
   * transaction: an ECDSA wallet pays from its own coins, Legacy and PQ wallets
   * go through {@link _buildSilentPaymentViaBridge}. `amount` null spends every
   * coin with the fees deducted, like {@link buildSendMaxTransaction}.
   */
  async buildSilentPaymentTransaction(
    code: string,
    amount: string | null,
    opts?: { forcedChangeAddress?: string },
  ): Promise<NeuraiBuildTransactionResult> {
    if (this.amountsStale) throw new Error('Refresh this wallet before sending');
    this._checkSilentPaymentCode(code);
    if (this.walletKind !== 'ecdsa') return this._buildSilentPaymentViaBridge(code, amount, opts?.forcedChangeAddress);

    const engine = await this.ensureEngine();
    const [utxosRaw, mempool] = await Promise.all([engine.getUTXOs(), engine.getMempool()]);
    const spentInMempool = new Set(mempool.map(m => `${m.prevtxid}:${m.prevout}`));
    const utxos: SpendableUtxo[] = utxosRaw
      .map(u => ({ ...u, satoshis: rawToSats(u.satoshis) }))
      .filter(u => (u.assetName === 'XNA' || !u.assetName) && u.satoshis > 0 && !spentInMempool.has(`${u.txid}:${u.outputIndex}`));
    if (utxos.length === 0) throw new Error('No spendable XNA to send');

    const feeRate = await this.estimateFeeRate();
    const changeAddress = this._defaultChangeAddress(engine) ?? (await engine.getChangeAddress());
    const changeDust = dustThresholdSats(changeAddress);
    const total = (coins: SpendableUtxo[]) => coins.reduce((sum, u) => sum + u.satoshis, 0n);
    // The payment is a strict v3 output like the change, so the change address sizes it.
    const feeFor = (coins: SpendableUtxo[], withChange: boolean) =>
      estimateNeuraiFeeSats(
        coins.map(u => u.script),
        withChange ? [changeAddress, changeAddress] : [changeAddress],
        feeRate,
      );

    let inputs: SpendableUtxo[];
    let amountSats: bigint;
    let feeSats: bigint;
    let changeSats = 0n;
    if (amount === null) {
      inputs = utxos;
      feeSats = feeFor(inputs, false);
      amountSats = total(inputs) - feeSats;
      if (amountSats < changeDust) throw new Error('Balance too low to cover the network fee');
    } else {
      amountSats = decimalToSats(amountFromInput(amount));
      if (amountSats <= 0n) throw new Error('Invalid amount');
      inputs = selectUtxosForSats(utxos, amountSats + feeFor([utxos[0]], true));
      // Every extra input raises the fee: select again until the coins cover it.
      for (;;) {
        feeSats = feeFor(inputs, true);
        if (total(inputs) >= amountSats + feeSats) break;
        inputs = selectUtxosForSats(utxos, amountSats + feeSats);
      }
      changeSats = total(inputs) - amountSats - feeSats;
      // Fold a sub-dust change into the fee rather than emitting an unspendable output.
      if (changeSats > 0 && changeSats < changeDust) {
        feeSats += changeSats;
        changeSats = 0n;
      }
    }

    const wifs: Record<string, string> = {};
    for (const u of inputs) {
      const material = engine.getPrivateKeyByAddress(u.address);
      if (typeof material !== 'string') throw new Error(`No ECDSA key for ${u.address}`);
      wifs[u.address] = material;
    }
    const outputs: SilentPaymentOutput[] = [{ code, valueSats: amountSats }];
    if (changeSats > 0) outputs.push({ address: changeAddress, valueSats: changeSats });
    const {
      signedHex,
      unsignedHex,
      derived: [payment],
    } = this._signPayment(inputs, wifs, outputs, this.getEngineNetwork());

    return {
      signedHex,
      unsignedHex,
      feeSats,
      sentAmountSats: amountSats,
      netDebitSats: amountSats + feeSats,
      debug: { silentPayment: { code, address: payment.address, k: payment.k }, inputs: inputs.length, changeSats },
    };
  }

  /**
   * Silent payment from Legacy or PQ coins, which no receiver scans: two
   * transactions. The first one pays the amount plus the second's fee to the
   * first ECDSA change address of the same words and passphrase
   * (`m/84'/coin'/0'/1/0`); the second spends that coin alone to the code.
   * Both are signed before anything is broadcast (`signedHex`, then
   * `chainedHex`). If the second never makes it, the coin is not lost:
   * importing the words as an ECDSA wallet shows it. With `coins`, the first
   * one spends exactly those (coin control).
   */
  private async _buildSilentPaymentViaBridge(
    code: string,
    amount: string | null,
    forcedChangeAddress?: string,
    coins?: WalletCoin[],
  ): Promise<NeuraiBuildTransactionResult> {
    if (!this.secret) throw new Error('Silent payments need a wallet with recovery words');
    const bridgeNetwork = engineNetworkFor(chainFor(this.getNeuraiNetwork(), 'ecdsa'));
    const bridgeEngine = await NeuraiJsWallet.createInstance({
      mnemonic: this.secret,
      passphrase: this.passphrase || undefined,
      network: bridgeNetwork,
      offlineMode: true,
      minAmountOfAddresses: 1,
    });
    // Offline, the engine answers its first change address without asking the node.
    const bridgeAddress = await bridgeEngine.getChangeAddress();
    const bridgeWif = bridgeEngine.getPrivateKeyByAddress(bridgeAddress);
    if (typeof bridgeWif !== 'string') throw new Error(`No ECDSA key for ${bridgeAddress}`);
    const bridgeScript = Buffer.from(encodeDestinationScript(bridgeAddress)).toString('hex');
    // The payment is a strict v3 output like the bridge, so the bridge address sizes it.
    const secondFeeSats = estimateNeuraiFeeSats([bridgeScript], [bridgeAddress], await this.estimateFeeRate());

    const firstAmount = amount === null ? null : satsToXna(decimalToSats(amountFromInput(amount)) + secondFeeSats);
    const first = coins
      ? await this.buildCoinControlTransaction(coins, bridgeAddress, firstAmount, { forcedChangeAddress })
      : firstAmount === null
        ? await this.buildSendMaxTransaction(bridgeAddress)
        : await this.buildSendTransaction([{ address: bridgeAddress, amount: firstAmount }], { forcedChangeAddress });
    if (!first.signedHex) throw new Error('Failed to sign the transfer to the ECDSA address');
    const firstOutputs = parseTransaction(first.signedHex).outputs;
    const vout = firstOutputs.findIndex(o => o.scriptPubKeyHex === bridgeScript);
    if (vout < 0) throw new Error('The transfer does not pay the ECDSA address');
    const bridgeCoin: SpendableUtxo = {
      txid: computeTxid(first.signedHex),
      outputIndex: vout,
      satoshis: firstOutputs[vout].valueSats,
      address: bridgeAddress,
      assetName: 'XNA',
      script: bridgeScript,
    };
    const amountSats = bridgeCoin.satoshis - secondFeeSats;
    if (amountSats < dustThresholdSats(bridgeAddress)) throw new Error('Balance too low to cover the network fee');

    const second = this._signPayment([bridgeCoin], { [bridgeAddress]: bridgeWif }, [{ code, valueSats: amountSats }], bridgeNetwork);
    const [payment] = second.derived;
    return {
      signedHex: first.signedHex,
      unsignedHex: first.unsignedHex,
      chainedHex: second.signedHex,
      chainedBridge: bridgeAddress,
      feeSats: first.feeSats + secondFeeSats,
      sentAmountSats: amountSats,
      netDebitSats: first.netDebitSats,
      debug: {
        silentPayment: { code, address: payment.address, k: payment.k },
        bridge: { address: bridgeAddress, txid: bridgeCoin.txid, vout },
        first: first.debug,
      },
    };
  }

  /** Throws unless `code` is a payment code this wallet can pay. */
  private _checkSilentPaymentCode(code: string): void {
    const check = checkCode(code, silentPaymentNetworkFor(this.network));
    if (!check.valid) throw new Error(`Invalid silent payment code (${check.reason})`);
    // Strict v3 outputs are anyone-can-spend where witness v3 is not active.
    if (!isKindAvailable(this.getNeuraiNetwork(), 'ecdsa')) throw new Error('Silent payments are not active on this network yet');
  }

  /**
   * The wallet's XNA coins for coin control, largest first, without the ones
   * a transaction in the mempool already spends.
   */
  async listCoins(): Promise<WalletCoin[]> {
    const engine = await this.ensureEngine();
    const [utxos, mempool] = await Promise.all([engine.getUTXOs(), engine.getMempool()]);
    return spendableCoins(
      utxos.map(u => ({ ...u, satoshis: rawToSats(u.satoshis) })),
      mempool,
    );
  }

  /**
   * Coin control: spend exactly `coins` (from {@link listCoins}) to `to`, an
   * address or a payment code, with the change to the wallet's change address
   * or `forcedChangeAddress`. `amount` null sends everything, fee deducted,
   * without change. Legacy and PQ coins pay a code through
   * {@link _buildSilentPaymentViaBridge}.
   */
  async buildCoinControlTransaction(
    coins: WalletCoin[],
    to: string,
    amount: string | null,
    opts?: { forcedChangeAddress?: string },
  ): Promise<NeuraiBuildTransactionResult> {
    if (looksLikeSilentPaymentCode(to) && this.walletKind !== 'ecdsa') {
      if (this.amountsStale) throw new Error('Refresh this wallet before sending');
      this._checkSilentPaymentCode(to);
      return this._buildSilentPaymentViaBridge(to, amount, opts?.forcedChangeAddress, coins);
    }
    const engine = await this.ensureEngine();
    const keys: Record<string, unknown> = {};
    for (const coin of coins) {
      const material = engine.getPrivateKeyByAddress(coin.address);
      if (!material) throw new Error(`Not a coin of this wallet: ${coin.address}`);
      keys[coin.address] = material;
    }
    const changeAddress = opts?.forcedChangeAddress ?? this._defaultChangeAddress(engine) ?? (await engine.getChangeAddress());
    return this._buildFromCoins(coins, keys, to, amount, { address: changeAddress });
  }

  /**
   * Build + sign a transaction spending exactly `coins` to `to`, an address or
   * a payment code, with the change to `change`. `keys` holds the signing
   * material of each coin's address. `amount` null sends everything, fee
   * deducted, without change. Paying a code takes strict v3 coins: the library
   * refuses any other input.
   */
  protected async _buildFromCoins(
    coins: WalletCoin[],
    keys: Record<string, unknown>,
    to: string,
    amount: string | null,
    change: PaymentDestination,
  ): Promise<NeuraiBuildTransactionResult> {
    if (this.amountsStale) throw new Error('Refresh this wallet before sending');
    if (coins.length === 0) throw new Error('Select the coins to spend');
    const recipient: PaymentDestination = looksLikeSilentPaymentCode(to) ? { code: to } : { address: to };
    if ('code' in recipient) this._checkSilentPaymentCode(to);
    else if (!this.isAddressValid(to)) throw new Error('Invalid address');

    // An output to a code is strict v3, like the coins that pay it.
    const sizingAddress = (d: PaymentDestination) => ('code' in d ? coins[0].address : d.address);
    const recipientAddress = sizingAddress(recipient);
    const changeAddress = sizingAddress(change);
    const feeRate = await this.estimateFeeRate();
    const feeFor = (withChange: boolean) =>
      estimateNeuraiFeeSats(
        coins.map(c => c.script),
        withChange ? [recipientAddress, changeAddress] : [recipientAddress],
        feeRate,
      );
    const totalSats = coins.reduce((sum, c) => sum + c.satoshis, 0n);
    let amountSats: bigint;
    let feeSats: bigint;
    let changeSats = 0n;
    if (amount === null) {
      feeSats = feeFor(false);
      amountSats = totalSats - feeSats;
    } else {
      amountSats = decimalToSats(amountFromInput(amount));
      feeSats = feeFor(true);
      changeSats = totalSats - amountSats - feeSats;
      if (changeSats < 0n) throw new Error('The selected coins do not cover the amount and the network fee');
      // Fold a sub-dust change into the fee rather than emitting an unspendable output.
      if (changeSats < dustThresholdSats(changeAddress)) {
        feeSats += changeSats;
        changeSats = 0n;
      }
    }
    if (amountSats < dustThresholdSats(recipientAddress)) throw new Error('Amount too low to cover the network fee');

    const outputs: SilentPaymentOutput[] = [{ ...recipient, valueSats: amountSats }];
    if (changeSats > 0n) outputs.push({ ...change, valueSats: changeSats });
    const { signedHex, unsignedHex, derived } = this._signPayment(coins, keys, outputs, this.getEngineNetwork());
    return {
      signedHex,
      unsignedHex,
      feeSats,
      sentAmountSats: amountSats,
      netDebitSats: amountSats + feeSats,
      debug: { coins: coins.length, changeSats, derived: derived.map(d => d.address) },
    };
  }

  /**
   * Build + sign the version 2 transaction spending all of `inputs` to
   * `outputs`, in that order. An output with a `code` pays a new address
   * derived from the inputs (strict v3 coins with WIF keys), returned in
   * `derived` in the same order. The decoded private keys are wiped once the
   * addresses are derived.
   */
  protected _signPayment(
    inputs: SpendableUtxo[],
    keys: Record<string, unknown>,
    outputs: SilentPaymentOutput[],
    engineNetwork: EngineNetwork,
  ): { signedHex: string; unsignedHex: string; derived: DerivedOutput[] } {
    const recipients = outputs.flatMap(o => ('code' in o ? [{ code: o.code }] : []));
    let derived: DerivedOutput[] = [];
    if (recipients.length > 0) {
      const network = silentPaymentNetworkFor(this.network);
      const senderInputs: Array<{ txid: string; vout: number; privateKey: Uint8Array; script: string }> = [];
      try {
        for (const u of inputs) {
          const wif = keys[u.address];
          if (typeof wif !== 'string') throw new Error(`No ECDSA key for ${u.address}`);
          // `script` makes the library refuse any input a receiver would not accept.
          senderInputs.push({ txid: u.txid, vout: u.outputIndex, privateKey: decodeWIF(wif, network), script: u.script });
        }
        derived = createOutputs(senderInputs, recipients, { network });
      } finally {
        for (const input of senderInputs) input.privateKey.fill(0);
      }
    }

    let next = 0;
    const payments = outputs.map(o => ({ address: 'code' in o ? derived[next++].address : o.address, valueSats: o.valueSats }));
    const { rawTx } = createPaymentTransaction({
      version: 2,
      inputs: inputs.map(u => ({ txid: u.txid, vout: u.outputIndex })),
      payments,
    });
    const signedHex = signNeuraiTransaction(
      signerNetworkFor(engineNetwork),
      rawTx,
      inputs as unknown as Parameters<typeof signNeuraiTransaction>[2],
      keys as Parameters<typeof signNeuraiTransaction>[3],
    );
    if (!signedHex) throw new Error('Failed to sign the transaction');
    return { signedHex, unsignedHex: rawTx, derived };
  }

  /**
   * Build + sign a "reveal public key" transaction for the dedicated DePIN chat
   * address (account 100, `m/44'/coin'/100'/0/0`). That address lives OUTSIDE
   * the wallet's normal derivation window, so the engine doesn't hold its key —
   * we sign with the DePIN identity's WIF directly (`privateKeys[depinAddress]`).
   *
   * Spending any UTXO from the address publishes its public key on-chain, which
   * is required for others to encrypt DePIN group messages to it. We send a
   * small amount to `burnAddress` and return the rest as change to the DePIN
   * address. `utxos` are the address's base-currency UTXOs (fetched by the
   * caller from the DePIN node); broadcasting is also left to the caller.
   *
   * Mirrors {@link buildSendMaxTransaction} (manual assembly + locally priced
   * fee) rather than `engine.createTransaction`, which can't sign for a foreign
   * address without per-UTXO key material.
   */
  async buildDepinPubkeyRevealTransaction(opts: {
    depinAddress: string;
    depinWif: string;
    utxos: SpendableUtxo[];
    burnAddress: string;
    amountSats: bigint;
    /** Hardware wallet: sign each input's sighash on the device (no local WIF). */
    device?: NeuraiESP32 | null;
  }): Promise<{ signedHex: string; feeSats: bigint; changeSats: bigint }> {
    const { depinAddress, depinWif, burnAddress, amountSats, device } = opts;
    // The wallet service sends no scripts, and both signers need the prevout's:
    // the software signer refuses an empty one, and a device would sign a
    // sighash over an empty scriptCode that the node then rejects.
    const depinScript = Buffer.from(encodeDestinationScript(depinAddress)).toString('hex');
    const utxos = opts.utxos
      .filter(u => (u.assetName === 'XNA' || !u.assetName) && u.satoshis > 0 && u.address === depinAddress)
      .map(u => ({ ...u, script: u.script || depinScript }));
    if (utxos.length === 0) throw new Error('No spendable XNA at the DePIN address');
    const totalIn = utxos.reduce((sum, u) => sum + u.satoshis, 0n);

    const feeRateXnaPerKb = await this.estimateFeeRate();
    let feeSats = estimateNeuraiFeeSats(
      utxos.map(u => u.script),
      [burnAddress, depinAddress],
      feeRateXnaPerKb,
    );
    let changeSats = totalIn - amountSats - feeSats;
    if (changeSats < 0) throw new Error('Insufficient funds at the DePIN address to cover the burn and fee');
    // Fold a sub-dust change into the fee rather than emitting an unspendable output.
    if (changeSats > 0 && changeSats < SEND_DUST_SATS) {
      feeSats += changeSats;
      changeSats = 0n;
    }

    const payments: { address: string; valueSats: bigint }[] = [{ address: burnAddress, valueSats: BigInt(amountSats) }];
    if (changeSats > 0) payments.push({ address: depinAddress, valueSats: BigInt(changeSats) });

    const { rawTx } = createPaymentTransaction({
      inputs: utxos.map(u => ({ txid: u.txid, vout: u.outputIndex })),
      payments,
    });

    let signedHex: string;
    if (!depinWif && device) {
      // Hardware wallet: the DePIN key never leaves the device. Sign each legacy
      // P2PKH sighash on-device (same `hashForSignature` primitive the signing
      // library uses) and assemble the scriptSig from the DER sig + pubkey.
      signedHex = await this.signDepinRevealWithDevice(rawTx, utxos, device);
    } else {
      // The DePIN address is foreign to the engine, so supply its WIF directly.
      const privateKeys: Record<string, unknown> = { [depinAddress]: depinWif };
      signedHex = signNeuraiTransaction(
        signerNetworkFor(this.getEngineNetwork()),
        rawTx,
        utxos as unknown as Parameters<typeof signNeuraiTransaction>[2],
        privateKeys as Parameters<typeof signNeuraiTransaction>[3],
      );
    }
    if (!signedHex) throw new Error('Failed to sign the DePIN reveal transaction');

    return { signedHex, feeSats, changeSats };
  }

  /**
   * Sign a legacy P2PKH DePIN-reveal transaction by routing each input's sighash
   * to the device (which holds the account-100' key). Assembles the standard
   * `<sig|SIGHASH_ALL> <pubkey>` scriptSig. The device confirms each signature
   * physically. All inputs belong to the single DePIN address, so one pubkey
   * signs them all.
   */
  private async signDepinRevealWithDevice(rawTx: string, utxos: SpendableUtxo[], device: NeuraiESP32): Promise<string> {
    const tx = bitcoin.Transaction.fromHex(rawTx);
    const byOutpoint = new Map(utxos.map(u => [`${u.txid}:${u.outputIndex}`, u]));
    const SIGHASH_ALL = bitcoin.Transaction.SIGHASH_ALL;

    for (let i = 0; i < tx.ins.length; i++) {
      const input = tx.ins[i];
      // `input.hash` is the txid in internal (reversed) byte order.
      const prevTxid = Buffer.from(input.hash).reverse().toString('hex');
      const u = byOutpoint.get(`${prevTxid}:${input.index}`);
      if (!u) throw new Error('DePIN reveal: could not map an input to a DePIN UTXO');

      const prevScript = Buffer.from(u.script, 'hex');
      // Only a legacy P2PKH prevout can be signed this way; never ask the owner
      // to approve a signature the node would reject.
      const p2pkh = bitcoin.payments.p2pkh({ output: prevScript });
      if (!p2pkh.hash) throw new Error('DePIN reveal: the DePIN UTXO is not a legacy P2PKH output');
      const sighash = tx.hashForSignature(i, prevScript, SIGHASH_ALL);
      const { signature, pubkey } = await device.depinSignDigest(Buffer.from(sighash).toString('hex'));
      if (!Buffer.from(bitcoin.crypto.hash160(Buffer.from(pubkey, 'hex'))).equals(Buffer.from(p2pkh.hash))) {
        throw new Error('DePIN reveal: the device key does not control the DePIN address');
      }

      const sigWithType = Buffer.concat([Buffer.from(signature, 'hex'), Buffer.from([SIGHASH_ALL])]);
      const scriptSig = bitcoin.script.compile([sigWithType, Buffer.from(pubkey, 'hex')]);
      tx.setInputScript(i, scriptSig);
    }

    return tx.toHex();
  }

  async broadcastTx(rawHex: string): Promise<string> {
    const txid = await this._broadcast(rawHex);
    // A next send must not reuse the change address this one paid.
    try {
      this._advanceAddresses(this._paidOwnAddresses(rawHex));
    } catch (err) {
      console.debug('broadcastTx: own outputs not read', err);
    }
    return txid;
  }

  private async _broadcast(rawHex: string): Promise<string> {
    const primary = this.getBackend();
    try {
      return await primary.broadcast(rawHex);
    } catch (err) {
      console.warn(`[Neurai] primary broadcast failed (kind=${primary.kind}):`, describeBackendError(err));
      // The WSS service surfaces only a generic "broadcast failed" (code 1005)
      // and discards the node's real reason. Fall back to a direct node RPC,
      // which returns the descriptive reject reason (and relays the tx if the
      // failure was WSS-specific rather than a true node rejection).
      if (primary.kind === 'rpc') throw new Error(describeBackendError(err));
      try {
        const txid = await primary.rpc<string>('sendrawtransaction', [rawHex]);
        console.warn('[Neurai] RPC fallback broadcast OK:', txid);
        return txid;
      } catch (rpcErr) {
        const reason = describeBackendError(rpcErr);
        console.warn('[Neurai] RPC fallback broadcast failed:', reason);
        // Surface the node's descriptive reason instead of WSS's "broadcast failed".
        throw new Error(reason);
      }
    }
  }

  /** Local XNA/1,000-vbyte policy, including the 20% margin. */
  async estimateFeeRate(_targetBlocks: number = FEE_TARGET_BLOCKS): Promise<number> {
    return LOCAL_FEE_RATE_XNA_PER_KB;
  }

  // ---------- helpers --------------------------------------------------------------

  private _historyItemToTransaction(
    item: IHistoryItem,
    _deltas: IDelta[],
    blockTimes: Record<number, number>,
    tipHeight: number,
  ): Transaction {
    return historyItemToTransaction(item, blockTimes, tipHeight, Math.floor(Date.now() / 1000));
  }

  // ---------- AbstractWallet `allow*` overrides ------------------------------------

  allowSend(): boolean {
    return true;
  }

  allowReceive(): boolean {
    return true;
  }

  allowPayJoin(): boolean {
    return false;
  }

  allowSilentPaymentSend(): boolean {
    return false;
  }

  allowCosignPsbt(): boolean {
    return false;
  }

  allowSignVerifyMessage(): boolean {
    return false;
  }

  allowMasterFingerprint(): boolean {
    return false;
  }

  allowBIP47(): boolean {
    return false;
  }

  allowXpub(): boolean {
    return false;
  }

  async allowOnchainAddress(): Promise<boolean> {
    return true;
  }
}
