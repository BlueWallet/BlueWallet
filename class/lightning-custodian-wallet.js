import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
let BigNumber = require('bignumber.js');

export class LightningCustodianWallet extends LegacyWallet {
  constructor() {
    super();
    this.init();
    this.type = 'lightningCustodianWallet';
    this.refresh_token = '';
    this.access_token = '';
    this._refresh_token_created_ts = 0;
    this._access_token_created_ts = 0;
    this.refill_addressess = [];
    this.pending_transactions_raw = [];
    this.info_raw = false;
  }

  getAddress() {
    return '';
  }

  timeToRefreshBalance() {
    // blitzhub calls are cheap, so why not refresh constantly
    return true;
  }

  timeToRefreshTransaction() {
    // blitzhub calls are cheap, so why not refresh the list constantly
    return true;
  }

  static fromJson(param) {
    let obj = super.fromJson(param);
    obj.init();
    return obj;
  }

  init() {
    this._api = new Frisbee({
      baseURI: 'https://api.blitzhub.io/',
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

  getTypeReadable() {
    return 'Lightning (custodian)';
  }

  async createAccount() {
    let response = await this._api.post('/create', {
      body: { partnerid: 'bluewallet', test: true },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
    let json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.login || !json.password) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.secret = 'blitzhub://' + json.login + ':' + json.password;

    console.log(response.body);
  }

  async payInvoice(invoice) {
    let response = await this._api.post('/payinvoice', {
      body: { invoice: invoice },
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

    console.log(response.body);

    this.last_paid_invoice_result = json;

    if (json.payment_preimage) {
      return true;
    } else {
      return false;
    }
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

    console.log(json);
  }

  /**
   * Uses login & pass stored in `this.secret` to authorize
   * and set internal `access_token` & `refresh_token`
   *
   * @return {Promise.<void>}
   */
  async authorize() {
    let login = this.secret.replace('blitzhub://', '').split(':')[0];
    let password = this.secret.replace('blitzhub://', '').split(':')[1];
    console.log('auth uses login:pass', login, password);
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

    console.log(json);
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

    console.log(json);
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

    console.log(json);
  }

  getTransactions() {
    let txs = [];
    this.pending_transactions_raw = this.pending_transactions_raw || [];
    this.transactions_raw = this.transactions_raw || [];
    txs = txs.concat(this.pending_transactions_raw, this.transactions_raw.slice().reverse()); // slice so array is cloned
    // transforming to how wallets/list screen expects it
    for (let tx of txs) {
      tx.value = tx.amount * 100000000;
      tx.received = new Date(tx.time * 1000).toString();
      tx.memo = 'Refill';
    }
    return txs;
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
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    this.pending_transactions_raw = json;

    console.log(json);
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

    if (typeof json.btc_txs === 'undefined' || typeof json.paid_invoices === 'undefined' || typeof json.sended_coins === 'undefined') {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.transactions_raw = [].concat(json.btc_txs || [], json.paid_invoices || [], json.sended_coins || []);

    console.log(json);
  }

  getBalance() {
    return new BigNumber(this.balance).div(100000000).toString(10);
  }

  async fetchBalance() {
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
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.BTC || typeof json.BTC.AvailableBalance === 'undefined') {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.balance_raw = json;
    this.balance = json.BTC.AvailableBalance;
    this._lastBalanceFetch = +new Date();

    console.log(json);
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

    console.log(json);

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

    console.log(json);
  }

  allowReceive() {
    return false;
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
