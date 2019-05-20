import { AbstractHDWallet } from './abstract-hd-wallet';
import { NativeModules } from 'react-native';
import bitcoin from 'bitcoinjs-lib';
import bip39 from 'bip39';
import BigNumber from 'bignumber.js';
import b58 from 'bs58check';
import signer from '../models/signer';
const BlueElectrum = require('../BlueElectrum');

const { RNRandomBytes } = NativeModules;

/**
 * Converts zpub to xpub
 *
 * @param {String} zpub
 * @returns {String} xpub
 */
function _zpubToXpub(zpub) {
  let data = b58.decode(zpub);
  data = data.slice(4);
  data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

  return b58.encode(data);
}

/**
 * Creates Segwit Bech32 Bitcoin address
 *
 * @param hdNode
 * @returns {String}
 */
function _nodeToBech32SegwitAddress(hdNode) {
  const pubkeyBuf = hdNode.keyPair.getPublicKeyBuffer();
  var scriptPubKey = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(pubkeyBuf));
  var address = bitcoin.address.fromOutputScript(scriptPubKey);
  return address;
}

/**
 * HD Wallet (BIP39).
 * In particular, BIP84 (Bech32 Native Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 */
export class HDSegwitBech32Wallet extends AbstractHDWallet {
  static type = 'HDsegwitBech32';
  static typeReadable = 'HD SegWit (BIP84 Bech32 Native)';

  constructor() {
    super();
    this._balances_by_external_index = {}; //  0 => { c: 0, u: 0 } // confirmed/unconfirmed
    this._balances_by_internal_index = {};

    this._txs_by_external_index = {};
    this._txs_by_internal_index = {};

    this.gap_limit = 20;
  }

  /**
   * @inheritDoc
   */
  getBalance() {
    let ret = 0;
    for (let bal of Object.values(this._balances_by_external_index)) {
      ret += bal.c;
    }
    for (let bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.c;
    }
    return ret;
  }

  getUnconfirmedBalance() {
    let ret = 0;
    for (let bal of Object.values(this._balances_by_external_index)) {
      ret += bal.u;
    }
    for (let bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.u;
    }
    return ret;
  }

  allowSend() {
    return true;
  }

