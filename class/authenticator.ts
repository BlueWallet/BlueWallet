import { ECPair, VaultTxType, address, TxOutput } from 'bitcoinjs-lib';
import dayjs, { Dayjs } from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

import { Authenticator as IAuthenticator, FinalizedPSBT } from 'app/consts';

import config from '../config';
import {
  bytesToMnemonic,
  mnemonicToKeyPair,
  privateKeyToPublicKey,
  getRandomBytes,
  privateKeyToKeyPair,
} from '../utils/crypto';

const i18n = require('../loc');
const signer = require('../models/signer');

const PIN_LENGTH = 4;

export class Authenticator implements IAuthenticator {
  static randomBytesSize = 16;
  publicKey: string;
  secret: string;
  keyPair: ECPair.ECPairInterface | null;
  readonly id: string;
  createdAt: Dayjs;

  constructor(readonly name: string) {
    this.id = uuidv4();
    this.publicKey = '';
    this.secret = '';
    this.keyPair = null;
    this.createdAt = dayjs();
  }

  static fromJson(json: string) {
    const data = JSON.parse(json);
    const { keyPair, name, createdAt } = data;

    const parsedKeyPair = privateKeyToKeyPair(keyPair.__D.data);

    const authenticator = new this(name);

    for (const key of Object.keys(data)) {
      authenticator[key] = data[key];
    }

    authenticator.createdAt = dayjs(createdAt);
    authenticator.keyPair = parsedKeyPair;

    return authenticator;
  }

  async init({ mnemonic }: { mnemonic?: string }) {
    try {
      this.secret =
        mnemonic !== undefined ? mnemonic : bytesToMnemonic(await getRandomBytes(Authenticator.randomBytesSize));

      this.keyPair = await mnemonicToKeyPair(this.secret);

      if (this.keyPair?.privateKey === undefined) {
        throw new Error();
      }
      this.publicKey = await privateKeyToPublicKey(this.keyPair.privateKey);
    } catch (_) {
      throw new Error(i18n.message.wrongMnemonic);
    }
  }

  async signAndFinalizePSBT(encodedPSBT: string): Promise<FinalizedPSBT> {
    let tx, fee;
    let vaultTxType = VaultTxType.Recovery;
    try {
      ({ tx, fee } = signer.signAndFinalizePSBT(encodedPSBT, [this.keyPair], vaultTxType));
    } catch (_) {
      try {
        vaultTxType = VaultTxType.Instant;
        ({ tx, fee } = signer.signAndFinalizePSBT(encodedPSBT, [this.keyPair], vaultTxType));
      } catch (e) {
        throw new Error(`Unable to sign tx with authenticator: ${e.message}`);
      }
    }

    const recipients = tx.outs.map((output: TxOutput) => {
      return {
        address: address.fromOutputScript(output.script, config.network),
        value: output.value,
      };
    });

    return {
      tx,
      vaultTxType,
      recipients,
      fee,
    };
  }

  get pin() {
    return this.publicKey.slice(-PIN_LENGTH);
  }

  get QRCode() {
    return this.secret;
  }
}
