import { LegacyWallet } from './';
import { AbstractHDWallet } from './abstract-hd-wallet';
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const BigNumber = require('bignumber.js');
const signer = require('../models/signer');

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
    if (!this._xpub) {
      let mnemonic = this.secret;
      let seed = bip39.mnemonicToSeed(mnemonic);
      let root = bitcoin.HDNode.fromSeedBuffer(seed);
      let path = "m/44'/0'/0'/0/" + index;
      let child = root.derivePath(path);

      let w = new LegacyWallet();
      w.setSecret(child.keyPair.toWIF());
      return (this.external_addresses_cache[index] = w.getAddress());
    } else {
      let node = bitcoin.HDNode.fromBase58(this._xpub);
      let address = node
        .derive(0)
        .derive(index)
        .getAddress();
      return (this.external_addresses_cache[index] = address);
    }
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    if (!this._xpub) {
      let mnemonic = this.secret;
      let seed = bip39.mnemonicToSeed(mnemonic);
      let root = bitcoin.HDNode.fromSeedBuffer(seed);

      let path = "m/44'/0'/0'/1/" + index;
      let child = root.derivePath(path);

      let w = new LegacyWallet();
      w.setSecret(child.keyPair.toWIF());
      return (this.internal_addresses_cache[index] = w.getAddress());
    } else {
      let node = bitcoin.HDNode.fromBase58(this._xpub);
      let address = node
        .derive(1)
        .derive(index)
        .getAddress();
      return (this.internal_addresses_cache[index] = address);
    }
  }

  createTx(utxos, amount, fee, address) {
    for (let utxo of utxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    return signer.createHDTransaction(
      utxos,
      address,
      amountPlusFee,
      fee,
      this._getInternalAddressByIndex(this.next_free_change_address_index),
    );
  }
}
