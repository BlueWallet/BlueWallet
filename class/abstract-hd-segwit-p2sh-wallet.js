import BigNumber from 'bignumber.js';
import * as bip39 from 'bip39';
import b58 from 'bs58check';
import { NativeModules } from 'react-native';

import config from '../config';
import { BitcoinUnit } from '../models/bitcoinUnits';
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
 * HD Wallet (BIP39).
 * In particular, BIP49 (P2SH Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
 */

export class AbstractHDSegwitP2SHWallet extends AbstractHDWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';
  static randomBytesSize = 32;
  static basePath = "m/49'/440'/0'";

  allowSend() {
    return true;
  }

  allowSendMax() {
    return true;
  }

  async generate() {
    return new Promise((resolve, reject) => {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        // eslint-disable-next-line no-undef
        return crypto.randomBytes(AbstractHDSegwitP2SHWallet.randomBytesSize, async (err, buf) => {
          if (err) throw err;
          try {
            await this.setSecret(bip39.entropyToMnemonic(buf.toString('hex')));
          } catch (error) {
            reject(error);
          }
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(AbstractHDSegwitP2SHWallet.randomBytesSize, async (err, bytes) => {
        if (err) throw new Error(err);
        const b = Buffer.from(bytes, 'base64').toString('hex');
        try {
          await this.setSecret(bip39.entropyToMnemonic(b));
        } catch (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  _getPath(path = '') {
    return `${AbstractHDSegwitP2SHWallet.basePath}${path}`;
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
    const root = bitcoin.bip32.fromSeed(this.seed, config.network);
    const path = this._getPath(`/0/${index}`);
    const child = root.derivePath(path);
    return bitcoin.ECPair.fromPrivateKey(child.privateKey, { network: config.network }).toWIF();
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
    const root = HDNode.fromSeed(this.seed, config.network);
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

  async generateNode0() {
    if (!this._node0) {
      const xpub = ypubToXpub(await this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    return this._node0;
  }

  async generateAddresses() {
    const node0 = await this.generateNode0();

    for (let index = 0; index < this.num_addresses; index++) {
      const address = this.nodeToAddress(node0.derive(index));
      this._address.push(address);
      this._address_to_wif_cache[address] = await this._getWIFByIndex(index);
      this._addr_balances[address] = {
        total: 0,
        c: 0,
        u: 0,
      };
    }
  }

  nodeToAddress() {
    throw new Error('Not implemented');
  }

  calculateTotalAmount({ utxos, amount, fee }) {
    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));

    if (amount === BitcoinUnit.MAX) {
      amountPlusFee = new BigNumber(0);
      for (const utxo of utxos) {
        amountPlusFee = amountPlusFee.plus(utxo.value);
      }
      amountPlusFee = amountPlusFee.dividedBy(100000000).toString(10);
    }
    return amountPlusFee;
  }
}
