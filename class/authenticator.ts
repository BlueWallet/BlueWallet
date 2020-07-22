import dayjs, { Dayjs } from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

import { Authenticator as IAuthenticator } from 'app/consts';

import { generatePrivateKey, privateKeyToPublicKey, bytesToMnemonic, mnemonicToEntropy } from '../utils/crypto';

const i18n = require('../loc');

const ENCODING = 'hex';
const PIN_LENGTH = 4;

export class Authenticator implements IAuthenticator {
  privateKey: Buffer | null;
  publicKey: string;
  entropy: string;
  secret: string;
  readonly id: string;
  createdAt: Dayjs;

  constructor(readonly name: string) {
    this.id = uuidv4();
    this.privateKey = null;
    this.entropy = '';
    this.publicKey = '';
    this.secret = '';
    this.createdAt = dayjs();
  }

  static fromJson(json: string) {
    const data = JSON.parse(json);
    const { privateKey, name, createdAt } = data;
    const parsedPrivateKey = Buffer.from(privateKey.data, ENCODING);
    const authenticator = new this(name);
    for (const key of Object.keys(data)) {
      authenticator[key] = data[key];
    }

    authenticator.createdAt = dayjs(createdAt);
    authenticator.privateKey = parsedPrivateKey;

    return authenticator;
  }

  async init({ entropy, mnemonic }: { entropy?: string; mnemonic?: string }) {
    if (entropy === undefined && mnemonic === undefined) {
      throw new Error('Not provided entropy or mnemonic');
    }
    const _entropy = mnemonic === undefined ? entropy : mnemonicToEntropy(mnemonic).toString(ENCODING);

    if (_entropy === undefined) {
      throw new Error('Couldn`t get entropy');
    }

    const buffer = Buffer.from(_entropy, ENCODING);
    try {
      this.privateKey = await generatePrivateKey({
        salt: buffer,
        password: buffer,
      });
      this.entropy = _entropy;
      this.secret = mnemonic || bytesToMnemonic(buffer);
      this.publicKey = privateKeyToPublicKey(this.privateKey);
    } catch (_) {
      throw new Error(i18n.wallets.errors.invalidPrivateKey);
    }
  }

  get pin() {
    return this.publicKey.slice(-PIN_LENGTH);
  }

  get QRCode() {
    return JSON.stringify({ entropy: this.entropy, name: this.name });
  }
}
