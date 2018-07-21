import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';
const bip39 = require('bip39');
const BigNumber = require('bignumber.js');

export class AbstractHDWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'abstract';
    this.next_free_address_index = 0;
    this.next_free_change_address_index = 0;
    this.internal_addresses_cache = {}; // index => address
    this.external_addresses_cache = {}; // index => address
  }

  allowSend() {
    return false; // TODO send from HD
  }

  setSecret(newSecret) {
    this.secret = newSecret.trim();
    this.secret = this.secret.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ');
    return this;
  }

  validateMnemonic() {
    return bip39.validateMnemonic(this.secret);
  }

  getMnemonicToSeedHex() {
    return bip39.mnemonicToSeedHex(this.secret);
  }

  getTypeReadable() {
    return 'HD SegWit (BIP49 P2SH)';
  }

  /**
   * Derives from hierarchy, returns next free address
   * (the one that has no transactions). Looks for several,
   * gives up if none found, and returns the used one
   *
   * @return {Promise.<string>}
   */
  async getAddressAsync() {
    throw new Error('Not implemented');
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

  async fetchBalance() {
    const api = new Frisbee({ baseURI: 'https://blockchain.info' });

    let response = await api.get('/balance?active=' + this.getXpub());

    if (response && response.body) {
      for (let xpub of Object.keys(response.body)) {
        this.balance = response.body[xpub].final_balance / 100000000;
      }
    } else {
      throw new Error('Could not fetch balance from API');
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
    const api = new Frisbee({ baseURI: 'https://blockchain.info' });
    this.transactions = [];
    let offset = 0;

    while (1) {
      let response = await api.get('/multiaddr?active=' + this.getXpub() + '&n=100&offset=' + offset);

      if (response && response.body) {
        if (response.body.txs && response.body.txs.length === 0) {
          break;
        }

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

            tx.value = new BigNumber(value).div(100000000).toString() * 1;

            this.transactions.push(tx);
          }
        } else {
          break; // error ?
        }
      } else {
        throw new Error('Could not fetch transactions from API'); // breaks here
      }

      offset += 100;
    }
  }
}
