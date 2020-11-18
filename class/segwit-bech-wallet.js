import config from '../config';
import { addressToScriptHash } from '../utils/bitcoin';
import { LegacyWallet } from './legacy-wallet';

const bitcoin = require('bitcoinjs-lib');

export class SegwitBech32Wallet extends LegacyWallet {
  static type = 'segwitBech32';
  static typeReadable = 'P2 WPKH';

  getScriptHashes() {
    if (this._scriptHashes) {
      return this._scriptHashes;
    }
    this._scriptHashes = [addressToScriptHash(this._address)];
    return this._scriptHashes;
  }

  getAddressForTransaction() {
    return this.getAddress();
  }

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = bitcoin.ECPair.fromWIF(this.secret, config.network);
      address = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: config.network,
      }).address;
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }

  static witnessToAddress(witness) {
    const pubKey = Buffer.from(witness, 'hex');
    return bitcoin.payments.p2wpkh({
      pubkey: pubKey,
      network: config.network,
    }).address;
  }

  /**
   * Converts script pub key to bech32 address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either bech32 address or false
   */
  static scriptPubKeyToAddress(scriptPubKey) {
    const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
    let ret;
    try {
      ret = bitcoin.payments.p2wpkh({
        output: scriptPubKey2,
        network: config.network,
      }).address;
    } catch (_) {
      return false;
    }
    return ret;
  }
}
