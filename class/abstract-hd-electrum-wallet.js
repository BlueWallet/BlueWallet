import { NativeModules } from 'react-native';
import bip39 from 'bip39';
import BigNumber from 'bignumber.js';
import b58 from 'bs58check';
import { AbstractHDWallet } from './abstract-hd-wallet';
const bitcoin = require('bitcoinjs-lib');
const BlueElectrum = require('../BlueElectrum');
const HDNode = require('bip32');
const coinSelectAccumulative = require('coinselect/accumulative');
const coinSelectSplit = require('coinselect/split');

const { RNRandomBytes } = NativeModules;

export class AbstractHDElectrumWallet extends AbstractHDWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';
  static defaultRBFSequence = 2147483648; // 1 << 31, minimum for replaceable transactions as per BIP68
  static finalRBFSequence = 4294967295; // 0xFFFFFFFF

  constructor() {
    super();
    this._balances_by_external_index = {}; //  0 => { c: 0, u: 0 } // confirmed/unconfirmed
    this._balances_by_internal_index = {};

    this._txs_by_external_index = {};
    this._txs_by_internal_index = {};

    this._utxo = [];
  }

  /**
   * @inheritDoc
   */
  getBalance() {
    let ret = 0;
    for (let bal of Object.values(this._balances_by_external_index)) {
      ret += bal.c;
    }
    for (let bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.c;
    }
    return ret + (this.getUnconfirmedBalance() < 0 ? this.getUnconfirmedBalance() : 0);
  }

  /**
   * @inheritDoc
   */
  timeToRefreshTransaction() {
    for (let tx of this.getTransactions()) {
      if (tx.confirmations < 7) return true;
    }
    return false;
  }

  getUnconfirmedBalance() {
    let ret = 0;
    for (let bal of Object.values(this._balances_by_external_index)) {
      ret += bal.u;
    }
    for (let bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.u;
    }
    return ret;
  }

  async generate() {
    let that = this;
    return new Promise(function(resolve) {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(32, (err, buf) => { // eslint-disable-line
          if (err) throw err;
          that.secret = bip39.entropyToMnemonic(buf.toString('hex'));
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(32, (err, bytes) => {
        if (err) throw new Error(err);
        let b = Buffer.from(bytes, 'base64').toString('hex');
        that.secret = bip39.entropyToMnemonic(b);
        resolve();
      });
    });
  }

  _getExternalWIFByIndex(index) {
    return this._getWIFByIndex(false, index);
  }

  _getInternalWIFByIndex(index) {
    return this._getWIFByIndex(true, index);
  }

  /**
   * Get internal/external WIF by wallet index
   * @param {Boolean} internal
   * @param {Number} index
   * @returns {string|false} Either string WIF or FALSE if error happened
   * @private
   */
  _getWIFByIndex(internal, index) {
    if (!this.secret) return false;
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = HDNode.fromSeed(seed);
    const path = `m/84'/0'/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodeAddressByIndex(node, index) {
    index = index * 1; // cast to int
    if (node === 0) {
      if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    }

    if (node === 0 && !this._node0) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    let address;
    if (node === 0) {
      address = this.constructor._nodeToBech32SegwitAddress(this._node0.derive(index));
    }

    if (node === 1) {
      address = this.constructor._nodeToBech32SegwitAddress(this._node1.derive(index));
    }

    if (node === 0) {
      return (this.external_addresses_cache[index] = address);
    }

    if (node === 1) {
      return (this.internal_addresses_cache[index] = address);
    }
  }

  _getNodePubkeyByIndex(node, index) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    if (node === 0) {
      return this._node0.derive(index).publicKey;
    }

    if (node === 1) {
      return this._node1.derive(index).publicKey;
    }
  }

  _getExternalAddressByIndex(index) {
    return this._getNodeAddressByIndex(0, index);
  }

  _getInternalAddressByIndex(index) {
    return this._getNodeAddressByIndex(1, index);
  }

  /**
   * Returning zpub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} zpub
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = HDNode.fromSeed(seed);

    const path = "m/84'/0'/0'";
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  /**
   * @inheritDoc
   */
  async fetchTransactions() {
    // if txs are absent for some internal address in hierarchy - this is a sign
    // we should fetch txs for that address
    // OR if some address has unconfirmed balance - should fetch it's txs
    // OR some tx for address is unconfirmed
    // OR some tx has < 7 confirmations

    // fetching transactions in batch: first, getting batch history for all addresses,
    // then batch fetching all involved txids
    // finally, batch fetching txids of all inputs (needed to see amounts & addresses of those inputs)
    // then we combine it all together

    let addresses2fetch = [];

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      // external addresses first
      let hasUnconfirmed = false;
      this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
      for (let tx of this._txs_by_external_index[c]) hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

      if (hasUnconfirmed || this._txs_by_external_index[c].length === 0 || this._balances_by_external_index[c].u !== 0) {
        addresses2fetch.push(this._getExternalAddressByIndex(c));
      }
    }

    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      // next, internal addresses
      let hasUnconfirmed = false;
      this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
      for (let tx of this._txs_by_internal_index[c]) hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

      if (hasUnconfirmed || this._txs_by_internal_index[c].length === 0 || this._balances_by_internal_index[c].u !== 0) {
        addresses2fetch.push(this._getInternalAddressByIndex(c));
      }
    }

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

    // now purge all unconfirmed txs from internal hashmaps, since some may be evicted from mempool because they became invalid
    // or replaced. hashmaps are going to be re-populated anyways, since we fetched TXs for addresses with unconfirmed TXs
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      this._txs_by_external_index[c] = this._txs_by_external_index[c].filter(tx => !!tx.confirmations);
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      this._txs_by_internal_index[c] = this._txs_by_internal_index[c].filter(tx => !!tx.confirmations);
    }

    // now, we need to put transactions in all relevant `cells` of internal hashmaps: this._txs_by_internal_index && this._txs_by_external_index

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      for (let tx of Object.values(txdatas)) {
        for (let vin of tx.vin) {
          if (vin.addresses && vin.addresses.indexOf(this._getExternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
            let clonedTx = Object.assign({}, tx);
            clonedTx.inputs = tx.vin.slice(0);
            clonedTx.outputs = tx.vout.slice(0);
            delete clonedTx.vin;
            delete clonedTx.vout;

            // trying to replace tx if it exists already (because it has lower confirmations, for example)
            let replaced = false;
            for (let cc = 0; cc < this._txs_by_external_index[c].length; cc++) {
              if (this._txs_by_external_index[c][cc].txid === clonedTx.txid) {
                replaced = true;
                this._txs_by_external_index[c][cc] = clonedTx;
              }
            }
            if (!replaced) this._txs_by_external_index[c].push(clonedTx);
          }
        }
        for (let vout of tx.vout) {
          if (vout.scriptPubKey.addresses.indexOf(this._getExternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
            let clonedTx = Object.assign({}, tx);
            clonedTx.inputs = tx.vin.slice(0);
            clonedTx.outputs = tx.vout.slice(0);
            delete clonedTx.vin;
            delete clonedTx.vout;

            // trying to replace tx if it exists already (because it has lower confirmations, for example)
            let replaced = false;
            for (let cc = 0; cc < this._txs_by_external_index[c].length; cc++) {
              if (this._txs_by_external_index[c][cc].txid === clonedTx.txid) {
                replaced = true;
                this._txs_by_external_index[c][cc] = clonedTx;
              }
            }
            if (!replaced) this._txs_by_external_index[c].push(clonedTx);
          }
        }
      }
    }

    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      for (let tx of Object.values(txdatas)) {
        for (let vin of tx.vin) {
          if (vin.addresses && vin.addresses.indexOf(this._getInternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
            let clonedTx = Object.assign({}, tx);
            clonedTx.inputs = tx.vin.slice(0);
            clonedTx.outputs = tx.vout.slice(0);
            delete clonedTx.vin;
            delete clonedTx.vout;

            // trying to replace tx if it exists already (because it has lower confirmations, for example)
            let replaced = false;
            for (let cc = 0; cc < this._txs_by_internal_index[c].length; cc++) {
              if (this._txs_by_internal_index[c][cc].txid === clonedTx.txid) {
                replaced = true;
                this._txs_by_internal_index[c][cc] = clonedTx;
              }
            }
            if (!replaced) this._txs_by_internal_index[c].push(clonedTx);
          }
        }
        for (let vout of tx.vout) {
          if (vout.scriptPubKey.addresses.indexOf(this._getInternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
            let clonedTx = Object.assign({}, tx);
            clonedTx.inputs = tx.vin.slice(0);
            clonedTx.outputs = tx.vout.slice(0);
            delete clonedTx.vin;
            delete clonedTx.vout;

            // trying to replace tx if it exists already (because it has lower confirmations, for example)
            let replaced = false;
            for (let cc = 0; cc < this._txs_by_internal_index[c].length; cc++) {
              if (this._txs_by_internal_index[c][cc].txid === clonedTx.txid) {
                replaced = true;
                this._txs_by_internal_index[c][cc] = clonedTx;
              }
            }
            if (!replaced) this._txs_by_internal_index[c].push(clonedTx);
          }
        }
      }
    }

    this._lastTxFetch = +new Date();
  }

  getTransactions() {
    let txs = [];

    for (let addressTxs of Object.values(this._txs_by_external_index)) {
      txs = txs.concat(addressTxs);
    }
    for (let addressTxs of Object.values(this._txs_by_internal_index)) {
      txs = txs.concat(addressTxs);
    }

    let ret = [];
    for (let tx of txs) {
      tx.received = tx.blocktime * 1000;
      if (!tx.blocktime) tx.received = +new Date() - 30 * 1000; // unconfirmed
      tx.confirmations = tx.confirmations || 0; // unconfirmed
      tx.hash = tx.txid;
      tx.value = 0;

      for (let vin of tx.inputs) {
        // if input (spending) goes from our address - we are loosing!
        if ((vin.address && this.weOwnAddress(vin.address)) || (vin.addresses && vin.addresses[0] && this.weOwnAddress(vin.addresses[0]))) {
          tx.value -= new BigNumber(vin.value).multipliedBy(100000000).toNumber();
        }
      }

      for (let vout of tx.outputs) {
        // when output goes to our address - this means we are gaining!
        if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses[0] && this.weOwnAddress(vout.scriptPubKey.addresses[0])) {
          tx.value += new BigNumber(vout.value).multipliedBy(100000000).toNumber();
        }
      }
      ret.push(tx);
    }

    // now, deduplication:
    let usedTxIds = {};
    let ret2 = [];
    for (let tx of ret) {
      if (!usedTxIds[tx.txid]) ret2.push(tx);
      usedTxIds[tx.txid] = 1;
    }

    return ret2.sort(function(a, b) {
      return b.received - a.received;
    });
  }

  async _binarySearchIterationForInternalAddress(index) {
    const gerenateChunkAddresses = chunkNum => {
      let ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(this._getInternalAddressByIndex(c));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    for (let c = 0; c < Math.round(index / this.gap_limit); c++) {
      let histories = await BlueElectrum.multiGetHistoryByAddress(gerenateChunkAddresses(c));
      if (this.constructor._getTransactionsFromHistories(histories).length > 0) {
        // in this particular chunk we have used addresses
        lastChunkWithUsedAddressesNum = c;
        lastHistoriesWithUsedAddresses = histories;
      } else {
        // empty chunk. no sense searching more chunks
        break;
      }
    }

    let lastUsedIndex = 0;

    if (lastHistoriesWithUsedAddresses) {
      // now searching for last used address in batch lastChunkWithUsedAddressesNum
      for (
        let c = lastChunkWithUsedAddressesNum * this.gap_limit;
        c < lastChunkWithUsedAddressesNum * this.gap_limit + this.gap_limit;
        c++
      ) {
        let address = this._getInternalAddressByIndex(c);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unsued
        }
      }
    }

    return lastUsedIndex;
  }

  async _binarySearchIterationForExternalAddress(index) {
    const gerenateChunkAddresses = chunkNum => {
      let ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(this._getExternalAddressByIndex(c));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    for (let c = 0; c < Math.round(index / this.gap_limit); c++) {
      let histories = await BlueElectrum.multiGetHistoryByAddress(gerenateChunkAddresses(c));
      if (this.constructor._getTransactionsFromHistories(histories).length > 0) {
        // in this particular chunk we have used addresses
        lastChunkWithUsedAddressesNum = c;
        lastHistoriesWithUsedAddresses = histories;
      } else {
        // empty chunk. no sense searching more chunks
        break;
      }
    }

    let lastUsedIndex = 0;

    if (lastHistoriesWithUsedAddresses) {
      // now searching for last used address in batch lastChunkWithUsedAddressesNum
      for (
        let c = lastChunkWithUsedAddressesNum * this.gap_limit;
        c < lastChunkWithUsedAddressesNum * this.gap_limit + this.gap_limit;
        c++
      ) {
        let address = this._getExternalAddressByIndex(c);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unsued
        }
      }
    }

    return lastUsedIndex;
  }

  async fetchBalance() {
    try {
      if (this.next_free_change_address_index === 0 && this.next_free_address_index === 0) {
        // doing binary search for last used address:
        this.next_free_change_address_index = await this._binarySearchIterationForInternalAddress(1000);
        this.next_free_address_index = await this._binarySearchIterationForExternalAddress(1000);
      } // end rescanning fresh wallet

      // finally fetching balance
      await this._fetchBalance();
    } catch (err) {
      console.warn(err);
    }
  }

  async _fetchBalance() {
    // probing future addressess in hierarchy whether they have any transactions, in case
    // our 'next free addr' pointers are lagging behind
    let tryAgain = false;
    let txs = await BlueElectrum.getTransactionsByAddress(
      this._getExternalAddressByIndex(this.next_free_address_index + this.gap_limit - 1),
    );
    if (txs.length > 0) {
      // whoa, someone uses our wallet outside! better catch up
      this.next_free_address_index += this.gap_limit;
      tryAgain = true;
    }

    txs = await BlueElectrum.getTransactionsByAddress(
      this._getInternalAddressByIndex(this.next_free_change_address_index + this.gap_limit - 1),
    );
    if (txs.length > 0) {
      this.next_free_change_address_index += this.gap_limit;
      tryAgain = true;
    }

    // FIXME: refactor me ^^^ can be batched in single call. plus not just couple of addresses, but all between [ next_free .. (next_free + gap_limit) ]

    if (tryAgain) return this._fetchBalance();

    // next, business as usuall. fetch balances

    let addresses2fetch = [];

    // generating all involved addresses.
    // basically, refetch all from index zero to maximum. doesnt matter
    // since we batch them 100 per call

    // external
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      addresses2fetch.push(this._getExternalAddressByIndex(c));
    }

    // internal
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      addresses2fetch.push(this._getInternalAddressByIndex(c));
    }

    let balances = await BlueElectrum.multiGetBalanceByAddress(addresses2fetch);

    // converting to a more compact internal format
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      let addr = this._getExternalAddressByIndex(c);
      if (balances.addresses[addr]) {
        // first, if balances differ from what we store - we delete transactions for that
        // address so next fetchTransactions() will refetch everything
        if (this._balances_by_external_index[c]) {
          if (
            this._balances_by_external_index[c].c !== balances.addresses[addr].confirmed ||
            this._balances_by_external_index[c].u !== balances.addresses[addr].unconfirmed
          ) {
            delete this._txs_by_external_index[c];
          }
        }
        // update local representation of balances on that address:
        this._balances_by_external_index[c] = {
          c: balances.addresses[addr].confirmed,
          u: balances.addresses[addr].unconfirmed,
        };
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      let addr = this._getInternalAddressByIndex(c);
      if (balances.addresses[addr]) {
        // first, if balances differ from what we store - we delete transactions for that
        // address so next fetchTransactions() will refetch everything
        if (this._balances_by_internal_index[c]) {
          if (
            this._balances_by_internal_index[c].c !== balances.addresses[addr].confirmed ||
            this._balances_by_internal_index[c].u !== balances.addresses[addr].unconfirmed
          ) {
            delete this._txs_by_internal_index[c];
          }
        }
        // update local representation of balances on that address:
        this._balances_by_internal_index[c] = {
          c: balances.addresses[addr].confirmed,
          u: balances.addresses[addr].unconfirmed,
        };
      }
    }

    this._lastBalanceFetch = +new Date();
  }

  async fetchUtxo() {
    // considering only confirmed balance
    let addressess = [];

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._balances_by_external_index[c] && this._balances_by_external_index[c].c && this._balances_by_external_index[c].c > 0) {
        addressess.push(this._getExternalAddressByIndex(c));
      }
    }

    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._balances_by_internal_index[c] && this._balances_by_internal_index[c].c && this._balances_by_internal_index[c].c > 0) {
        addressess.push(this._getInternalAddressByIndex(c));
      }
    }

    this._utxo = [];
    for (let arr of Object.values(await BlueElectrum.multiGetUtxoByAddress(addressess))) {
      this._utxo = this._utxo.concat(arr);
    }

    // backward compatibility TODO: remove when we make sure `.utxo` is not used
    this.utxo = this._utxo;
    // this belongs in `.getUtxo()`
    for (let u of this.utxo) {
      u.txid = u.txId;
      u.amount = u.value;
      u.wif = this._getWifForAddress(u.address);
      u.confirmations = u.height ? 1 : 0;
    }
  }

  getUtxo() {
    return this._utxo;
  }

  _getDerivationPathByAddress(address) {
    const path = "m/84'/0'/0'";
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return path + '/0/' + c;
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return path + '/1/' + c;
    }

    return false;
  }

  _getPubkeyByAddress(address) {
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return this._getNodePubkeyByIndex(0, c);
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return this._getNodePubkeyByIndex(1, c);
    }

    return false;
  }

  weOwnAddress(address) {
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return true;
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return true;
    }
    return false;
  }

  /**
   * @deprecated
   */
  createTx(utxos, amount, fee, address) {
    throw new Error('Deprecated');
  }

  /**
   *
   * @param utxos {Array.<{vout: Number, value: Number, txId: String, address: String}>} List of spendable utxos
   * @param targets {Array.<{value: Number, address: String}>} Where coins are going. If theres only 1 target and that target has no value - this will send MAX to that address (respecting fee rate)
   * @param feeRate {Number} satoshi per byte
   * @param changeAddress {String} Excessive coins will go back to that address
   * @param sequence {Number} Used in RBF
   * @param skipSigning {boolean} Whether we should skip signing, use returned `psbt` in that case
   * @returns {{outputs: Array, tx: Transaction, inputs: Array, fee: Number, psbt: Psbt}}
   */
  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false) {
    if (!changeAddress) throw new Error('No change address provided');
    sequence = sequence || AbstractHDElectrumWallet.defaultRBFSequence;

    let algo = coinSelectAccumulative;
    if (targets.length === 1 && targets[0] && !targets[0].value) {
      // we want to send MAX
      algo = coinSelectSplit;
    }

    let { inputs, outputs, fee } = algo(utxos, targets, feeRate);

    // .inputs and .outputs will be undefined if no solution was found
    if (!inputs || !outputs) {
      throw new Error('Not enough balance. Try sending smaller amount');
    }

    let psbt = new bitcoin.Psbt();

    let c = 0;
    let keypairs = {};
    let values = {};

    inputs.forEach(input => {
      let keyPair;
      if (!skipSigning) {
        // skiping signing related stuff
        keyPair = bitcoin.ECPair.fromWIF(this._getWifForAddress(input.address));
        keypairs[c] = keyPair;
      }
      values[c] = input.value;
      c++;
      if (!skipSigning) {
        // skiping signing related stuff
        if (!input.address || !this._getWifForAddress(input.address)) throw new Error('Internal error: no address or WIF to sign input');
      }
      let pubkey = this._getPubkeyByAddress(input.address);
      let masterFingerprint = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      // this is not correct fingerprint, as we dont know real fingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub
      let path = this._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        sequence,
        bip32Derivation: [
          {
            masterFingerprint,
            path,
            pubkey,
          },
        ],
        witnessUtxo: {
          script: p2wpkh.output,
          value: input.value,
        },
      });
    });

    outputs.forEach(output => {
      // if output has no address - this is change output
      let change = false;
      if (!output.address) {
        change = true;
        output.address = changeAddress;
      }

      let path = this._getDerivationPathByAddress(output.address);
      let pubkey = this._getPubkeyByAddress(output.address);
      let masterFingerprint = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      // this is not correct fingerprint, as we dont know realfingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub

      let outputData = {
        address: output.address,
        value: output.value,
      };

      if (change) {
        outputData['bip32Derivation'] = [
          {
            masterFingerprint,
            path,
            pubkey,
          },
        ];
      }

      psbt.addOutput(outputData);
    });

    if (!skipSigning) {
      // skiping signing related stuff
      for (let cc = 0; cc < c; cc++) {
        psbt.signInput(cc, keypairs[cc]);
      }
    }

    let tx;
    if (!skipSigning) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }
    return { tx, inputs, outputs, fee, psbt };
  }

  /**
   * Combines 2 PSBTs into final transaction from which you can
   * get HEX and broadcast
   *
   * @param base64one {string}
   * @param base64two {string}
   * @returns {Transaction}
   */
  combinePsbt(base64one, base64two) {
    const final1 = bitcoin.Psbt.fromBase64(base64one);
    const final2 = bitcoin.Psbt.fromBase64(base64two);
    final1.combine(final2);
    return final1.finalizeAllInputs().extractTransaction();
  }

  /**
   * Creates Segwit Bech32 Bitcoin address
   *
   * @param hdNode
   * @returns {String}
   */
  static _nodeToBech32SegwitAddress(hdNode) {
    return bitcoin.payments.p2wpkh({
      pubkey: hdNode.publicKey,
    }).address;
  }

  /**
   * Converts zpub to xpub
   *
   * @param {String} zpub
   * @returns {String} xpub
   */
  static _zpubToXpub(zpub) {
    let data = b58.decode(zpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  static _getTransactionsFromHistories(histories) {
    let txs = [];
    for (let history of Object.values(histories)) {
      for (let tx of history) {
        txs.push(tx);
      }
    }
    return txs;
  }

  /**
   * Broadcast txhex. Can throw an exception if failed
   *
   * @param {String} txhex
   * @returns {Promise<boolean>}
   */
  async broadcastTx(txhex) {
    let broadcast = await BlueElectrum.broadcastV2(txhex);
    console.log({ broadcast });
    if (broadcast.indexOf('successfully') !== -1) return true;
    return broadcast.length === 64; // this means return string is txid (precise length), so it was broadcasted ok
  }
}
