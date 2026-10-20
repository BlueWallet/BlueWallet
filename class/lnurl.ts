import { bech32 } from 'bech32';
import { BIP32Interface } from 'bip32';
import bolt11 from 'bolt11';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { cbc } from '@noble/ciphers/aes';
import ecc from '../blue_modules/noble_ecc';
import { parse } from 'url'; // eslint-disable-line n/no-deprecated-api
import { fetch } from '../util/fetch';
import { base64ToUint8Array, hexToUint8Array, uint8ArrayToHex, uint8ArrayToString } from '../blue_modules/uint8array-extras';

const ONION_REGEX = /^(http:\/\/[^/:@]+\.onion(?::\d{1,5})?)(\/.*)?$/; // regex for onion URL

interface LnurlPayServicePayload {
  callback: string;
  fixed: boolean;
  min: number;
  max: number;
  domain: string;
  metadata: string;
  description?: string;
  image?: string;
  amount: number;
  commentAllowed?: number;
}

interface LnurlPayServiceBolt11Payload {
  pr: string;
  successAction?: any;
  disposable?: boolean;
  tag: string;
  metadata: any;
  minSendable: number;
  maxSendable: number;
  callback: string;
  commentAllowed: number;
}

export type LnurlAuthAction = 'register' | 'login' | 'link' | 'auth';

const LNURL_AUTH_ACTIONS: readonly LnurlAuthAction[] = ['register', 'login', 'link', 'auth'];

export interface LnurlAuthParams {
  href: string;
  domain: string;
  k1: string;
  action: LnurlAuthAction;
}

/**
 * `{"status": "ERROR", "reason": "..."}` reply from LNURL service. `reason` is text from the service, so it can be shown to the user
 */
export class LnurlServerError extends Error {
  reason: string;

  constructor(reason: string) {
    super('Reply from server: ' + reason);
    this.name = 'LnurlServerError';
    this.reason = reason;
  }
}

interface DecodedInvoice {
  destination: string;
  num_satoshis: string;
  num_millisatoshis: string;
  timestamp: string;
  fallback_addr: string;
  route_hints: any[];
  payment_hash?: string;
  description_hash?: string;
  cltv_expiry?: string;
  expiry?: string;
  description?: string;
}

/**
 * @see https://github.com/btcontract/lnurl-rfc/blob/master/lnurl-pay.md
 */
export default class Lnurl {
  static TAG_PAY_REQUEST = 'payRequest'; // type of LNURL
  static TAG_WITHDRAW_REQUEST = 'withdrawRequest'; // type of LNURL
  static TAG_LOGIN_REQUEST = 'login'; // type of LNURL

  private _lnurl: string;
  private _lnurlPayServiceBolt11Payload: LnurlPayServiceBolt11Payload | false;
  private _lnurlPayServicePayload: LnurlPayServicePayload | false;
  private _AsyncStorage: any;
  private _preimage: string | false;

  constructor(url: string | false, AsyncStorage?: any) {
    this._lnurl = url || '';
    this._lnurlPayServiceBolt11Payload = false;
    this._lnurlPayServicePayload = false;
    this._AsyncStorage = AsyncStorage;
    this._preimage = false;
  }

  static findlnurl(bodyOfText: string): string | null {
    const res = /^(?:http.*[&?]lightning=|lightning:)?(lnurl1[02-9ac-hj-np-z]+)/.exec(bodyOfText.toLowerCase());
    if (res) {
      return res[1];
    }
    return null;
  }

  static getUrlFromLnurl(lnurlExample: string): string | false {
    const found = Lnurl.findlnurl(lnurlExample);
    if (!found) {
      if (Lnurl.isLightningAddress(lnurlExample)) {
        const username = lnurlExample.split('@')[0].trim();
        const host = lnurlExample.split('@')[1].trim();
        const proto = host.match(/\.onion$/) ? 'http' : 'https';
        return `${proto}://${host}/.well-known/lnurlp/${username}`;
      } else {
        return false;
      }
    }

    const decoded = bech32.decode(found, 10000);
    return uint8ArrayToString(new Uint8Array(bech32.fromWords(decoded.words)));
  }

  static isLnurl(url: string): boolean {
    return Lnurl.findlnurl(url) !== null;
  }

  static isOnionUrl(url: string): boolean {
    return Lnurl.parseOnionUrl(url) !== null;
  }

