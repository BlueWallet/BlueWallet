import { LegacyWallet } from './legacy-wallet';
const bitcoin = require('bitcoinjs-lib');

export class SegwitBech32Wallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'segwitBech32';
  }

  getTypeReadable() {
    return 'P2 WPKH';
  }

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret);
      let pubKey = keyPair.getPublicKeyBuffer();
      let scriptPubKey = bitcoin.script.witnessPubKeyHash.output.encode(
        bitcoin.crypto.hash160(pubKey),
      );
      address = bitcoin.address.fromOutputScript(scriptPubKey);
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }
}