  async generate() {
    let that = this;
    return new Promise(function(resolve) {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(32, (err, buf) => { // eslint-disable-line
          if (err) throw err;
          that.secret = bip39.entropyToMnemonic(buf.toString('hex'));
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(32, (err, bytes) => {
        if (err) throw new Error(err);
        let b = Buffer.from(bytes, 'base64').toString('hex');
        that.secret = bip39.entropyToMnemonic(b);
        resolve();
      });
    });
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
    const root = bitcoin.HDNode.fromSeedBuffer(seed);
    const path = `m/84'/0'/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.keyPair.toWIF();
  }

  _getNodeAddressByIndex(node, index) {
    index = index * 1; // cast to int
    if (node === 0) {
      if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    }

    if (node === 0 && !this._node0) {
      const xpub = _zpubToXpub(this.getXpub());
      const hdNode = bitcoin.HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = _zpubToXpub(this.getXpub());
      const hdNode = bitcoin.HDNode.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    let address;
    if (node === 0) {
      address = _nodeToBech32SegwitAddress(this._node0.derive(index));
    }

    if (node === 1) {
      address = _nodeToBech32SegwitAddress(this._node1.derive(index));
    }

    if (node === 0) {
      return (this.external_addresses_cache[index] = address);
    }

    if (node === 1) {
      return (this.internal_addresses_cache[index] = address);
    }
  }

  _getExternalAddressByIndex(index) {
    return this._getNodeAddressByIndex(0, index);
  }

  _getInternalAddressByIndex(index) {
    return this._getNodeAddressByIndex(1, index);
  }

  /**
   * Returning zpub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} zpub
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.HDNode.fromSeedBuffer(seed);

    const path = "m/84'/0'/0'";
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  /**
   * @inheritDoc
   */
  async fetchTransactions() {
    // if txs are absent for some internal address in hierarchy - this is a sign
    // we should fetch txs for that address
    // OR if some address has unconfirmed balance - should fetch it's txs
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (!this._txs_by_external_index[c] || this._txs_by_external_index[c].length === 0 || this._balances_by_external_index[c].u !== 0) {
        this._txs_by_external_index[c] = await BlueElectrum.getTransactionsFullByAddress(this._getExternalAddressByIndex(c));
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + 1 /* this.gap_limit */; c++) {
      if (!this._txs_by_internal_index[c] || this._txs_by_internal_index[c].length === 0 || this._balances_by_internal_index[c].u !== 0) {
        this._txs_by_internal_index[c] = await BlueElectrum.getTransactionsFullByAddress(this._getInternalAddressByIndex(c));
      }
    }
  }

  getTransactions() {
    let txs = [];

    for (let addressTxs of Object.values(this._txs_by_external_index)) {
      txs = txs.concat(addressTxs);
    }
    for (let addressTxs of Object.values(this._txs_by_internal_index)) {
      txs = txs.concat(addressTxs);
    }

    let ret = [];
    for (let tx of txs) {
      tx.received = tx.blocktime * 1000;
      tx.hash = tx.txid;
      tx.value = 0;

      for (let vin of tx.inputs) {
        // if input (spending) goes from our address - we are loosing!
        if (vin.address && this.weOwnAddress(vin.address)) {
          tx.value -= new BigNumber(vin.value).multipliedBy(100000000).toNumber();
        }
      }

      for (let vout of tx.outputs) {
        // when output goes to our address - this means we are gaining!
        if (vout.addresses && vout.addresses[0] && this.weOwnAddress(vout.scriptPubKey.addresses[0])) {
          tx.value += new BigNumber(vout.value).multipliedBy(100000000).toNumber();
        }
      }
      ret.push(tx);
    }

    return ret;
  }

  async _fetchBalance() {
    let addresses2fetch = [];

    // generating all involved addresses.
    // if address is skipped in internal representation (`_balances_by_external_index` and `_balances_by_internal_index`)
    // then its a marker that this address should be fetched.
    // if it has unconfirmed balance - it is also a marker that it should be fetched
    // also it should be fetched if it is the last used address in hierarchy, just for any case,
    // or if it is next unused (plus several unused addressess according to gap limit)

    // external
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (c >= this.next_free_address_index) {
        addresses2fetch.push(this._getExternalAddressByIndex(c));
      } else if (!this._balances_by_external_index[c]) {
        addresses2fetch.push(this._getExternalAddressByIndex(c));
      } else if (this._balances_by_external_index[c] && this._balances_by_external_index[c].u !== 0) {
        addresses2fetch.push(this._getExternalAddressByIndex(c));
      }
    }

    // internal
    for (let c = 0; c < this.next_free_change_address_index + 1 /* this.gap_limit */; c++) {
      if (c >= this.next_free_change_address_index) {
        addresses2fetch.push(this._getInternalAddressByIndex(c));
      } else if (!this._balances_by_internal_index[c]) {
        addresses2fetch.push(this._getInternalAddressByIndex(c));
      } else if (this._balances_by_internal_index[c] && this._balances_by_internal_index[c].u !== 0) {
        addresses2fetch.push(this._getInternalAddressByIndex(c));
      }
    }

    let balances = await BlueElectrum.multiGetBalanceByAddress(addresses2fetch);

    // converting to a more compact internal format
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      let addr = this._getExternalAddressByIndex(c);
      if (balances.addresses[addr]) {
        this._balances_by_external_index[c] = {
          c: balances.addresses[addr].confirmed,
          u: balances.addresses[addr].unconfirmed,
        };
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      let addr = this._getInternalAddressByIndex(c);
      if (balances.addresses[addr]) {
        this._balances_by_internal_index[c] = {
          c: balances.addresses[addr].confirmed,
          u: balances.addresses[addr].unconfirmed,
        };
      }
    }

    this._lastBalanceFetch = +new Date();
  }

  weOwnAddress(address) {
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return true;
    }
    for (let c = 0; c < this.next_free_change_address_index + 1 /* this.gap_limit */; c++) {
      if (this._getInternalAddressByIndex(c) === address) return true;
    }
    return false;
  }

  createTx(utxos, amount, fee, address) {
    for (let utxo of utxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    return signer.createHDSegwitTransaction(
      utxos,
      address,
      amountPlusFee,
      fee,
      this._getInternalAddressByIndex(this.next_free_change_address_index),
    );
  }
}
