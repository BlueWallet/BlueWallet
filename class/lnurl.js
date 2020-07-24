import bech32 from 'bech32';
import bolt11 from 'bolt11';
const CryptoJS = require('crypto-js');

const createHash = require('create-hash');

/**
 * @see https://github.com/btcontract/lnurl-rfc/blob/master/lnurl-pay.md
 */
export default class Lnurl {
  static TAG_PAY_REQUEST = 'payRequest'; // type of LNURL
  static TAG_WITHDRAW_REQUEST = "withdrawRequest"; // type of LNURL

  constructor(url, AsyncStorage) {
    this._lnurl = url;
    this._lnurlPayServiceBolt11Payload = false;
    this._lnurlPayServicePayload = false;
    this._AsyncStorage = AsyncStorage;
    this._preimage = false;
  }

  static findlnurl(bodyOfText) {
    var res = /,*?((lnurl)([0-9]{1,}[a-z0-9]+){1})/.exec(bodyOfText.toLowerCase());
    if (res) {
      return res[1];
    }
    return null;
  }

  static getUrlFromLnurl(lnurlExample) {
    const found = Lnurl.findlnurl(lnurlExample);
    if (!found) return false;

    const decoded = bech32.decode(lnurlExample, 10000);
    return Buffer.from(bech32.fromWords(decoded.words)).toString();
  }

  static isLnurl(url) {
    return url.toLowerCase().startsWith('lnurl1');
  }

  async fetchGet(url) {
    const resp = await fetch(url, { method: 'GET' });
    if (resp.status >= 300) {
      throw new Error('Bad response from server');
    }
    const reply = await resp.json();
    if (reply.status === 'ERROR') {
      throw new Error('Reply from server: ' + reply.reason);
    }
    return reply;
  }

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

    return decoded;
  }

  async requestBolt11FromLnurlPayService(amountSat) {
    if (!this._lnurlPayServicePayload) throw new Error('this._lnurlPayServicePayload is not set');
    if (!this._lnurlPayServicePayload.callback) throw new Error('this._lnurlPayServicePayload.callback is not set');
    if (amountSat < this._lnurlPayServicePayload.min || amountSat > this._lnurlPayServicePayload.max)
      throw new Error('amount is not right, ' + amountSat + ' should be between ' + this._lnurlPayServicePayload.min + ' and ' + this._lnurlPayServicePayload.max);
    const nonce = Math.floor(Math.random() * 2e16).toString(16);
    const separator = this._lnurlPayServicePayload.callback.indexOf('?') === -1 ? '?' : '&';
    const urlToFetch = this._lnurlPayServicePayload.callback + separator + 'amount=' + Math.floor(amountSat * 1000) + '&nonce=' + nonce;
    this._lnurlPayServiceBolt11Payload = await this.fetchGet(urlToFetch);
    if (this._lnurlPayServiceBolt11Payload.status === 'ERROR')
      throw new Error(this._lnurlPayServiceBolt11Payload.reason || 'requestBolt11FromLnurlPayService() error');

    // check pr description_hash, amount etc:
    const decoded = this.decodeInvoice(this._lnurlPayServiceBolt11Payload.pr);
    const metadataHash = createHash('sha256').update(this._lnurlPayServicePayload.metadata).digest('hex');
    if (metadataHash !== decoded.description_hash) {
      throw new Error(`Invoice description_hash doesn't match metadata.`);
    }
    if (parseInt(decoded.num_satoshis) !== Math.round(amountSat)) {
      throw new Error(`Invoice doesn't match specified amount, got ${decoded.num_satoshis}, expected ${Math.round(amountSat)}`);
    }

    return this._lnurlPayServiceBolt11Payload;
  }

  async callLnurlPayService() {
    if (!this._lnurl) throw new Error('this._lnurl is not set');
    const url = Lnurl.getUrlFromLnurl(this._lnurl);
    // calling the url
    const reply = await this.fetchGet(url);

    if (reply.tag !== Lnurl.TAG_PAY_REQUEST) {
      throw new Error('lnurl-pay expected, found tag ' + reply.tag);
    }

    const data = reply;

    // parse metadata and extract things from it
    var image;
    var description;
    const kvs = JSON.parse(data.metadata);
    for (let i = 0; i < kvs.length; i++) {
      const [k, v] = kvs[i];
      switch (k) {
        case 'text/plain':
          description = v;
          break;
        case 'image/png;base64':
        case 'image/jpeg;base64':
          image = 'data:' + k + ',' + v;
          break;
      }
    }

    // setting the payment screen with the parameters
    const min = Math.ceil((data.minSendable || 0) / 1000);
    const max = Math.floor(data.maxSendable / 1000);

    this._lnurlPayServicePayload = {
      callback: data.callback,
      fixed: min === max,
      min,
      max,
      domain: data.callback.match(new RegExp('https://([^/]+)/'))[1],
      metadata: data.metadata,
      description,
      image,
      amount: min,
      // lnurl: uri,
    };
    return this._lnurlPayServicePayload;
  }

  async loadSuccessfulPayment(paymentHash) {
    if (!paymentHash) throw new Error('No paymentHash provided');
    let data;
    try {
      data = await this._AsyncStorage.getItem('lnurlpay_success_data_' + paymentHash);
      data = JSON.parse(data);
    } catch (_) {
      return false;
    }

    if (!data) return false;

    this._lnurlPayServicePayload = data.lnurlPayServicePayload;
    this._lnurlPayServiceBolt11Payload = data.lnurlPayServiceBolt11Payload;
    this._lnurl = data.lnurl;
    this._preimage = data.preimage;

    return true;
  }

  async storeSuccess(paymentHash, preimage) {
    if (typeof preimage === 'object') {
      preimage = Buffer.from(preimage.data).toString('hex');
    }
    this._preimage = preimage;

    await this._AsyncStorage.setItem(
      'lnurlpay_success_data_' + paymentHash,
      JSON.stringify({
        lnurlPayServicePayload: this._lnurlPayServicePayload,
        lnurlPayServiceBolt11Payload: this._lnurlPayServiceBolt11Payload,
        lnurl: this._lnurl,
        preimage,
      }),
    );
  }

  getSuccessAction() {
    return this._lnurlPayServiceBolt11Payload.successAction;
  }

  getDomain() {
    return this._lnurlPayServicePayload.domain;
  }

  getDescription() {
    return this._lnurlPayServicePayload.description;
  }

  getImage() {
    return this._lnurlPayServicePayload.image;
  }

  getLnurl() {
    return this._lnurl;
  }

  getDisposable() {
    return this._lnurlPayServiceBolt11Payload.disposable;
  }

  getPreimage() {
    return this._preimage;
  }

  static decipherAES(ciphertextBase64, preimageHex, ivBase64) {
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const key = CryptoJS.enc.Hex.parse(preimageHex);
    return CryptoJS.AES.decrypt(Buffer.from(ciphertextBase64, 'base64').toString('hex'), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      format: CryptoJS.format.Hex,
    }).toString(CryptoJS.enc.Utf8);
  }
}
