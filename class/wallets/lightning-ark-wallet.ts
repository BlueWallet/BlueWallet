import BigNumber from 'bignumber.js';
import {
  ArkadeSwaps,
  BoltzSwapProvider,
  decodeInvoice,
  BoltzSwap,
  BoltzReverseSwap,
  isPendingReverseSwap,
  isPendingSubmarineSwap,
  isReverseFinalStatus,
  isSubmarineFinalStatus,
} from '@arkade-os/boltz-swap';
import {
  SingleKey,
  MnemonicIdentity,
  Ramps,
  Wallet,
  ExtendedCoin,
  ArkTransaction,
  isSpendable,
  RestDelegatorProvider,
} from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
import {
  RealmWalletRepository,
  RealmContractRepository,
  RealmSwapRepository,
  getArkadeRealm,
} from '../../blue_modules/arkade-adapters/realm';
import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { LightningTransaction, Transaction } from './types.ts';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import assert from 'assert';
import { Measure } from '../measure.ts';
import { clearNamespaceTasks, enqueueSwapTask, reconcileSwapTasks } from '../../blue_modules/arkade-adapters/background/swap-queue';
import type { SwapProcessorDeps } from '../../blue_modules/arkade-adapters/background/swap-processor';
import { registerArkadeBackgroundTask, unregisterArkadeBackgroundTask } from '../../blue_modules/arkade-adapters/background/task-scheduler';
import { startPolling, stopPolling } from '../../blue_modules/arkade-adapters/background/foreground-poller';
import type { TWallet } from './types';
const { bech32, bech32m } = require('bech32');

const staticWalletCache: Record<string, Wallet> = {};
const staticSwapsCache: Record<string, ArkadeSwaps> = {};
const initLock: Record<string, boolean> = {};
const boardingLock: Record<string, boolean> = {};

export class LightningArkWallet extends LightningCustodianWallet {
  static readonly type = 'lightningArkWallet';
  static readonly typeReadable = 'Lightning Ark';
  static readonly subtitleReadable = 'Ark';
  // @ts-ignore: override
  public readonly type = LightningArkWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = LightningArkWallet.typeReadable;

  // _wallet and _arkadeSwaps are defined as non-enumerable in the constructor
  // so that Object.assign (used by saveToDisk) skips them during serialization,
  // avoiding the need to clear them in prepareForSerialization (which races
  // with the background sync timer).
  private _wallet!: Wallet | undefined;
  private _arkadeSwaps!: ArkadeSwaps | undefined;
  private _arkServerUrl: string = 'https://arkade.computer';
  private _delegatorUrl: string = 'https://delegate.arkade.money';
  private _arkServerPublicKey: string = '022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba';

  private _boltzApiUrl: string = 'https://api.ark.boltz.exchange';

  // Per-wallet random identifier used as the key for the Realm file path,
  // Keychain service, and swap-queue task IDs. Lazily generated on first
  // getNamespace() call and persisted on the next saveToDisk(). Was once
  // sha256(secret), but that leaked wallet existence in plaintext
  // AsyncStorage / filesystem / keychain — undermining plausible deniability.
  private _taskNamespace: string = '';

  constructor() {
    super();
    // Non-enumerable so Object.assign (serialization) skips these runtime-only fields
    Object.defineProperty(this, '_wallet', { enumerable: false, writable: true, value: undefined });
    Object.defineProperty(this, '_arkadeSwaps', { enumerable: false, writable: true, value: undefined });
  }

  private _swapHistory: BoltzSwap[] = [];
  private _transactionsHistory: ArkTransaction[] = [];
  private _boardingUtxos: ExtendedCoin[] = [];

  // fees from Boltz:
  private _limitMin: number = 0;
  private _limitMax: number = 0;
  private _feePercentage: number = 0;

  /**
   * Returns true if the amount is within Boltz swap limits for Lightning invoices.
   * If limits haven't been fetched yet, returns false (Ark-only fallback).
   */
  isLightningAmountEligible(amt: number): boolean {
    if (!this._limitMin || !this._limitMax) return false;
    console.log(`[ARK] isLightningAmountEligible(${amt}): min=${this._limitMin}, max=${this._limitMax}`);
    return amt >= this._limitMin && amt <= this._limitMax;
  }

