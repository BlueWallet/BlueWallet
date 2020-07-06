import BigNumber from 'bignumber.js';
import * as bip39 from 'bip39';
import b58 from 'bs58check';
import { NativeModules } from 'react-native';

import { BitcoinUnit } from '../models/bitcoinUnits';
import signer from '../models/signer';
import { AbstractHDWallet } from './abstract-hd-wallet';

const HDNode = require('bip32');
const bitcoin = require('bitcoinjs-lib');

const { RNRandomBytes } = NativeModules;

/**
 * Converts ypub to xpub
 * @param {String} ypub - wallet ypub
 * @returns {*}
 */
function ypubToXpub(ypub) {
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
function nodeToP2shSegwitAddress(hdNode) {
  const { address } = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wpkh({ pubkey: hdNode.publicKey }),
  });
  return address;
}

/**
 * HD Wallet (BIP39).
 * In particular, BIP49 (P2SH Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
 */

export class HDSegwitP2SHWallet extends AbstractHDWallet {
  static type = 'HDsegwitP2SH';
  static typeReadable = 'HD P2SH';
  static randomBytesSize = 32;
  static basePath = "m/49'/440'/0'";

  allowSend() {
    return true;
  }

  allowSendMax() {
    return true;
  }

  async generate() {
    return new Promise(resolve => {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(HDSegwitP2SHWallet.randomBytesSize, async (err, buf) => {
          if (err) throw err;
          await this.setSecret(bip39.entropyToMnemonic(buf.toString('hex')));
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(HDSegwitP2SHWallet.randomBytesSize, async (err, bytes) => {
        if (err) throw new Error(err);
        const b = Buffer.from(bytes, 'base64').toString('hex');
        console.log('SET');
        await this.setSecret(bip39.entropyToMnemonic(b));
        resolve();
      });
    });
  }

  _getPath(path = '') {
    return `${HDSegwitP2SHWallet.basePath}${path}`;
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
    const root = bitcoin.bip32.fromSeed(this.seed);
    const path = this._getPath(`/0/${index}`);
    const child = root.derivePath(path);
    return bitcoin.ECPair.fromPrivateKey(child.privateKey).toWIF();
  }

  /**
   * Returning ypub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} ypub
   */
  async getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const mnemonic = this.secret;
    this.seed = await bip39.mnemonicToSeed(mnemonic);
    const root = HDNode.fromSeed(this.seed);
    const path = this._getPath();
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support ypub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('049d7cb2', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  async generateAddresses() {
    if (!this._node0) {
      const xpub = ypubToXpub(await this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    for (let index = 0; index < this.num_addresses; index++) {
      const address = nodeToP2shSegwitAddress(this._node0.derive(index));
      this._address.push(address);
      this._address_to_wif_cache[address] = await this._getWIFByIndex(index);
      this._addr_balances[address] = {
        total: 0,
        c: 0,
        u: 0,
      };
    }
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
    for (const utxo of utxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));

    if (amount === BitcoinUnit.MAX) {
      amountPlusFee = new BigNumber(0);
      for (const utxo of utxos) {
        amountPlusFee = amountPlusFee.plus(utxo.value);
      }
      amountPlusFee = amountPlusFee.dividedBy(100000000).toString(10);
    }

    return signer.createHDSegwitTransaction(utxos, address, amountPlusFee, fee, this.getAddressForTransaction());
  }
}
