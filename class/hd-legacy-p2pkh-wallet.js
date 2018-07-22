import { LegacyWallet } from './';
import { AbstractHDWallet } from './abstract-hd-wallet';
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');

/**
 * HD Wallet (BIP39).
 * In particular, BIP44 (P2PKH legacy addressess)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 */
export class HDLegacyP2PKHWallet extends AbstractHDWallet {
  constructor() {
    super();
    this.type = 'HDlegacyP2PKH';
  }

  getTypeReadable() {
    return 'HD Legacy (BIP44 P2PKH)';
  }

  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/44'/0'/0'";
    let child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();
    return this._xpub;
  }

  _getExternalWIFByIndex(index) {
    index = index * 1; // cast to int
    if (index < 0) return '';
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/44'/0'/0'/0/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getInternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/44'/0'/0'/1/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/44'/0'/0'/0/" + index;
    let child = root.derivePath(path);

    let w = new LegacyWallet();
    w.setSecret(child.keyPair.toWIF());
    return (this.external_addresses_cache[index] = w.getAddress());
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/44'/0'/0'/1/" + index;
    let child = root.derivePath(path);

    let w = new LegacyWallet();
    w.setSecret(child.keyPair.toWIF());
    return (this.internal_addresses_cache[index] = w.getAddress());
  }
}
