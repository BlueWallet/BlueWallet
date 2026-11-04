import { sha256 } from '@noble/hashes/sha256';
import { RestDelegatorProvider, SingleKey, Wallet, ExtendedCoin, ArkTransaction, TxType } from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
import { RealmContractRepository, RealmWalletRepository } from '@arkade-os/sdk/repositories/realm';
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
import { refundStrandedSends } from '../../blue_modules/arkade-stranded-sends';
import { errorMessage } from '../../helpers/errorMessage';
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
const initInFlight: Map<string, Promise<Wallet>> = new Map();
const boardingLock: Record<string, boolean> = {};

// Test-only: exposes module-private caches so unit tests can observe / reset
// them and verify deletion-vs-init race behavior. Not part of the public API.
export const __testing__ = {
  staticWalletCache,
  initInFlight,
  boardingLock,
};

const LIGHTNING_UNAVAILABLE = 'Lightning is temporarily unavailable on Arkade wallets';

/** display row built from SDK history / boarding utxos; see getTransactions() */
type ArkTxRow = LightningTransaction & { txid: string; walletID: string };

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
  // sha256(secret) is cheap but getNamespace is called on every init, delete,
  // and boarding poll. Memoize keyed by `secret` so a
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

  private _transactionsHistory: ArkTransaction[] = [];
  private _privateKeyCache = '';
  private _boardingUtxos: ExtendedCoin[] = [];

  constructor() {
    super();
    Object.defineProperty(this, '_wallet', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_namespaceCache', { value: undefined, writable: true, enumerable: false, configurable: true });
  }

  /**
   * Drops legacy Boltz-era keys restored from an old encrypted blob.
   * `AbstractWallet.fromJson` copies every stored key onto a fresh instance
   * with no schema, so they come back as stray enumerable properties and the
   * next `Object.assign` would write them straight back out. Runs on the live
   * wallet immediately before the clone; one save cycle and the blob is clean.
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

    if (this._wallet) return;

    const cachedWallet = staticWalletCache[namespace];
    if (cachedWallet) {
      this._wallet = cachedWallet;
      return;
    }

    let inFlight = initInFlight.get(namespace);
    if (!inFlight) {
      inFlight = (async () => {
        const realm = await getArkadeRealm(namespace);
        const walletRepository = new RealmWalletRepository(realm);
        const contractRepository = new RealmContractRepository(realm);

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
          } catch (e) {
            throw new Error(`Delegate service unreachable (${delegatorUrl}): ${errorMessage(e)}`);
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

        // Boltz has shut down, so a Lightning send it never resolved keeps the
        // user's sats in its lockup until the wallet refunds it (#8804: "the
        // failed invoices balance never came back"). Sweep once per fresh init
        // so an app launch is enough. Not awaited: a best-effort background
        // reconciliation, not a gate on wallet startup.
        this._refundStrandedSends(realm, wallet).catch((e: unknown) => {
          console.log('[ARK] stranded-send refund failed:', errorMessage(e));
        });

        return wallet;
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

    this._wallet = await inFlight;
  }

  // Refunds through the SDK alone. See blue_modules/arkade-stranded-sends.ts.
  private async _refundStrandedSends(realm: Realm, wallet: Wallet) {
    if (!(await refundStrandedSends(realm, wallet))) return;
    if (this._wallet === wallet) {
      await this.fetchBalance();
      await this.fetchTransactions();
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
   * Single source of activity for the BlueWallet transaction list. Two passes
   * build the result:
   *
   * 1. `_transactionsHistory` (Ark SDK) — the base rows:
   *    - `key.boardingTxid` is set ONLY on boarding outputs, so it is an
   *      exclusive refill discriminator: RECEIVED && settled → "Refill"
   *      (`boarding-<txid>`); other boarding states are suppressed (pending
   *      boarding is surfaced from `_boardingUtxos` in pass 2).
   *    - no `boardingTxid` → native Ark leg (`ark-<arkTxid|commitmentTxid>`),
   *      SENT negative / RECEIVED positive. Labeled "Lightning" by
   *      TransactionListItem.
   *
   * 2. `_boardingUtxos` → "Pending refill" rows (boarding UTXO not yet swept),
   *    with a live timestamp.
   *
   * Stable row ids survive status transitions: `boarding-<txid>`,
   * `boarding-utxo-<txid>:<vout>`, `ark-<arkTxid|commitmentTxid>`.
   */
  getTransactions(): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const ret: ArkTxRow[] = [];

    // Pass 1 — base rows from the SDK transaction history (single source of
    // truth). `key.boardingTxid` is set only on boarding outputs, so it is an
    // exclusive refill discriminator; every other entry is a native Ark leg.

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
      ret.push({
        txid: `ark-${idKey}`,
        type: 'bitcoind_tx',
        walletID,
        description,
        memo: description,
        value: absAmount * direction,
        timestamp: createdAtSec,
      });
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

    // rows carry only the lightning fields; callers treat them as the on-chain shape too
    return ret as (Transaction & LightningTransaction)[];
  }

  async fetchUserInvoices() {
    // nop
  }

  async fetchTransactions() {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Arkade wallet not initialized');

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

    throw new Error(LIGHTNING_UNAVAILABLE);
  }

  async getUserInvoices(): Promise<LightningTransaction[]> {
    return [];
  }

  async addInvoice(): Promise<string> {
    throw new Error(LIGHTNING_UNAVAILABLE);
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

  isInvoiceGeneratedByWallet() {
    return false;
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

  /**
   * Cleanup hook invoked when the wallet is removed from BlueWallet storage.
   * Drains any in-flight init so its post-await tail can no longer repopulate
   * staticWalletCache / realmInstances after we've cleared them, then closes the per-wallet Realm, deletes the Realm files, and
   * resets the Keychain entry. Errors are scoped here and never thrown to the
   * deletion path.
   */
  async onDelete(): Promise<void> {
    if (!this.secret) return; // nothing to clean
    const namespace = this.getNamespace();

    delete boardingLock[namespace];

    // If init() is racing with us, await its settlement before clearing caches.
    // Without this drain, the IIFE in init() would write to staticWalletCache
    // after our delete and the realm adapter would re-cache the open Realm,
    // resurrecting state for an already-deleted wallet. Note that the racing
    // init's `await inFlight` continuation runs *before* ours (it was registered
    // earlier), so when we resume here, init has already re-assigned
    // this._wallet and populated the cache.
    // We then clear everything in one pass.
    const inFlightInit = initInFlight.get(namespace);
    if (inFlightInit) {
      try {
        await inFlightInit;
      } catch {
        // init's caller already received the rejection; we just need it to settle.
      }
    }

    // Stop VtxoManager loops before tearing down storage so their background
    // timers / settlement polls don't keep running against a wallet whose Realm
    // we're about to delete.
    const cachedWallet = staticWalletCache[namespace];

    this._wallet = undefined;
    delete staticWalletCache[namespace];
    initInFlight.delete(namespace);

    // Type guards: real SDK objects always have dispose; unit-test stubs may not.
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
