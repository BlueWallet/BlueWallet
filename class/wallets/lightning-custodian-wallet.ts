import bolt11 from 'bolt11';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { LegacyWallet } from './legacy-wallet';

export class LightningCustodianWallet extends LegacyWallet {
  static readonly type = 'lightningCustodianWallet';
  static readonly typeReadable = 'Lightning';
  static readonly subtitleReadable = 'LNDhub';
  // @ts-ignore: override
  public readonly type = LightningCustodianWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = LightningCustodianWallet.typeReadable;

  baseURI?: string;
  refresh_token: string = '';
  access_token: string = '';
  _refresh_token_created_ts: number = 0;
  _access_token_created_ts: number = 0;
  refill_addressess: string[] = [];
  pending_transactions_raw: any[] = [];
  transactions_raw: any[] = [];
  user_invoices_raw: any[] = [];
  info_raw = false;
  preferredBalanceUnit = BitcoinUnit.SATS;
  chain = Chain.OFFCHAIN;
  last_paid_invoice_result?: any;
  decoded_invoice_raw?: any;

  constructor() {
    super();
    this.init();
  }

  /**
   * requires calling init() after setting
   *
   * @param URI
   */
  setBaseURI(URI: string | undefined) {
    this.baseURI = URI?.endsWith('/') ? URI.slice(0, -1) : URI;
  }

  getBaseURI() {
    return this.baseURI;
  }

  allowSend() {
    return true;
  }

  getAddress(): string | false {
    if (this.refill_addressess.length > 0) {
      return this.refill_addressess[0];
    } else {
      return false;
    }
  }

  getSecret() {
    return this.secret + '@' + this.baseURI;
  }

  timeToRefreshBalance() {
    return (+new Date() - this._lastBalanceFetch) / 1000 > 300; // 5 min
  }

  timeToRefreshTransaction() {
    return (+new Date() - this._lastTxFetch) / 1000 > 300; // 5 min
  }

  static fromJson(param: any) {
    const obj = super.fromJson(param);
    // @ts-ignore: local init
    obj.init();
    return obj;
  }

  async init() {
    // un-cache refill onchain addresses on cold start. should help for cases when certain lndhub
    // is turned off permanently, so users cant pull refill address from cache and send money to a black hole
    this.refill_addressess = [];
  }

  accessTokenExpired() {
    return (+new Date() - this._access_token_created_ts) / 1000 >= 3600 * 2; // 2h
  }

  refreshTokenExpired() {
    return (+new Date() - this._refresh_token_created_ts) / 1000 >= 3600 * 24 * 7; // 7d
  }

  generate(): Promise<void> {
    // nop
    return Promise.resolve();
  }

  async createAccount(isTest: boolean = false) {
    const response = await fetch(this.baseURI + '/create', {
      method: 'POST',
      body: JSON.stringify({ partnerid: 'bluewallet', accounttype: (isTest && 'test') || 'common' }),
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + (json.message ? json.message : json.error) + ' (code ' + json.code + ')');
    }

    if (!json.login || !json.password) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
    }

