import * as bip39 from 'bip39';
import { crypto } from 'bitcoinjs-lib';
import * as ecurve from 'ecurve';
import { pbkdf2 } from 'pbkdf2';

import { bytesToBits, bitsToBytes } from './buffer';

const bigi = require('bigi');

const i18n = require('../loc');

interface GeneratePrivateKey {
  password: Buffer;
  salt: Buffer;
  iterations?: number;
  keylen?: number;
  digest?: string;
}

export const generatePrivateKey = ({
  password,
  salt,
  iterations = 100000,
  keylen = 32,
  digest = 'sha256',
}: GeneratePrivateKey): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
      if (err) {
        reject(err);
      }
      resolve(derivedKey);
    });
  });

export const privateKeyToPublicKey = (privateKey: Buffer) =>
  ecurve
    .getCurveByName('secp256k1')
    .G.multiply(bigi.fromBuffer(privateKey))
    .getEncoded(false)
    .toString('hex');

const create132BitKeyWithSha256 = (bytes: Buffer, random128bits: string) => {
  const SALT_LENGHT = 4;
  const sha256Bits = bytesToBits(crypto.sha256(bytes));
  return sha256Bits.slice(0, SALT_LENGHT) + random128bits;
};

const generateWordsFromBytes = (random132bits: string) => {
  const dividedBits = random132bits.match(/.{1,11}/g);
  if (dividedBits === null) {
    throw new Error('Couldn`t parse bits');
  }
  return dividedBits.map(bit => {
    const index = parseInt(bit, 2);
    return bip39.wordlists.english[index];
  });
};

export const bytesToMnemonic = (bytes: Buffer): string => {
  const random128bits = bytesToBits(bytes);
  const random132bits = create132BitKeyWithSha256(bytes, random128bits);
  return generateWordsFromBytes(random132bits).join(' ');
};

export const mnemonicToBits = (mnemonic: string) => {
  const WORD_BIT_LENGHT = 11;

  return mnemonic.split(' ').reduce((bits, word) => {
    const index = bip39.wordlists.english.indexOf(word);
    if (index === -1) {
      throw new Error(
        i18n.formatString(i18n.wallets.errors.noIndexForWord, {
          word,
        }),
      );
    }
    return bits + index.toString(2).padStart(WORD_BIT_LENGHT, '0');
  }, '');
};

export const mnemonicToEntropy = (mnemonic: string) => {
  const SALT_LENGHT = 4;
  const bits128 = mnemonicToBits(mnemonic).slice(SALT_LENGHT);
  return bitsToBytes(bits128);
};
