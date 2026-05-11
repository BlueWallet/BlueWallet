import BigNumber from 'bignumber.js';
import { sha256 } from '@noble/hashes/sha256';
import {
  ArkadeSwaps,
  BoltzReverseSwap,
  BoltzSubmarineSwap,
  BoltzSwap,
  BoltzSwapProvider,
  SubmarineRefundOutcome,
  decodeInvoice,
  isChainSwapClaimable,
  isChainSwapRefundable,
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
  static readonly typeReadable = 'Lightning Ark';
  static readonly subtitleReadable = 'Ark';
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

  constructor() {
    super();
    Object.defineProperty(this, '_wallet', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_arkadeSwaps', { value: undefined, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(this, '_namespaceCache', { value: undefined, writable: true, enumerable: false, configurable: true });
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
          this.balance = balance.available;
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
      this._limitMin = limits.min ?? 333;
      this._limitMax = limits.max ?? 1_000_000;
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
   * Single source of activity for the BlueWallet transaction list,
   * coalesced from three feeds:
   *
   * 1. `_swapHistory` (Boltz). Branch on the `swap.type` discriminator:
   *    - `reverse`   → Lightning RECEIVE (`user_invoice`).
   *    - `submarine` → Lightning SEND (`payment_request` while pending,
   *      `paid_invoice` once `transaction.claimed`).
   *    - `chain`     → not surfaced (no LN-shaped UX entry point yet).
   *    Settlement signal is `LightningTransaction.ispaid`; we never invent
   *    a `confirmations` field for an LN/Ark row.
   *
   * 2. `_transactionsHistory` (Ark SDK):
   *    - `key.boardingTxid && type==='RECEIVED' && settled` → "Refill" row.
   *    - `key.boardingTxid` (other types/statuses) → suppressed.
   *    - no `boardingTxid` → native Ark transfer; SENT renders negative,
   *      RECEIVED renders positive.
   *
   * 3. `_boardingUtxos` → "Pending refill" rows (boarding UTXO not yet swept).
   *
   * Coalescing: a settled swap always produces an Ark-side tx in
   * `_transactionsHistory` — reverse `invoice.settled` is Boltz claiming
   * into our address, submarine `transaction.claimed` is our lockup being
   * claimed by Boltz. The native-Ark pass therefore drops any history
   * entry whose `(direction, |amount|)` matches a *settled* swap within
   * ±30 minutes of `swap.createdAt`. We do NOT dedupe against
   * pending/failed/refunded swaps — those don't guarantee an Ark-side leg
   * and matching against them would hide unrelated native transfers of
   * the same amount.
   *
   * Stable row ids: every row sets `txid` to a logical id that survives
   * status transitions — `swap-<id>`, `boarding-<txid>`,
   * `boarding-utxo-<txid>:<vout>`, `ark-<arkTxid|commitmentTxid>`. FlatList
   * still keys by index today, but the field is the canonical key for any
   * future consumer.
   *
   * Hidden states:
   * - Submarine `invoice.set` → dropped (no funds at risk yet).
   * - Submarine `swap.expired` / `invoice.expired` → kept with a `Failed: `
   *   prefix; SDK classifies them as refundable so the user needs the row
   *   to recover an on-chain lockup.
   * - Reverse expired-unpaid invoices (`type === 'reverse'` AND `!ispaid`
   *   AND `!memoPrefix` AND `expiry+timestamp < now`) are dropped. The
   *   expiry guard is gated to (a) reverse only — submarine pending rows
   *   may have on-chain locked funds that need recovery visibility — and
   *   (b) non-terminal rows so a `Failed: ` / `Refunded: ` row whose
   *   BOLT11 has since expired is still preserved for diagnosis.
   * - Failed/refunded swaps stay visible with `ispaid:false` and a
   *   `Failed: ` / `Refunded: ` memo prefix so support can diagnose them.
   */
  getTransactions(): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const ret: any[] = [];
    const nowSec = Math.floor(Date.now() / 1000);
    const DEDUP_WINDOW_SEC = 30 * 60;

    type SwapFingerprint = { type: TxType; amount: number; createdAtSec: number };
    const swapFingerprints: SwapFingerprint[] = [];

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
        switch (swap.status) {
          case 'invoice.settled':
            ispaid = true;
            break;
          case 'transaction.failed':
          case 'transaction.lockupFailed':
          case 'transaction.refunded':
            memoPrefix = 'Failed: ';
            break;
          // swap.created / transaction.mempool / transaction.confirmed → pending receive
          // invoice.expired / swap.expired → handled by the unpaid-expired filter below
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

      // Hide expired unpaid reverse invoices only. Three exclusions:
      // 1. Terminal rows (`Failed: ` / `Refunded: `) carry diagnostic value
      //    beyond the BOLT11 lifetime — we keep them.
      // 2. Submarine pending rows are NEVER hidden: by the time a submarine
      //    swap reaches `invoice.pending` / `invoice.paid` /
      //    `transaction.claim.pending`, the user's lockup is on-chain.
      //    Hiding the row before the SDK transitions it to swap.expired or
      //    transaction.refunded would lose visibility into recoverable
      //    locked funds.
      // 3. Without a decoded expiry we can't reason about freshness, so the
      //    row stays visible.
      if (swap.type === 'reverse' && !ispaid && !memoPrefix && expiry !== undefined && expiry > 0 && timestamp + expiry < nowSec) continue;

      // Pre-record the fingerprint so the native-Ark pass below can suppress
      // the matching SDK history entry. Only settled swaps are guaranteed to
      // have an Ark-side counterpart: reverse settles by
      // Boltz claiming into our address, submarine settles by our lockup
      // being claimed by Boltz. Pending/failed/refunded rows aren't
      // guaranteed to produce an Ark leg, and recording their fingerprints
      // would hide unrelated same-amount native transfers in the ±30 min
      // window.
      if (ispaid) {
        swapFingerprints.push({
          type: direction < 0 ? TxType.TxSent : TxType.TxReceived,
          amount: absValue,
          createdAtSec: timestamp,
        });
      }

      ret.push({
        txid: `swap-${swap.id}`,
        type,
        walletID,
        description: memoPrefix + memo,
        memo: memoPrefix + memo,
        value,
        timestamp,
        ispaid,
        payment_hash,
        payment_request: bolt11invoice,
        amt: value,
        // @ts-ignore preimage is required for reverse, optional for submarine
        payment_preimage: swap.preimage,
        expire_time: expiry ?? 3600,
      });
    }

    for (const boardingTx of this._boardingUtxos) {
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

    for (const histTx of this._transactionsHistory) {
      if (histTx.key.boardingTxid) {
        // Boarding leg: keep the existing "settled refill only" rule.
        if (histTx.type === TxType.TxReceived && histTx.settled) {
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

      // Native Ark transfer. Skip the swap-side leg of any settlement we
      // already rendered as a Lightning row.
      const histAmount = Math.abs(histTx.amount);
      const histCreatedAtSec = Math.floor(histTx.createdAt / 1000);
      const matchesSwap = swapFingerprints.some(
        fp => fp.type === histTx.type && fp.amount === histAmount && Math.abs(fp.createdAtSec - histCreatedAtSec) <= DEDUP_WINDOW_SEC,
      );
      if (matchesSwap) continue;

      const idKey = histTx.key.arkTxid || histTx.key.commitmentTxid || `${histTx.type}-${histCreatedAtSec}-${histAmount}`;
      const direction = histTx.type === TxType.TxSent ? -1 : 1;
      const description = histTx.type === TxType.TxSent ? 'Sent' : 'Received';
      ret.push({
        txid: `ark-${idKey}`,
        type: 'bitcoind_tx',
        walletID,
        description,
        memo: description,
        value: histAmount * direction,
        timestamp: histCreatedAtSec,
      });
    }

    return ret;
  }

  async fetchUserInvoices() {
    // nop
  }

  async fetchTransactions() {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');
    if (!this._arkadeSwaps) throw new Error('ArkadeSwaps not initialized');

    this._swapHistory = await this._arkadeSwaps.getSwapHistory();
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    await this._attemptBoardUtxos();

    const balance = await this._wallet.getBalance();
    this._lastBalanceFetch = +new Date();
    // Use SDK `total` (offchain available + recoverable + boarding) so the
    // headline balance reflects everything the user holds, including pending
    // refills. `available` alone hides boarding deposits until they swap.
    this.balance = balance.total;
  }

  async payInvoice(invoice: string, freeAmount: number = 0) {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

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

    const paymentResult = await this._arkadeSwaps.sendLightningPayment({ invoice });

    console.log('Payment successful!');
    console.log('Amount:', paymentResult.amount);
    console.log('Preimage:', paymentResult.preimage);
    console.log('Transaction ID:', paymentResult.txid);
  }

  async getUserInvoices(): Promise<LightningTransaction[]> {
    await this.fetchTransactions();
    const txs = this.getTransactions();
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

    return result.invoice;
  }

  async getArkAddress(): Promise<string> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark not initialized');
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
    assert(this._wallet, 'Ark wallet not initialized');

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
    return this.getTransactions().some(tx => tx.payment_request === paymentRequest && typeof tx.value !== 'undefined' && tx?.value >= 0);
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

  // Per-swap claim/refund + import-time restore.
  // These are thin wrappers over `ArkadeSwaps`. We do not add app-side polling
  // or reliability layers — the SDK owns swap reliability internally
  // (claimVHTLC waits for VTXO availability; refundVHTLC reports
  // swept/skipped). UI code calls these from the swap detail screen.

  getSwapById(id: string): BoltzSwap | undefined {
    return this._swapHistory.find(swap => swap.id === id);
  }

  isSwapClaimable(swap: BoltzSwap): boolean {
    return isReverseSwapClaimable(swap) || isChainSwapClaimable(swap);
  }

  isSwapRefundable(swap: BoltzSwap): boolean {
    return isSubmarineSwapRefundable(swap) || isChainSwapRefundable(swap);
  }

  async claimSwap(swap: BoltzReverseSwap): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._arkadeSwaps) throw new Error('ArkadeSwaps not initialized');
    await this._arkadeSwaps.claimVHTLC(swap);
    await this.fetchTransactions();
    await this.fetchBalance();
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
