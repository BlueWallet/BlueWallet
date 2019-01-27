import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
import { BitcoinUnit } from '../models/bitcoinUnits';
let BigNumber = require('bignumber.js');

export class LightningCustodianWallet extends LegacyWallet {
  static type = 'lightningCustodianWallet';
  static typeReadable = 'Lightning';

  constructor(props) {
    super(props);
    this.setBaseURI(); // no args to init with default value
    this.init();
    this.refresh_token = '';
    this.access_token = '';
    this._refresh_token_created_ts = 0;
    this._access_token_created_ts = 0;
    this.refill_addressess = [];
    this.pending_transactions_raw = [];
    this.user_invoices_raw = [];
    this.info_raw = false;
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
      this.baseURI = 'https://lndhub.herokuapp.com/';
    }
  }

  getBaseURI() {
    return this.baseURI;
  }

  allowSend() {
    console.log(this.getBalance(), this.getBalance() > 0);
    return this.getBalance() > 0;
  }

  getAddress() {
    return '';
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
    });
  }

  accessTokenExpired() {
    return (+new Date() - this._access_token_created_ts) / 1000 >= 3600 * 2; // 2h
  }

  refreshTokenExpired() {
    return (+new Date() - this._refresh_token_created_ts) / 1000 >= 3600 * 24 * 7; // 7d
  }

  generate() {
    // nop
  }

  async createAccount(isTest) {
    let response = await this._api.post('/create', {
      body: { partnerid: 'bluewallet', accounttype: (isTest && 'test') || 'common' },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + (json.message ? json.message : json.error) + ' (code ' + json.code + ')');
    }

    if (!json.login || !json.password) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.secret = 'lndhub://' + json.login + ':' + json.password;
  }

  async payInvoice(invoice, freeAmount = 0) {
    let response = await this._api.post('/payinvoice', {
      body: { invoice: invoice, amount: freeAmount },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    this.last_paid_invoice_result = json;
  }

  /**
   * Returns list of LND invoices created by user
   *
   * @return {Promise.<Array>}
   */
  async getUserInvoices(limit = false) {
    let limitString = '';
    if (limit) limitString = '?limit=' + parseInt(limit);
    let response = await this._api.get('/getuserinvoices' + limitString, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (limit) {
      // need to merge existing invoices with the ones that arrived
      // but the ones received later should overwrite older ones

      for (let oldInvoice of this.user_invoices_raw) {
        // iterate all OLD invoices
        let found = false;
        for (let newInvoice of json) {
          // iterate all NEW invoices
          if (newInvoice.payment_request === oldInvoice.payment_request) found = true;
        }

        if (!found) {
          // if old invoice is not found in NEW array, we simply add it:
          json.push(oldInvoice);
        }
      }
    }

    this.user_invoices_raw = json.sort(function(a, b) {
      return a.timestamp - b.timestamp;
    });

    return this.user_invoices_raw;
  }

  /**
   * Basically the same as this.getUserInvoices() but saves invoices list
   * to internal variable
   *
   * @returns {Promise<void>}
   */
  async fetchUserInvoices() {
    await this.getUserInvoices();
  }

  async addInvoice(amt, memo) {
    let response = await this._api.post('/addinvoice', {
      body: { amt: amt + '', memo: memo },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.r_hash || !json.pay_req) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    return json.pay_req;
  }

  async checkRouteInvoice(invoice) {
    let response = await this._api.get('/checkrouteinvoice?invoice=' + invoice, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
  }

  /**
   * Uses login & pass stored in `this.secret` to authorize
   * and set internal `access_token` & `refresh_token`
   *
   * @return {Promise.<void>}
   */
  async authorize() {
    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    }
    let response = await this._api.post('/auth?type=auth', {
      body: { login: login, password: password },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.access_token || !json.refresh_token) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.refresh_token = json.refresh_token;
    this.access_token = json.access_token;
    this._refresh_token_created_ts = +new Date();
    this._access_token_created_ts = +new Date();
  }

  async checkLogin() {
    if (this.accessTokenExpired() && this.refreshTokenExpired()) {
      // all tokens expired, only option is to login with login and password
      return this.authorize();
    }

    if (this.accessTokenExpired()) {
      // only access token expired, so only refreshing it
      let refreshedOk = true;
      try {
        await this.refreshAcessToken();
      } catch (Err) {
        refreshedOk = false;
      }

      if (!refreshedOk) {
        // something went wrong, lets try to login regularly
        return this.authorize();
      }
    }
  }

  async refreshAcessToken() {
    let response = await this._api.post('/auth?type=refresh_token', {
      body: { refresh_token: this.refresh_token },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.access_token || !json.refresh_token) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.refresh_token = json.refresh_token;
    this.access_token = json.access_token;
    this._refresh_token_created_ts = +new Date();
    this._access_token_created_ts = +new Date();
  }

  async fetchBtcAddress() {
    let response = await this._api.get('/getbtc', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    this.refill_addressess = [];

    for (let arr of json) {
      this.refill_addressess.push(arr.address);
    }
  }

  getTransactions() {
    let txs = [];
    this.pending_transactions_raw = this.pending_transactions_raw || [];
    this.user_invoices_raw = this.user_invoices_raw || [];
    this.transactions_raw = this.transactions_raw || [];
    txs = txs.concat(this.pending_transactions_raw.slice(), this.transactions_raw.slice().reverse(), this.user_invoices_raw.slice()); // slice so array is cloned
    // transforming to how wallets/list screen expects it
    for (let tx of txs) {
      tx.fromWallet = this.secret;
      if (tx.amount) {
        // pending tx
        tx.amt = tx.amount * -100000000;
        tx.fee = 0;
        tx.timestamp = tx.time;
        tx.memo = 'On-chain transaction';
      }

      if (typeof tx.amt !== 'undefined' && typeof tx.fee !== 'undefined') {
        // lnd tx outgoing
        tx.value = parseInt((tx.amt * 1 + tx.fee * 1) * -1);
      }

      if (tx.type === 'paid_invoice') {
        tx.memo = tx.memo || 'Lightning payment';
        if (tx.value > 0) tx.value = tx.value * -1; // value already includes fee in it (see lndhub)
        // outer code expects spending transactions to of negative value
      }

      if (tx.type === 'bitcoind_tx') {
        tx.memo = 'On-chain transaction';
      }

      if (tx.type === 'user_invoice') {
        // incoming ln tx
        tx.value = parseInt(tx.amt);
        tx.memo = tx.description || 'Lightning invoice';
      }

      tx.received = new Date(tx.timestamp * 1000).toString();
    }
    return txs.sort(function(a, b) {
      return b.timestamp - a.timestamp;
    });
  }

  async fetchPendingTransactions() {
    let response = await this._api.get('/getpending', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    this.pending_transactions_raw = json;
  }

  async fetchTransactions() {
    // TODO: iterate over all available pages
    const limit = 10;
    let queryRes = '';
    let offset = 0;
    queryRes += '?limit=' + limit;
    queryRes += '&offset=' + offset;

    let response = await this._api.get('/gettxs' + queryRes, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!Array.isArray(json)) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.transactions_raw = json;
  }

  getBalance() {
    return new BigNumber(this.balance).dividedBy(100000000).toString(10);
  }

  async fetchBalance(noRetry) {
    await this.checkLogin();

    let response = await this._api.get('/balance', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      if (json.code * 1 === 1 && !noRetry) {
        await this.authorize();
        return this.fetchBalance(true);
      }
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.BTC || typeof json.BTC.AvailableBalance === 'undefined') {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.balance_raw = json;
    this.balance = json.BTC.AvailableBalance;
    this._lastBalanceFetch = +new Date();
  }

  /**
   * Example return:
   * { destination: '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f',
   *   payment_hash: 'faf996300a468b668c58ca0702a12096475a0dd2c3dde8e812f954463966bcf4',
   *   num_satoshisnum_satoshis: '100',
   *   timestamp: '1535116657',
   *   expiry: '3600',
   *   description: 'hundredSatoshis blitzhub',
   *   description_hash: '',
   *   fallback_addr: '',
   *   cltv_expiry: '10',
   *   route_hints: [] }
   *
   * @param invoice BOLT invoice string
   * @return {Promise.<Object>}
   */
  async decodeInvoice(invoice) {
    await this.checkLogin();

    let response = await this._api.get('/decodeinvoice?invoice=' + invoice, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.payment_hash) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    return (this.decoded_invoice_raw = json);
  }

  async fetchInfo() {
    let response = await this._api.get('/getinfo', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.identity_pubkey) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.info_raw = json;
  }

  allowReceive() {
    return true;
  }
}

/*



pending tx:

    [ { amount: 0.00078061,
        account: '521172',
        address: '3F9seBGCJZQ4WJJHwGhrxeGXCGbrm5SNpF',
        category: 'receive',
        confirmations: 0,
        blockhash: '',
        blockindex: 0,
        blocktime: 0,
        txid: '28a74277e47c2d772ee8a40464209c90dce084f3b5de38a2f41b14c79e3bfc62',
        walletconflicts: [],
        time: 1535024434,
        timereceived: 1535024434 } ]


tx:

    [ { amount: 0.00078061,
        account: '521172',
        address: '3F9seBGCJZQ4WJJHwGhrxeGXCGbrm5SNpF',
        category: 'receive',
        confirmations: 5,
        blockhash: '0000000000000000000edf18e9ece18e449c6d8eed1f729946b3531c32ee9f57',
        blockindex: 693,
        blocktime: 1535024914,
        txid: '28a74277e47c2d772ee8a40464209c90dce084f3b5de38a2f41b14c79e3bfc62',
        walletconflicts: [],
        time: 1535024434,
        timereceived: 1535024434 } ]

 */
