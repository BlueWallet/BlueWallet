import { NativeModules } from 'react-native';

import config from '../config';
import { AbstractWallet } from './abstract-wallet';

const { RNRandomBytes } = NativeModules;
const BigNumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');

const BlueElectrum = require('../BlueElectrum');
const signer = require('../models/signer');

/**
 *  Has private key and single address like "1ABCD....."
 *  (legacy P2PKH compressed)
 */
export class LegacyWallet extends AbstractWallet {
  static type = 'legacy';
  static typeReadable = 'Legacy (P2PKH)';

  /**
   * Simple function which says that we havent tried to fetch balance
   * for a long time
   *
   * @return {boolean}
   */
  timeToRefreshBalance() {
    if (+new Date() - this._lastBalanceFetch >= 5 * 60 * 1000) {
      return true;
    }
    return false;
  }

  /**
   * Simple function which says if we hve some low-confirmed transactions
   * and we better fetch them
   *
   * @return {boolean}
   */
  timeToRefreshTransaction() {
    if (this.unconfirmed_transactions) {
      return true;
    }
    return false;
  }

  async generate() {
    const that = this;
    return new Promise(function(resolve) {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(32, (err, buf) => {
          // eslint-disable-line
          if (err) throw err;
          that.secret = bitcoin.ECPair.makeRandom({
            rng(length) {
              return buf;
            },
            network: config.network,
          }).toWIF();
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(32, (err, bytes) => {
        if (err) throw new Error(err);
        that.secret = bitcoin.ECPair.makeRandom({
          rng(length) {
            const b = Buffer.from(bytes, 'base64');
            return b;
          },
          network: config.network,
        }).toWIF();
        resolve();
      });
    });
  }

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = bitcoin.ECPair.fromWIF(this.secret, config.network);
      address = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: config.network,
      }).address;
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }

  /**
   * Fetches balance of the Wallet via API.
   * Returns VOID. Get the actual balance via getter.
   *
   * @returns {Promise.<void>}
   */
  async fetchBalance() {
    try {
      const balance = await BlueElectrum.getBalanceByAddress(this.getAddress());
      this.balance = balance.confirmed + balance.unconfirmed;
      this.unconfirmed_balance = balance.unconfirmed;
      this._lastBalanceFetch = +new Date();
    } catch (err) {
      console.warn(err.message);
    }
  }

  /**
   * Fetches UTXO from API. Returns VOID.
   *
   * @return {Promise.<void>}
   */
  async fetchUtxos() {
    try {
      this.utxo = [];
      const utxos = await BlueElectrum.multiGetUtxoByAddress([this.getAddress()]);
      this.utxo = utxos;
    } catch (err) {
      console.warn(err.message);
    }
  }

  /**
   * Fetches transactions via API. Returns VOID.
   * Use getter to get the actual list.
   *
   * @return {Promise.<void>}
   */
  async fetchTransactions() {
    const txids_to_update = [];
    try {
      this._lastTxFetch = +new Date();
      const txids = await BlueElectrum.getTransactionsByAddress(this.getAddress());
      for (const tx of txids) {
        if (!this.transactionConfirmed(tx.tx_hash)) txids_to_update.push(tx.tx_hash);
      }
      await this._update_unconfirmed_tx(txids_to_update);
    } catch (Err) {
      console.warn(Err.message);
    }
  }

  async broadcastTx(txhex) {
    try {
      const broadcast = await BlueElectrum.broadcast(txhex);
      return broadcast;
    } catch (error) {
      return error;
    }
  }

  /**
   * Takes UTXOs (as presented by blockcypher api), transforms them into
   * format expected by signer module, creates tx and returns signed string txhex.
   *
   * @param utxos Unspent outputs, expects blockcypher format
   * @param amount
   * @param fee
   * @param toAddress
   * @param memo
   * @return string Signed txhex ready for broadcast
   */
  createTx(utxos, amount, fee, toAddress, memo) {
    // transforming UTXOs fields to how module expects it
    for (const u of utxos) {
      u.confirmations = 6; // hack to make module accept 0 confirmation
      u.value = u.value / 100000000;
      u.value = u.value.toString(10);
    }
    // console.log('creating legacy tx ', amount, ' with fee ', fee, 'secret=', this.getSecret(), 'from address', this.getAddress());
    const amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    return signer.createTransaction(utxos, toAddress, amountPlusFee, fee, this.getSecret(), this.getAddress());
  }

  getLatestTransactionTime() {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = 0;
    for (const tx of this.getTransactions()) {
      max = Math.max(new Date(tx.received) * 1, max);
    }

    return new Date(max).toString();
  }

  getRandomBlockcypherToken() {
    return (array => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array[0];
    })([
      '0326b7107b4149559d18ce80612ef812',
      'a133eb7ccacd4accb80cb1225de4b155',
      '7c2b1628d27b4bd3bf8eaee7149c577f',
      'f1e5a02b9ec84ec4bc8db2349022e5f5',
      'e5926dbeb57145979153adc41305b183',
    ]);
  }

  isAddressValid(address) {
    try {
      bitcoin.address.toOutputScript(address, config.network);
      return true;
    } catch (e) {
      return false;
    }
  }

  transactionConfirmed(txid) {
    for (const transaction of this.transactions) {
      if (txid === transaction.txid) return true;
    }
    return false;
  }

  getBalance() {
    return this.balance;
  }

  async _update_unconfirmed_tx(txid_list) {
    try {
      const txs_full = await BlueElectrum.multiGetTransactionsFullByTxid(txid_list);
      const unconfirmed_transactions = [];
      for (const tx of txs_full) {
        let value = 0;
        for (const input of tx.inputs) {
          if (!input.txid) continue; // coinbase
          if (this.weOwnAddress(input.addresses[0])) value -= input.value;
        }
        for (const output of tx.outputs) {
          if (!output.addresses) continue; // OP_RETURN
          if (this.weOwnAddress(output.addresses[0])) value += output.value;
        }
        tx.value = new BigNumber(value).multipliedBy(100000000).toNumber();
        if (tx.time) tx.received = new Date(tx.time * 1000).toISOString();
        else tx.received = new Date().toISOString();
        tx.walletLabel = this.label;
        if (!tx.confirmations) tx.confirmations = 0;
        if (tx.confirmations < 6) unconfirmed_transactions.push(tx);
        else this.transactions.push(tx);
      }
      this.unconfirmed_transactions = unconfirmed_transactions; // all unconfirmed transactions will be updated
    } catch (err) {
      console.warn(err.message);
    }
  }
}
