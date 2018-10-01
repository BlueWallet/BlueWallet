import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
import { WatchOnlyWallet } from './watch-only-wallet';
const bip39 = require('bip39');

export class AbstractHDWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'abstract';
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

  getTypeReadable() {
    throw new Error('Not implemented');
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

    // no luck - lets iterate over all addressess we have up to first unused address index
    for (let c = 0; c <= this.next_free_change_address_index; c++) {
      let possibleAddress = this._getInternalAddressByIndex(c);
      if (possibleAddress === address) {
        return (this._address_to_wif_cache[address] = this._getInternalWIFByIndex(c));
      }
    }

    for (let c = 0; c <= this.next_free_address_index; c++) {
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
}
