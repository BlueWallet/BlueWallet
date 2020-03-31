import { AbstractWallet } from './abstract-wallet';
import { HDSegwitBech32Wallet } from './';
import { NativeModules } from 'react-native';
const bitcoin = require('bitcoinjs-lib');
const { RNRandomBytes } = NativeModules;
const BigNumber = require('bignumber.js');
const signer = require('../models/signer');
const BlueElectrum = require('../BlueElectrum');

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
    for (let tx of this.getTransactions()) {
      if (tx.confirmations < 7) {
        return true;
      }
    }
    return false;
  }

  async generate() {
    let that = this;
    return new Promise(function(resolve) {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(32, (err, buf) => { // eslint-disable-line
          if (err) throw err;
          that.secret = bitcoin.ECPair.makeRandom({
            rng: function(length) {
              return buf;
            },
          }).toWIF();
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(32, (err, bytes) => {
        if (err) throw new Error(err);
        that.secret = bitcoin.ECPair.makeRandom({
          rng: function(length) {
            let b = Buffer.from(bytes, 'base64');
            return b;
          },
        }).toWIF();
        resolve();
      });
    });
  }

  /**
   *
   * @returns {string}
   */
  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret);
      address = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
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
      let balance = await BlueElectrum.getBalanceByAddress(this.getAddress());
      this.balance = Number(balance.confirmed);
      this.unconfirmed_balance = new BigNumber(balance.unconfirmed);
      this.unconfirmed_balance = this.unconfirmed_balance.dividedBy(100000000).toString() * 1; // wtf
      this._lastBalanceFetch = +new Date();
    } catch (Error) {
      console.warn(Error);
    }
  }

  /**
   * Fetches UTXO from API. Returns VOID.
   *
   * @return {Promise.<void>}
   */
  async fetchUtxo() {
    try {
      let utxos = await BlueElectrum.multiGetUtxoByAddress([this.getAddress()]);
      for (let arr of Object.values(utxos)) {
        this.utxo = this.utxo.concat(arr);
      }
    } catch (Error) {
      console.warn(Error);
    }

    // backward compatibility
    for (let u of this.utxo) {
      u.tx_output_n = u.vout;
      u.tx_hash = u.txId;
      u.confirmations = u.height ? 1 : 0;
    }
  }

  getUtxo() {
    return this.utxo;
  }

  /**
   * Fetches transactions via Electrum. Returns VOID.
   * Use getter to get the actual list.   *
   * @see AbstractHDElectrumWallet.fetchTransactions()
   *
   * @return {Promise.<void>}
   */
  async fetchTransactions() {
    // Below is a simplified copypaste from HD electrum wallet
    this._txs_by_external_index = [];
    let addresses2fetch = [this.getAddress()];

    // first: batch fetch for all addresses histories
    let histories = await BlueElectrum.multiGetHistoryByAddress(addresses2fetch);
    let txs = {};
    for (let history of Object.values(histories)) {
      for (let tx of history) {
        txs[tx.tx_hash] = tx;
      }
    }

    // next, batch fetching each txid we got
    let txdatas = await BlueElectrum.multiGetTransactionByTxid(Object.keys(txs));

    // now, tricky part. we collect all transactions from inputs (vin), and batch fetch them too.
    // then we combine all this data (we need inputs to see source addresses and amounts)
    let vinTxids = [];
    for (let txdata of Object.values(txdatas)) {
      for (let vin of txdata.vin) {
        vinTxids.push(vin.txid);
      }
    }
    let vintxdatas = await BlueElectrum.multiGetTransactionByTxid(vinTxids);

    // fetched all transactions from our inputs. now we need to combine it.
    // iterating all _our_ transactions:
    for (let txid of Object.keys(txdatas)) {
      // iterating all inputs our our single transaction:
      for (let inpNum = 0; inpNum < txdatas[txid].vin.length; inpNum++) {
        let inpTxid = txdatas[txid].vin[inpNum].txid;
        let inpVout = txdatas[txid].vin[inpNum].vout;
        // got txid and output number of _previous_ transaction we shoud look into
        if (vintxdatas[inpTxid] && vintxdatas[inpTxid].vout[inpVout]) {
          // extracting amount & addresses from previous output and adding it to _our_ input:
          txdatas[txid].vin[inpNum].addresses = vintxdatas[inpTxid].vout[inpVout].scriptPubKey.addresses;
          txdatas[txid].vin[inpNum].value = vintxdatas[inpTxid].vout[inpVout].value;
        }
      }
    }

    // now, we need to put transactions in all relevant `cells` of internal hashmaps: this.transactions_by_internal_index && this.transactions_by_external_index

    for (let tx of Object.values(txdatas)) {
      for (let vin of tx.vin) {
        if (vin.addresses && vin.addresses.indexOf(this.getAddress()) !== -1) {
          // this TX is related to our address
          let clonedTx = Object.assign({}, tx);
          clonedTx.inputs = tx.vin.slice(0);
          clonedTx.outputs = tx.vout.slice(0);
          delete clonedTx.vin;
          delete clonedTx.vout;

          this._txs_by_external_index.push(clonedTx);
        }
      }
      for (let vout of tx.vout) {
        if (vout.scriptPubKey.addresses.indexOf(this.getAddress()) !== -1) {
          // this TX is related to our address
          let clonedTx = Object.assign({}, tx);
          clonedTx.inputs = tx.vin.slice(0);
          clonedTx.outputs = tx.vout.slice(0);
          delete clonedTx.vin;
          delete clonedTx.vout;

          this._txs_by_external_index.push(clonedTx);
        }
      }
    }

    this._lastTxFetch = +new Date();
  }

  getTransactions() {
    // a hacky code reuse from electrum HD wallet:
    this._txs_by_external_index = this._txs_by_external_index || [];
    this._txs_by_internal_index = [];

    let hd = new HDSegwitBech32Wallet();
    return hd.getTransactions.apply(this);
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
   * Takes UTXOs, transforms them into
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
    for (let u of utxos) {
      u.confirmations = 6; // hack to make module accept 0 confirmations
      u.txid = u.tx_hash;
      u.vout = u.tx_output_n;
      u.amount = new BigNumber(u.value);
      u.amount = u.amount.dividedBy(100000000);
      u.amount = u.amount.toString(10);
    }
    // console.log('creating legacy tx ', amount, ' with fee ', fee, 'secret=', this.getSecret(), 'from address', this.getAddress());
    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    return signer.createTransaction(utxos, toAddress, amountPlusFee, fee, this.getSecret(), this.getAddress());
  }

  getLatestTransactionTime() {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = 0;
    for (let tx of this.getTransactions()) {
      max = Math.max(new Date(tx.received) * 1, max);
    }

    return new Date(max).toString();
  }

  /**
   * Validates any address, including legacy, p2sh and bech32
   *
   * @param address
   * @returns {boolean}
   */
  isAddressValid(address) {
    try {
      bitcoin.address.toOutputScript(address);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Converts script pub key to legacy address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either p2pkh address or false
   */
  static scriptPubKeyToAddress(scriptPubKey) {
    const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
    let ret;
    try {
      ret = bitcoin.payments.p2pkh({
        output: scriptPubKey2,
        network: bitcoin.networks.bitcoin,
      }).address;
    } catch (_) {
      return false;
    }
    return ret;
  }

  weOwnAddress(address) {
    return this.getAddress() === address || this._address === address;
  }
}
