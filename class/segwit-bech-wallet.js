import { LegacyWallet } from './legacy-wallet';
import bitcoin from 'bitcoinjs-lib';
import b58 from 'bs58check';

/**
 * Converts zpub to xpub
 * @param {String} zpub - wallet zpub
 * @returns {*}
 */
export function zpubToXpub(zpub) {
  let data = b58.decode(zpub);
  data = data.slice(4);
  data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);
  return b58.encode(data);
}

/**
 * Creates Segwit P2WPKH Bitcoin address (Bech32)
 * @param hdNode
 * @returns {String}
 */
export function nodeToP2wpkhSegwitAddress(hdNode) {
  var pubkeyBuf = hdNode.keyPair.getPublicKeyBuffer();
  var hash = bitcoin.crypto.hash160(pubkeyBuf);
  var scriptPubkey = bitcoin.script.witnessPubKeyHash.output.encode(hash);

  return bitcoin.address.fromOutputScript(scriptPubkey);
}

export class SegwitBech32Wallet extends LegacyWallet {
  static type = 'segwitBech32';
  static typeReadable = 'P2 WPKH';

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret);
      let pubKey = keyPair.getPublicKeyBuffer();
      let scriptPubKey = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(pubKey));
      address = bitcoin.address.fromOutputScript(scriptPubKey);
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }

  static witnessToAddress(witness) {
    const pubKey = Buffer.from(witness, 'hex');
    const pubKeyHash = bitcoin.crypto.hash160(pubKey);
    const scriptPubKey = bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash);
    return bitcoin.address.fromOutputScript(scriptPubKey, bitcoin.networks.bitcoin);
  }

  static scriptPubKeyToAddress(scriptPubKey) {
    const bitcoin = require('bitcoinjs-lib');
    const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
    return bitcoin.address.fromOutputScript(scriptPubKey2, bitcoin.networks.bitcoin);
  }
}