    this.secret = 'lndhub://' + json.login + ':' + json.password;
  }

  async payInvoice(invoice: string, freeAmount: number = 0) {
    const response = await fetch(this.baseURI + '/payinvoice', {
      method: 'POST',
      body: JSON.stringify({ invoice, amount: freeAmount }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    this.last_paid_invoice_result = json;
  }

  /**
   * Returns list of LND invoices created by user
   *
   * @return {Promise.<Array>}
   */
  async getUserInvoices(limit: number | false = false) {
    let limitString = '';
    if (limit) limitString = '?limit=' + parseInt(limit as unknown as string, 10);
    const response = await fetch(this.baseURI + '/getuserinvoices' + limitString, {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
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

    this.user_invoices_raw = json.sort(function (a: { timestamp: number }, b: { timestamp: number }) {
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

  isInvoiceGeneratedByWallet(paymentRequest: string) {
    return this.user_invoices_raw.some(invoice => invoice.payment_request === paymentRequest);
  }

  weOwnAddress(address: string) {
    return this.refill_addressess.some(refillAddress => address === refillAddress);
  }

  async addInvoice(amt: number, memo: string) {
    const response = await fetch(this.baseURI + '/addinvoice', {
      method: 'POST',
      body: JSON.stringify({ amt: amt + '', memo }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });
    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.r_hash || !json.pay_req) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
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
    } else {
      login = this.secret.replace('lndhub://', '').split(':')[0];
      password = this.secret.replace('lndhub://', '').split(':')[1];
    }
    const response = await fetch(this.baseURI + '/auth?type=auth', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.access_token || !json.refresh_token) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
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
    const response = await fetch(this.baseURI + '/auth?type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this.refresh_token }),
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.access_token || !json.refresh_token) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
    }

    this.refresh_token = json.refresh_token;
    this.access_token = json.access_token;
    this._refresh_token_created_ts = +new Date();
    this._access_token_created_ts = +new Date();
  }

  async fetchBtcAddress() {
    const response = await fetch(this.baseURI + '/getbtc', {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
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
    let txs: any = [];
    txs = txs.concat(this.pending_transactions_raw.slice(), this.transactions_raw.slice().reverse(), this.user_invoices_raw.slice()); // slice so array is cloned

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
        tx.value = (tx.amt * 1 + tx.fee * 1) * -1;
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
        tx.value = parseInt(tx.amt, 10);
        tx.memo = tx.description || 'Lightning invoice';
      }

      tx.received = new Date(tx.timestamp * 1000).toString();
    }
    return txs.sort(function (a: { timestamp: number }, b: { timestamp: number }) {
      return b.timestamp - a.timestamp;
    });
  }

  async fetchPendingTransactions() {
    const response = await fetch(this.baseURI + '/getpending', {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
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

    const response = await fetch(this.baseURI + '/gettxs' + queryRes, {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!Array.isArray(json)) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
    }

    this._lastTxFetch = +new Date();
    this.transactions_raw = json;
  }

  getBalance() {
    return this.balance;
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    await this.checkLogin();

    const response = await fetch(this.baseURI + '/balance', {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      if (json.code * 1 === 1 && !noRetry) {
        await this.authorize();
        return this.fetchBalance(true);
      }
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.BTC || typeof json.BTC.AvailableBalance === 'undefined') {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
    }

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
  decodeInvoice(invoice: string) {
    const { payeeNodeKey, tags, satoshis, millisatoshis, timestamp } = bolt11.decode(invoice);

    const decoded: any = {
      destination: payeeNodeKey,
      num_satoshis: satoshis ? satoshis.toString() : '0',
      num_millisatoshis: millisatoshis ? millisatoshis.toString() : '0',
      timestamp: timestamp?.toString() ?? '0',
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

    if (parseInt(decoded.num_satoshis, 10) === 0 && decoded.num_millisatoshis > 0) {
      decoded.num_satoshis = (decoded.num_millisatoshis / 1000).toString();
    }

    return (this.decoded_invoice_raw = decoded);
  }

  async fetchInfo() {
    const response = await fetch(this.baseURI + '/getinfo', {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.identity_pubkey) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
    }
  }

  static async isValidNodeAddress(address: string): Promise<boolean> {
    const normalizedAddress = new URL('/getinfo', address.replace(/([^:]\/)\/+/g, '$1'));

    const response = await fetch(normalizedAddress.toString(), {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.code && json.code !== 1) {
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
  async decodeInvoiceRemote(invoice: string) {
    await this.checkLogin();

    const response = await fetch(this.baseURI + '/decodeinvoice?invoice=' + invoice, {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer' + ' ' + this.access_token,
      },
    });

    const json = await response.json();
    if (!json) {
      throw new Error('API failure: ' + response.statusText);
    }

    if (json.error) {
      throw new Error('API error: ' + json.message + ' (code ' + json.code + ')');
    }

    if (!json.payment_hash) {
      throw new Error('API unexpected response: ' + JSON.stringify(json));
    }

    return (this.decoded_invoice_raw = json);
  }

  weOwnTransaction(txid: string) {
    for (const tx of this.getTransactions()) {
      if (tx && tx.payment_hash && tx.payment_hash === txid) return true;
    }

    return false;
  }

  authenticate(lnurl: any) {
    return lnurl.authenticate(this.secret);
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
