import { AbstractHDWallet } from './abstract-hd-wallet';
import Frisbee from 'frisbee';
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');

/**
 * HD Wallet (BIP39).
 * In particular, Breadwallet-compatible (Legacy addresses)
 */
export class HDLegacyBreadwalletWallet extends AbstractHDWallet {
  static type = 'HDLegacyBreadwallet';
  static typeReadable = 'HD Legacy Breadwallet (P2PKH)';

  /**
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/584
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/914
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/997
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/0'";
    let child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();
    return this._xpub;
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/0'/0/" + index;
    let child = root.derivePath(path);

    return (this.external_addresses_cache[index] = child.getAddress());
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/0'/1/" + index;
    let child = root.derivePath(path);

    return (this.internal_addresses_cache[index] = child.getAddress());
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

  /**
   * @inheritDoc
   */
  async fetchBalance() {
    try {
      const api = new Frisbee({ baseURI: 'https://blockchain.info' });

      let response = await api.get('/balance?active=' + this.getXpub());

      if (response && response.body) {
        for (let xpub of Object.keys(response.body)) {
          this.balance = response.body[xpub].final_balance / 100000000;
        }
        this._lastBalanceFetch = +new Date();
      } else {
        throw new Error('Could not fetch balance from API: ' + response.err);
      }
    } catch (err) {
      console.warn(err);
    }
  }
}