  static parseOnionUrl(url: string): [string, string] | null {
    const match = url.match(ONION_REGEX);
    if (match === null) return null;
    const [, baseURI, path] = match;
    return [baseURI, path];
  }

  async fetchGet(url: string): Promise<any> {
    const resp = await fetch(url, { method: 'GET' });
    if (resp.status >= 300) {
      // some services send the error reason with an HTTP error status
      const errorReply = await resp.json().catch(() => undefined);
      if (typeof errorReply?.reason === 'string') {
        throw new LnurlServerError(errorReply.reason);
      }
      throw new Error('Bad response from server');
    }
    const reply = await resp.json();
    if (reply.status === 'ERROR') {
      throw new LnurlServerError(String(reply.reason ?? ''));
    }
    return reply;
  }

  decodeInvoice(invoice: string): DecodedInvoice {
    const { payeeNodeKey, tags, satoshis, millisatoshis, timestamp } = bolt11.decode(invoice);

    const decoded: DecodedInvoice = {
      destination: payeeNodeKey ?? '',
      num_satoshis: satoshis ? satoshis.toString() : '0',
      num_millisatoshis: millisatoshis ? millisatoshis.toString() : '0',
      timestamp: timestamp?.toString() ?? '',
      fallback_addr: '',
      route_hints: [],
    };

    for (let i = 0; i < tags.length; i++) {
      const { tagName, data } = tags[i];
      switch (tagName) {
        case 'payment_hash':
          decoded.payment_hash = String(data);
          break;
        case 'purpose_commit_hash':
          decoded.description_hash = String(data);
          break;
        case 'min_final_cltv_expiry':
          decoded.cltv_expiry = data.toString();
          break;
        case 'expire_time':
          decoded.expiry = data.toString();
          break;
        case 'description':
          decoded.description = String(data);
          break;
      }
    }

    if (!decoded.expiry) decoded.expiry = '3600'; // default

    if (parseInt(decoded.num_satoshis, 10) === 0 && parseInt(decoded.num_millisatoshis, 10) > 0) {
      decoded.num_satoshis = (parseInt(decoded.num_millisatoshis, 10) / 1000).toString();
    }

    return decoded;
  }

  async requestBolt11FromLnurlPayService(amountSat: number, comment: string = ''): Promise<LnurlPayServiceBolt11Payload> {
    if (!this._lnurlPayServicePayload) throw new Error('this._lnurlPayServicePayload is not set');
    if (!this._lnurlPayServicePayload.callback) throw new Error('this._lnurlPayServicePayload.callback is not set');
    if (amountSat < this._lnurlPayServicePayload.min || amountSat > this._lnurlPayServicePayload.max)
      throw new Error(
        'The specified amount is invalid, ' +
          amountSat +
          ' it should be between ' +
          this._lnurlPayServicePayload.min +
          ' and ' +
          this._lnurlPayServicePayload.max,
      );
    const nonce = Math.floor(Math.random() * 2e16).toString(16);
    const separator = this._lnurlPayServicePayload.callback.indexOf('?') === -1 ? '?' : '&';
    if (this.getCommentAllowed() && comment && comment.length > (this.getCommentAllowed() as number)) {
      comment = comment.substr(0, this.getCommentAllowed() as number);
    }
    if (comment) comment = `&comment=${encodeURIComponent(comment)}`;
    const urlToFetch =
      this._lnurlPayServicePayload.callback + separator + 'amount=' + Math.floor(amountSat * 1000) + '&nonce=' + nonce + comment;
    this._lnurlPayServiceBolt11Payload = (await this.fetchGet(urlToFetch)) as LnurlPayServiceBolt11Payload;

    // check pr description_hash, amount etc:
    const decoded = this.decodeInvoice(this._lnurlPayServiceBolt11Payload.pr);
    const metadataHash = uint8ArrayToHex(sha256(this._lnurlPayServicePayload.metadata));
    if (metadataHash !== decoded.description_hash) {
      console.log(`Invoice description_hash doesn't match metadata.`);
    }
    if (parseInt(decoded.num_satoshis, 10) !== Math.round(amountSat)) {
      throw new Error(`Invoice doesn't match specified amount, got ${decoded.num_satoshis}, expected ${Math.round(amountSat)}`);
    }

    return this._lnurlPayServiceBolt11Payload;
  }

