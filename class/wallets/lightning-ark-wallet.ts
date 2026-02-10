import BigNumber from 'bignumber.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';
import { ArkadeLightning, BoltzSwapProvider, decodeInvoice, PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap';
import { SingleKey, VtxoManager, Ramps, Wallet, ExtendedCoin, ArkTransaction } from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
import { fetch } from '../../util/fetch';

import BIP32Factory from 'bip32';

import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { LightningTransaction, Transaction } from './types.ts';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import assert from 'assert';
import ecc from '../../blue_modules/noble_ecc.ts';
import { Measure } from '../measure.ts';
const { bech32m } = require('bech32');

const bip32 = BIP32Factory(ecc);

const staticWalletCache: Record<string, Wallet> = {};
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

  private _wallet: Wallet | undefined;
  private _arkadeLightning: ArkadeLightning | undefined = undefined;
  private _arkServerUrl: string = 'https://arkade.computer';
  private _arkServerPublicKey: string = '022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba';
  private _boltzApiUrl: string = 'https://api.ark.boltz.exchange';

  private _swapHistory: (PendingReverseSwap | PendingSubmarineSwap)[] = [];
  private _transactionsHistory: ArkTransaction[] = [];
  private _claimedSwaps: Record<string, boolean> = {};
  private _privateKeyCache = '';
  private _boardingUtxos: ExtendedCoin[] = [];

  // fees from Boltz:
  private _limitMin: number = 0;
  private _limitMax: number = 0;
  private _feePercentage: number = 0;

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
    return this.hashIt(this.secret);
  }

  async init() {
    const namespace = this.getNamespace();

    if (initLock[namespace]) {
      let c = 0;
      while (!this._wallet || !this._arkadeLightning) {
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

      await this._initLightningSwaps();

      // initialize VTXO manager in set timeout so it doesnt block the wallet initialization
      setTimeout(async () => {
        const manager = new VtxoManager(staticWalletCache[namespace], {
          enabled: true, // Enable expiration monitoring
        });
        try {
          const expiringVtxos = await manager.getExpiringVtxos();
          if (expiringVtxos.length > 0) {
            console.log(`ARK renewing ${expiringVtxos.length} expiring VTXOs...`);
            const renewTxid = await manager.renewVtxos();
            console.log('ARK VTXO renewed:', renewTxid);
          }
        } catch (error: any) {
          console.log('ARK Error renewing VTXOs:', error.message);
        }
      }, 1_000);
    } finally {
      initLock[namespace] = false;
    }
  }

  async _initLightningSwaps() {
    assert(this._wallet, 'Ark wallet must be initialized first');
    assert(this._boltzApiUrl, 'Boltz Api Url is not set');

    // fetching fees boltz takes:
    const feesResponse = await fetch(this._boltzApiUrl + '/v2/swap/submarine');
    const feesResponseJson = await feesResponse.json();
    this._limitMin = feesResponseJson?.ARK?.BTC?.limits?.minimal ?? 333;
    this._limitMax = feesResponseJson?.ARK?.BTC?.limits?.maximal ?? 1000000;
    this._feePercentage = feesResponseJson?.ARK?.BTC?.fees?.percentage ?? 0;
    if (!feesResponseJson?.ARK?.BTC?.fees?.percentage) {
      console.log('warning: unexpected fees response from boltz:', JSON.stringify(feesResponseJson, null, 2));
    }

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

      if (this._claimedSwaps[swap.id]) {
        ispaid = true;
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
      if (histTx.key.boardingTxid && histTx.type === 'RECEIVED' && histTx.settled) {
        // for now putting on the list only onchain top-up transactions:
        ret.push({
          type: 'bitcoind_tx',
          walletID,
          description: 'Refill',
          memo: 'Refill',
          value: histTx.amount,
          timestamp: Math.floor(histTx.createdAt / 1000),
        });
      }
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
    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async _attemptToClaimPendingVHTLCs() {
    assert(this._wallet, 'Ark wallet not initialized');
    assert(this._arkadeLightning, 'Ark Lightning not initialized');
    const arkadeLightning = this._arkadeLightning;

    const pendingReverseSwaps = await this._arkadeLightning.getPendingReverseSwaps();
    if ((pendingReverseSwaps ?? []).length > 0) console.log('got', pendingReverseSwaps?.length ?? [], 'pending swaps');

    await Promise.all(
      (pendingReverseSwaps ?? []).map(async swap => {
        if (this._claimedSwaps[swap.id]) return;

        console.log(`claiming ${swap.id}...`);
        if (swap?.response?.timeoutBlockHeights?.refund && swap?.response?.timeoutBlockHeights?.refund <= Date.now() / 1000) {
          console.log(`skipping ${swap.id} (too old)`);
          return;
        }
        try {
          await arkadeLightning.claimVHTLC(swap);
          console.log('claimed!');
          this._claimedSwaps[swap.id] = true;
        } catch (error: any) {
          console.log(`could not claim ${swap.id}:`, error.message);
        }
      }),
    );
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    if (this._arkadeLightning) {
      await this._attemptToClaimPendingVHTLCs();
    }

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

    assert(this._arkadeLightning, 'Ark Lightning not initialized');

    const invoiceDetails = decodeInvoice(invoice);

    console.log('Invoice amount:', invoiceDetails.amountSats, 'sats');
    console.log('Description:', invoiceDetails.description);
    console.log('Payment Hash:', invoiceDetails.paymentHash);

    assert(invoiceDetails.amountSats > this._limitMin, `Minimum you can send is ${this._limitMin} sat`);
    assert(invoiceDetails.amountSats < this._limitMax, `Maximum you can is ${this._limitMax} sat`);

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
    assert(amt > this._limitMin, `Minimum to receive is ${this._limitMin} sat`);
    assert(amt < this._limitMax, `Maximum to receive is ${this._limitMin} sat`);

    // fee percentage is smth like `0.01`, but its not 1%, its one-hundredth of a percent, rounded up
    const serviceFee = Math.ceil(new BigNumber(amt).multipliedBy(this._feePercentage).dividedBy(100).toNumber());

    const result = await this._arkadeLightning.createLightningInvoice({
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
