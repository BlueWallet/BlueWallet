import { AbstractWallet } from './abstract-wallet';
import { SegwitBech32Wallet } from './';
import { useBlockcypherTokens } from './constants';
import Frisbee from 'frisbee';
const isaac = require('isaac');
const BigNumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
const signer = require('../models/signer');

/**
 *  Has private key and address signle like "1ABCD....."
 *  (legacy P2PKH compressed)
 */
export class LegacyWallet extends AbstractWallet {
  constructor() {
    super();
    this.type = 'legacy';
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
  }

  timeToRefresh() {
    if (+new Date() - this._lastBalanceFetch >= 60 * 1000) {
      return true;
    }

    for (let tx of this.transactions) {
      if (tx.confirmations < 7) {
        return true;
      }
    }
  }

  generate() {
    function myRng(c) {
      let buf = Buffer.alloc(c);
      let totalhex = '';
      for (let i = 0; i < c; i++) {
        let randomNumber = isaac.random();
        randomNumber = Math.floor(randomNumber * 256);
        let n = new BigNumber(randomNumber);
        let hex = n.toString(16);
        if (hex.length === 1) {
          hex = '0' + hex;
        }
        totalhex += hex;
      }
      totalhex = bitcoin.crypto.sha256('oh hai!' + totalhex).toString('hex');
      totalhex = bitcoin.crypto.sha256(totalhex).toString('hex');
      buf.fill(totalhex, 0, 'hex');
      return buf;
    }
    this.secret = bitcoin.ECPair.makeRandom({ rng: myRng }).toWIF();
  }

