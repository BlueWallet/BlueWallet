import BigNumber from 'bignumber.js';
import { sha256 } from '@noble/hashes/sha256';
import {
  ArkadeSwaps,
  BoltzSwapProvider,
  decodeInvoice,
  PendingSwap,
  PendingReverseSwap,
  migrateToSwapRepository,
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
  migrateWalletRepository,
  requiresMigration,
  rollbackMigration,
} from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { enqueueSwapTask, reconcileSwapTasks } from '../../blue_modules/arkade-adapters/background/swap-queue';
import type { SwapProcessorDeps } from '../../blue_modules/arkade-adapters/background/swap-processor';
const { bech32, bech32m } = require('bech32');

const staticWalletCache: Record<string, Wallet> = {};
const staticSwapsCache: Record<string, ArkadeSwaps> = {};
const initLock: Record<string, boolean> = {};
const boardingLock: Record<string, boolean> = {};
/** Track swap IDs that already have an active waitAndClaim listener. */
const observedSwapIds = new Set<string>();
/** Promises that resolve when a waitAndClaim completes for a given invoice. */
const claimPromises = new Map<string, Promise<void>>();

type SpendableArkVtxo = Awaited<ReturnType<Wallet['getVtxos']>>[number];
type SendBitcoinParams = Parameters<Wallet['sendBitcoin']>[0];
type PatchedWallet = Wallet & {
  __bluewalletOriginalSendBitcoin?: Wallet['sendBitcoin'];
  __bluewalletSendBitcoinHelper?: (params: SendBitcoinParams) => Promise<string>;
};

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

  constructor() {
    super();
    // Non-enumerable so Object.assign (serialization) skips these runtime-only fields
    Object.defineProperty(this, '_wallet', { enumerable: false, writable: true, value: undefined });
    Object.defineProperty(this, '_arkadeSwaps', { enumerable: false, writable: true, value: undefined });
  }

  private _swapHistory: PendingSwap[] = [];
  private _transactionsHistory: ArkTransaction[] = [];
  private _boardingUtxos: ExtendedCoin[] = [];
  private _contractsLoaded: boolean = false;

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

  hashIt = (s: string): string => {
    return uint8ArrayToHex(sha256(s));
  };

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
    assert(this.secret, 'No secret provided');
    return this.hashIt(this.secret);
  }

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
      const identity = this._getIdentity();

      const realm = await getArkadeRealm(namespace);
      const walletRepository = new RealmWalletRepository(realm as any);
      const contractRepository = new RealmContractRepository(realm as any);
      const swapRepository = new RealmSwapRepository(realm as any);

      if (!staticWalletCache[namespace]) {
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
      this._patchWalletRuntime();

      // Migration from legacy AsyncStorage to Realm
      const legacyStorage = {
        getItem: (key: string) => AsyncStorage.getItem(`${namespace}_${key}`),
        setItem: (key: string, value: string) => AsyncStorage.setItem(`${namespace}_${key}`, value),
        removeItem: (key: string) => AsyncStorage.removeItem(`${namespace}_${key}`),
        clear: async () => {
          const allKeys = await AsyncStorage.getAllKeys();
          const namespacedKeys = allKeys.filter(k => k.startsWith(`${namespace}_`));
          if (namespacedKeys.length > 0) {
            await AsyncStorage.multiRemove(namespacedKeys);
          }
        },
      };

      // Only attempt migration if legacy data actually exists in AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const hasLegacyData = allKeys.some(k => k.startsWith(`${namespace}_`));
      if (hasLegacyData) {
        // Migrate wallet data (vtxos, transactions, etc.)
        try {
          const needsWalletMigration = await requiresMigration('wallet', legacyStorage);
          if (needsWalletMigration) {
            console.log('[ARK] Migrating wallet data from AsyncStorage to Realm...');
            const boardingAddress = await this._wallet!.getBoardingAddress();
            const arkAddress = await this._wallet!.getAddress();
            await migrateWalletRepository(legacyStorage, walletRepository, {
              onchain: [boardingAddress],
              offchain: [arkAddress],
            });
            console.log('[ARK] Wallet migration complete');
          }
        } catch (error: any) {
          console.log('[ARK] Wallet migration failed, rolling back:', error.message);
          await rollbackMigration('wallet', legacyStorage);
        }

        // Migrate swap data (pending swaps, swap history)
        try {
          const swapsMigrated = await migrateToSwapRepository(legacyStorage, swapRepository);
          if (swapsMigrated) {
            console.log('[ARK] Swap data migrated to Realm');
          }
        } catch (error: any) {
          console.log('[ARK] Swap migration failed:', error.message);
        }
      }

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
      // Re-observe any pending swaps whose WebSocket may have died
      this._reobservePendingSwaps().catch(e => console.log('[ARK] Re-observe pending swaps failed:', e));
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

    // Re-observe any pending reverse swaps whose WebSocket listener may have died
    this._reobservePendingSwaps().catch(e => console.log('[ARK] Re-observe pending swaps failed:', e));
  }

  /**
   * Re-establish waitAndClaim() WebSocket listeners for pending reverse swaps.
   * This ensures that swaps created in a previous session (or before navigation)
   * can still be paid and claimed.
   */
  private async _reobservePendingSwaps(): Promise<void> {
    assert(this._arkadeSwaps, 'ArkadeSwaps must be initialized first');

    const allSwaps = await this._arkadeSwaps.getSwapHistory();

    for (const swap of allSwaps) {
      if (!isPendingReverseSwap(swap)) continue;
      if (isReverseFinalStatus(swap.status)) continue;
      if (observedSwapIds.has(swap.id)) continue;

      observedSwapIds.add(swap.id);
      console.log('[ARK] Re-observing pending reverse swap:', swap.id);

      // Extract the invoice string so waitForInvoicePayment() can find the promise
      // @ts-ignore response.invoice exists on reverse swaps
      const invoiceStr: string | undefined = swap.response?.invoice;

      const claimPromise = this._arkadeSwaps
        .waitAndClaim(swap as PendingReverseSwap)
        .then(async () => {
          console.log('[ARK] Re-observed swap claimed successfully:', swap.id);
          // Refresh swap statuses so getTransactions() returns settled status immediately
          if (this._arkadeSwaps) {
            await this._arkadeSwaps.refreshSwapsStatus();
            this._swapHistory = await this._arkadeSwaps.getSwapHistory();
            this._lastTxFetch = 0;
          }
        })
        .catch(err => {
          console.warn('[ARK] Re-observed waitAndClaim ended:', swap.id, err?.message ?? err);
        })
        .finally(() => {
          observedSwapIds.delete(swap.id);
          if (invoiceStr) claimPromises.delete(invoiceStr);
        });

      if (invoiceStr) {
        claimPromises.set(invoiceStr, claimPromise);
      }
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

    // Fast path: fetch with current script only (no contract manager).
    this._swapHistory = await this._arkadeSwaps.getSwapHistory();
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this.balance = this._getCorrectedBalance(this.balance);
    this._lastTxFetch = +new Date();

    // Background: init contract manager then re-fetch to include old non-delegate VTXOs.
    // Only needed once — after the first load, getScriptMap() already includes contracts.
    if (!this._contractsLoaded) {
      const wallet = this._wallet;
      const swaps = this._arkadeSwaps;
      wallet
        .getContractManager()
        .then(() => {
          this._contractsLoaded = true;
          return Promise.all([swaps.getSwapHistory(), wallet.getTransactionHistory()]);
        })
        .then(([swapHistory, txHistory]) => {
          this._swapHistory = swapHistory;
          this._transactionsHistory = txHistory;
          this.balance = this._getCorrectedBalance(this.balance);
          this._lastTxFetch = +new Date();
        })
        .catch(() => {});
    }
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
        const balance = await this._getAvailableBalance();
        this._lastBalanceFetch = +new Date();
        this.balance = this._getCorrectedBalance(balance);
      }, 15000);
    } catch {
      console.warn('[ARK] fetchBalance timed out, using cached balance');
    }
  }

  private async _getAvailableBalance(): Promise<number> {
    const vtxos = await this._getUnifiedSpendableVtxos();
    return vtxos.reduce((sum, vtxo) => sum + vtxo.value, 0);
  }

  private _patchWalletRuntime() {
    if (!this._wallet) return;

    const wallet = this._wallet as PatchedWallet;
    wallet.__bluewalletSendBitcoinHelper = (params: SendBitcoinParams) => this._sendBitcoinWithHiddenSubdustSupport(params);

    if (wallet.__bluewalletOriginalSendBitcoin) return;

    wallet.__bluewalletOriginalSendBitcoin = wallet.sendBitcoin.bind(wallet);
    wallet.sendBitcoin = async (params: SendBitcoinParams) => {
      if (wallet.__bluewalletSendBitcoinHelper) {
        return wallet.__bluewalletSendBitcoinHelper(params);
      }

      assert(wallet.__bluewalletOriginalSendBitcoin, 'Original sendBitcoin implementation missing');
      return wallet.__bluewalletOriginalSendBitcoin(params);
    };
  }

  private _getCorrectedBalance(visibleBalance: number): number {
    const derivedBalance = this._getDerivedBalanceFromCachedTransactions();
    if (visibleBalance === 0 && derivedBalance > 0) {
      return derivedBalance;
    }

    const hiddenSubdust = this._getHiddenSubdustAmount(visibleBalance);
    return visibleBalance + hiddenSubdust;
  }

  private _getHiddenSubdustAmount(visibleBalance: number): number {
    const derivedBalance = this._getDerivedBalanceFromCachedTransactions();
    const delta = derivedBalance - visibleBalance;

    if (delta > 0 && delta < this._getDustAmount()) {
      return delta;
    }

    return 0;
  }

  private _getDerivedBalanceFromCachedTransactions(): number {
    return this.getTransactions().reduce((sum, tx) => {
      if (typeof tx.value !== 'number') return sum;
      if (tx.type === 'user_invoice' && !tx.ispaid) return sum;
      return sum + tx.value;
    }, 0);
  }

  private _getDustAmount(): number {
    const dustAmount = this._wallet?.dustAmount;
    return typeof dustAmount === 'bigint' ? Number(dustAmount) : 330;
  }

  private async _getUnifiedSpendableVtxos(): Promise<SpendableArkVtxo[]> {
    const visibleVtxos = await this._getVisibleSpendableVtxos();
    const hiddenVtxo = await this._recoverHiddenSubdustVtxo(visibleVtxos);
    return hiddenVtxo ? this._dedupeVtxos(visibleVtxos, [hiddenVtxo]) : visibleVtxos;
  }

  private async _getVisibleSpendableVtxos(): Promise<SpendableArkVtxo[]> {
    assert(this._wallet, 'Ark wallet not initialized');

    const [regularVtxos, storedVtxos] = await Promise.all([this._wallet.getVtxos(), this._getStoredVtxos()]);

    return this._dedupeVtxos(regularVtxos, storedVtxos).filter(
      vtxo => isSpendable(vtxo) && (vtxo.virtualStatus.state === 'settled' || vtxo.virtualStatus.state === 'preconfirmed'),
    );
  }

  private _dedupeVtxos(...vtxoSets: SpendableArkVtxo[][]): SpendableArkVtxo[] {
    const uniqueVtxos = new Map<string, SpendableArkVtxo>();

    for (const vtxos of vtxoSets) {
      for (const vtxo of vtxos) {
        const key = `${vtxo.txid}:${vtxo.vout}`;
        const existing = uniqueVtxos.get(key);
        uniqueVtxos.set(key, existing ? { ...existing, ...vtxo } : vtxo);
      }
    }

    return Array.from(uniqueVtxos.values());
  }

  private async _recoverHiddenSubdustVtxo(visibleVtxos: SpendableArkVtxo[]): Promise<SpendableArkVtxo | null> {
    assert(this._wallet, 'Ark wallet not initialized');

    const visibleBalance = visibleVtxos.reduce((sum, vtxo) => sum + vtxo.value, 0);
    const hiddenSubdust = this._getHiddenSubdustAmount(visibleBalance);
    if (!hiddenSubdust) return null;

    const latestSentTx = [...this._transactionsHistory]
      .reverse()
      .find(tx => tx.type === 'SENT' && !tx.key.boardingTxid && !!tx.key.arkTxid);
    if (!latestSentTx) return null;

    const syntheticVtxo = this._buildSyntheticSubdustVtxo({
      txid: latestSentTx.key.arkTxid,
      value: hiddenSubdust,
      createdAt: latestSentTx.createdAt,
      commitmentTxid: latestSentTx.key.commitmentTxid,
      settled: latestSentTx.settled,
    });

    const alreadyVisible = visibleVtxos.some(vtxo => vtxo.txid === syntheticVtxo.txid && vtxo.vout === syntheticVtxo.vout);
    if (!alreadyVisible) {
      await this._saveSyntheticSubdustVtxo(syntheticVtxo);
    }

    return syntheticVtxo;
  }

  private async _saveSyntheticSubdustVtxo(vtxo: SpendableArkVtxo): Promise<void> {
    assert(this._wallet, 'Ark wallet not initialized');

    try {
      const arkAddress = await this._wallet.getAddress();
      await this._wallet.walletRepository.saveVtxos(arkAddress, [vtxo]);
    } catch (error: any) {
      console.log('[ARK] Failed to save synthetic subdust VTXO:', error?.message ?? error);
    }
  }

  private _buildSyntheticSubdustVtxo({
    txid,
    value,
    createdAt,
    commitmentTxid,
    settled,
  }: {
    txid: string;
    value: number;
    createdAt: number;
    commitmentTxid?: string;
    settled: boolean;
  }): SpendableArkVtxo {
    assert(this._wallet, 'Ark wallet not initialized');

    return {
      txid,
      vout: 1,
      value,
      createdAt: new Date(createdAt),
      forfeitTapLeafScript: this._wallet.offchainTapscript.forfeit(),
      intentTapLeafScript: this._wallet.offchainTapscript.forfeit(),
      isUnrolled: false,
      isSpent: false,
      tapTree: this._wallet.offchainTapscript.encode(),
      virtualStatus: settled
        ? { state: 'settled' }
        : {
            state: 'preconfirmed',
            commitmentTxIds: commitmentTxid ? [commitmentTxid] : undefined,
          },
      status: {
        confirmed: settled,
      },
    } as SpendableArkVtxo;
  }

  private async _sendBitcoinWithHiddenSubdustSupport(params: SendBitcoinParams): Promise<string> {
    assert(this._wallet, 'Ark wallet not initialized');

    const wallet = this._wallet as PatchedWallet;
    assert(wallet.__bluewalletOriginalSendBitcoin, 'Original sendBitcoin implementation missing');

    if (params.selectedVtxos && params.selectedVtxos.length > 0) {
      return wallet.__bluewalletOriginalSendBitcoin(params);
    }

    const [regularVtxos, unifiedVtxos] = await Promise.all([this._wallet.getVtxos(), this._getUnifiedSpendableVtxos()]);
    const regularVtxoKeys = new Set(regularVtxos.map(vtxo => `${vtxo.txid}:${vtxo.vout}`));

    try {
      const selection = this._selectSpendableVtxos(unifiedVtxos, params.amount);
      const usesRecoveredSubdust = selection.inputs.some(vtxo => !regularVtxoKeys.has(`${vtxo.txid}:${vtxo.vout}`));

      if (!usesRecoveredSubdust) {
        return wallet.__bluewalletOriginalSendBitcoin(params);
      }

      const txid = await wallet.__bluewalletOriginalSendBitcoin({
        ...params,
        selectedVtxos: selection.inputs,
      });

      if (selection.changeAmount > 0n && selection.changeAmount < BigInt(this._getDustAmount())) {
        await this._saveSyntheticSubdustVtxo(
          this._buildSyntheticSubdustVtxo({
            txid,
            value: Number(selection.changeAmount),
            createdAt: Date.now(),
            settled: selection.inputs.every(input => input.virtualStatus.state === 'settled'),
          }),
        );
      }

      return txid;
    } catch {
      return wallet.__bluewalletOriginalSendBitcoin(params);
    }
  }

  private _selectSpendableVtxos(vtxos: SpendableArkVtxo[], targetAmount: number): { inputs: SpendableArkVtxo[]; changeAmount: bigint } {
    const sortedVtxos = [...vtxos].sort((a, b) => {
      const expiryA = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
      const expiryB = b.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
      if (expiryA !== expiryB) {
        return expiryA - expiryB;
      }
      return b.value - a.value;
    });

    const selected: SpendableArkVtxo[] = [];
    let selectedAmount = 0;
    for (const vtxo of sortedVtxos) {
      selected.push(vtxo);
      selectedAmount += vtxo.value;
      if (selectedAmount >= targetAmount) break;
    }

    if (selectedAmount < targetAmount) {
      throw new Error('Insufficient funds');
    }

    return {
      inputs: selected,
      changeAmount: BigInt(selectedAmount - targetAmount),
    };
  }

  private async _getStoredVtxos() {
    assert(this._wallet, 'Ark wallet not initialized');

    try {
      const arkAddress = await this._wallet.getAddress();
      return await this._wallet.walletRepository.getVtxos(arkAddress);
    } catch (error: any) {
      console.log('[ARK] Failed to fetch stored VTXOs:', error?.message ?? error);
      return [];
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
      this._lastBalanceFetch = 0;
      this._lastTxFetch = 0;
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

    this._lastBalanceFetch = 0;
    this._lastTxFetch = 0;
  }

  async getUserInvoices(limit: number | false = false): Promise<LightningTransaction[]> {
    // Force refresh (bypass throttle) so newly created invoices are found
    this._lastTxFetch = 0;
    await this.fetchTransactions();
    const txs = this.getTransactions();
    return txs.filter(tx => tx.value! > 0);
  }

  async addInvoice(amt: number, memo: string) {
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

    // Monitor the swap in the background and claim the VHTLC when the payer pays the LN invoice.
    observedSwapIds.add(result.pendingSwap.id);
    const claimPromise = this._arkadeSwaps
      .waitAndClaim(result.pendingSwap)
      .then(async () => {
        console.log('Reverse swap claimed successfully for invoice:', result.invoice);
        // Refresh swap statuses from Boltz API then update local history
        // so getTransactions() returns the settled status immediately
        if (this._arkadeSwaps) {
          await this._arkadeSwaps.refreshSwapsStatus();
          this._swapHistory = await this._arkadeSwaps.getSwapHistory();
          this._lastTxFetch = 0;
        }
      })
      .catch(err => {
        // WebSocket may close after the swap is already claimed — this is expected
        console.warn('waitAndClaim ended with error (swap may already be claimed):', err?.message ?? err);
      })
      .finally(() => {
        observedSwapIds.delete(result.pendingSwap.id);
        claimPromises.delete(result.invoice);
      });
    claimPromises.set(result.invoice, claimPromise);

    // Seed a background task so the swap is monitored even if the app is killed
    await this._seedSwapTask(result.pendingSwap.id);

    return result.invoice;
  }

  /**
   * Returns a promise that resolves when the given LN invoice is paid and claimed.
   * Returns immediately if no pending claim exists for this invoice.
   */
  async waitForInvoicePayment(invoiceStr: string): Promise<void> {
    const promise = claimPromises.get(invoiceStr);
    if (promise) await promise;
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
   * Returns null if the wallet is not fully initialized.
   */
  getProcessorDeps(): SwapProcessorDeps | null {
    if (!this._wallet || !this._arkadeSwaps) return null;

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