  async callLnurlPayService(): Promise<LnurlPayServicePayload> {
    if (!this._lnurl) throw new Error('this._lnurl is not set');
    const url = Lnurl.getUrlFromLnurl(this._lnurl);
    if (!url) throw new Error('Invalid LNURL');
    // calling the url
    const reply = (await this.fetchGet(url)) as LnurlPayServiceBolt11Payload;

    if (reply.tag !== Lnurl.TAG_PAY_REQUEST) {
      throw new Error('lnurl-pay expected, found tag ' + reply.tag);
    }

    const data = reply;

    // parse metadata and extract things from it
    let image: string | undefined;
    let description: string | undefined;
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
    const min = Math.ceil((data.minSendable ?? 0) / 1000);
    const max = Math.floor((data.maxSendable ?? 0) / 1000);

    this._lnurlPayServicePayload = {
      callback: data.callback,
      fixed: min === max,
      min,
      max,
      // @ts-ignore idk
      domain: data.callback.match(/^(https|http):\/\/([^/]+)\//)[2],
      metadata: data.metadata,
      description,
      image,
      amount: min,
      commentAllowed: data.commentAllowed,
      // lnurl: uri,
    };
    return this._lnurlPayServicePayload;
  }

  async loadSuccessfulPayment(paymentHash: string): Promise<boolean> {
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

  async storeSuccess(paymentHash: string, preimage: string | { data: Buffer }): Promise<void> {
    if (typeof preimage === 'object') {
      preimage = uint8ArrayToHex(new Uint8Array(preimage.data));
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

  getSuccessAction(): any | undefined {
    return this._lnurlPayServiceBolt11Payload && 'successAction' in this._lnurlPayServiceBolt11Payload
      ? this._lnurlPayServiceBolt11Payload.successAction
      : undefined;
  }

  getDomain(): string | undefined {
    return this._lnurlPayServicePayload ? this._lnurlPayServicePayload.domain : undefined;
  }

  getDescription(): string | undefined {
    return this._lnurlPayServicePayload ? this._lnurlPayServicePayload.description : undefined;
  }

  getImage(): string | undefined {
    return this._lnurlPayServicePayload ? this._lnurlPayServicePayload.image : undefined;
  }

  getLnurl(): string {
    return this._lnurl;
  }

  getDisposable(): boolean | undefined {
    return this._lnurlPayServiceBolt11Payload && 'disposable' in this._lnurlPayServiceBolt11Payload
      ? this._lnurlPayServiceBolt11Payload.disposable
      : undefined;
  }

  getPreimage(): string | false {
    return this._preimage;
  }

  static decipherAES(ciphertextBase64: string, preimageHex: string, ivBase64: string): string {
    // crypto-js's old implementation silently returned '' on malformed
    // ciphertext (non-16-aligned bytes, bad PKCS7 padding) and threw on
    // malformed UTF-8 plaintext. @noble/ciphers throws on the former. We
    // catch every throw and return '' — the call site at
    // screen/lnd/lnurlPaySuccess.tsx renders this directly without a
    // try/catch, so a misbehaving LNURL server should not crash the screen.
    // Note: unlike crypto-js's strict `enc.Utf8` decoder, `uint8ArrayToString`
    // is lenient on bad UTF-8 (mojibake instead of throw); this is strictly
    // safer than the old behaviour for this user-facing path.
    try {
      const key = hexToUint8Array(preimageHex);
      const iv = base64ToUint8Array(ivBase64);
      const ct = base64ToUint8Array(ciphertextBase64);
      const pt = cbc(key, iv).decrypt(ct);
      return uint8ArrayToString(pt);
    } catch (_) {
      return '';
    }
  }

  getCommentAllowed(): number | false {
    if (!this._lnurlPayServicePayload) return false;
    return this._lnurlPayServicePayload.commentAllowed ? parseInt(this._lnurlPayServicePayload.commentAllowed.toString(), 10) : false;
  }

  getMin(): number | false {
    if (!this._lnurlPayServicePayload) return false;
    return this._lnurlPayServicePayload.min ? parseInt(this._lnurlPayServicePayload.min.toString(), 10) : false;
  }

  getMax(): number | false {
    if (!this._lnurlPayServicePayload) return false;
    return this._lnurlPayServicePayload.max ? parseInt(this._lnurlPayServicePayload.max.toString(), 10) : false;
  }

  getAmount(): number | false {
    return this.getMin();
  }

  /**
   * @see https://github.com/lnurl/luds/blob/luds/04.md
   */
  static isLnurlAuth(text: string): boolean {
    if (!Lnurl.isLnurl(text)) return false;
    try {
      return parse(Lnurl.getUrlFromLnurl(text) || '', true).query.tag === Lnurl.TAG_LOGIN_REQUEST;
    } catch (_) {
      return false;
    }
  }

  /**
   * Validates LNURL-auth request (LUD-04) and extracts everything needed to sign it
   */
  static parseAuthUrl(lnurl: string): LnurlAuthParams {
    const url = parse(Lnurl.getUrlFromLnurl(lnurl) || '', true);
    const { tag, k1, action = 'auth' } = url.query;

    if (tag !== Lnurl.TAG_LOGIN_REQUEST) {
      throw new Error('lnurl-auth expected, found tag ' + tag);
    }

    // LUD-05: FQDN with last full-stop omitted
    const domain = (url.hostname || '').replace(/\.$/, '');
    if (!domain) {
      throw new Error('Invalid URL: hostname is null');
    }

    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && domain.endsWith('.onion'))) {
      throw new Error('Invalid URL: must be https or onion');
    }

    if (typeof k1 !== 'string' || !/^[0-9a-f]{64}$/i.test(k1)) {
      throw new Error('Invalid k1');
    }

    // unknown actions (e.g. "signup") are not rejected: the signature is the same, only the prompt differs, so show the login prompt like Valet
    const normalizedAction = typeof action === 'string' ? action.toLowerCase() : '';
    const authAction = LNURL_AUTH_ACTIONS.includes(normalizedAction as LnurlAuthAction) ? (normalizedAction as LnurlAuthAction) : 'login';

    return { href: url.href, domain, k1, action: authAction };
  }

  /**
   * Linking key derivation used by LNDHub wallets before LUD-05 support. Kept so existing
   * accounts on services stay accessible.
   */
  static legacyLinkingKey(secret: string, domain: string): Uint8Array {
    return hmac(sha256, secret, domain);
  }

  /**
   * @see https://github.com/lnurl/luds/blob/luds/05.md
   */
  static lud05PathSuffix(hashingKey: Uint8Array, domain: string): number[] {
    const material = hmac(sha256, hashingKey, domain);
    const view = new DataView(material.buffer, material.byteOffset, 16);
    return [0, 4, 8, 12].map(offset => view.getUint32(offset, false));
  }

  /**
   * Indexes of 2^31 and above are derived as hardened, same as other LUD-05 implementations,
   * so they must not be masked.
   *
   * @see https://github.com/lnurl/luds/blob/luds/05.md
   */
  static lud05LinkingKey(root: BIP32Interface, domain: string): Uint8Array {
    const hashingKey = root.derivePath("m/138'/0").privateKey;
    if (!hashingKey) {
      throw new Error('LNURL-auth requires a private key');
    }

    const node = Lnurl.lud05PathSuffix(hashingKey, domain).reduce((parent, index) => parent.derive(index), root.derivePath("m/138'"));
    if (!node.privateKey) {
      throw new Error('LNURL-auth requires a private key');
    }

    return node.privateKey;
  }

  async authenticate(linkingKey: Uint8Array): Promise<void> {
    if (!this._lnurl) throw new Error('this._lnurl is not set');

    const { href, k1 } = Lnurl.parseAuthUrl(this._lnurl);

    const publicKey = ecc.pointFromScalar(linkingKey);
    if (!publicKey) {
      throw new Error('Failed to generate public key');
    }
    const signature = ecc.signDER(hexToUint8Array(k1), linkingKey);

    const reply = await this.fetchGet(`${href}&sig=${uint8ArrayToHex(signature)}&key=${uint8ArrayToHex(publicKey)}`);
    if (reply?.status !== 'OK') {
      throw new Error('Unexpected reply from server');
    }
  }

  static isLightningAddress(address: string) {
    // ensure only 1 `@` present:
    if (address.split('@').length !== 2) return false;
    const splitted = address.split('@');
    return !!splitted[0].trim() && !!splitted[1].trim();
  }
}