  getTypeReadable() {
    return 'Legacy (P2PKH)';
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
      address = keyPair.getAddress();
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
      const api = new Frisbee({
        baseURI: 'https://api.blockcypher.com/v1/btc/main/addrs/',
      });

      let response = await api.get(
        this.getAddress() + '/balance' + ((useBlockcypherTokens && '&token=' + this.getRandomBlockcypherToken()) || ''),
      );
      let json = response.body;
      if (typeof json === 'undefined' || typeof json.final_balance === 'undefined') {
        throw new Error('Could not fetch UTXO from API' + response.err);
      }

      this.balance = new BigNumber(json.final_balance);
      this.balance = this.balance.div(100000000).toString() * 1;
      this.unconfirmed_balance = new BigNumber(json.unconfirmed_balance);
      this.unconfirmed_balance = this.unconfirmed_balance.div(100000000).toString() * 1;
      this._lastBalanceFetch = +new Date();
    } catch (err) {
      console.warn(err);
    }
  }

  /**
   * Fetches UTXO from API. Returns VOID.
   *
   * @return {Promise.<void>}
   */
  async fetchUtxo() {
    const api = new Frisbee({
      baseURI: 'https://api.blockcypher.com/v1/btc/main/addrs/',
    });

    let response;
    try {
      let maxHeight = 0;
      this.utxo = [];
      let json;

      do {
        response = await api.get(
          this.getAddress() +
            '?limit=2000&after=' +
            maxHeight +
            ((useBlockcypherTokens && '&token=' + this.getRandomBlockcypherToken()) || ''),
        );
        json = response.body;
        if (typeof json === 'undefined' || typeof json.final_balance === 'undefined') {
          throw new Error('Could not fetch UTXO from API' + response.err);
        }
        json.txrefs = json.txrefs || []; // case when source address is empty (or maxheight too high, no txs)

        for (let txref of json.txrefs) {
          maxHeight = Math.max(maxHeight, txref.block_height) + 1;
          if (typeof txref.spent !== 'undefined' && txref.spent === false) {
            this.utxo.push(txref);
          }
        }
      } while (json.txrefs.length);

      json.unconfirmed_txrefs = json.unconfirmed_txrefs || [];
      this.utxo = this.utxo.concat(json.unconfirmed_txrefs);
    } catch (err) {
      console.warn(err);
    }
  }

  /**
   * Fetches transactions via API. Returns VOID.
   * Use getter to get the actual list.
   *
   * @return {Promise.<void>}
   */
  async fetchTransactions() {
    try {
      const api = new Frisbee({
        baseURI: 'https://api.blockcypher.com/',
      });

      let response = await api.get(
        'v1/btc/main/addrs/' + this.getAddress() + '/full' + ((useBlockcypherTokens && '&token=' + this.getRandomBlockcypherToken()) || ''),
      );
      let json = response.body;
      if (typeof json === 'undefined' || !json.txs) {
        throw new Error('Could not fetch transactions from API:' + response.err);
      }

      this.transactions = json.txs;
      this._lastTxFetch = +new Date();
      // now, calculating value per each transaction...
      for (let tx of this.transactions) {
        // how much came in...
        let value = 0;
        for (let out of tx.outputs) {
          if (out.addresses.indexOf(this.getAddress()) !== -1) {
            // found our address in outs of this TX
            value += out.value;
          }
        }
        tx.value = value;
        // end

        // how much came out
        value = 0;
        for (let inp of tx.inputs) {
          if (!inp.addresses) {
            console.log('inp.addresses empty');
            console.log('got witness', inp.witness); // TODO

            inp.addresses = [];
            if (inp.witness && inp.witness[1]) {
              let address = SegwitBech32Wallet.witnessToAddress(inp.witness[1]);
              inp.addresses.push(address);
            } else {
              inp.addresses.push('???');
            }
          }
          if (inp.addresses.indexOf(this.getAddress()) !== -1) {
            // found our address in outs of this TX
            value -= inp.output_value;
          }
        }
        console.log('came out', value);
        tx.value += value;
        // end
      }
    } catch (err) {
      console.warn(err);
    }
  }

  getShortAddress() {
    let a = this.getAddress().split('');
    return (
      a[0] +
      a[1] +
      a[2] +
      a[3] +
      a[4] +
      a[5] +
      a[6] +
      a[7] +
      a[8] +
      a[9] +
      a[10] +
      a[11] +
      a[12] +
      a[13] +
      '...' +
      a[a.length - 6] +
      a[a.length - 5] +
      a[a.length - 4] +
      a[a.length - 3] +
      a[a.length - 2] +
      a[a.length - 1]
    );
  }

  async broadcastTx(txhex) {
    let chainso = await this._broadcastTxChainso(txhex);
    console.log('chainso = ', chainso);

    if ((chainso && chainso.status && chainso.status === 'fail') || !chainso) {
      console.log('fallback to blockcypher');
      let blockcypher = await this._broadcastTxBlockcypher(txhex); // fallback
      console.log('blockcypher = ', blockcypher);

      if (Object.keys(blockcypher).length === 0 || blockcypher.error) {
        // error
        console.log('blockcypher error, fallback to smartbit');
        let smartbit = await this._broadcastTxSmartbit(txhex);
        console.log('smartbit = ', smartbit);
        return smartbit;

        // let btczen =  await this._broadcastTxBtczen(txhex);
        // console.log(btczen);
        // return btczen;
      }
      return blockcypher;
    } else {
      console.log('success');
      // success
      return {
        result: chainso.data.txid,
      };
    }
  }

  async _broadcastTxBtczen(txhex) {
    const api = new Frisbee({
      baseURI: 'https://btczen.com',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    let res = await api.get('/broadcast/' + txhex);
    console.log('response btczen', res.body);
    return res.body;
  }

  async _broadcastTxChainso(txhex) {
    const api = new Frisbee({
      baseURI: 'https://chain.so',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    let res = await api.post('/api/v2/send_tx/BTC', {
      body: { tx_hex: txhex },
    });
    return res.body;
  }

  async _broadcastTxSmartbit(txhex) {
    const api = new Frisbee({
      baseURI: 'https://api.smartbit.com.au',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    let res = await api.post('/v1/blockchain/pushtx', {
      body: { hex: txhex },
    });
    return res.body;
  }

  async _broadcastTxBlockcypher(txhex) {
    const api = new Frisbee({
      baseURI: 'https://api.blockcypher.com',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    let res = await api.post('/v1/btc/main/txs/push', { body: { tx: txhex } });
    // console.log('blockcypher response', res);
    return res.body;
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
    for (let u of utxos) {
      u.confirmations = 6; // hack to make module accept 0 confirmations
      u.txid = u.tx_hash;
      u.vout = u.tx_output_n;
      u.amount = new BigNumber(u.value);
      u.amount = u.amount.div(100000000);
      u.amount = u.amount.toString(10);
    }
    console.log('creating legacy tx ', amount, ' with fee ', fee, 'secret=', this.getSecret(), 'from address', this.getAddress());
    let amountPlusFee = parseFloat(new BigNumber(amount).add(fee).toString(10));
    return signer.createTransaction(utxos, toAddress, amountPlusFee, fee, this.getSecret(), this.getAddress());
  }

  getLatestTransactionTime() {
    for (let tx of this.transactions) {
      return tx.received;
    }
    return 0;
  }

  getRandomBlockcypherToken() {
    return (array => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
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
      bitcoin.address.toOutputScript(address);
      return true;
    } catch (e) {
      return false;
    }
  }
}
