import { LegacyWallet } from './';
import { AbstractHDWallet } from './abstract-hd-wallet';
import Frisbee from 'frisbee';
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
  constructor() {
    super();
    this.type = 'HDlegacyP2PKH';
  }

  getTypeReadable() {
    return 'HD Legacy (BIP44 P2PKH)';
  }

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

  async fetchBalance() {
    try {
      const api = new Frisbee({ baseURI: 'https://www.blockonomics.co' });
      let response = await api.post('/api/balance', { body: JSON.stringify({ addr: this.getXpub() }) });
      // console.log(response);

      if (response && response.body && response.body.response) {
        this.balance = 0;
        this.unconfirmed_balance = 0;
        this.usedAddresses = [];
        for (let addr of response.body.response) {
          this.balance += addr.confirmed;
          this.unconfirmed_balance += addr.unconfirmed;
          this.usedAddresses.push(addr.addr);
        }
        this.balance = new BigNumber(this.balance).dividedBy(100000000).toString() * 1;
        this.unconfirmed_balance = new BigNumber(this.unconfirmed_balance).dividedBy(100000000).toString() * 1;
        this._lastBalanceFetch = +new Date();
      } else {
        throw new Error('Could not fetch balance from API: ' + response.err);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  /**
   * @inheritDoc
   */
  async fetchUtxo() {
    const api = new Frisbee({
      baseURI: 'https://blockchain.info',
    });

    if (this.usedAddresses.length === 0) {
      // just for any case, refresh balance (it refreshes internal `this.usedAddresses`)
      await this.fetchBalance();
    }

    let addresses = this.usedAddresses.join('|');
    addresses += '|' + this._getExternalAddressByIndex(this.next_free_address_index);
    addresses += '|' + this._getInternalAddressByIndex(this.next_free_change_address_index);

    let utxos = [];

    let response;
    try {
      response = await api.get('/unspent?active=' + addresses + '&limit=1000');
      // this endpoint does not support offset of some kind o_O
      // so doing only one call
      let json = response.body;
      if (typeof json === 'undefined' || typeof json.unspent_outputs === 'undefined') {
        throw new Error('Could not fetch UTXO from API ' + response.err);
      }

      for (let unspent of json.unspent_outputs) {
        // a lil transform for signer module
        unspent.txid = unspent.tx_hash_big_endian;
        unspent.vout = unspent.tx_output_n;
        unspent.amount = unspent.value;

        let chunksIn = bitcoin.script.decompile(Buffer.from(unspent.script, 'hex'));
        unspent.address = bitcoin.address.fromOutputScript(chunksIn);
        utxos.push(unspent);
      }
    } catch (err) {
      console.warn(err);
    }

    this.utxo = utxos;
  }

  weOwnAddress(addr) {
    let hashmap = {};
    for (let a of this.usedAddresses) {
      hashmap[a] = 1;
    }

    return hashmap[addr] === 1;
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
