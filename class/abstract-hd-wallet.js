import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
import { WatchOnlyWallet } from './watch-only-wallet';
const bip39 = require('bip39');
const BigNumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
const BlueElectrum = require('../BlueElectrum');

export class AbstractHDWallet extends LegacyWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  constructor() {
    super();
    this.next_free_address_index = 0;
    this.next_free_change_address_index = 0;
    this.internal_addresses_cache = {}; // index => address
    this.external_addresses_cache = {}; // index => address
    this._xpub = ''; // cache
    this.usedAddresses = [];
    this._address_to_wif_cache = {};
  }

  generate() {
    throw new Error('Not implemented');
  }

  allowSend() {
    return false;
  }

  getTransactions() {
    // need to reformat txs, as we are expected to return them in blockcypher format,
    // but they are from blockchain.info actually (for all hd wallets)

    let txs = [];
    for (let tx of this.transactions) {
      txs.push(AbstractHDWallet.convertTx(tx));
    }

    return txs;
  }

  static convertTx(tx) {
    // console.log('converting', tx);
    var clone = Object.assign({}, tx);
    clone.received = new Date(clone.time * 1000).toISOString();
    clone.outputs = clone.out;
    if (clone.confirmations === undefined) {
      clone.confirmations = 0;
    }
    for (let o of clone.outputs) {
      o.addresses = [o.addr];
    }
    for (let i of clone.inputs) {
      if (i.prev_out && i.prev_out.addr) {
        i.addresses = [i.prev_out.addr];
      }
    }

    if (!clone.value) {
      let value = 0;
      for (let inp of clone.inputs) {
        if (inp.prev_out && inp.prev_out.xpub) {
          // our owned
          value -= inp.prev_out.value;
        }
      }

      for (let out of clone.out) {
        if (out.xpub) {
          // to us
          value += out.value;
        }
      }
      clone.value = value;
    }

    return clone;
  }

  setSecret(newSecret) {
    this.secret = newSecret.trim().toLowerCase();
    this.secret = this.secret.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ');
    return this;
  }

  /**
   * @return {Boolean} is mnemonic in `this.secret` valid
   */
  validateMnemonic() {
    return bip39.validateMnemonic(this.secret);
  }

  getMnemonicToSeedHex() {
    return bip39.mnemonicToSeedHex(this.secret);
  }

  /**
   * Derives from hierarchy, returns next free address
   * (the one that has no transactions). Looks for several,
   * gives up if none found, and returns the used one
   *
   * @return {Promise.<string>}
   */
  async getAddressAsync() {
    // looking for free external address
    let freeAddress = '';
    let c;
    for (c = 0; c < Math.max(5, this.usedAddresses.length); c++) {
      if (this.next_free_address_index + c < 0) continue;
      let address = this._getExternalAddressByIndex(this.next_free_address_index + c);
      this.external_addresses_cache[this.next_free_address_index + c] = address; // updating cache just for any case
      let WatchWallet = new WatchOnlyWallet();
      WatchWallet.setSecret(address);
      await WatchWallet.fetchTransactions();
      if (WatchWallet.transactions.length === 0) {
        // found free address
        freeAddress = WatchWallet.getAddress();
        this.next_free_address_index += c; // now points to _this one_
        break;
      }
    }

    if (!freeAddress) {
      // could not find in cycle above, give up
      freeAddress = this._getExternalAddressByIndex(this.next_free_address_index + c); // we didnt check this one, maybe its free
      this.next_free_address_index += c + 1; // now points to the one _after_
    }

    return freeAddress;
  }

  /**
   * Derives from hierarchy, returns next free CHANGE address
   * (the one that has no transactions). Looks for several,
   * gives up if none found, and returns the used one
   *
   * @return {Promise.<string>}
   */
  async getChangeAddressAsync() {
    // looking for free internal address
    let freeAddress = '';
    let c;
    for (c = 0; c < Math.max(5, this.usedAddresses.length); c++) {
      if (this.next_free_change_address_index + c < 0) continue;
      let address = this._getInternalAddressByIndex(this.next_free_change_address_index + c);
      this.internal_addresses_cache[this.next_free_change_address_index + c] = address; // updating cache just for any case
      let WatchWallet = new WatchOnlyWallet();
      WatchWallet.setSecret(address);
      await WatchWallet.fetchTransactions();
      if (WatchWallet.transactions.length === 0) {
        // found free address
        freeAddress = WatchWallet.getAddress();
        this.next_free_change_address_index += c; // now points to _this one_
        break;
      }
    }

    if (!freeAddress) {
      // could not find in cycle above, give up
      freeAddress = this._getExternalAddressByIndex(this.next_free_address_index + c); // we didnt check this one, maybe its free
      this.next_free_address_index += c + 1; // now points to the one _after_
    }

    return freeAddress;
  }

  /**
   * Should not be used in HD wallets
   *
   * @deprecated
   * @return {string}
   */
  getAddress() {
    return '';
  }

  _getExternalWIFByIndex(index) {
    throw new Error('Not implemented');
  }

  _getInternalWIFByIndex(index) {
    throw new Error('Not implemented');
  }

  _getExternalAddressByIndex(index) {
    throw new Error('Not implemented');
  }

  _getInternalAddressByIndex(index) {
    throw new Error('Not implemented');
  }

  getXpub() {
    throw new Error('Not implemented');
  }

  /**
   * Async function to fetch all transactions. Use getter to get actual txs.
   * Also, sets internals:
   *  `this.internal_addresses_cache`
   *  `this.external_addresses_cache`
   *
   * @returns {Promise<void>}
   */
  async fetchTransactions() {
    try {
      const api = new Frisbee({ baseURI: 'https://blockchain.info' });
      this.transactions = [];
      let offset = 0;

      while (1) {
        let response = await api.get('/multiaddr?active=' + this.getXpub() + '&n=100&offset=' + offset);

        if (response && response.body) {
          if (response.body.txs && response.body.txs.length === 0) {
            break;
          }

          let latestBlock = false;
          if (response.body.info && response.body.info.latest_block) {
            latestBlock = response.body.info.latest_block.height;
          }

          this._lastTxFetch = +new Date();

          // processing TXs and adding to internal memory
          if (response.body.txs) {
            for (let tx of response.body.txs) {
              let value = 0;

              for (let input of tx.inputs) {
                // ----- INPUTS
                if (input.prev_out.xpub) {
                  // sent FROM US
                  value -= input.prev_out.value;

                  // setting internal caches to help ourselves in future...
                  let path = input.prev_out.xpub.path.split('/');
                  if (path[path.length - 2] === '1') {
                    // change address
                    this.next_free_change_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_change_address_index);
                    // setting to point to last maximum known change address + 1
                  }
                  if (path[path.length - 2] === '0') {
                    // main (aka external) address
                    this.next_free_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_address_index);
                    // setting to point to last maximum known main address + 1
                  }
                  // done with cache
                }
              }

              for (let output of tx.out) {
                // ----- OUTPUTS
                if (output.xpub) {
                  // sent TO US (change)
                  value += output.value;

                  // setting internal caches to help ourselves in future...
                  let path = output.xpub.path.split('/');
                  if (path[path.length - 2] === '1') {
                    // change address
                    this.next_free_change_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_change_address_index);
                    // setting to point to last maximum known change address + 1
                  }
                  if (path[path.length - 2] === '0') {
                    // main (aka external) address
                    this.next_free_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_address_index);
                    // setting to point to last maximum known main address + 1
                  }
                  // done with cache
                }
              }

              tx.value = value; // new BigNumber(value).div(100000000).toString() * 1;
              if (!tx.confirmations && latestBlock) {
                tx.confirmations = latestBlock - tx.block_height + 1;
              }

              this.transactions.push(tx);
            }

            if (response.body.txs.length < 100) {
              // this fetch yilded less than page size, thus requesting next batch makes no sense
              break;
            }
          } else {
            break; // error ?
          }
        } else {
          throw new Error('Could not fetch transactions from API: ' + response.err); // breaks here
        }

        offset += 100;
      }
    } catch (err) {
      console.warn(err);
    }
  }

  /**
   * Given that `address` is in our HD hierarchy, try to find
   * corresponding WIF
   *
   * @param address {String} In our HD hierarchy
   * @return {String} WIF if found
   */
  _getWifForAddress(address) {
    if (this._address_to_wif_cache[address]) return this._address_to_wif_cache[address]; // cache hit

    // fast approach, first lets iterate over all addressess we have in cache
    for (let index of Object.keys(this.internal_addresses_cache)) {
      if (this._getInternalAddressByIndex(index) === address) {
        return (this._address_to_wif_cache[address] = this._getInternalWIFByIndex(index));
      }
    }

    for (let index of Object.keys(this.external_addresses_cache)) {
      if (this._getExternalAddressByIndex(index) === address) {
        return (this._address_to_wif_cache[address] = this._getExternalWIFByIndex(index));
      }
    }

    // no luck - lets iterate over all addresses we have up to first unused address index
    for (let c = 0; c <= this.next_free_change_address_index + 3; c++) {
      let possibleAddress = this._getInternalAddressByIndex(c);
      if (possibleAddress === address) {
        return (this._address_to_wif_cache[address] = this._getInternalWIFByIndex(c));
      }
    }

    for (let c = 0; c <= this.next_free_address_index + 3; c++) {
      let possibleAddress = this._getExternalAddressByIndex(c);
      if (possibleAddress === address) {
        return (this._address_to_wif_cache[address] = this._getExternalWIFByIndex(c));
      }
    }

    throw new Error('Could not find WIF for ' + address);
  }

  createTx() {
    throw new Error('Not implemented');
  }

  async fetchBalance() {
    try {
      // doing binary search for last used externa address

      let that = this;

      // refactor me
      // eslint-disable-next-line
      async function binarySearchIterationForInternalAddress(index, maxUsedIndex = 0, minUnusedIndex = 100500100, depth = 0) {
        if (depth >= 20) return maxUsedIndex + 1; // fail
        let txs = await BlueElectrum.getTransactionsByAddress(that._getInternalAddressByIndex(index));
        if (txs.length === 0) {
          if (index === 0) return 0;
          minUnusedIndex = Math.min(minUnusedIndex, index); // set
          index = Math.floor((index - maxUsedIndex) / 2 + maxUsedIndex);
        } else {
          maxUsedIndex = Math.max(maxUsedIndex, index); // set
          let txs2 = await BlueElectrum.getTransactionsByAddress(that._getInternalAddressByIndex(index + 1));
          if (txs2.length === 0) return index + 1; // thats our next free address

          index = Math.round((minUnusedIndex - index) / 2 + index);
        }

        return binarySearchIterationForInternalAddress(index, maxUsedIndex, minUnusedIndex, depth + 1);
      }

      this.next_free_change_address_index = await binarySearchIterationForInternalAddress(100);

      // refactor me
      // eslint-disable-next-line
      async function binarySearchIterationForExternalAddress(index, maxUsedIndex = 0, minUnusedIndex = 100500100, depth = 0) {
        if (depth >= 20) return maxUsedIndex + 1; // fail
        let txs = await BlueElectrum.getTransactionsByAddress(that._getExternalAddressByIndex(index));
        if (txs.length === 0) {
          if (index === 0) return 0;
          minUnusedIndex = Math.min(minUnusedIndex, index); // set
          index = Math.floor((index - maxUsedIndex) / 2 + maxUsedIndex);
        } else {
          maxUsedIndex = Math.max(maxUsedIndex, index); // set
          let txs2 = await BlueElectrum.getTransactionsByAddress(that._getExternalAddressByIndex(index + 1));
          if (txs2.length === 0) return index + 1; // thats our next free address

          index = Math.round((minUnusedIndex - index) / 2 + index);
        }

        return binarySearchIterationForExternalAddress(index, maxUsedIndex, minUnusedIndex, depth + 1);
      }

      this.next_free_address_index = await binarySearchIterationForExternalAddress(100);
      this.usedAddresses = [];

      // generating all involved addresses:
      for (let c = 0; c < this.next_free_address_index; c++) {
        this.usedAddresses.push(this._getExternalAddressByIndex(c));
      }
      for (let c = 0; c < this.next_free_change_address_index; c++) {
        this.usedAddresses.push(this._getInternalAddressByIndex(c));
      }

      // finally fetching balance
      let balance = await BlueElectrum.multiGetBalanceByAddress(this.usedAddresses);
      this.balance = new BigNumber(balance.balance).dividedBy(100000000).toNumber();
      this.unconfirmed_balance = new BigNumber(balance.unconfirmed_balance).dividedBy(100000000).toNumber();
      this._lastBalanceFetch = +new Date();
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
}
