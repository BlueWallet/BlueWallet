import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
import { BitcoinUnit } from '../models/bitcoinUnits';

export class ACINQStrikeLightningWallet extends LegacyWallet {
  static type = 'acinqStrikeLightningWallet';
  static typeReadable = 'strike';

  constructor(props) {
    super(props);
    this.setBaseURI(); // no args to init with default value
    this.init();
    this.secret = '';
    this.user_charges_raw = [];
    this.preferredBalanceUnit = BitcoinUnit.SATS;
  }

  /**
   * requires calling init() after setting
   *
   * @param URI
   */
  setBaseURI(URI) {
    if (URI) {
      this.baseURI = URI;
    } else {
      this.baseURI = 'https://api.strike.acinq.co/api/v1';
    }
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
  }

  setSecret(secret) {
    this.secret = secret;
    this._api.auth(this.secret);
  }

  /**
   * Returns list of LND invoices created by user
   *
   * @return {Promise.<Array>}
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

    this.user_charges_raw = json.sort((a, b) => {
      return a.created - b.created;
    });

    return this.user_charges_raw;
  }

  async getUserCharges() {
    let response = await this._api.get('/charges');
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.code && json.code === 401) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    this.user_charges_raw = json.sort((a, b) => {
      return a.created - b.created;
    });
    return this.user_charges_raw;
  }

  /**
   * Basically the same as this.getUserInvoices() but saves invoices list
   * to internal variable
   *
   * @returns {Promise<void>}
   */
  getTransactions() {
    console.warn('heee');

    return this.user_charges_raw;
  }

  async authenticate() {
    await this.getUserCharges();
    return true;
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

  allowReceive() {
    return true;
  }
}
