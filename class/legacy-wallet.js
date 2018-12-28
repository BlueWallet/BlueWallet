import { AbstractWallet } from './abstract-wallet';
import { SegwitBech32Wallet } from './';
import { useBlockcypherTokens } from './constants';
import Frisbee from 'frisbee';
import { NativeModules } from 'react-native';
const { RNRandomBytes } = NativeModules;
const BigNumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
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
    for (let tx of this.transactions) {
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
        this.getAddress() + '/balance' + ((useBlockcypherTokens && '?token=' + this.getRandomBlockcypherToken()) || ''),
      );
      let json = response.body;
      if (typeof json === 'undefined' || typeof json.final_balance === 'undefined') {
        throw new Error('Could not fetch balance from API: ' + response.err + ' ' + JSON.stringify(response.body));
      }

      this.balance = new BigNumber(json.final_balance);
      this.balance = this.balance.dividedBy(100000000).toString() * 1;
      this.unconfirmed_balance = new BigNumber(json.unconfirmed_balance);
      this.unconfirmed_balance = this.unconfirmed_balance.dividedBy(100000000).toString() * 1;
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

      let after = 0;
      let before = 100500100;

      for (let oldTx of this.getTransactions()) {
        if (oldTx.block_height && oldTx.confirmations < 7) {
          after = Math.max(after, oldTx.block_height);
        }
      }

      while (1) {
        let response = await api.get(
          'v1/btc/main/addrs/' +
            this.getAddress() +
            '/full?after=' +
            after +
            '&before=' +
            before +
            '&limit=50' +
            ((useBlockcypherTokens && '&token=' + this.getRandomBlockcypherToken()) || ''),
        );
        let json = response.body;
        if (typeof json === 'undefined' || !json.txs) {
          throw new Error('Could not fetch transactions from API:' + response.err);
        }

        let alreadyFetchedTransactions = this.transactions;
        this.transactions = json.txs;
        this._lastTxFetch = +new Date();

        // now, calculating value per each transaction...
        for (let tx of this.transactions) {
          if (tx.block_height) {
            before = Math.min(before, tx.block_height); // so next time we fetch older TXs
          }

          // now, if we dont have enough outputs or inputs in response we should collect them from API:
          if (tx.next_outputs) {
            let newOutputs = await this._fetchAdditionalOutputs(tx.next_outputs);
            tx.outputs = tx.outputs.concat(newOutputs);
          }
          if (tx.next_inputs) {
            let newInputs = await this._fetchAdditionalInputs(tx.next_inputs);
            tx.inputs = tx.inputs.concat(newInputs);
          }

          // how much came in...
          let value = 0;
          for (let out of tx.outputs) {
            if (out && out.addresses && out.addresses.indexOf(this.getAddress()) !== -1) {
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
              // console.log('inp.addresses empty');
              // console.log('got witness', inp.witness); // TODO

              inp.addresses = [];
              if (inp.witness && inp.witness[1]) {
                let address = SegwitBech32Wallet.witnessToAddress(inp.witness[1]);
                inp.addresses.push(address);
              } else {
                inp.addresses.push('???');
              }
            }
            if (inp && inp.addresses && inp.addresses.indexOf(this.getAddress()) !== -1) {
              // found our address in outs of this TX
              value -= inp.output_value;
            }
          }
          tx.value += value;
          // end
        }

        this.transactions = alreadyFetchedTransactions.concat(this.transactions);

        let txsUnconf = [];
        let txs = [];
        let hashPresent = {};
        // now, rearranging TXs. unconfirmed go first:
        for (let tx of this.transactions.reverse()) {
          if (hashPresent[tx.hash]) continue;
          hashPresent[tx.hash] = 1;
          if (tx.block_height && tx.block_height === -1) {
            // unconfirmed
            console.log(tx);
            if (+new Date(tx.received) < +new Date() - 3600 * 24 * 1000) {
              // nop, too old unconfirmed tx - skipping it
            } else {
              txsUnconf.push(tx);
            }
          } else {
            txs.push(tx);
          }
        }
        this.transactions = txsUnconf.reverse().concat(txs.reverse());
        // all reverses needed so freshly fetched TXs replace same old TXs

        this.transactions = this.transactions.sort((a, b) => {
          return a.received < b.received;
        });

        if (json.txs.length < 50) {
          // final batch, so it has les than max txs
          break;
        }
      }
    } catch (err) {
      console.warn(err);
    }
  }

  async _fetchAdditionalOutputs(nextOutputs) {
    let outputs = [];
    let baseURI = nextOutputs.split('/');
    baseURI = baseURI[0] + '/' + baseURI[1] + '/' + baseURI[2] + '/';
    const api = new Frisbee({
      baseURI: baseURI,
    });

    do {
      await (() => new Promise(resolve => setTimeout(resolve, 1000)))();
      nextOutputs = nextOutputs.replace(baseURI, '');

      let response = await api.get(nextOutputs + ((useBlockcypherTokens && '&token=' + this.getRandomBlockcypherToken()) || ''));
      let json = response.body;
      if (typeof json === 'undefined') {
        throw new Error('Could not fetch transactions from API:' + response.err);
      }

      if (json.outputs && json.outputs.length) {
        outputs = outputs.concat(json.outputs);
        nextOutputs = json.next_outputs;
      } else {
        break;
      }
    } while (1);

    return outputs;
  }

  async _fetchAdditionalInputs(nextInputs) {
    let inputs = [];
    let baseURI = nextInputs.split('/');
    baseURI = baseURI[0] + '/' + baseURI[1] + '/' + baseURI[2] + '/';
    const api = new Frisbee({
      baseURI: baseURI,
    });

    do {
      await (() => new Promise(resolve => setTimeout(resolve, 1000)))();
      nextInputs = nextInputs.replace(baseURI, '');

      let response = await api.get(nextInputs + ((useBlockcypherTokens && '&token=' + this.getRandomBlockcypherToken()) || ''));
      let json = response.body;
      if (typeof json === 'undefined') {
        throw new Error('Could not fetch transactions from API:' + response.err);
      }

      if (json.inputs && json.inputs.length) {
        inputs = inputs.concat(json.inputs);
        nextInputs = json.next_inputs;
      } else {
        break;
      }
    } while (1);

    return inputs;
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
