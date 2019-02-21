import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';
let BigNumber = require('bignumber.js');

export class ACINQStrikeLightningWallet extends LegacyWallet {
  static type = 'acinqStrikeLightningWallet';
  static typeReadable = 'Strike';

  constructor(props) {
    super(props);
    this.baseURI = 'https://api.strike.acinq.co/api/v1';
    this.init();
    this.secret = '';
    this.user_charges_raw = [];
    this.balance = 0;
    this.preferredBalanceUnit = BitcoinUnit.SATS;
    this.chain = Chain.OFFCHAIN;
    this.optionalDisclosureDetail = 'All ACINQ Strike invoices carry a 1.0% fee.';
  }

  getBaseURI() {
    return this.baseURI;
  }

  allowSend() {
    return false;
  }

  timeToRefreshBalance() {
    // only manual refresh for now
    return false;
  }

  timeToRefreshTransaction() {
    // only manual refresh for now
    return false;
  }

  static fromJson(param) {
    let obj = super.fromJson(param);
    obj.init();
    return obj;
  }

  init() {
    this._api = new Frisbee({
      baseURI: this.baseURI,
      headers: {
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      },
    });
    this._api.auth(this.secret);
  }

  setSecret(secret) {
    this.secret = secret;
    this._api.auth(this.secret);
  }

  /**
   * Returns a "charge" object of belonging to the provided chargeId
   *
   * @return {Promise.<Object>}
   */
  async getCharge(chargeId) {
    let response = await this._api.get('/charges/' + chargeId);
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    return json;
  }

  async fetchTransactions() {
    const usercharges = await this.getUserCharges();
    return usercharges;
  }

  async fetchBalance() {
    const transactions = await this.fetchTransactions();
    return transactions;
  }

  async getUserCharges() {
    let response = await this._api.get('/charges');
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.code) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    this.user_charges_raw = json.sort((a, b) => {
      return a.created < b.created;
    });

    this.balance = 0;
    this.user_charges_raw.forEach(charge => {
      charge.fromWallet = this.secret;
      if (charge.paid === true) {
        this.balance += charge.amount_satoshi;
      }
    });
    return this.user_charges_raw;
  }

  getTransactions() {
    return this.user_charges_raw;
  }

  getBalance() {
    return new BigNumber(this.balance).dividedBy(100000000).toString(10);
  }

  async authenticate() {
    await this.getUserCharges();
    return true;
  }

  getLatestTransactionTime() {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = 0;
    for (let tx of this.getTransactions()) {
      max = Math.max(new Date(tx.updated) * 1, max);
    }

    return new Date(max).toString();
  }

  async createCharge(amount, description = 'ACINQ strike Charge') {
    let response = await this._api.post('/charges', {
      body: { amount: Number(amount), description: String(description), currency: 'btc' },
      auth: {
        user: this.secret,
        pass: '',
      },
    });
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.code) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    return json;
  }

  async addInvoice(amount, description) {
    return this.createCharge(amount, description);
  }

  allowReceive() {
    return true;
  }
}
