import { LegacyWallet } from './legacy-wallet';
const bitcoin = require('bitcoinjs-lib');

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
