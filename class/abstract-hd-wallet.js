import * as bip39 from 'bip39';
import { sortBy, compose, mapValues, map } from 'lodash/fp';

import { addressToScriptHash } from '../utils/bitcoin';
import { LegacyWallet } from './legacy-wallet';

const mapValuesNoCap = mapValues.convert({ cap: false });

const BlueElectrum = require('../BlueElectrum');

export class AbstractHDWallet extends LegacyWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  constructor() {
    super();
    this._xpub = ''; // cache
    this._address = [];
    this._address_to_wif_cache = {};
    this._addr_balances = {};
    this.num_addresses = 20;
  }

  prepareForSerialization() {
    // deleting structures that cant be serialized
    delete this._node0;
    delete this._node1;
  }

  generate() {
    throw new Error('Not implemented');
  }

  allowSend() {
    return false;
  }

  getTransactions() {
    return super.getTransactions();
  }

  async setSecret(newSecret) {
    this.secret = newSecret.trim().toLowerCase();
    this.secret = this.secret.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ');
    this._address = [];
    await this.generateAddresses();
    return this;
  }

  /**
   * @return {Boolean} is mnemonic in `this.secret` valid
   */
  validateMnemonic() {
    return bip39.validateMnemonic(this.secret);
  }

  async getMnemonicToSeedHex() {
    const seed = await bip39.mnemonicToSeed(this.secret);

    return seed.toString('hex');
  }

  getAddressesSortedByAmount() {
    return compose(
      map(({ addr }) => addr),
      sortBy('total'),
      mapValuesNoCap(function(value, key) {
        return { addr: key, ...value };
      }),
    )(this._addr_balances);
  }

  getAddressForTransaction() {
    return this._getAddressWithLowestBalance();
  }

  _getAddressWithLowestBalance() {
    let min = 1e6;
    let addr_min = false;
    for (const addr in this._addr_balances) {
      const balance = this._addr_balances[addr].total;
      if (balance === 0) return addr;
      if (balance < min) {
        min = balance;
        addr_min = addr;
      }
    }
    return addr_min;
  }

  _getExternalWIFByIndex() {
    throw new Error('Not implemented');
  }

  _getInternalWIFByIndex() {
    throw new Error('Not implemented');
  }

  _getExternalAddressByIndex() {
    throw new Error('Not implemented');
  }

  _getInternalAddressByIndex() {
    throw new Error('Not implemented');
  }

  getXpub() {
    throw new Error('Not implemented');
  }

  async fetchTransactions() {
    const txids_to_update = [];
    this._lastTxFetch = new Date().getTime();
    const tx_addr_dict = await BlueElectrum.multiGetHistoryByAddress(this.getAddress());

    for (const addr in tx_addr_dict) {
      for (const tx of tx_addr_dict[addr]) {
        txids_to_update.push(tx);
      }
    }

    if (txids_to_update) await this.setTransactions(txids_to_update);
  }

  getAddress() {
    if (!this._address) {
      this.generateAddresses();
    }
    return this._address;
  }

  getScriptHashes() {
    if (this._scriptHashes) {
      return this._scriptHashes;
    }
    this._scriptHashes = this._address.map(addressToScriptHash);

    return this._scriptHashes;
  }
  /**
   * Given that `address` is in our HD hierarchy, try to find
   * corresponding WIF
   *
   * @param address {String} In our HD hierarchy
   * @return {String} WIF if found
   */
  _getWifForAddress(address) {
    if (this._address_to_wif_cache[address]) return this._address_to_wif_cache[address];
    throw new Error('Could not find WIF for ' + address);
  }

  createTx() {
    throw new Error('Not implemented');
  }

  async fetchBalance() {
    const balance = await BlueElectrum.multiGetBalanceByAddress(this.getAddress());
    this.balance = balance.balance + balance.unconfirmed_balance;
    this.confirmed_balance = balance.balance;
    this.incoming_balance = balance.incoming_balance;
    this.outgoing_balance = balance.outgoing_balance;
    this.unconfirmed_balance = balance.unconfirmed_balance;

    this._lastBalanceFetch = new Date().getTime();
    for (const address in balance.addresses) {
      this._addr_balances[address] = {
        total: balance.addresses[address].unconfirmed + balance.addresses[address].confirmed,
        c: balance.addresses[address].confirmed,
        u: balance.addresses[address].unconfirmed,
      };
    }
  }

  async fetchUtxos() {
    this.utxo = [];
    const utxos = await BlueElectrum.multiGetUtxoByAddress(this.getAddress());
    this.utxo = utxos;
    return this.utxo;
  }

  weOwnAddress(addr) {
    return this._address.includes(addr);
  }

  _getDerivationPathByAddress() {
    throw new Error('Not implemented');
  }

  _getNodePubkeyByIndex() {
    throw new Error('Not implemented');
  }

  generateAddresses() {
    throw new Error('Not implemented');
  }
}
