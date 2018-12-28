import { BitcoinUnit } from '../models/bitcoinUnits';

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
  }

  getTransactions() {
    return this.transactions;
  }

  /**
   *
   * @returns {string}
   */
  getLabel() {
    return this.label;
  }

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

  allowRBF() {
    return false;
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
    this.secret = newSecret.trim();
    return this;
  }

  getLatestTransactionTime() {
    return 0;
  }

  getAddress() {}

  // createTx () { throw Error('not implemented') }
}
