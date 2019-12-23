import bip39 from 'bip39';
import BigNumber from 'bignumber.js';
import b58 from 'bs58check';
import signer from '../models/signer';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
const bitcoin = require('bitcoinjs-lib');
const HDNode = require('bip32');

/**
 * HD Wallet (BIP39).
 * In particular, BIP49 (P2SH Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
 */
export class HDSegwitP2SHWallet extends AbstractHDElectrumWallet {
  static type = 'HDsegwitP2SH';
  static typeReadable = 'HD SegWit (BIP49 P2SH)';

  allowSend() {
    return true;
  }

  allowSendMax(): boolean {
    return true;
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
    const root = bitcoin.bip32.fromSeed(seed);
    const path = `m/49'/0'/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return bitcoin.ECPair.fromPrivateKey(child.privateKey).toWIF();
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    if (!this._node0) {
      const xpub = this.constructor._ypubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    const address = this.constructor._nodeToP2shSegwitAddress(this._node0.derive(index));

    return (this.external_addresses_cache[index] = address);
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    if (!this._node1) {
      const xpub = this.constructor._ypubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node1 = hdNode.derive(1);
    }
    const address = this.constructor._nodeToP2shSegwitAddress(this._node1.derive(index));

    return (this.internal_addresses_cache[index] = address);
  }

  /**
   * Returning ypub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} ypub
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = HDNode.fromSeed(seed);

    const path = "m/49'/0'/0'";
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support ypub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('049d7cb2', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  /**
   *
   * @param utxos
   * @param amount Either float (BTC) or string 'MAX' (BitcoinUnit.MAX) to send all
   * @param fee
   * @param address
   * @returns {string}
   */
  createTx(utxos, amount, fee, address) {
    for (let utxo of utxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));

    if (amount === BitcoinUnit.MAX) {
      amountPlusFee = new BigNumber(0);
      for (let utxo of utxos) {
        amountPlusFee = amountPlusFee.plus(utxo.amount);
      }
      amountPlusFee = amountPlusFee.dividedBy(100000000).toString(10);
    }

    return signer.createHDSegwitTransaction(
      utxos,
      address,
      amountPlusFee,
      fee,
      this._getInternalAddressByIndex(this.next_free_change_address_index),
    );
  }

  /**
   * Converts ypub to xpub
   * @param {String} ypub - wallet ypub
   * @returns {*}
   */
  static _ypubToXpub(ypub) {
    let data = b58.decode(ypub);
    if (data.readUInt32BE() !== 0x049d7cb2) throw new Error('Not a valid ypub extended key!');
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  /**
   * Creates Segwit P2SH Bitcoin address
   * @param hdNode
   * @returns {String}
   */
  static _nodeToP2shSegwitAddress(hdNode) {
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: hdNode.publicKey }),
    });
    return address;
  }
}
