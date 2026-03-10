import { sha256 } from '@noble/hashes/sha256';
import { SingleKey, VtxoManager, Ramps, Wallet, ExtendedCoin, ArkTransaction, RestArkProvider, RestIndexerProvider } from '@arkade-os/sdk';
import { RealmWalletRepository, RealmContractRepository, getArkadeRealm } from '../../blue_modules/arkade-adapters/realm';

import BIP32Factory from 'bip32';

import { AbstractWallet } from './abstract-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { Transaction } from './types.ts';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import assert from 'assert';
import ecc from '../../blue_modules/noble_ecc.ts';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
const { bech32, bech32m } = require('bech32');

const bip32 = BIP32Factory(ecc);

const staticWalletCache: Record<string, Wallet> = {};
const initLock: Record<string, boolean> = {};
const boardingLock: Record<string, boolean> = {};

export class ArkWallet extends AbstractWallet {
  static readonly type = 'arkWallet';
  static readonly typeReadable = 'Ark';
  static readonly subtitleReadable = 'Ark';
  // @ts-ignore: override
  public readonly type = ArkWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = ArkWallet.typeReadable;

  private _wallet: Wallet | undefined;
  private _arkServerUrl: string = 'https://arkade.computer';
  private _arkServerPublicKey: string = '022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba';

  private _transactionsHistory: ArkTransaction[] = [];
  private _privateKeyCache = '';
  private _boardingUtxos: ExtendedCoin[] = [];

  // overrides from AbstractWallet:
  user_invoices_raw: any[] = [];

  constructor() {
    super();
    this.chain = Chain.OFFCHAIN;
    this.preferredBalanceUnit = BitcoinUnit.SATS;
  }

  hashIt = (s: string): string => {
    return uint8ArrayToHex(sha256(s));
  };

  prepareForSerialization() {
    this._wallet = undefined;
  }

  _getIdentity() {
    assert(this.secret, 'No secret provided');

    if (this.secret.startsWith('nsec1')) {
      // nsec import: NIP-19 bech32-encoded raw private key
      const decoded = bech32.decode(this.secret, 1000);
      const privKeyBytes = new Uint8Array(bech32.fromWords(decoded.words));
      return SingleKey.fromPrivateKey(privKeyBytes);
    }

    if (!this._privateKeyCache) {
      const mnemonic = this.secret.replace('ark://', '').trim();
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
      while (!this._wallet) {
        await new Promise(resolve => setTimeout(resolve, 500)); // sleep
        if (c++ > 30) {
          throw new Error('Ark wallet initialization timed out');
        }
      }
      initLock[namespace] = false;
      return;
    }

    initLock[namespace] = true;

    try {
      const identity = this._getIdentity();

      const realm = await getArkadeRealm(namespace);
      const walletRepository = new RealmWalletRepository(realm as any);
      const contractRepository = new RealmContractRepository(realm as any);

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

      this._wallet = staticWalletCache[namespace];

      // initialize VTXO manager in set timeout so it doesnt block the wallet initialization
      setTimeout(async () => {
        const manager = new VtxoManager(staticWalletCache[namespace], {
          enabled: true,
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

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'ark://' + bip39.entropyToMnemonic(uint8ArrayToHex(buf));

    await this.init();
  }

  setSecret(newSecret: string): this {
    this.secret = newSecret.trim();
    return this;
  }

  getSecret() {
    return this.secret;
  }

  timeToRefreshBalance(): boolean {
    return +new Date() - this._lastBalanceFetch >= 5 * 60 * 1000;
  }

  timeToRefreshTransaction(): boolean {
    return +new Date() - this._lastTxFetch >= 5 * 60 * 1000;
  }

  getAddress(): string | false {
    return this._address || false;
  }

  async getAddressAsync(): Promise<string | false | undefined> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark not initialized');
    this._address = await this._wallet.getAddress();
    return this._address;
  }

  getTransactions(): Transaction[] {
    const ret: Transaction[] = [];

    for (const boardingTx of this._boardingUtxos) {
      ret.push({
        txid: boardingTx.txid + ':' + boardingTx.vout,
        hash: boardingTx.txid,
        value: boardingTx.value,
        time: boardingTx.status.block_time ?? Math.floor(Date.now() / 1000),
        confirmations: boardingTx.status.confirmed ? 1 : 0,
        inputs: [],
        outputs: [],
      } as unknown as Transaction);
    }

    for (const histTx of this._transactionsHistory) {
      const txid = histTx.key.boardingTxid || (histTx.key as any).roundTxid || String(histTx.createdAt);
      ret.push({
        txid,
        hash: txid,
        value: histTx.type === 'RECEIVED' ? histTx.amount : -histTx.amount,
        time: Math.floor(histTx.createdAt / 1000),
        confirmations: histTx.settled ? 1 : 0,
        inputs: [],
        outputs: [],
      } as unknown as Transaction);
    }

    return ret;
  }

  async fetchTransactions() {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    this._transactionsHistory = await this._wallet.getTransactionHistory();
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(): Promise<void> {
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

  async payInvoice(address: string, amount: number = 0) {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    assert(this.isAddressValid(address), 'Invalid Ark address');

    await this._wallet.sendBitcoin({
      address,
      amount,
    });
  }

  async allowOnchainAddress() {
    return true;
  }

  async fetchBtcAddress() {
    if (!this._wallet) await this.init();
    assert(this._wallet, 'Ark wallet not initialized');

    return await this._wallet.getBoardingAddress();
  }

  allowSend(): boolean {
    return true;
  }

  allowReceive(): boolean {
    return true;
  }

  isInvoiceGeneratedByWallet(_paymentRequest: string): boolean {
    return false;
  }

  weOwnAddress(address: string): boolean {
    return this._address === address;
  }

  weOwnTransaction(_txid: string): boolean {
    return this._transactionsHistory.some(tx => (tx.key.boardingTxid || (tx.key as any).roundTxid) === _txid);
  }

  private async _attemptBoardUtxos() {
    const namespace = this.getNamespace();
    if (boardingLock[namespace]) return;

    if (!this._wallet) return;

    boardingLock[namespace] = true;
    this._boardingUtxos = await this._wallet.getBoardingUtxos();
    (async () => {
      if (this._boardingUtxos.length > 0) {
        if (!this._wallet) return;
        console.log('attempting to board ', this._boardingUtxos.length, 'UTXOs...');
        const info = await this._wallet.arkProvider.getInfo();
        const feeInfo = info.fees;
        await new Ramps(this._wallet).onboard(feeInfo, this._boardingUtxos);
        this._boardingUtxos = await this._wallet.getBoardingUtxos();
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
