import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';
import {
  ArkadeLightning,
  BoltzSwapProvider,
  CreateLightningInvoiceResponse,
  decodeInvoice,
  PendingReverseSwap,
  PendingSubmarineSwap,
} from '@arkade-os/boltz-swap';
import { SingleKey, VtxoManager, Wallet } from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';

import BIP32Factory from 'bip32';

import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { LightningTransaction, Transaction } from './types.ts';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import assert from 'assert';
import ecc from '../../blue_modules/noble_ecc.ts';
import { Measure } from '../measure.ts';

const bip32 = BIP32Factory(ecc);

/**
 * fee taken by Boltz, currently hardcoded to 1 on their end
 */
const SERVICE_FEE = 1;

const staticWalletCache: Record<string, Wallet> = {};

export class LightningArkWallet extends LightningCustodianWallet {
  static readonly type = 'lightningArkWallet';
  static readonly typeReadable = 'Lightning Ark';
  static readonly subtitleReadable = 'Ark';
  // @ts-ignore: override
  public readonly type = LightningArkWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = LightningArkWallet.typeReadable;

  private _wallet: Wallet | undefined;
  private _arkadeLightning: ArkadeLightning | undefined = undefined;
  private _arkServerUrl: string = 'https://arkade.computer';
  private _arkServerPublicKey: string = '022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba';
  private _boltzApiUrl: string = 'https://api.ark.boltz.exchange';

  private _userInvoices: Record<string, LightningTransaction & { id?: string }> = {}; // LightningReceiveRequest id => LightningTransaction object; also transfer id (to be used for cross-referencing)
  private _createdInvoices: CreateLightningInvoiceResponse[] = [];
  private _swapHistory: (PendingReverseSwap | PendingSubmarineSwap)[] = [];
  private _claimedSwaps: Record<string, boolean> = {};
  private _privateKeyCache = '';

  hashIt = (s: string): string => {
    return uint8ArrayToHex(sha256(s));
  };

  prepareForSerialization() {
    this._wallet = undefined;
    this._arkadeLightning = undefined;
  }

  _getIdentity() {
    assert(this.secret, 'No secret provided');

    if (!this._privateKeyCache) {
      const mnemonic = this.secret;
      const m = new Measure('bip39.mnemonicToSeedSync');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      m.end();

      const mm = new Measure('derive path');
      const index = 0;
      const internal = 0;
      const accountNumber = 0;
      const root = bip32.fromSeed(seed);
      const path = `m/86'/0'/${accountNumber}'/${internal}/${index}`;
      const child = root.derivePath(path);
      mm.end();
      assert(child.privateKey, 'Internal error: no private key for child');

      this._privateKeyCache = uint8ArrayToHex(child.privateKey);
    }

    return SingleKey.fromPrivateKey(hexToUint8Array(this._privateKeyCache));
  }

  getNamespace(): string {
    assert(this.secret, 'No secret provided');
    return this.hashIt(this.secret);
  }

  async init() {
    const m = new Measure('getIdentity');
    const identity = this._getIdentity();
    m.end();
    const namespace = this.getNamespace();
    console.log({ namespace });

    class ArkCustomStorage {
      async getItem(key: string): Promise<string | null> {
        return await AsyncStorage.getItem(`${namespace}_${key}`);
      }

      async setItem(key: string, value: string): Promise<void> {
        return await AsyncStorage.setItem(`${namespace}_${key}`, value);
      }

      async removeItem(key: string): Promise<void> {
        await AsyncStorage.removeItem(`${namespace}_${key}`);
      }

      async clear(): Promise<void> {
        // nop
      }
    }

    const storage = new ArkCustomStorage();

    const mm = new Measure('Wallet.create()');
    if (!staticWalletCache[namespace]) {
      const wallet = await Wallet.create({
        storage,
        identity,
        arkProvider: new ExpoArkProvider(this._arkServerUrl),
        indexerProvider: new ExpoIndexerProvider(this._arkServerUrl),
        arkServerPublicKey: this._arkServerPublicKey,
      });
      staticWalletCache[namespace] = wallet;
    }

    mm.end();
    this._wallet = staticWalletCache[namespace];

    const mmm = new Measure('_initLightningSwaps');
    await this._initLightningSwaps();
    mmm.end();

    // initialize VTXO manager in set timeout so it doesnt block the wallet initialization
    setTimeout(async () => {
      const manager = new VtxoManager(staticWalletCache[namespace], {
        enabled: true, // Enable expiration monitoring
        thresholdPercentage: 10, // Alert when 10% of lifetime remains (default)
      });
      try {
        const txid = await manager.renewVtxos();
        console.log('ARK VTXO Renewed:', txid);
      } catch (error: any) {
        console.log('ARK Error renewing VTXOs:', error.message);
      }
    }, 1_000);
  }

