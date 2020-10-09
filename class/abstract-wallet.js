import * as bitcoin from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';
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
    this.confirmed_balance = 0; // SAT
    this.unconfirmed_balance = 0; // SAT
    this.incoming_balance = 0; // SAT
    this.outgoing_balance = 0; // SAT
    this.transactions = [];
    this._address = false;
    this.utxo = [];
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this.preferredBalanceUnit = BitcoinUnit.BTC;
    this.chain = Chain.ONCHAIN;
    this.hideBalance = false;
    this.id = uuidv4();
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

  isAddressMine(address) {
    if (!this._address) {
      return false;
    }
    if (typeof this._address === 'string') {
      return this._address === address;
    }
    for (let i = 0; i < this._address.length; i++) {
      if (address === this._address[i]) {
        return true;
      }
    }
    return false;
  }

  isAnyOfAddressesMine(addresses) {
    if (!this._address) {
      return false;
    }
    if (typeof this._address === 'string') {
      return addresses.includes(this._address);
    }
    for (let i = 0; i < this._address.length; i++) {
      if (addresses.includes(this._address[i])) {
        return true;
      }
    }
    return false;
  }

  isOutputScriptMine(script) {
    const address = bitcoin.address.fromOutputScript(script, config.network);

    return this.isAddressMine(address);
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

  getAddress() {
    throw Error('not implemented');
  }

  getAddressAsync() {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  getUtxos() {
    return this.utxo;
  }
}
