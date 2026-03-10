import BigNumber from 'bignumber.js';
import { sha256 } from '@noble/hashes/sha256';
import { ArkadeSwaps, BoltzSwapProvider, decodeInvoice, PendingSwap, migrateToSwapRepository } from '@arkade-os/boltz-swap';
import {
  SingleKey,
  MnemonicIdentity,
  Ramps,
  Wallet,
  ExtendedCoin,
  ArkTransaction,
  RestArkProvider,
  RestIndexerProvider,
  migrateWalletRepository,
  requiresMigration,
  rollbackMigration,
} from '@arkade-os/sdk';
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

  // fees from Boltz:
  private _limitMin: number = 0;
  private _limitMax: number = 0;
  private _feePercentage: number = 0;

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

      const mm = new Measure('Wallet.create()');
      if (!staticWalletCache[namespace]) {
        const wallet = await Wallet.create({
          identity,
          arkProvider: new RestArkProvider(this._arkServerUrl),
          indexerProvider: new RestIndexerProvider(this._arkServerUrl),
          arkServerPublicKey: this._arkServerPublicKey,
          storage: { walletRepository, contractRepository },
        });
        staticWalletCache[namespace] = wallet;
      }

      mm.end();
      this._wallet = staticWalletCache[namespace];

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
      const hasLegacyData = await AsyncStorage.getItem(`${namespace}_wallet:state`);
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
          // nop, this is invoice that we created
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

    // Build a set of amounts from settled Lightning receive swaps so we can
    // skip the duplicate Ark transaction history entries (the claimed VTXO
    // shows up in both _swapHistory and _transactionsHistory).
    const swapReceiveAmounts = new Map<number, number>();
    for (const swap of this._swapHistory) {
      if (swap.status === 'invoice.settled') {
        // @ts-ignore properties do exist
        const amt: number = swap.response.onchainAmount || swap.response.expectedAmount || 0;
        swapReceiveAmounts.set(amt, (swapReceiveAmounts.get(amt) || 0) + 1);
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

      let description: string;
      if (histTx.key.boardingTxid) {
        description = 'Refill';
      } else if (histTx.type === 'RECEIVED') {
        description = 'Received';
      } else {
        description = 'Sent';
      }

      // Sent transactions are always considered settled (matching reference app behavior).
      // Received transactions use the actual settled flag from the Ark SDK.
      const isSettled = histTx.type === 'SENT' ? true : histTx.settled;

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

    this._swapHistory = await this._arkadeSwaps.getSwapHistory();
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    await this._attemptBoardUtxos();

    const balance = await this._wallet.getBalance();
    this._lastBalanceFetch = +new Date();
    this.balance = balance.available;
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
  }

  async getUserInvoices(limit: number | false = false): Promise<LightningTransaction[]> {
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
    // This is fire-and-forget: the UI polls for balance/invoice changes separately.
    this._arkadeSwaps
      .waitAndClaim(result.pendingSwap)
      .then(() => {
        console.log('Reverse swap claimed successfully for invoice:', result.invoice);
      })
      .catch(err => {
        // WebSocket may close after the swap is already claimed — this is expected
        console.warn('waitAndClaim ended with error (swap may already be claimed):', err?.message ?? err);
      });

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