  async _initLightningSwaps() {
    assert(this._wallet, 'Ark wallet must be initialized first');
    assert(this._boltzApiUrl, 'Boltz Api Url is not set');

    // Initialize the Lightning swap provider
    const swapProvider = new BoltzSwapProvider({
      apiUrl: this._boltzApiUrl,
      network: 'bitcoin',
    });

    // Create the ArkadeLightning instance
    this._arkadeLightning = new ArkadeLightning({
      wallet: this._wallet,
      swapProvider,
    });
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'ark://' + bip39.entropyToMnemonic(uint8ArrayToHex(buf));

    await this.init();
  }

  getSecret() {
    return this.secret;
  }

  getTransactions(): (Transaction & LightningTransaction)[] {
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
      }

      if (this._claimedSwaps[swap.id]) {
        ispaid = true;
      }

      // @ts-ignore properties do exist
      value = swap.response.expectedAmount || swap.response.onchainAmount || swap.request.invoiceAmount /* doesnt account for fee */ || 0;
      value = value * direction;

      ret.push({
        type: direction < 0 ? 'paid_invoice' : 'user_invoice',
        walletID: this.getID(),
        description: memo,
        memo,
        value,
        timestamp,
        ispaid,
        payment_hash,
        payment_request: bolt11invoice,
        amt: value,
        payment_preimage: swap.preimage,
        expire_time: timestamp + expiry,
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
    if (!this._arkadeLightning) throw new Error('Ark Lightning not initialized');

    this._swapHistory = await this._arkadeLightning.getSwapHistory();
    console.log('updated _swapHistory:', this._swapHistory);
    this._lastTxFetch = +new Date();
  }

  async _attemptToClaimPendingVHTLCs() {
    assert(this._wallet, 'Ark wallet not initialized');
    assert(this._arkadeLightning, 'Ark Lightning not initialized');

    const pendingReverseSwaps = await this._arkadeLightning.getPendingReverseSwaps();
    if ((pendingReverseSwaps ?? []).length > 0) console.log('got', pendingReverseSwaps?.length ?? [], 'pending swaps');

    for (const swap of pendingReverseSwaps ?? []) {
      if (this._claimedSwaps[swap.id]) continue;

      console.log(`claiming ${swap.id}...`);
      try {
        await this._arkadeLightning.claimVHTLC(swap);
        console.log('claimed!');
        this._claimedSwaps[swap.id] = true;
      } catch (error: any) {
        console.log('could not claim:', error.message);
      }
    }
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    if (this._arkadeLightning) {
      await this._attemptToClaimPendingVHTLCs();
    }

    const balance = await this._wallet.getBalance();
    this._lastBalanceFetch = +new Date();
    this.balance = balance.available;
  }

  getBalance() {
    return this.balance;
  }

  async payInvoice(invoice: string, freeAmount: number = 0) {
    if (!this._wallet) await this.init();
    assert(this._arkadeLightning, 'Ark Lightning not initialized');
    const invoiceDetails = decodeInvoice(invoice);

    console.log('Invoice amount:', invoiceDetails.amountSats, 'sats');
    console.log('Description:', invoiceDetails.description);
    console.log('Payment Hash:', invoiceDetails.paymentHash);

    const paymentResult = await this._arkadeLightning.sendLightningPayment({ invoice });

    console.log('Payment successful!');
    console.log('Amount:', paymentResult.amount);
    console.log('Preimage:', paymentResult.preimage);
    console.log('Transaction ID:', paymentResult.txid);
  }

  async getUserInvoices(limit: number | false = false): Promise<LightningTransaction[]> {
    if (this._arkadeLightning) {
      await this._attemptToClaimPendingVHTLCs();
    }
    await this.fetchTransactions();
    const txs = this.getTransactions();
    return txs.filter(tx => tx.value! > 0);
  }

  async addInvoice(amt: number, memo: string) {
    if (!this._wallet) await this.init();
    assert(this._arkadeLightning, 'Ark Lightning not initialized');
    assert(amt > 333, 'Only invoices > 333 sat allowed');

    const result = await this._arkadeLightning.createLightningInvoice({
      amount: amt + SERVICE_FEE,
      description: memo,
    });

    this._createdInvoices.push(result);

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

  async fetchInfo() {
    throw new Error('not implemented');
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
    if (!this._wallet) throw new Error('Ark wallet not initialized');

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
    // todo
    return Object.values(this._userInvoices).some(tx => tx.payment_request === paymentRequest);
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

  getAddress(): string | false {
    return false;
  }
}