  // fetchTransactions / fetchBalance throttle for 30s using these timestamps.
  // Resetting to 0 forces the next call to bypass the throttle and refetch.
  // Call after any operation that changed wallet state (sent/paid/claimed).
  invalidateTxCache(): void {
    this._lastTxFetch = 0;
  }

  invalidateBalanceCache(): void {
    this._lastBalanceFetch = 0;
  }

  prepareForSerialization() {
    // No-op: _wallet and _arkadeSwaps are non-enumerable, so Object.assign
    // (used by saveToDisk) already excludes them from the serialized clone.
  }

  _getIdentity() {
    assert(this.secret, 'No secret provided');

    if (this.secret.startsWith('nsec1')) {
      // nsec import: NIP-19 bech32-encoded raw private key
      const decoded = bech32.decode(this.secret, 1000);
      const privKeyBytes = new Uint8Array(bech32.fromWords(decoded.words));
      return SingleKey.fromPrivateKey(privKeyBytes);
    }

    // Default: mnemonic-based identity with BIP86 derivation
    const mnemonic = this.secret.replace('arkade://', '').trim();
    return MnemonicIdentity.fromMnemonic(mnemonic, { isMainnet: true });
  }

  getNamespace(): string {
    if (!this._taskNamespace) {
      const bytes = new Uint8Array(16);
      (globalThis as any).crypto.getRandomValues(bytes);
      this._taskNamespace = uint8ArrayToHex(bytes);
    }
    return this._taskNamespace;
  }

  // Ark wallets have no on-chain external addresses to subscribe for GroundControl
  // push notifications. Returning [] makes upstream subscribe/unsubscribe call sites
  // a no-op without needing to type-sniff the wallet.
  getAllExternalAddresses(): string[] {
    return [];
  }

  // ---- Background lifecycle (formerly hooks/useArkadeBackgroundSync.ts) ----
  //
  // The class owns the registration of the background task scheduler and the
  // foreground poller. A single static `syncBackground(walletsProvider)` call,
  // re-invoked whenever the wallets list changes, registers when the first Ark
  // wallet appears and tears down when the last one is removed. Background
  // callbacks read the current wallets via the stored provider so they always
  // see the live list.

  private static _walletsProvider: (() => TWallet[]) | null = null;
  private static _backgroundRegistered: boolean = false;
  private static _tickInFlight: WeakSet<LightningArkWallet> = new WeakSet();
  private static _prevNamespaces: Set<string> = new Set();

  static async syncBackground(walletsProvider: () => TWallet[]): Promise<void> {
    LightningArkWallet._walletsProvider = walletsProvider;
    const arkWallets = walletsProvider().filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];
    const currentNamespaces = new Set(arkWallets.map(w => w.getNamespace()));

    // Prune tasks for any Ark wallet removed since the last sync — keeps surviving
    // wallets' monitoring intact. The "last wallet gone" case falls out naturally.
    for (const ns of LightningArkWallet._prevNamespaces) {
      if (!currentNamespaces.has(ns)) {
        await clearNamespaceTasks(ns).catch(e => console.log('[ArkadeSync] Cleanup failed:', e));
      }
    }
    LightningArkWallet._prevNamespaces = currentNamespaces;

    if (arkWallets.length > 0 && !LightningArkWallet._backgroundRegistered) {
      LightningArkWallet._backgroundRegistered = true;
      // Init each Ark wallet so reconcileBackgroundTasks (called inside init) queues any pending swaps.
      await Promise.all(arkWallets.map(w => w.init().catch(e => console.log('[ArkadeSync] Bootstrap init failed:', e))));
      await registerArkadeBackgroundTask(LightningArkWallet._buildDeps).catch(e => console.log('[ArkadeSync] Registration failed:', e));
      startPolling({ onTick: LightningArkWallet._onTick });
      return;
    }

