import createHash from 'create-hash';
import slip39 from 'slip39';
import { WORD_LIST } from 'slip39/src/slip39_helper';

import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';

type TWalletThis = Omit<HDLegacyP2PKHWallet | HDSegwitP2SHWallet | HDSegwitBech32Wallet, 'secret'> & {
  secret: string[];
};

// collection of SLIP39 functions
const SLIP39Mixin = {
  _getSeed() {
    const self = this as unknown as TWalletThis;
    const master = slip39.recoverSecret(self.secret, self.passphrase);
    return Buffer.from(master);
  },

  validateMnemonic() {
    const self = this as unknown as TWalletThis;
    if (!self.secret.every(m => slip39.validateMnemonic(m))) return false;

    try {
      slip39.recoverSecret(self.secret);
    } catch (e) {
      return false;
    }
    return true;
  },

  setSecret(newSecret: string) {
    const self = this as unknown as TWalletThis;
    // Try to match words to the default slip39 wordlist and complete partial words
    const lookupMap = WORD_LIST.reduce((map, word) => {
      const prefix3 = word.substr(0, 3);
      const prefix4 = word.substr(0, 4);

      map.set(prefix3, !map.has(prefix3) ? word : false);
      map.set(prefix4, !map.has(prefix4) ? word : false);

      return map;
    }, new Map());

    self.secret = newSecret
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
    return self;
  },

  getID() {
    const self = this as unknown as TWalletThis;
    const string2hash = self.secret.sort().join(',') + (self.getPassphrase() || '');
    return createHash('sha256').update(string2hash).digest().toString('hex');
  },
};

export class SLIP39LegacyP2PKHWallet extends HDLegacyP2PKHWallet {
  static readonly type = 'SLIP39legacyP2PKH';
  static readonly typeReadable = 'SLIP39 Legacy (P2PKH)';
  // @ts-ignore: override
  public readonly type = SLIP39LegacyP2PKHWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = SLIP39LegacyP2PKHWallet.typeReadable;

  allowBIP47() {
    return false;
  }

  _getSeed = SLIP39Mixin._getSeed;
  validateMnemonic = SLIP39Mixin.validateMnemonic;
  // @ts-ignore: this type mismatch
  setSecret = SLIP39Mixin.setSecret;
  getID = SLIP39Mixin.getID;
}

export class SLIP39SegwitP2SHWallet extends HDSegwitP2SHWallet {
  static readonly type = 'SLIP39segwitP2SH';
  static readonly typeReadable = 'SLIP39 SegWit (P2SH)';
  // @ts-ignore: override
  public readonly type = SLIP39SegwitP2SHWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = SLIP39SegwitP2SHWallet.typeReadable;

  _getSeed = SLIP39Mixin._getSeed;
  validateMnemonic = SLIP39Mixin.validateMnemonic;
  // @ts-ignore: this type mismatch
  setSecret = SLIP39Mixin.setSecret;
  getID = SLIP39Mixin.getID;
}

export class SLIP39SegwitBech32Wallet extends HDSegwitBech32Wallet {
  static readonly type = 'SLIP39segwitBech32';
  static readonly typeReadable = 'SLIP39 SegWit (Bech32)';
  // @ts-ignore: override
  public readonly type = SLIP39SegwitBech32Wallet.type;
  // @ts-ignore: override
  public readonly typeReadable = SLIP39SegwitBech32Wallet.typeReadable;

  allowBIP47() {
    return false;
  }

  _getSeed = SLIP39Mixin._getSeed;
  validateMnemonic = SLIP39Mixin.validateMnemonic;
  // @ts-ignore: this type mismatch
  setSecret = SLIP39Mixin.setSecret;
  getID = SLIP39Mixin.getID;
}
