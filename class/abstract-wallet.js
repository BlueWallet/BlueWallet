import { BitcoinUnit, Chain } from '../models/bitcoinUnits';
const createHash = require('create-hash');

export class AbstractWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  static fromJson(obj) {
    let obj2 = JSON.parse(obj);
    let temp = new this();
    for (let key2 of Object.keys(obj2)) {
      temp[key2] = obj2[key2];
    }

    return temp;
  }

  constructor() {
    this.type = this.constructor.type;
    this.typeReadable = this.constructor.typeReadable;
    this.label = '';
    this.secret = ''; // private key or recovery phrase
    this.balance = 0;
    this.unconfirmed_balance = 0;
    this.transactions = [];
    this._address = false; // cache
    this.utxo = [];
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this.preferredBalanceUnit = BitcoinUnit.BTC;
    this.chain = Chain.ONCHAIN;
    this.hideBalance = false;
    this.userHasSavedExport = false;
  }

  getID() {
    return createHash('sha256')
      .update(this.getSecret())
      .digest()
      .toString('hex');
  }

  getTransactions() {
    return this.transactions;
  }

  getUserHasSavedExport() {
    return this.userHasSavedExport;
  }

  setUserHasSavedExport(value) {
    this.userHasSavedExport = value;
  }

  /**
   *
   * @returns {string}
   */
  getLabel() {
    if (this.label.trim().length === 0) {
      return 'Wallet';
    }
    return this.label;
  }

  getXpub() {
    return this._address;
  }

  /**
   *
   * @returns {number} Available to spend amount, int, in sats
   */
  getBalance() {
    return this.balance;
  }

  getPreferredBalanceUnit() {
    for (let value of Object.values(BitcoinUnit)) {
      if (value === this.preferredBalanceUnit) {
        return this.preferredBalanceUnit;
      }
    }
    return BitcoinUnit.BTC;
  }

  allowReceive() {
    return true;
  }

  allowSend() {
    return true;
  }

  allowSendMax(): boolean {
    return false;
  }

  allowRBF() {
    return false;
  }

  allowBatchSend() {
    return false;
  }

  allowHodlHodlTrading() {
    return false;
  }

  weOwnAddress(address) {
    throw Error('not implemented');
  }

  /**
   * Returns delta of unconfirmed balance. For example, if theres no
   * unconfirmed balance its 0
   *
   * @return {number}
   */
  getUnconfirmedBalance() {
    return this.unconfirmed_balance;
  }

  setLabel(newLabel) {
    this.label = newLabel;
    return this;
  }

  getSecret() {
    return this.secret;
  }

  setSecret(newSecret) {
    this.secret = newSecret
      .trim()
      .replace('bitcoin:', '')
      .replace('BITCOIN:', '');

    if (this.secret.startsWith('BC1')) this.secret = this.secret.toLowerCase();

    try {
      const parsedSecret = JSON.parse(this.secret);
      if (parsedSecret && parsedSecret.keystore && parsedSecret.keystore.xpub) {
        let masterFingerprint = false;
        if (parsedSecret.keystore.ckcc_xfp) {
          // It is a ColdCard Hardware Wallet
          masterFingerprint = Number(parsedSecret.keystore.ckcc_xfp);
        }
        this.secret = parsedSecret.keystore.xpub;
        this.masterFingerprint = masterFingerprint;
      }
    } catch (_) {}
    return this;
  }

  getLatestTransactionTime() {
    return 0;
  }

  // createTx () { throw Error('not implemented') }

  getAddress() {
    throw Error('not implemented');
  }

  getAddressAsync() {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  useWithHardwareWalletEnabled() {
    return false;
  }
}
