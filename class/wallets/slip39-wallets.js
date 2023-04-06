import slip39 from 'slip39';
import { WORD_LIST } from 'slip39/dist/slip39_helper';
import createHash from 'create-hash';

import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';

// collection of SLIP39 functions
const SLIP39Mixin = {
  _getSeed() {
    const master = slip39.recoverSecret(this.secret, this.passphrase);
    return Buffer.from(master);
  },

  validateMnemonic() {
    if (!this.secret.every(m => slip39.validateMnemonic(m))) return false;

    try {
      slip39.recoverSecret(this.secret);
    } catch (e) {
      return false;
    }
    return true;
  },

  setSecret(newSecret) {
    // Try to match words to the default slip39 wordlist and complete partial words
    const lookupMap = WORD_LIST.reduce((map, word) => {
      const prefix3 = word.substr(0, 3);
      const prefix4 = word.substr(0, 4);

      map.set(prefix3, !map.has(prefix3) ? word : false);
      map.set(prefix4, !map.has(prefix4) ? word : false);

      return map;
    }, new Map());

    this.secret = newSecret
      .trim()
      .split('\n')
      .filter(s => s)
      .map(s => {
        let secret = s
          .trim()
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, ' ')
          .replace(/\s+/g, ' ');

        secret = secret
          .split(' ')
          .map(word => lookupMap.get(word) || word)
          .join(' ');

        return secret;
      });
    return this;
  },

  getID() {
    const string2hash = this.secret.sort().join(',') + (this.getPassphrase() || '');
    return createHash('sha256').update(string2hash).digest().toString('hex');
  },
};

export class SLIP39LegacyP2PKHWallet extends HDLegacyP2PKHWallet {
  static type = 'SLIP39legacyP2PKH';
  static typeReadable = 'SLIP39 Legacy (P2PKH)';

  allowBIP47() {
    return false;
  }

  _getSeed = SLIP39Mixin._getSeed;
  validateMnemonic = SLIP39Mixin.validateMnemonic;
  setSecret = SLIP39Mixin.setSecret;
  getID = SLIP39Mixin.getID;
}

export class SLIP39SegwitP2SHWallet extends HDSegwitP2SHWallet {
  static type = 'SLIP39segwitP2SH';
  static typeReadable = 'SLIP39 SegWit (P2SH)';

  _getSeed = SLIP39Mixin._getSeed;
  validateMnemonic = SLIP39Mixin.validateMnemonic;
  setSecret = SLIP39Mixin.setSecret;
  getID = SLIP39Mixin.getID;
}

export class SLIP39SegwitBech32Wallet extends HDSegwitBech32Wallet {
  static type = 'SLIP39segwitBech32';
  static typeReadable = 'SLIP39 SegWit (Bech32)';

  allowBIP47() {
    return false;
  }

  _getSeed = SLIP39Mixin._getSeed;
  validateMnemonic = SLIP39Mixin.validateMnemonic;
  setSecret = SLIP39Mixin.setSecret;
  getID = SLIP39Mixin.getID;
}
