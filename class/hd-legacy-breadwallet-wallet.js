import { AbstractHDWallet } from './abstract-hd-wallet';
import Frisbee from 'frisbee';
import bip39 from 'bip39';
const bip32 = require('bip32');
const bitcoinjs = require('bitcoinjs-lib');

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
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);

    const path = "m/0'";
    const child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();

    return this._xpub;
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);

    const path = "m/0'/0/" + index;
    const child = root.derivePath(path);

    const address = bitcoinjs.payments.p2pkh({
      pubkey: child.publicKey,
    }).address;

    return (this.external_addresses_cache[index] = address);
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);

    const path = "m/0'/1/" + index;
    const child = root.derivePath(path);

    const address = bitcoinjs.payments.p2pkh({
      pubkey: child.publicKey,
    }).address;

    return (this.internal_addresses_cache[index] = address);
  }

  _getExternalWIFByIndex(index) {
    return this._getWIFByIndex(false, index);
  }

  _getInternalWIFByIndex(index) {
    return this._getWIFByIndex(true, index);
  }

  /**
   * Get internal/external WIF by wallet index
   * @param {Boolean} internal
   * @param {Number} index
   * @returns {*}
   * @private
   */
  _getWIFByIndex(internal, index) {
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bitcoinjs.bip32.fromSeed(seed);
    const path = `m/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

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
