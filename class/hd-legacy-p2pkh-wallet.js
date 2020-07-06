import BigNumber from 'bignumber.js';
import * as bip39 from 'bip39';

import signer from '../models/signer';
import { AbstractHDWallet } from './abstract-hd-wallet';

const HDNode = require('bip32');
const bitcoin = require('bitcoinjs-lib');

/**
 * HD Wallet (BIP39).
 * In particular, BIP44 (P2PKH legacy addressess)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 */
export class HDLegacyP2PKHWallet extends AbstractHDWallet {
  static type = 'HDlegacyP2PKH';
  static typeReadable = 'HD Legacy (BIP44 P2PKH)';

  allowSend() {
    return true;
  }

  async getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const mnemonic = this.secret;
    this.seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(this.seed);

    const path = "m/44'/440'/0'";
    const child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();
    return this._xpub;
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
  async _getWIFByIndex(index) {
    if (!this.seed) {
      this.seed = await bip39.mnemonicToSeed(this.secret);
    }

    const root = HDNode.fromSeed(this.seed);
    const path = `m/44'/440'/0'/0/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  async generateAddresses() {
    const node = bitcoin.bip32.fromBase58(await this.getXpub());
    for (let index = 0; index < this.num_addresses; index++) {
      const address = bitcoin.payments.p2pkh({
        pubkey: node.derive(0).derive(index).publicKey,
      }).address;
      this._address.push(address);
      this._address_to_wif_cache[address] = await this._getWIFByIndex(index);
      this._addr_balances[address] = {
        total: 0,
        c: 0,
        u: 0,
      };
    }
    console.warn(this._address);
  }

  createTx(utxos, amount, fee, address) {
    for (const utxo of utxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    const amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    return signer.createHDTransaction(utxos, address, amountPlusFee, fee, this.getAddressForTransaction());
  }
}
