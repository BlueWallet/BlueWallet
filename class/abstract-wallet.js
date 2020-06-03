import { BitcoinUnit, Chain } from '../models/bitcoinUnits';

const createHash = require('create-hash');

export class AbstractWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  static fromJson(obj) {
    const obj2 = JSON.parse(obj);
    const temp = new this();
    for (const key2 of Object.keys(obj2)) {
      temp[key2] = obj2[key2];
    }

    return temp;
  }

  constructor() {
    this.type = this.constructor.type;
    this.typeReadable = this.constructor.typeReadable;
    this.label = '';
    this.secret = ''; // private key or recovery phrase
    this.balance = 0; // SAT
    this.unconfirmed_balance = 0; // SAT
    this.transactions = [];
    this.unconfirmed_transactions = [];
    this._address = false;
    this.utxo = [];
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this.preferredBalanceUnit = BitcoinUnit.BTC;
    this.chain = Chain.ONCHAIN;
    this.hideBalance = false;
  }

  getID() {
    return createHash('sha256')
      .update(this.getSecret())
      .digest()
      .toString('hex');
  }

  getTransactions() {
    return this.unconfirmed_transactions.concat(this.transactions);
  }

  /**
   *
   * @returns {string}
   */
  getLabel() {
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
    return this.balance + this.unconfirmed_balance;
  }

  getPreferredBalanceUnit() {
    for (const value of Object.values(BitcoinUnit)) {
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

  allowSendMax() {
    return false;
  }

  allowRBF() {
    return false;
  }

  allowBatchSend() {
    return false;
  }

  weOwnAddress(address) {
    return this.getAddress() === address;
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

  // createTx () { throw Error('not implemented') }

  getAddress() {
    throw Error('not implemented');
  }

  getAddressAsync() {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  getUtxo() {
    return this.utxo;
  }
}
