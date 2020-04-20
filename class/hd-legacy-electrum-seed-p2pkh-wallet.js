import { HDLegacyP2PKHWallet } from './';

const bitcoin = require('bitcoinjs-lib');
const mn = require('electrum-mnemonic');

/**
 * ElectrumSeed means that instead of BIP39 seed format it works with the format invented by Electrum wallet. Otherwise
 * its a regular HD wallet that has all the properties of parent class.
 *
 * @see https://electrum.readthedocs.io/en/latest/seedphrase.html
 */
export class HDLegacyElectrumSeedP2PKHWallet extends HDLegacyP2PKHWallet {
  static type = 'HDlegacyElectrumSeedP2PKH';
  static typeReadable = 'HD Legacy Electrum (BIP32 P2PKH)';

  validateMnemonic() {
    try {
      mn.mnemonicToSeedSync(this.secret);
      return true;
    } catch (_) {
      return false;
    }
  }

  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const root = bitcoin.bip32.fromSeed(mn.mnemonicToSeedSync(this.secret));
    this._xpub = root.toBase58();
    return this._xpub;
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    const node = bitcoin.bip32.fromBase58(this.getXpub());
    const address = bitcoin.payments.p2pkh({
      pubkey: node.derive(1).derive(index).publicKey,
    }).address;

    return (this.internal_addresses_cache[index] = address);
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    const node = bitcoin.bip32.fromBase58(this.getXpub());
    const address = bitcoin.payments.p2pkh({
      pubkey: node.derive(0).derive(index).publicKey,
    }).address;

    return (this.external_addresses_cache[index] = address);
  }

  _getWIFByIndex(internal, index) {
    const root = bitcoin.bip32.fromSeed(mn.mnemonicToSeedSync(this.secret));
    const path = `m/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }
}
