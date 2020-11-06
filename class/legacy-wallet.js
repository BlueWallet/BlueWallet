import { findLast, difference } from 'lodash';
import { NativeModules } from 'react-native';

import config from '../config';
import logger from '../logger';
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
      this.confirmed_balance = balance.balance;
      this.incoming_balance = balance.alert_incoming;
      this.outgoing_balance = balance.alert_outgoing;
      this._lastBalanceFetch = +new Date();
    } catch (err) {
      logger.error('legacy-wallet', `fetchBalance: ${err.message}`);
    }
  }

  /**
   * Fetches UTXO from API. Returns VOID.
   *
   * @return {Promise.<void>}
   */
  async fetchUtxos() {
    this.utxo = [];
    const utxos = await BlueElectrum.multiGetUtxoByAddress([this.getAddress()]);
    this.utxo = utxos;

    return this.utxo;
  }

  /**
   * Fetches transactions via API. Returns VOID.
   * Use getter to get the actual list.
   *
   * @return {Promise.<void>}
   */
  async fetchTransactions() {
    try {
      this._lastTxFetch = +new Date();
      const txids = await BlueElectrum.getTransactionsByAddress(this.getAddress());

      await this.setTransactions(txids);
    } catch (err) {
      logger.error('legacy-wallet', `fetchTransactions: ${err.message}`);
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
  createTx(utxos, amount, fee, toAddress) {
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

  async setTransactions(txs) {
    const txid_list = txs.map(t => t.tx_hash);

    this.transactions = this.transactions.filter(tx => {
      if (!(tx.height > 0)) {
        return false;
      }
      const transaction = findLast(txs, t => t.tx_hash === tx.txid);

      if (!transaction) {
        return false;
      }
      return transaction.tx_type === tx.tx_type;
    });

    const alreadyFetchedTxIds = this.transactions.map(tx => tx.txid);

    const txIdsDiff = difference(txid_list, alreadyFetchedTxIds);

    if (txIdsDiff.length === 0) {
      return;
    }

    const txs_full = await BlueElectrum.multiGetTransactionsFullByTxid(txIdsDiff);

    const transactions = [];

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
      tx.height = txs.find(t => t.tx_hash === tx.txid).height;
      tx.tx_type = findLast(txs, t => t.tx_hash === tx.txid).tx_type;

      tx.value = new BigNumber(value).multipliedBy(100000000).toNumber();
      if (tx.time) {
        tx.received = new Date(tx.time * 1000).toISOString();
      } else {
        tx.received = new Date().toISOString();
      }
      tx.walletLabel = this.label;
      if (!tx.confirmations) tx.confirmations = 0;
      transactions.push(tx);
    }

    this.transactions = this.transactions.filter(t => {
      const duplicatedTx = transactions.find(trans => trans.txid === t.txid);
      return !!!duplicatedTx;
    });

    this.transactions = [...this.transactions, ...transactions];
  }
}
