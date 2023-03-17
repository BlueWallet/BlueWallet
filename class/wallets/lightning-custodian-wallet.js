import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
import bolt11 from 'bolt11';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { isTorDaemonDisabled } from '../../blue_modules/environment';
const torrific = require('../../blue_modules/torrific');
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
    this.chain = Chain.OFFCHAIN;
    this.cardKeys = false;
    this.wipeData = false;
    this.cardWritten = false;
    this.cardEnabled = true;
    this.cardDetails = false;
    this.createcardurl = '';
  }

  /**
   * requires calling init() after setting
   *
   * @param URI
   */
  setBaseURI(URI) {
    this.baseURI = URI;
  }

  getBaseURI() {
    return this.baseURI;
  }

  allowSend() {
    return true;
  }

  getAddress() {
    if (this.refill_addressess.length > 0) {
      return this.refill_addressess[0];
    } else {
      return undefined;
    }
  }

  getSecret() {
    return this.secret + '@' + this.baseURI;
  }

  getLogin() {
    let login;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }
    return login;
  }

  timeToRefreshBalance() {
    return (+new Date() - this._lastBalanceFetch) / 1000 > 300; // 5 min
  }

  timeToRefreshTransaction() {
    return (+new Date() - this._lastTxFetch) / 1000 > 300; // 5 min
  }

  static fromJson(param) {
    const obj = super.fromJson(param);
    obj.init();
    return obj;
  }

  async init() {
    this._api = new Frisbee({
      baseURI: this.baseURI,
    });
    const isTorDisabled = await isTorDaemonDisabled();

    if (!isTorDisabled && this.baseURI && this.baseURI?.indexOf('.onion') !== -1) {
      this._api = new torrific.Torsbee({
        baseURI: this.baseURI,
      });
    }
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
    const response = await this._api.post('/create', {
      body: { partnerid: 'bluewallet', accounttype: (isTest && 'test') || 'common' },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + (json.message ? json.message : json.error) + ' (code ' + json.code + ')');
    }

    if (!json.login || !json.password) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this.secret = 'boltcardhub://' + json.login + ':' + json.password;
  }

  async payInvoice(invoice, freeAmount = 0) {
    const response = await this._api.post('/payinvoice', {
      body: { invoice, amount: freeAmount },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    if (response.originalResponse && typeof response.originalResponse === 'string') {
      try {
        response.originalResponse = JSON.parse(response.originalResponse);
      } catch (_) {}
    }

    if (response.originalResponse && response.originalResponse.status && response.originalResponse.status === 503) {
      throw new Error('Payment is in transit');
    }

    const json = response.body;
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
    const response = await this._api.get('/getuserinvoices' + limitString, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.originalResponse));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (limit) {
      // need to merge existing invoices with the ones that arrived
      // but the ones received later should overwrite older ones

      for (const oldInvoice of this.user_invoices_raw) {
        // iterate all OLD invoices
        let found = false;
        for (const newInvoice of json) {
          // iterate all NEW invoices
          if (newInvoice.payment_request === oldInvoice.payment_request) found = true;
        }

        if (!found) {
          // if old invoice is not found in NEW array, we simply add it:
          json.push(oldInvoice);
        }
      }
    }

    this.user_invoices_raw = json.sort(function (a, b) {
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

  isInvoiceGeneratedByWallet(paymentRequest) {
    return this.user_invoices_raw.some(invoice => invoice.payment_request === paymentRequest);
  }

  weOwnAddress(address) {
    return this.refill_addressess.some(refillAddress => address === refillAddress);
  }

  async addInvoice(amt, memo) {
    const response = await this._api.post('/addinvoice', {
      body: { amt: amt + '', memo },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    const json = response.body;
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
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }
    const response = await this._api.post('/auth?type=auth', {
      body: { login, password },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });

    const json = response.body;
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
    const response = await this._api.post('/auth?type=refresh_token', {
      body: { refresh_token: this.refresh_token },
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });

    const json = response.body;
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
    const response = await this._api.get('/getbtc', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    this.refill_addressess = [];

    for (const arr of json) {
      this.refill_addressess.push(arr.address);
    }
  }

  async getAddressAsync() {
    await this.fetchBtcAddress();
    return this.getAddress();
  }

  async allowOnchainAddress() {
    if (this.getAddress() !== undefined && this.getAddress() !== null) {
      return true;
    } else {
      await this.fetchBtcAddress();
      return this.getAddress() !== undefined && this.getAddress() !== null;
    }
  }

  getTransactions() {
    let txs = [];
    this.pending_transactions_raw = this.pending_transactions_raw || [];
    this.user_invoices_raw = this.user_invoices_raw || [];
    this.transactions_raw = this.transactions_raw || [];
    txs = txs.concat(this.pending_transactions_raw.slice(), this.transactions_raw.slice().reverse(), this.user_invoices_raw.slice()); // slice so array is cloned
    // transforming to how wallets/list screen expects it
    for (const tx of txs) {
      tx.walletID = this.getID();
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
    return txs.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });
  }

  async fetchPendingTransactions() {
    const response = await this._api.get('/getpending', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = response.body;
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
    const offset = 0;
    queryRes += '?limit=' + limit;
    queryRes += '&offset=' + offset;

    const response = await this._api.get('/gettxs' + queryRes, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!Array.isArray(json)) {
      throw new Error('API unexpected response: ' + JSON.stringify(response.body));
    }

    this._lastTxFetch = +new Date();
    this.transactions_raw = json;
  }

  getBalance() {
    return this.balance;
  }

  async fetchBalance(noRetry) {
    await this.checkLogin();

    const response = await this._api.get('/balance', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = response.body;
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
   *   num_satoshis: '100',
   *   timestamp: '1535116657',
   *   expiry: '3600',
   *   description: 'hundredSatoshis blitzhub',
   *   description_hash: '',
   *   fallback_addr: '',
   *   cltv_expiry: '10',
   *   route_hints: [] }
   *
   * @param invoice BOLT invoice string
   * @return {payment_hash: string}
   */
  decodeInvoice(invoice) {
    const { payeeNodeKey, tags, satoshis, millisatoshis, timestamp } = bolt11.decode(invoice);

    const decoded = {
      destination: payeeNodeKey,
      num_satoshis: satoshis ? satoshis.toString() : '0',
      num_millisatoshis: millisatoshis ? millisatoshis.toString() : '0',
      timestamp: timestamp.toString(),
      fallback_addr: '',
      route_hints: [],
    };

    for (let i = 0; i < tags.length; i++) {
      const { tagName, data } = tags[i];
      switch (tagName) {
        case 'payment_hash':
          decoded.payment_hash = data;
          break;
        case 'purpose_commit_hash':
          decoded.description_hash = data;
          break;
        case 'min_final_cltv_expiry':
          decoded.cltv_expiry = data.toString();
          break;
        case 'expire_time':
          decoded.expiry = data.toString();
          break;
        case 'description':
          decoded.description = data;
          break;
      }
    }

    if (!decoded.expiry) decoded.expiry = '3600'; // default

    if (parseInt(decoded.num_satoshis) === 0 && decoded.num_millisatoshis > 0) {
      decoded.num_satoshis = (decoded.num_millisatoshis / 1000).toString();
    }

    return (this.decoded_invoice_raw = decoded);
  }

  async fetchInfo() {
    const response = await this._api.get('/getinfo', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = response.body;
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

  static async isValidNodeAddress(address) {
    const isTorDisabled = await isTorDaemonDisabled();
    const isTor = address.indexOf('.onion') !== -1;
    const apiCall =
      isTor && !isTorDisabled
        ? new torrific.Torsbee({
            baseURI: address,
          })
        : new Frisbee({
            baseURI: address,
          });
    //call /getinfobolt from the hub to make sure this is a bolt card hub
    const response = await apiCall.get('/getinfobolt', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
    const json = response.body;
    if (typeof json === 'undefined') {
      return false;
    }

    if (json && json.code && json.code !== 1) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    return true;
  }

  allowReceive() {
    return true;
  }

  allowSignVerifyMessage() {
    return false;
  }

  /**
   * Example return:
   * { destination: '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f',
   *   payment_hash: 'faf996300a468b668c58ca0702a12096475a0dd2c3dde8e812f954463966bcf4',
   *   num_satoshis: '100',
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
  async decodeInvoiceRemote(invoice) {
    await this.checkLogin();

    const response = await this._api.get('/decodeinvoice?invoice=' + invoice, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = response.body;
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

  weOwnTransaction(txid) {
    for (const tx of this.getTransactions()) {
      if (tx && tx.payment_hash && tx.payment_hash === txid) return true;
    }

    return false;
  }

  authenticate(lnurl) {
    return lnurl.authenticate(this.secret);
  }

  async createcard() {
    await this.checkLogin();

    if(this.createcardurl) {
      return this.createcardurl;
    }

    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }

    const response = await this._api.post('/createboltcard', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
      body: {
        card_name: login+':'+password
      }
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    if (json && json.status === 'ERROR') {
      throw new Error('API error: ' + json.reason);
    }

    return (this.createcardurl = json);
  }

  async getcardkeys() {
    await this.checkLogin();

    if(this.cardKeys) {
      return this.cardKeys;
    }


    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }

    const response = await this._api.post('/getcardkeys', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
      body: {
        card_name: login+':'+password
      }
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    if (json && json.status === 'ERROR') {
      throw new Error('API error: ' + json.reason);
    }

    return (this.cardKeys = json);
  }

  setCardKeys(keys) {
    this.cardKeys = keys;
  }

  async wipecard() {
    await this.checkLogin();

    if(this.wipeData) {
      return this.wipeData;
    }

    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }

    const response = await this._api.post('/wipecard', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
      body: {
        card_name: login+':'+password
      }
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }

    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    //throws error maybe dont do this
    // await this.getCardDetails(true);

    return (this.wipeData = json);
  }

  getWipeData() {
    return this.wipeData;
  } 

  setWipeData(data) {
    this.wipeData = data;
  }
  
  async setCardWritten(status) {
    this.cardWritten = status;
  }

  async disconnectCard() {
    this.cardKeys = false;
    this.wipeData = false;
    this.cardWritten = false;
    this.cardEnabled = false;
    this.cardDetails = false;
    this.createcardurl = '';
    return;
  }

  async enableCard(status) {
    await this.checkLogin();

    if(!this.cardDetails) await this.getCardDetails();

    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }

    console.log('enable bool', status);
    const response = await this._api.post('/updatecard', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
      body: {
        enable: status,
        card_name: login+':'+password,
        tx_max: this.cardDetails.tx_limit_sats,
        day_max: this.cardDetails.day_limit_sats,
      }
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }
    
    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    
    console.log('enable response', [json]);
    return this.cardEnabled = status;
  }

  async updateCard(day_max, tx_max) {
    await this.checkLogin();

    if(!this.cardDetails) await this.getCardDetails();

    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }

    let cardEnabled = 'false';
    if(this.cardDetails.lnurlw_enable == 'Y') {
      cardEnabled = 'true';
    }

    const response = await this._api.post('/updatecard', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
      body: {
        enable: cardEnabled,
        card_name: login+':'+password,
        tx_max: tx_max,
        day_max: day_max,
      }
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
    }
    
    if (json && json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }
    
    console.log('card update response', [json]);
    return json;
  }

  async getCardDetails(reload, showErrors = true) {
    await this.checkLogin();

    if(this.cardDetails && !reload) {
      return this.cardDetails;
    }

    let login, password;
    if (this.secret.indexOf('blitzhub://') !== -1) {
      login = this.secret.replace('blitzhub://', '').split(':')[0];
      password = this.secret.replace('blitzhub://', '').split(':')[1];
    } else if(this.secret.indexOf('lndhub://') !== -1) {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    } else {
      login = this.secret.replace('boltcardhub://', '').split(':')[0];
      password = this.secret.replace('boltcardhub://', '').split(':')[1];
    }

    const response = await this._api.post('/getcard', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
      body: {
        card_name: login+':'+password
      }
    });

    const json = response.body;
    if (typeof json === 'undefined') {
      if(showErrors) {
        throw new Error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
      } else {
        console.error('API failure: ' + response.err + ' ' + JSON.stringify(response.body));
        return;
      }
    }

    if (json && json.error) {
      if(showErrors) {
        throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
      } else {
        console.error('API error: ' + json.message + ' (code ' + json.code + ')');
        return;
      }
    }
    if (json && json.status === 'ERROR') {
      if(showErrors) {
        throw new Error('API error: ' + json.reason);
      } else {
        console.error('API error: ' + json.reason);
        return;
      }
    }

    //if there is a non-wiped boltcard, set the cardwritten to true
    if(json.uid) {
      this.cardWritten = true;
    }
    return (this.cardDetails = json);
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