    if (arkWallets.length === 0 && LightningArkWallet._backgroundRegistered) {
      LightningArkWallet._backgroundRegistered = false;
      await unregisterArkadeBackgroundTask().catch(e => console.log('[ArkadeSync] Unregistration failed:', e));
      stopPolling();
    }
  }

  private static _buildDeps = async (): Promise<Map<string, SwapProcessorDeps>> => {
    const depsMap = new Map<string, SwapProcessorDeps>();
    const wallets = LightningArkWallet._walletsProvider?.() ?? [];
    const arkWallets = wallets.filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];

    for (const wallet of arkWallets) {
      try {
        await wallet.init();
        depsMap.set(wallet.getNamespace(), wallet.getProcessorDeps());
      } catch (error) {
        console.log('[ArkadeSync] Failed to build deps for wallet:', error);
      }
    }
    return depsMap;
  };

  // Refresh every Ark wallet on each foreground tick so direct Ark payments to
  // any wallet are detected, not just the currently-selected one.
  private static _onTick = (): void => {
    const wallets = LightningArkWallet._walletsProvider?.() ?? [];
    const arkWallets = wallets.filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];

    for (const wallet of arkWallets) {
      if (LightningArkWallet._tickInFlight.has(wallet)) continue;
      LightningArkWallet._tickInFlight.add(wallet);

      Promise.all([wallet.fetchBalance(), wallet.fetchTransactions()])
        .catch(e => console.log('[ArkadeSync] Refresh error:', e))
        .finally(() => LightningArkWallet._tickInFlight.delete(wallet));
    }
  };

  async init() {
    const namespace = this.getNamespace();

    if (initLock[namespace]) {
      let c = 0;
      while (!this._wallet || !this._arkadeSwaps) {
        await new Promise(resolve => setTimeout(resolve, 500)); // sleep
        if (c++ > 30) {
          throw new Error('Ark wallet initialization timed out');
        }
      }
      initLock[namespace] = false;
      return; // wallet is initialized, so we can return
    }

    initLock[namespace] = true;

    try {
      const realm = await getArkadeRealm(namespace);
      const walletRepository = new RealmWalletRepository(realm as any);
      const contractRepository = new RealmContractRepository(realm as any);
      const swapRepository = new RealmSwapRepository(realm as any);

      if (!staticWalletCache[namespace]) {
        // Identity derivation runs PBKDF2 (BIP39 seed) — only pay it on a real cache miss.
        const identity = this._getIdentity();
        const mm = new Measure('Wallet.create()');
        const wallet = await Wallet.create({
          identity,
          arkProvider: new ExpoArkProvider(this._arkServerUrl),
          indexerProvider: new ExpoIndexerProvider(this._arkServerUrl),
          delegatorProvider: new RestDelegatorProvider(this._delegatorUrl),
          arkServerPublicKey: this._arkServerPublicKey,
          storage: { walletRepository, contractRepository },
        });
        staticWalletCache[namespace] = wallet;
        mm.end();
      }
      this._wallet = staticWalletCache[namespace];

      await this._initLightningSwaps(swapRepository);

      // Reconcile background tasks for any pending swaps (handles app startup + wallet restore)
      this.reconcileBackgroundTasks().catch(e => console.log('[ARK] Background task reconcile failed:', e));
    } finally {
      initLock[namespace] = false;
    }
  }

  private async _fetchBoltzFeesAndLimits() {
    assert(this._arkadeSwaps, 'ArkadeSwaps must be initialized first');
    try {
      const [fees, limits] = await Promise.all([this._arkadeSwaps.getFees(), this._arkadeSwaps.getLimits()]);
      this._feePercentage = fees.reverse.percentage ?? 0;
      this._limitMin = limits.min ?? 333;
      this._limitMax = limits.max ?? 1000000;
    } catch (e) {
      console.log('[ARK] Failed to fetch Boltz fees/limits:', e);
    }
  }

  async _initLightningSwaps(swapRepository: InstanceType<typeof RealmSwapRepository>) {
    assert(this._wallet, 'Ark wallet must be initialized first');
    assert(this._boltzApiUrl, 'Boltz Api Url is not set');

    const namespace = this.getNamespace();

    // Reuse existing ArkadeSwaps instance (and its SwapManager) for this namespace
    if (staticSwapsCache[namespace]) {
      this._arkadeSwaps = staticSwapsCache[namespace];
      if (!this._feePercentage) {
        await this._fetchBoltzFeesAndLimits();
      }
      return;
    }

    // Initialize the Lightning swap provider
    const swapProvider = new BoltzSwapProvider({
      apiUrl: this._boltzApiUrl,
      network: 'bitcoin',
    });

    // Create the ArkadeSwaps instance with Realm-backed swap repository
    this._arkadeSwaps = new ArkadeSwaps({
      wallet: this._wallet,
      swapProvider,
      swapRepository,
    });

    staticSwapsCache[namespace] = this._arkadeSwaps;

    await this._fetchBoltzFeesAndLimits();
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'arkade://' + bip39.entropyToMnemonic(uint8ArrayToHex(buf));

    await this.init();
  }

  getSecret() {
    return this.secret;
  }

  getTransactions(): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const ret: LightningTransaction[] = [];
    for (const swap of this._swapHistory) {
      let memo = '';
      let value = 0;
      let timestamp = 0;
      let payment_hash = '';
      let bolt11invoice = '';
      let direction = 1;
      let ispaid = false;
      let expiry = 3600;

      try {
        // @ts-ignore properties do exist
        bolt11invoice = swap.request.invoice || swap.response.invoice;
        const invoiceDetails = this.decodeInvoice(bolt11invoice);
        value = invoiceDetails.num_satoshis;
        memo = invoiceDetails.description;
        payment_hash = invoiceDetails.payment_hash;
        expiry = invoiceDetails.expiry;
      } catch {}

      timestamp = swap.createdAt;

      switch (swap.status) {
        case 'transaction.claimed':
          direction = -1;
          ispaid = true;
          break;
        case 'invoice.settled':
          direction = 1;
          ispaid = true;
          break;
        case 'swap.created':
          // This is a Lightning invoice we created but hasn't been paid yet.
          // Hide it once the invoice has expired (it will never settle).
          if (timestamp + expiry < Math.floor(Date.now() / 1000)) continue;
          break;
        case 'invoice.set':
          // dont return it, its an invoice we trief to pay but could not
          continue;
      }

      // @ts-ignore properties do exist
      value = swap.response.onchainAmount || swap.response.expectedAmount || value || swap.request.invoiceAmount || 0;
      value = value * direction;

      ret.push({
        type: direction < 0 ? 'paid_invoice' : 'user_invoice',
        walletID,
        description: memo,
        memo,
        value,
        timestamp,
        ispaid,
        payment_hash,
        payment_request: bolt11invoice,
        amt: value,
        payment_preimage: swap.preimage,
        expire_time: expiry,
      });
    }

    // Track settled Lightning swap amounts so we can skip duplicate Ark
    // transaction history entries. Reverse swaps duplicate RECEIVED entries;
    // submarine swaps duplicate SENT entries.
    const swapReceiveAmounts = new Map<number, number>();
    const settledReceiveSwapAmounts = new Set<number>();
    const swapSendAmounts = new Map<number, number>();
    for (const swap of this._swapHistory) {
      if (isPendingReverseSwap(swap) && swap.status === 'invoice.settled') {
        const amt = swap.response.onchainAmount || 0;
        swapReceiveAmounts.set(amt, (swapReceiveAmounts.get(amt) || 0) + 1);
        settledReceiveSwapAmounts.add(amt);
        continue;
      }

      if (isPendingSubmarineSwap(swap) && swap.status === 'transaction.claimed') {
        const amt = swap.response.expectedAmount || 0;
        swapSendAmounts.set(amt, (swapSendAmounts.get(amt) || 0) + 1);
      }
    }

    for (const boardingTx of this._boardingUtxos) {
      ret.push({
        type: 'bitcoind_tx',
        walletID,
        description: 'Pending refill',
        memo: 'Pending refill',
        value: boardingTx.value,
        timestamp: boardingTx.status.block_time ?? Math.floor(Date.now() / 1000),
      });
    }

    for (const histTx of this._transactionsHistory) {
      // Skip RECEIVED non-boarding entries that are already covered by a
      // swap history entry (Lightning receives via Boltz reverse swap).
      if (histTx.type === 'RECEIVED' && !histTx.key.boardingTxid) {
        const count = swapReceiveAmounts.get(histTx.amount);
        if (count && count > 0) {
          swapReceiveAmounts.set(histTx.amount, count - 1);
          continue;
        }
      }

      // Skip SENT non-boarding entries that are already covered by a
      // swap history entry (Lightning payments via Boltz submarine swap).
      if (histTx.type === 'SENT' && !histTx.key.boardingTxid) {
        const count = swapSendAmounts.get(histTx.amount);
        if (count && count > 0) {
          swapSendAmounts.set(histTx.amount, count - 1);
          continue;
        }
      }

      let description: string;
      if (histTx.key.boardingTxid) {
        description = 'Refill';
      } else if (histTx.type === 'RECEIVED') {
        description = 'Received';
      } else {
        description = 'Sent';
      }

      // Sent transactions are always considered settled (matching reference app behavior).
      // Received transactions use the actual settled flag from the Ark SDK,
      // but also consider the transaction settled if a matching swap is already
      // settled (the Ark SDK may lag behind the swap status).
      const isSettled = histTx.type === 'SENT' ? true : histTx.settled || settledReceiveSwapAmounts.has(histTx.amount);

      ret.push({
        type: 'bitcoind_tx',
        walletID,
        description,
        memo: description,
        value: histTx.type === 'SENT' ? -histTx.amount : histTx.amount,
        timestamp: Math.floor(histTx.createdAt / 1000),
        confirmations: isSettled ? 3 : 0,
      });
    }

    // @ts-ignore meh
    return ret;
  }

  async fetchUserInvoices() {
    // nop
  }

  async fetchTransactions() {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');
    if (!this._arkadeSwaps) throw new Error('Ark Swaps not initialized');

    // Skip if we fetched recently (within 30s)
    const now = +new Date();
    if (this._lastTxFetch && now - this._lastTxFetch < 30000) {
      return;
    }

    this._swapHistory = await this._arkadeSwaps.getSwapHistory();
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    // Skip if we fetched recently (within 30s) to avoid hammering the indexer
    const now = +new Date();
    if (this._lastBalanceFetch && now - this._lastBalanceFetch < 30000) {
      return;
    }

    // Fire-and-forget: boarding UTXOs are only used for display in getTransactions(),
    // so we don't need to block the balance fetch on them.
    this._attemptBoardUtxos().catch(e => console.log('[ARK] boarding check failed:', e.message));

    try {
      await this._withTimeout(async () => {
        const vtxos = await this._wallet!.getVtxos();
        this.balance = vtxos.filter(isSpendable).reduce((sum, v) => sum + v.value, 0);
        this._lastBalanceFetch = +new Date();
      }, 15000);
    } catch {
      console.warn('[ARK] fetchBalance timed out, using cached balance');
    }
  }

  private async _withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`[ARK] Operation timed out after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([fn(), timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  getBalance() {
    return this.balance;
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
      this.invalidateBalanceCache();
      this.invalidateTxCache();
      return;
    }

    assert(this._arkadeSwaps, 'Ark Swaps not initialized');

    const invoiceDetails = decodeInvoice(invoice);

    console.log('Invoice amount:', invoiceDetails.amountSats, 'sats');
    console.log('Description:', invoiceDetails.description);
    console.log('Payment Hash:', invoiceDetails.paymentHash);

    assert(invoiceDetails.amountSats > this._limitMin, `Minimum you can send is ${this._limitMin} sat`);
    assert(invoiceDetails.amountSats < this._limitMax, `Maximum you can is ${this._limitMax} sat`);

    const paymentResult = await this._arkadeSwaps.sendLightningPayment({
      invoice,
    });

    console.log('Payment successful!');
    console.log('Amount:', paymentResult.amount);
    console.log('Preimage:', paymentResult.preimage);
    console.log('Transaction ID:', paymentResult.txid);

    this.invalidateBalanceCache();
    this.invalidateTxCache();
  }

  async getUserInvoices(limit: number | false = false): Promise<LightningTransaction[]> {
    this.invalidateTxCache();
    await this.fetchTransactions();
    const txs = this.getTransactions();
    return txs.filter(tx => tx.value! > 0);
  }

  async addInvoice(amt: number, memo: string): Promise<string> {
    const { invoice } = await this.createReverseSwap(amt, memo);
    return invoice;
  }

  /**
   * Create a Lightning-to-Ark reverse swap and return both the invoice and the
   * pending swap. Consumers drive settlement by calling waitAndClaim(pendingSwap);
   * the swap is also seeded into the background queue so it is monitored even if
   * the app is killed.
   */
  async createReverseSwap(amt: number, memo: string): Promise<{ invoice: string; pendingSwap: BoltzReverseSwap }> {
    if (!this._wallet) await this.init();
    assert(this._arkadeSwaps, 'Ark Swaps not initialized');
    assert(amt > this._limitMin, `Minimum to receive is ${this._limitMin} sat`);
    assert(amt < this._limitMax, `Maximum to receive is ${this._limitMin} sat`);

    // fee percentage is smth like `0.01`, but its not 1%, its one-hundredth of a percent, rounded up
    const serviceFee = Math.ceil(new BigNumber(amt).multipliedBy(this._feePercentage).dividedBy(100).toNumber());

    const result = await this._arkadeSwaps.createLightningInvoice({
      amount: amt + serviceFee,
      description: memo,
    });

    console.log('Expiry (seconds):', result.expiry);
    console.log('Lightning Invoice:', result.invoice);
    console.log('Payment Hash:', result.paymentHash);

    await this._seedSwapTask(result.pendingSwap.id);

    return { invoice: result.invoice, pendingSwap: result.pendingSwap };
  }

  /**
   * Wait for a pending reverse swap to be paid, then claim the VHTLC. Refreshes
   * local swap history on success so getTransactions() reflects settlement.
   * Delegates WebSocket reconnection + polling fallback to @arkade-os/boltz-swap.
   */
  async waitAndClaim(pendingSwap: BoltzReverseSwap): Promise<void> {
    if (!this._arkadeSwaps) await this.init();
    assert(this._arkadeSwaps, 'Ark Swaps not initialized');
    await this._arkadeSwaps.waitAndClaim(pendingSwap);
    await this._arkadeSwaps.refreshSwapsStatus();
    this._swapHistory = await this._arkadeSwaps.getSwapHistory();
    this.invalidateTxCache();
  }

  /** Look up an in-flight reverse swap by its ID. Primary entry for the
   *  view-invoice screen arriving from create-invoice with swapId in params. */
  async getPendingReverseSwapById(swapId: string): Promise<BoltzReverseSwap | undefined> {
    if (!this._arkadeSwaps) await this.init();
    assert(this._arkadeSwaps, 'Ark Swaps not initialized');
    const history = await this._arkadeSwaps.getSwapHistory();
    return history.find(
      s => isPendingReverseSwap(s) && !isReverseFinalStatus(s.status) && s.id === swapId,
    ) as BoltzReverseSwap | undefined;
  }

  /** Fallback lookup by invoice string for entry paths without a swap ID
   *  (e.g. tapping a pending invoice from the transactions list). */
  async getPendingReverseSwapByInvoice(invoiceStr: string): Promise<BoltzReverseSwap | undefined> {
    if (!this._arkadeSwaps) await this.init();
    assert(this._arkadeSwaps, 'Ark Swaps not initialized');
    const history = await this._arkadeSwaps.getSwapHistory();
    return history.find(
      s => isPendingReverseSwap(s) && !isReverseFinalStatus(s.status) && s.response.invoice === invoiceStr,
    ) as BoltzReverseSwap | undefined;
  }

  async getArkAddress(): Promise<string> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark not initialized');
    return await this._wallet.getAddress();
  }

  async fetchPendingTransactions() {
    // nop
  }

  /**
   * Subscribe to real-time incoming fund notifications (VTXOs + boarding UTXOs).
   * Returns a stop function to unsubscribe.
   */
  async notifyIncomingFunds(callback: (event: { type: string; newVtxos?: any[]; coins?: any[] }) => void): Promise<() => void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');
    return this._wallet.notifyIncomingFunds(callback);
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

  async createAccount(isTest: boolean = false) {
    // nop
  }

  accessTokenExpired() {
    return false;
  }

  refreshTokenExpired() {
    return false;
  }

  private async _attemptBoardUtxos() {
    // executing in background since it can take a lot of time, but setting the lock so there wont be any races
    // (for example, during another pull-to-refresh)
    const namespace = this.getNamespace();
    if (boardingLock[namespace]) return;

    if (!this._wallet) return;

    boardingLock[namespace] = true;
    this._boardingUtxos = await this._wallet.getBoardingUtxos(); // calling it here so fetchBalance will pick it up and then `getTransactions` will show it in tx list
    (async () => {
      if (this._boardingUtxos.length > 0) {
        if (!this._wallet) return;
        // not instantiating, this is supposed to be called inside `fetchBalance`
        console.log('attempting to board ', this._boardingUtxos.length, 'UTXOs...');
        const info = await this._wallet.arkProvider.getInfo();
        const feeInfo = info.fees;
        await new Ramps(this._wallet).onboard(feeInfo, this._boardingUtxos);
        this._boardingUtxos = await this._wallet.getBoardingUtxos(); // refetch UTXOs, if we succeeded boarding previosuly the set should be reduced
      }
    })()
      .catch(e => console.log('ark boarding failed:', e.message))
      .finally(() => {
        boardingLock[namespace] = false;
      });
  }

  /**
   * Return the SwapProcessorDeps needed by the background swap-monitor processor.
   * Throws if init() hasn't populated _wallet/_arkadeSwaps — both call sites
   * await init() immediately before calling this, so the throw signals a real
   * regression in init's invariants rather than masking it with a silent null.
   */
  getProcessorDeps(): SwapProcessorDeps {
    if (!this._wallet || !this._arkadeSwaps) {
      throw new Error('getProcessorDeps called before init() completed');
    }

    const swapProvider = new BoltzSwapProvider({
      apiUrl: this._boltzApiUrl,
      network: 'bitcoin',
    });

    return {
      swapRepository: this._arkadeSwaps.swapRepository,
      swapProvider,
      wallet: this._wallet,
    };
  }

  /**
   * Reconcile the background task queue against the current set of pending swaps.
   * Call on app startup, wallet import/restore, and periodically.
   */
  async reconcileBackgroundTasks(): Promise<void> {
    if (!this._arkadeSwaps) return;

    const namespace = this.getNamespace();
    const allSwaps = await this._arkadeSwaps.getSwapHistory();

    const pendingSwapIds = allSwaps
      .filter(swap => {
        if (isPendingReverseSwap(swap)) return !isReverseFinalStatus(swap.status);
        if (isPendingSubmarineSwap(swap)) return !isSubmarineFinalStatus(swap.status);
        return false;
      })
      .map(swap => swap.id);

    await reconcileSwapTasks(namespace, pendingSwapIds, {
      arkServerUrl: this._arkServerUrl,
      boltzApiUrl: this._boltzApiUrl,
      network: 'bitcoin',
    });
  }

  /**
   * Seed a background task for a newly created pending swap.
   */
  private async _seedSwapTask(swapId: string): Promise<void> {
    try {
      await enqueueSwapTask({
        namespace: this.getNamespace(),
        swapId,
        arkServerUrl: this._arkServerUrl,
        boltzApiUrl: this._boltzApiUrl,
        network: 'bitcoin',
      });
    } catch (error) {
      console.log('[ARK] Failed to seed swap task:', error);
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
}
