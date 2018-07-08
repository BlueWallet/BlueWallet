import { HDSegwitP2SHWallet } from './';
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');

/**
 * HD Wallet (BIP39).
 * In particular, Breadwallet-compatible (Legacy addresses)
 */
export class HDLegacyBreadwalletWallet extends HDSegwitP2SHWallet {
  constructor() {
    super();
    this.type = 'HDLegacyBreadwallet';
  }

  getTypeReadable() {
    return 'HD Legacy Breadwallet-compatible (P2PKH)';
  }

  /**
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/584
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/914
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/997
   */
  getXpub() {
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/0'";
    let child = root.derivePath(path).neutered();
    return child.toBase58();
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/0'/0/" + index;
    let child = root.derivePath(path);

    return child.getAddress();
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int

    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/0'/1/" + index;
    let child = root.derivePath(path);

    return child.getAddress();
  }

  _getExternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/0'/0/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getInternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/0'/1/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  getAddressAsync() {
    // TODO
  }
}
