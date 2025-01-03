/* eslint react/prop-types: "off", @typescript-eslint/ban-ts-comment: "off", camelcase: "off"   */
import BIP47Factory, { BIP47Interface } from '@spsina/bip47';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import BIP32Factory, { BIP32Interface } from 'bip32';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { Psbt, Transaction as BTransaction } from 'bitcoinjs-lib';
import b58 from 'bs58check';
import { CoinSelectOutput, CoinSelectReturnInput } from 'coinselect';
import { ECPairFactory } from 'ecpair';
import { ECPairInterface } from 'ecpair/src/ecpair';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { ElectrumHistory } from '../../blue_modules/BlueElectrum';
import ecc from '../../blue_modules/noble_ecc';
import { randomBytes } from '../rng';
import { AbstractHDWallet } from './abstract-hd-wallet';
import { CreateTransactionResult, CreateTransactionTarget, CreateTransactionUtxo, Transaction, Utxo } from './types';
import { SilentPayment, UTXOType as SPUTXOType, UTXO as SPUTXO } from 'silent-payments';

const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);
const bip47 = BIP47Factory(ecc);

type BalanceByIndex = {
  c: number;
  u: number;
};

/**
 * Electrum - means that it utilizes Electrum protocol for blockchain data
 */
export class AbstractHDElectrumWallet extends AbstractHDWallet {
  static readonly type = 'abstract';
  static readonly typeReadable = 'abstract';
  static defaultRBFSequence = 2147483648; // 1 << 31, minimum for replaceable transactions as per BIP68
  static finalRBFSequence = 4294967295; // 0xFFFFFFFF
  // @ts-ignore: override
  public readonly type = AbstractHDElectrumWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = AbstractHDElectrumWallet.typeReadable;

  _balances_by_external_index: Record<number, BalanceByIndex>;
  _balances_by_internal_index: Record<number, BalanceByIndex>;

  // @ts-ignore
  _txs_by_external_index: Record<number, Transaction[]>;
  // @ts-ignore
  _txs_by_internal_index: Record<number, Transaction[]>;

  _utxo: any[];

  // BIP47
  _enable_BIP47: boolean;
  _payment_code: string;

  /**
   * payment codes of people who can pay us
   */
  _receive_payment_codes: string[];

  /**
   * payment codes of people whom we can pay
   */
  _send_payment_codes: string[];

  /**
   * joint addresses with remote counterparties, to receive funds
   */
  _addresses_by_payment_code_receive: Record<string, string[]>;

  /**
   * receive index
   */
  _next_free_payment_code_address_index_receive: Record<string, number>;

  /**
   * joint addresses with remote counterparties, whom we can send funds
   */
  _addresses_by_payment_code_send: Record<string, string[]>;

  /**
   * send index
   */
  _next_free_payment_code_address_index_send: Record<string, number>;

  /**
   * this is where we put transactions related to our PC receive addresses. this is both
   * incoming transactions AND outgoing transactions (when we spend those funds)
   *
   */
  _txs_by_payment_code_index: Record<string, Transaction[][]>;

  _balances_by_payment_code_index: Record<string, BalanceByIndex>;
  _bip47_instance?: BIP47Interface;

  constructor() {
    super();
    this._balances_by_external_index = {}; //  0 => { c: 0, u: 0 } // confirmed/unconfirmed
    this._balances_by_internal_index = {};

    this._txs_by_external_index = {};
    this._txs_by_internal_index = {};

    this._utxo = [];

    // BIP47
    this._enable_BIP47 = false;
    this._payment_code = '';
    this._receive_payment_codes = [];
    this._send_payment_codes = [];
    this._next_free_payment_code_address_index_receive = {};
    this._txs_by_payment_code_index = {};
    this._addresses_by_payment_code_send = {};
    this._next_free_payment_code_address_index_send = {};
    this._balances_by_payment_code_index = {};
    this._addresses_by_payment_code_receive = {};
  }

  /**
   * @inheritDoc
   */
  getBalance() {
    let ret = 0;
    for (const bal of Object.values(this._balances_by_external_index)) {
      ret += bal.c;
    }
    for (const bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.c;
    }
    for (const pc of this._receive_payment_codes) {
      ret += this._getBalancesByPaymentCodeIndex(pc).c;
    }
    return ret + (this.getUnconfirmedBalance() < 0 ? this.getUnconfirmedBalance() : 0);
  }

  /**
   *
   * @inheritDoc
   */
  getUnconfirmedBalance() {
    let ret = 0;
    for (const bal of Object.values(this._balances_by_external_index)) {
      ret += bal.u;
    }
    for (const bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.u;
    }
    for (const pc of this._receive_payment_codes) {
      ret += this._getBalancesByPaymentCodeIndex(pc).u;
    }
    return ret;
  }

  async generate() {
    const buf = await randomBytes(16);
    this.secret = bip39.entropyToMnemonic(buf.toString('hex'));
  }

  async generateFromEntropy(user: Buffer) {
    if (user.length !== 32 && user.length !== 16) {
      throw new Error('Entropy has to be 16 or 32 bytes long');
    }
    this.secret = bip39.entropyToMnemonic(user.toString('hex'));
  }

  _getExternalWIFByIndex(index: number): string | false {
    return this._getWIFByIndex(false, index);
  }

  _getInternalWIFByIndex(index: number): string | false {
    return this._getWIFByIndex(true, index);
  }

  /**
   * Get internal/external WIF by wallet index
   * @param {Boolean} internal
   * @param {Number} index
   * @returns {string|false} Either string WIF or FALSE if error happened
   * @private
   */
  _getWIFByIndex(internal: boolean, index: number): string | false {
    if (!this.secret) return false;
    const seed = this._getSeed();
    const root = bip32.fromSeed(seed);
    const path = `${this.getDerivationPath()}/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodeAddressByIndex(node: number, index: number): string {
    index = index * 1; // cast to int
    if (node === 0) {
      if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    }

    if (node === 0 && !this._node0) {
      const xpub = this._zpubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this._zpubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    let address: string;
    if (node === 0) {
      // @ts-ignore
      address = this._hdNodeToAddress(this._node0.derive(index));
    } else {
      // tbh the only possible else is node === 1
      // @ts-ignore
      address = this._hdNodeToAddress(this._node1.derive(index));
    }

    if (node === 0) {
      return (this.external_addresses_cache[index] = address);
    } else {
      // tbh the only possible else option is node === 1
      return (this.internal_addresses_cache[index] = address);
    }
  }

  _getNodePubkeyByIndex(node: number, index: number) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      const xpub = this._zpubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this._zpubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    if (node === 0 && this._node0) {
      return this._node0.derive(index).publicKey;
    }

    if (node === 1 && this._node1) {
      return this._node1.derive(index).publicKey;
    }

    throw new Error('Internal error: this._node0 or this._node1 is undefined');
  }

  _getExternalAddressByIndex(index: number): string {
    return this._getNodeAddressByIndex(0, index);
  }

  _getInternalAddressByIndex(index: number) {
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
    const seed = this._getSeed();
    const root = bip32.fromSeed(seed);

    const path = this.getDerivationPath();
    if (!path) {
      throw new Error('Internal error: no path');
    }
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

    const addresses2fetch = [];

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      // external addresses first
      let hasUnconfirmed = false;
      this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
      for (const tx of this._txs_by_external_index[c]) hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

      if (hasUnconfirmed || this._txs_by_external_index[c].length === 0 || this._balances_by_external_index[c].u !== 0) {
        addresses2fetch.push(this._getExternalAddressByIndex(c));
      }
    }

    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      // next, internal addresses
      let hasUnconfirmed = false;
      this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
      for (const tx of this._txs_by_internal_index[c]) hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

      if (hasUnconfirmed || this._txs_by_internal_index[c].length === 0 || this._balances_by_internal_index[c].u !== 0) {
        addresses2fetch.push(this._getInternalAddressByIndex(c));
      }
    }

    // next, bip47 addresses
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        let hasUnconfirmed = false;
        this._txs_by_payment_code_index[pc] = this._txs_by_payment_code_index[pc] || {};
        this._txs_by_payment_code_index[pc][c] = this._txs_by_payment_code_index[pc][c] || [];
        for (const tx of this._txs_by_payment_code_index[pc][c])
          hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

        if (hasUnconfirmed || this._txs_by_payment_code_index[pc][c].length === 0 || this._balances_by_payment_code_index[pc].u !== 0) {
          addresses2fetch.push(this._getBIP47AddressReceive(pc, c));
        }
      }
    }

    // first: batch fetch for all addresses histories
    const histories = await BlueElectrum.multiGetHistoryByAddress(addresses2fetch);
    const txs: Record<string, ElectrumHistory> = {};
    for (const history of Object.values(histories)) {
      for (const tx of history as ElectrumHistory[]) {
        txs[tx.tx_hash] = tx;
      }
    }

    // next, batch fetching each txid we got
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(Object.keys(txs), true);

    // now, tricky part. we collect all transactions from inputs (vin), and batch fetch them too.
    // then we combine all this data (we need inputs to see source addresses and amounts)
    const vinTxids = [];
    for (const txdata of Object.values(txdatas)) {
      for (const vin of txdata.vin) {
        vin.txid && vinTxids.push(vin.txid);
        // ^^^^ not all inputs have txid, some of them are Coinbase (newly-created coins)
      }
    }
    const vintxdatas = await BlueElectrum.multiGetTransactionByTxid(vinTxids, true);

    // fetched all transactions from our inputs. now we need to combine it.
    // iterating all _our_ transactions:
    for (const txid of Object.keys(txdatas)) {
      // iterating all inputs our our single transaction:
      for (let inpNum = 0; inpNum < txdatas[txid].vin.length; inpNum++) {
        const inpTxid = txdatas[txid].vin[inpNum].txid;
        const inpVout = txdatas[txid].vin[inpNum].vout;
        // got txid and output number of _previous_ transaction we shoud look into
        if (vintxdatas[inpTxid]?.vout[inpVout]) {
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
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        this._txs_by_payment_code_index[pc][c] = this._txs_by_payment_code_index[pc][c].filter(tx => !!tx.confirmations);
      }
    }

    // now, we need to put transactions in all relevant `cells` of internal hashmaps:
    // this._txs_by_internal_index, this._txs_by_external_index & this._txs_by_payment_code_index

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      for (const tx of Object.values(txdatas)) {
        for (const vin of tx.vin) {
          if (vin.addresses && vin.addresses.indexOf(this._getExternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
            const { vin: txVin, vout: txVout, ...txRest } = tx;
            const clonedTx = { ...txRest, inputs: txVin.slice(0), outputs: txVout.slice(0) };

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
        for (const vout of tx.vout) {
          if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.indexOf(this._getExternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
            const { vin: txVin, vout: txVout, ...txRest } = tx;
            const clonedTx = { ...txRest, inputs: txVin.slice(0), outputs: txVout.slice(0) };

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
      for (const tx of Object.values(txdatas)) {
        for (const vin of tx.vin) {
          if (vin.addresses && vin.addresses.indexOf(this._getInternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
            const { vin: txVin, vout: txVout, ...txRest } = tx;
            const clonedTx = { ...txRest, inputs: txVin.slice(0), outputs: txVout.slice(0) };

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
        for (const vout of tx.vout) {
          if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.indexOf(this._getInternalAddressByIndex(c)) !== -1) {
            // this TX is related to our address
            this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
            const { vin: txVin, vout: txVout, ...txRest } = tx;
            const clonedTx = { ...txRest, inputs: txVin.slice(0), outputs: txVout.slice(0) };

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

    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        for (const tx of Object.values(txdatas)) {
          // since we are iterating PCs who can pay us, we can completely ignore `tx.vin` and only iterate `tx.vout`
          for (const vout of tx.vout) {
            if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.indexOf(this._getBIP47AddressReceive(pc, c)) !== -1) {
              // this TX is related to our address
              this._txs_by_payment_code_index[pc] = this._txs_by_payment_code_index[pc] || {};
              this._txs_by_payment_code_index[pc][c] = this._txs_by_payment_code_index[pc][c] || [];
              const { vin: txVin, vout: txVout, ...txRest } = tx;
              const clonedTx = { ...txRest, inputs: txVin.slice(0), outputs: txVout.slice(0) };

              // trying to replace tx if it exists already (because it has lower confirmations, for example)
              let replaced = false;
              for (let cc = 0; cc < this._txs_by_payment_code_index[pc][c].length; cc++) {
                if (this._txs_by_payment_code_index[pc][c][cc].txid === clonedTx.txid) {
                  replaced = true;
                  this._txs_by_payment_code_index[pc][c][cc] = clonedTx;
                }
              }
              if (!replaced) this._txs_by_payment_code_index[pc][c].push(clonedTx);
            }
          }
        }
      }
    }

    this._lastTxFetch = +new Date();
  }

  getTransactions() {
    let txs: Transaction[] = [];

    for (const addressTxs of Object.values(this._txs_by_external_index)) {
      txs = txs.concat(addressTxs);
    }
    for (const addressTxs of Object.values(this._txs_by_internal_index)) {
      txs = txs.concat(addressTxs);
    }
    if (this._receive_payment_codes) {
      for (const pc of this._receive_payment_codes) {
        if (this._txs_by_payment_code_index[pc])
          for (const addressTxs of Object.values(this._txs_by_payment_code_index[pc])) {
            txs = txs.concat(addressTxs);
          }
      }
    }

    if (txs.length === 0) return []; // guard clause; so we wont spend time calculating addresses

    // its faster to pre-build hashmap of owned addresses than to query `this.weOwnAddress()`, which in turn
    // iterates over all addresses in hierarchy
    const ownedAddressesHashmap: Record<string, boolean> = {};
    for (let c = 0; c < this.next_free_address_index + 1; c++) {
      ownedAddressesHashmap[this._getExternalAddressByIndex(c)] = true;
    }
    for (let c = 0; c < this.next_free_change_address_index + 1; c++) {
      ownedAddressesHashmap[this._getInternalAddressByIndex(c)] = true;
    }
    if (this._receive_payment_codes)
      for (const pc of this._receive_payment_codes) {
        for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + 1; c++) {
          ownedAddressesHashmap[this._getBIP47AddressReceive(pc, c)] = true;
        }
      }
    // hack: in case this code is called from LegacyWallet:
    if (this.getAddress()) ownedAddressesHashmap[String(this.getAddress())] = true;

    const ret: Transaction[] = [];
    for (const tx of txs) {
      tx.received = tx.blocktime * 1000;
      if (!tx.blocktime) tx.received = +new Date() - 30 * 1000; // unconfirmed
      tx.confirmations = tx.confirmations || 0; // unconfirmed
      tx.hash = tx.txid;
      tx.value = 0;

      for (const vin of tx.inputs) {
        // if input (spending) goes from our address - we are loosing!
        if ((vin.address && ownedAddressesHashmap[vin.address]) || (vin.addresses?.[0] && ownedAddressesHashmap[vin.addresses[0]])) {
          tx.value -= new BigNumber(vin.value ?? 0).multipliedBy(100000000).toNumber();
        }
      }

      for (const vout of tx.outputs) {
        // when output goes to our address - this means we are gaining!
        if (vout.scriptPubKey.addresses?.[0] && ownedAddressesHashmap[vout.scriptPubKey.addresses[0]]) {
          tx.value += new BigNumber(vout.value).multipliedBy(100000000).toNumber();
        }
      }

      if (this.allowBIP47() && this.isBIP47Enabled()) {
        tx.counterparty = this.getBip47CounterpartyByTx(tx);
      }
      ret.push(tx);
    }

    // now, deduplication:
    const usedTxIds: Record<string, number> = {};
    const ret2 = [];
    for (const tx of ret) {
      if (!usedTxIds[tx.txid]) ret2.push(tx);
      usedTxIds[tx.txid] = 1;
    }

    return ret2.sort(function (a, b) {
      return Number(b.received) - Number(a.received);
    });
  }

  async _binarySearchIterationForInternalAddress(index: number) {
    const gerenateChunkAddresses = (chunkNum: number) => {
      const ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(this._getInternalAddressByIndex(c));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    for (let c = 0; c < Math.round(index / this.gap_limit); c++) {
      const histories = await BlueElectrum.multiGetHistoryByAddress(gerenateChunkAddresses(c));
      // @ts-ignore
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
        let c = Number(lastChunkWithUsedAddressesNum) * this.gap_limit;
        c < Number(lastChunkWithUsedAddressesNum) * this.gap_limit + this.gap_limit;
        c++
      ) {
        const address = this._getInternalAddressByIndex(c);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unused
        }
      }
    }

    return lastUsedIndex;
  }

  async _binarySearchIterationForExternalAddress(index: number) {
    const gerenateChunkAddresses = (chunkNum: number) => {
      const ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(this._getExternalAddressByIndex(c));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    for (let c = 0; c < Math.round(index / this.gap_limit); c++) {
      const histories = await BlueElectrum.multiGetHistoryByAddress(gerenateChunkAddresses(c));
      // @ts-ignore
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
        let c = Number(lastChunkWithUsedAddressesNum) * this.gap_limit;
        c < Number(lastChunkWithUsedAddressesNum) * this.gap_limit + this.gap_limit;
        c++
      ) {
        const address = this._getExternalAddressByIndex(c);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unused
        }
      }
    }

    return lastUsedIndex;
  }

  async _binarySearchIterationForBIP47Address(paymentCode: string, index: number) {
    const generateChunkAddresses = (chunkNum: number) => {
      const ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(this._getBIP47AddressReceive(paymentCode, c));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    for (let c = 0; c < Math.round(index / this.gap_limit); c++) {
      const histories = await BlueElectrum.multiGetHistoryByAddress(generateChunkAddresses(c));
      // @ts-ignore
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
        let c = Number(lastChunkWithUsedAddressesNum) * this.gap_limit;
        c < Number(lastChunkWithUsedAddressesNum) * this.gap_limit + this.gap_limit;
        c++
      ) {
        const address = this._getBIP47AddressReceive(paymentCode, c);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unused
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
        if (this._receive_payment_codes) {
          for (const pc of this._receive_payment_codes) {
            this._next_free_payment_code_address_index_receive[pc] = await this._binarySearchIterationForBIP47Address(pc, 1000);
          }
        }
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
    // for that we are gona batch fetch history for all addresses between last used and last used + gap_limit

    const lagAddressesToFetch = [];
    for (let c = this.next_free_address_index; c < this.next_free_address_index + this.gap_limit; c++) {
      lagAddressesToFetch.push(this._getExternalAddressByIndex(c));
    }
    for (let c = this.next_free_change_address_index; c < this.next_free_change_address_index + this.gap_limit; c++) {
      lagAddressesToFetch.push(this._getInternalAddressByIndex(c));
    }
    for (const pc of this._receive_payment_codes) {
      for (
        let c = this._next_free_payment_code_address_index_receive[pc];
        c < this._next_free_payment_code_address_index_receive[pc] + this.gap_limit;
        c++
      ) {
        lagAddressesToFetch.push(this._getBIP47AddressReceive(pc, c));
      }
    }

    const txs = await BlueElectrum.multiGetHistoryByAddress(lagAddressesToFetch); // <------ electrum call

    for (let c = this.next_free_address_index; c < this.next_free_address_index + this.gap_limit; c++) {
      const address = this._getExternalAddressByIndex(c);
      if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
        // whoa, someone uses our wallet outside! better catch up
        this.next_free_address_index = c + 1;
      }
    }

    for (let c = this.next_free_change_address_index; c < this.next_free_change_address_index + this.gap_limit; c++) {
      const address = this._getInternalAddressByIndex(c);
      if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
        // whoa, someone uses our wallet outside! better catch up
        this.next_free_change_address_index = c + 1;
      }
    }

    for (const pc of this._receive_payment_codes) {
      for (
        let c = this._next_free_payment_code_address_index_receive[pc];
        c < this._next_free_payment_code_address_index_receive[pc] + this.gap_limit;
        c++
      ) {
        const address = this._getBIP47AddressReceive(pc, c);
        if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
          // whoa, someone uses our wallet outside! better catch up
          this._next_free_payment_code_address_index_receive[pc] = c + 1;
        }
      }
    }

    // next, business as usuall. fetch balances

    const addresses2fetch = [];

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

    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._next_free_payment_code_address_index_receive[pc] + this.gap_limit; c++) {
        addresses2fetch.push(this._getBIP47AddressReceive(pc, c));
      }
    }

    const balances = await BlueElectrum.multiGetBalanceByAddress(addresses2fetch);

    // converting to a more compact internal format
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      const addr = this._getExternalAddressByIndex(c);
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
      const addr = this._getInternalAddressByIndex(c);
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

    for (const pc of this._receive_payment_codes) {
      let confirmed = 0;
      let unconfirmed = 0;
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        const addr = this._getBIP47AddressReceive(pc, c);
        if (balances.addresses[addr].confirmed || balances.addresses[addr].unconfirmed) {
          confirmed = confirmed + balances.addresses[addr].confirmed;
          unconfirmed = unconfirmed + balances.addresses[addr].unconfirmed;
        }
      }
      this._balances_by_payment_code_index[pc] = {
        c: confirmed,
        u: unconfirmed,
      };
    }

    this._lastBalanceFetch = +new Date();
  }

  async fetchUtxo(): Promise<void> {
    // fetching utxo of addresses that only have some balance
    let addressess = [];

    // considering confirmed balance:
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._balances_by_external_index?.[c]?.c > 0) {
        addressess.push(this._getExternalAddressByIndex(c));
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._balances_by_internal_index?.[c]?.c > 0) {
        addressess.push(this._getInternalAddressByIndex(c));
      }
    }

    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._next_free_payment_code_address_index_receive[pc] + this.gap_limit; c++) {
        if (this._balances_by_payment_code_index?.[pc]?.c > 0) {
          addressess.push(this._getBIP47AddressReceive(pc, c));
        }
      }
    }

    // considering UNconfirmed balance:
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._balances_by_external_index?.[c]?.u > 0) {
        addressess.push(this._getExternalAddressByIndex(c));
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._balances_by_internal_index?.[c]?.u > 0) {
        addressess.push(this._getInternalAddressByIndex(c));
      }
    }

    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._next_free_payment_code_address_index_receive[pc] + this.gap_limit; c++) {
        if (this._balances_by_payment_code_index?.[pc]?.u > 0) {
          addressess.push(this._getBIP47AddressReceive(pc, c));
        }
      }
    }

    // note: we could remove checks `.c` and `.u` to simplify code, but the resulting `addressess` array would be bigger, thus bigger batch
    // to fetch (or maybe even several fetches), which is not critical but undesirable.
    // anyway, result has `.confirmations` property for each utxo, so outside caller can easily filter out unconfirmed if he wants to

    addressess = [...new Set(addressess)]; // deduplicate just for any case

    const fetchedUtxo = await BlueElectrum.multiGetUtxoByAddress(addressess);
    this._utxo = [];
    for (const arr of Object.values(fetchedUtxo)) {
      this._utxo = this._utxo.concat(arr);
    }

    // this belongs in `.getUtxo()`
    for (const u of this._utxo) {
      u.wif = this._getWifForAddress(u.address);
      if (!u.confirmations && u.height) u.confirmations = BlueElectrum.estimateCurrentBlockheight() - u.height;
    }

    this._utxo = this._utxo.sort((a, b) => Number(a.value) - Number(b.value));
    // more consistent, so txhex in unit tests wont change
  }

  /**
   * Getter for previously fetched UTXO. For example:
   *     [ { height: 0,
   *    value: 666,
   *    address: 'string',
   *    vout: 1,
   *    txid: 'string',
   *    wif: 'string',
   *    confirmations: 0 } ]
   *
   * @param respectFrozen {boolean} Add Frozen outputs
   * @returns {[]}
   */
  getUtxo(respectFrozen = false) {
    let ret = [];

    if (this._utxo.length === 0) {
      ret = this.getDerivedUtxoFromOurTransaction(); // oy vey, no stored utxo. lets attempt to derive it from stored transactions
    } else {
      ret = this._utxo;
    }
    if (!respectFrozen) {
      ret = ret.filter(({ txid, vout }) => !this.getUTXOMetadata(txid, vout).frozen);
    }
    return ret;
  }

  getDerivedUtxoFromOurTransaction(returnSpentUtxoAsWell = false): Utxo[] {
    const utxos: Utxo[] = [];

    // its faster to pre-build hashmap of owned addresses than to query `this.weOwnAddress()`, which in turn
    // iterates over all addresses in hierarchy
    const ownedAddressesHashmap: Record<string, boolean> = {};
    for (let c = 0; c < this.next_free_address_index + 1; c++) {
      ownedAddressesHashmap[this._getExternalAddressByIndex(c)] = true;
    }
    for (let c = 0; c < this.next_free_change_address_index + 1; c++) {
      ownedAddressesHashmap[this._getInternalAddressByIndex(c)] = true;
    }
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + 1; c++) {
        ownedAddressesHashmap[this._getBIP47AddressReceive(pc, c)] = true;
      }
    }

    for (const tx of this.getTransactions()) {
      for (const output of tx.outputs) {
        let address: string | false = false;
        if (output.scriptPubKey && output.scriptPubKey.addresses && output.scriptPubKey.addresses[0]) {
          address = output.scriptPubKey.addresses[0];
        }
        if (ownedAddressesHashmap[String(address)]) {
          const value = new BigNumber(output.value).multipliedBy(100000000).toNumber();
          utxos.push({
            txid: tx.txid,
            vout: output.n,
            address: String(address),
            value,
            confirmations: tx.confirmations,
            wif: false,
            height: BlueElectrum.estimateCurrentBlockheight() - (tx.confirmations ?? 0),
          });
        }
      }
    }

    if (returnSpentUtxoAsWell) return utxos;

    // got all utxos we ever had. lets filter out the ones that are spent:
    const ret = [];
    for (const utxo of utxos) {
      let spent = false;
      for (const tx of this.getTransactions()) {
        for (const input of tx.inputs) {
          if (input.txid === utxo.txid && input.vout === utxo.vout) spent = true;
          // utxo we got previously was actually spent right here ^^
        }
      }

      if (!spent) {
        // filling WIFs only for legit unspent UTXO, as it is a slow operation
        utxo.wif = this._getWifForAddress(utxo.address);
        ret.push(utxo);
      }
    }

    return ret;
  }

  _getDerivationPathByAddress(address: string): string | false {
    const path = this.getDerivationPath();
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return path + '/0/' + c;
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return path + '/1/' + c;
    }
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        // not technically correct but well, to have at least somethign in PSBT...
        if (this._getBIP47AddressReceive(pc, c) === address) return "m/47'/0'/0'/" + c;
      }
    }

    return false;
  }

  /**
   *
   * @param address {string} Address that belongs to this wallet
   * @returns {Buffer|false} Either buffer with pubkey or false
   */
  _getPubkeyByAddress(address: string): Buffer | false {
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return this._getNodePubkeyByIndex(0, c);
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return this._getNodePubkeyByIndex(1, c);
    }
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        if (this._getBIP47AddressReceive(pc, c) === address) return this._getBIP47PubkeyByIndex(pc, c);
      }
    }

    return false;
  }

  /**
   * Finds WIF corresponding to address and returns it
   *
   * @param address {string} Address that belongs to this wallet
   * @returns {string|false} WIF or false
   */
  _getWIFbyAddress(address: string): string | false {
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return this._getWIFByIndex(false, c);
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return this._getWIFByIndex(true, c);
    }
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        if (this._getBIP47AddressReceive(pc, c) === address) return this._getBIP47WIF(pc, c);
      }
    }
    return false;
  }

  weOwnAddress(address: string) {
    if (!address) return false;
    let cleanAddress = address;

    if (this.segwitType === 'p2wpkh') {
      cleanAddress = address.toLowerCase();
    }

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === cleanAddress) return true;
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === cleanAddress) return true;
    }
    for (const pc of this._receive_payment_codes) {
      for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit; c++) {
        if (this._getBIP47AddressReceive(pc, c) === address) return true;
      }
    }
    return false;
  }

  /**
   *
   * @param utxos {Array.<{vout: Number, value: Number, txid: String, address: String}>} List of spendable utxos
   * @param targets {Array.<{value: Number, address: String}>} Where coins are going. If theres only 1 target and that target has no value - this will send MAX to that address (respecting fee rate)
   * @param feeRate {Number} satoshi per byte
   * @param changeAddress {String} Excessive coins will go back to that address
   * @param sequence {Number} Used in RBF
   * @param skipSigning {boolean} Whether we should skip signing, use returned `psbt` in that case
   * @param masterFingerprint {number} Decimal number of wallet's master fingerprint
   * @returns {{outputs: Array, tx: Transaction, inputs: Array, fee: Number, psbt: Psbt}}
   */
  createTransaction(
    utxos: CreateTransactionUtxo[],
    targets: CreateTransactionTarget[],
    feeRate: number,
    changeAddress: string,
    sequence: number = AbstractHDElectrumWallet.defaultRBFSequence,
    skipSigning = false,
    masterFingerprint: number = 0,
  ): CreateTransactionResult {
    if (targets.length === 0) throw new Error('No destination provided');
    // compensating for coinselect inability to deal with segwit inputs, and overriding script length for proper vbytes calculation
    for (const u of utxos) {
      // this is a hacky way to distinguish native/wrapped segwit, but its good enough for our case since we have only
      // those 2 wallet types
      if (this._getExternalAddressByIndex(0).startsWith('bc1')) {
        u.script = { length: 27 };
      } else if (this._getExternalAddressByIndex(0).startsWith('3')) {
        u.script = { length: 50 };
      }
    }

    for (const t of targets) {
      if (t.address && t.address.startsWith('bc1')) {
        // in case address is non-typical and takes more bytes than coinselect library anticipates by default
        t.script = { length: bitcoin.address.toOutputScript(t.address).length + 3 };
      }

      if (t.script?.hex) {
        // setting length for coinselect lib manually as it is not aware of our field `hex`
        t.script.length = t.script.hex.length / 2 - 4;
      }
    }

    let { inputs, outputs, fee } = this.coinselect(utxos, targets, feeRate);

    const hasSilentPaymentOutput: boolean = !!outputs.find(o => o.address?.startsWith('sp1'));
    if (hasSilentPaymentOutput) {
      if (!this.allowSilentPaymentSend()) {
        throw new Error('This wallet can not send to SilentPayment address');
      }

      // for a single wallet all utxos gona be the same type, so we define it only once:
      let utxoType: SPUTXOType = 'non-eligible';
      switch (this.segwitType) {
        case 'p2sh(p2wpkh)':
          utxoType = 'p2sh-p2wpkh';
          break;
        case 'p2wpkh':
          utxoType = 'p2wpkh';
          break;
        default:
          // @ts-ignore override
          if (this.type === 'HDlegacyP2PKH') utxoType = 'p2pkh';
      }

      const spUtxos: SPUTXO[] = inputs.map(u => ({ ...u, utxoType, wif: u.wif! }));
      const sp = new SilentPayment();
      outputs = sp.createTransaction(spUtxos, outputs) as CoinSelectOutput[];
    }

    sequence = sequence || AbstractHDElectrumWallet.defaultRBFSequence;
    let psbt = new bitcoin.Psbt();
    let c = 0;
    const keypairs: Record<number, ECPairInterface> = {};
    const values: Record<number, number> = {};

    inputs.forEach(input => {
      let keyPair;
      if (!skipSigning) {
        // skiping signing related stuff
        keyPair = ECPair.fromWIF(this._getWifForAddress(String(input.address)));
        keypairs[c] = keyPair;
      }
      values[c] = input.value;
      c++;
      if (!skipSigning) {
        // skiping signing related stuff
        if (!input.address || !this._getWifForAddress(input.address)) throw new Error('Internal error: no address or WIF to sign input');
      }

      let masterFingerprintBuffer;
      if (masterFingerprint) {
        let masterFingerprintHex = Number(masterFingerprint).toString(16);
        if (masterFingerprintHex.length < 8) masterFingerprintHex = '0' + masterFingerprintHex; // conversion without explicit zero might result in lost byte
        const hexBuffer = Buffer.from(masterFingerprintHex, 'hex');
        masterFingerprintBuffer = Buffer.from(hexBuffer).reverse();
      } else {
        masterFingerprintBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      }
      // this is not correct fingerprint, as we dont know real fingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub

      psbt = this._addPsbtInput(psbt, input, sequence, masterFingerprintBuffer);
    });

    outputs.forEach(output => {
      // if output has no address - this is change output or a custom script output
      let change = false;
      // @ts-ignore
      if (!output.address && !output.script?.hex) {
        change = true;
        output.address = changeAddress;
      }

      const path = this._getDerivationPathByAddress(String(output.address));
      const pubkey = this._getPubkeyByAddress(String(output.address));
      let masterFingerprintBuffer;

      if (masterFingerprint) {
        let masterFingerprintHex = Number(masterFingerprint).toString(16);
        if (masterFingerprintHex.length < 8) masterFingerprintHex = '0' + masterFingerprintHex; // conversion without explicit zero might result in lost byte
        const hexBuffer = Buffer.from(masterFingerprintHex, 'hex');
        masterFingerprintBuffer = Buffer.from(hexBuffer).reverse();
      } else {
        masterFingerprintBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      }

      // this is not correct fingerprint, as we dont know realfingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub

      if (output.address?.startsWith('PM')) {
        // ok its BIP47 payment code, so we need to unwrap a joint address for the receiver and use it instead:
        output.address = this._getNextFreePaymentCodeAddressSend(output.address);
        // ^^^ trusting that notification transaction is in place
      }

      psbt.addOutput({
        address: output.address,
        // @ts-ignore types from bitcoinjs are not exported so we cant define outputData separately and add fields conditionally (either address or script should be present)
        script: output.script?.hex ? Buffer.from(output.script.hex, 'hex') : undefined,
        value: output.value,
        bip32Derivation:
          change && path && pubkey
            ? [
                {
                  masterFingerprint: masterFingerprintBuffer,
                  path,
                  pubkey,
                },
              ]
            : [],
      });
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

  _addPsbtInput(psbt: Psbt, input: CoinSelectReturnInput, sequence: number, masterFingerprintBuffer: Buffer) {
    if (!input.address) {
      throw new Error('Internal error: no address on Utxo during _addPsbtInput()');
    }
    const pubkey = this._getPubkeyByAddress(input.address);
    const path = this._getDerivationPathByAddress(input.address);
    if (!pubkey || !path) {
      throw new Error('Internal error: pubkey or path are invalid');
    }
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
    if (!p2wpkh.output) {
      throw new Error('Internal error: could not create p2wpkh output during _addPsbtInput');
    }

    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence,
      bip32Derivation: [
        {
          masterFingerprint: masterFingerprintBuffer,
          path,
          pubkey,
        },
      ],
      witnessUtxo: {
        script: p2wpkh.output,
        value: input.value,
      },
    });

    return psbt;
  }

  /**
   * Combines 2 PSBTs into final transaction from which you can
   * get HEX and broadcast
   *
   * @param base64one {string|Psbt}
   * @param base64two {string|Psbt}
   * @returns {Transaction}
   */
  combinePsbt(base64one: string | Psbt, base64two: string | Psbt) {
    const final1 = typeof base64one === 'string' ? bitcoin.Psbt.fromBase64(base64one) : base64one;
    const final2 = typeof base64two === 'string' ? bitcoin.Psbt.fromBase64(base64two) : base64two;
    final1.combine(final2);

    let extractedTransaction;
    try {
      extractedTransaction = final1.finalizeAllInputs().extractTransaction();
    } catch (_) {
      // probably already finalized
      extractedTransaction = final1.extractTransaction();
    }

    return extractedTransaction;
  }

  /**
   * Creates Segwit Bech32 Bitcoin address
   */
  _nodeToBech32SegwitAddress(hdNode: BIP32Interface): string {
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: hdNode.publicKey,
    });

    if (!address) {
      throw new Error('Could not create address in _nodeToBech32SegwitAddress');
    }

    return address;
  }

  _nodeToLegacyAddress(hdNode: BIP32Interface): string {
    const { address } = bitcoin.payments.p2pkh({
      pubkey: hdNode.publicKey,
    });

    if (!address) {
      throw new Error('Could not create address in _nodeToLegacyAddress');
    }

    return address;
  }

  /**
   * Creates Segwit P2SH Bitcoin address
   */
  _nodeToP2shSegwitAddress(hdNode: BIP32Interface): string {
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: hdNode.publicKey }),
    });

    if (!address) {
      throw new Error('Could not create address in _nodeToP2shSegwitAddress');
    }

    return address;
  }

  static _getTransactionsFromHistories(histories: Record<string, ElectrumHistory[]>) {
    const txs = [];
    for (const history of Object.values(histories)) {
      for (const tx of history) {
        txs.push(tx);
      }
    }
    return txs;
  }

  /**
   * Probes zero address in external hierarchy for transactions, if there are any returns TRUE.
   * Zero address is a pretty good indicator, since its a first one to fund the wallet.
   * Q: How can you use the wallet and not fund it first?
   * A: You can if it is a BIP47 wallet!
   *
   * @returns {Promise<boolean>}
   */
  async wasEverUsed(): Promise<boolean> {
    const txs1 = await BlueElectrum.getTransactionsByAddress(this._getExternalAddressByIndex(0));
    if (txs1.length > 0) {
      return true;
    }
    if (!this.allowBIP47()) {
      return false;
    }
    try {
      // watch-only wallet will throw an error here
      this.getDerivationPath();
    } catch (_) {
      return false;
    }
    // only check BIP47 if derivation path is regular, otherwise too many wallets will be found
    if (!["m/84'/0'/0'", "m/44'/0'/0'", "m/49'/0'/0'"].includes(this.getDerivationPath() as string)) {
      return false;
    }

    const bip47_instance = this.getBIP47FromSeed();
    const address = bip47_instance.getNotificationAddress();
    const txs2 = await BlueElectrum.getTransactionsByAddress(address);
    return txs2.length > 0;
  }

  /**
   * @inheritDoc
   */
  getAllExternalAddresses() {
    const ret = [];

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      ret.push(this._getExternalAddressByIndex(c));
    }

    if (this.allowBIP47() && this.isBIP47Enabled()) {
      // returning BIP47 joint addresses with everyone who can pay us because they are kinda our 'external' aka 'receive' addresses

      for (const pc of this._receive_payment_codes) {
        for (let c = 0; c < this._getNextFreePaymentCodeIndexReceive(pc) + this.gap_limit / 4; c++) {
          //  ^^^ not full gap limit to reduce computation (theoretically, there should not be gaps at all)
          ret.push(this._getBIP47AddressReceive(pc, c));
        }
      }
    }

    return ret;
  }

  /**
   * Check if address is a Change address. Needed for Coin control.
   *
   * @param address
   * @returns {Boolean} Either address is a change or not
   */
  addressIsChange(address: string) {
    for (let c = 0; c < this.next_free_change_address_index + 1; c++) {
      if (address === this._getInternalAddressByIndex(c)) return true;
    }
    return false;
  }

  calculateHowManySignaturesWeHaveFromPsbt(psbt: Psbt) {
    let sigsHave = 0;
    for (const inp of psbt.data.inputs) {
      if (inp.finalScriptSig || inp.finalScriptWitness || inp.partialSig) sigsHave++;
    }
    return sigsHave;
  }

  /**
   * Tries to signs passed psbt object (by reference). If there are enough signatures - tries to finalize psbt
   * and returns Transaction (ready to extract hex)
   *
   * @param psbt {Psbt}
   * @returns {{ tx: Transaction }}
   */
  cosignPsbt(psbt: Psbt) {
    const seed = this._getSeed();
    const hdRoot = bip32.fromSeed(seed);

    for (let cc = 0; cc < psbt.inputCount; cc++) {
      try {
        psbt.signInputHD(cc, hdRoot);
      } catch (e) {} // protects agains duplicate cosignings

      if (!psbt.inputHasHDKey(cc, hdRoot)) {
        for (const derivation of psbt.data.inputs[cc].bip32Derivation || []) {
          const splt = derivation.path.split('/');
          const internal = +splt[splt.length - 2];
          const index = +splt[splt.length - 1];
          const wif = this._getWIFByIndex(!!internal, index);
          if (!wif) {
            throw new Error('Internal error: cant get WIF by index during cosingPsbt');
          }
          const keyPair = ECPair.fromWIF(wif);
          try {
            psbt.signInput(cc, keyPair);
          } catch (e) {} // protects agains duplicate cosignings or if this output can't be signed with current wallet
        }
      }
    }

    let tx: BTransaction | false = false;
    if (this.calculateHowManySignaturesWeHaveFromPsbt(psbt) === psbt.inputCount) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }

    return { tx };
  }

  /**
   * @param seed {Buffer} Buffer object with seed
   * @returns {string} Hex string of fingerprint derived from mnemonics. Always has length of 8 chars and correct leading zeroes. All caps
   */
  static seedToFingerprint(seed: Buffer) {
    const root = bip32.fromSeed(seed);
    let hex = root.fingerprint.toString('hex');
    while (hex.length < 8) hex = '0' + hex; // leading zeroes
    return hex.toUpperCase();
  }

  /**
   * @param mnemonic {string}  Mnemonic phrase (12 or 24 words)
   * @returns {string} Hex fingerprint
   */
  static mnemonicToFingerprint(mnemonic: string, passphrase?: string) {
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    return AbstractHDElectrumWallet.seedToFingerprint(seed);
  }

  /**
   * @returns {string} Hex string of fingerprint derived from wallet mnemonics. Always has length of 8 chars and correct leading zeroes
   */
  getMasterFingerprintHex() {
    const seed = this._getSeed();
    return AbstractHDElectrumWallet.seedToFingerprint(seed);
  }

  /**
   * Whether BIP47 is enabled. This is per-wallet setting that can be changed, NOT a feature-flag
   * @returns boolean
   */
  isBIP47Enabled(): boolean {
    return this._enable_BIP47;
  }

  switchBIP47(value: boolean): void {
    this._enable_BIP47 = value;
  }

  getBIP47FromSeed(): BIP47Interface {
    if (!this._bip47_instance || !this._bip47_instance.getNotificationAddress) {
      this._bip47_instance = bip47.fromBip39Seed(this.secret, undefined, this.passphrase);
    }

    return this._bip47_instance;
  }

  /**
   * find and return _existing_ notification transaction for the given payment code
   * (i.e. if it exists - we notified in the past and dont need to notify again)
   */
  getBIP47NotificationTransaction(receiverPaymentCode: string): Transaction | undefined {
    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(receiverPaymentCode);
    const remoteNotificationAddress = publicBip47.getNotificationAddress();

    for (const tx of this.getTransactions()) {
      for (const output of tx.outputs) {
        if (output.scriptPubKey?.addresses?.includes(remoteNotificationAddress)) return tx;
        // ^^^ if in the past we sent a tx to his notification address - most likely that was a proper notification
        // transaction with OP_RETURN.
        // but not gona verify it here, will just trust it
      }
    }
  }

  /**
   * return BIP47 payment code of the counterparty of this transaction (someone who paid us, or someone we paid)
   * or undefined if it was a non-BIP47 transaction
   */
  getBip47CounterpartyByTxid(txid: string): string | undefined {
    const foundTx = this.getTransactions().find(tx => tx.txid === txid);
    if (foundTx) {
      return this.getBip47CounterpartyByTx(foundTx);
    }
    return undefined;
  }

  /**
   * return BIP47 payment code of the counterparty of this transaction (someone who paid us, or someone we paid)
   * or undefined if it was a non-BIP47 transaction
   */
  getBip47CounterpartyByTx(tx: Transaction): string | undefined {
    for (const pc of Object.keys(this._txs_by_payment_code_index)) {
      // iterating all payment codes

      for (const txs of Object.values(this._txs_by_payment_code_index[pc])) {
        for (const tx2 of txs) {
          if (tx2.txid === tx.txid) {
            return pc; // found it!
          }
        }
      }
    }

    // checking txs we sent to counterparties

    for (const pc of this._send_payment_codes) {
      for (const out of tx.outputs) {
        for (const address of out.scriptPubKey?.addresses ?? []) {
          if (this._addresses_by_payment_code_send[pc] && Object.values(this._addresses_by_payment_code_send[pc]).includes(address)) {
            // found it!
            return pc;
          }
        }
      }
    }

    return undefined; // found nothing
  }

  createBip47NotificationTransaction(utxos: CreateTransactionUtxo[], receiverPaymentCode: string, feeRate: number, changeAddress: string) {
    const aliceBip47 = BIP47Factory(ecc).fromBip39Seed(this.getSecret(), undefined, this.getPassphrase());
    const bobBip47 = BIP47Factory(ecc).fromPaymentCode(receiverPaymentCode);
    assert(utxos[0], 'No UTXO');
    assert(utxos[0].wif, 'No UTXO WIF');

    // constructing targets: notification address, _dummy_ payload (+potential change might be added later)

    const targetsTemp: CreateTransactionTarget[] = [];
    targetsTemp.push({
      address: bobBip47.getNotificationAddress(),
      value: 546, // minimum permissible utxo size
    });
    targetsTemp.push({
      value: 0,
      script: {
        hex: Buffer.alloc(83).toString('hex'), // no `address` here, its gonabe op_return. but we pass dummy data here with a correct size just to choose utxo
      },
    });

    // creating temp transaction so that utxo can be selected:

    const { inputs: inputsTemp } = this.createTransaction(
      utxos,
      targetsTemp,
      feeRate,
      changeAddress,
      AbstractHDElectrumWallet.defaultRBFSequence,
      false,
      0,
    );
    assert(inputsTemp?.[0]?.wif, 'inputsTemp?.[0]?.wif assert failed');

    // utxo selected. lets create op_return payload using the correct (first!) utxo and correct targets with that payload

    const keyPair = ECPair.fromWIF(inputsTemp[0].wif);
    const outputNumber = Buffer.from('00000000', 'hex');
    outputNumber.writeUInt32LE(inputsTemp[0].vout);
    const blindedPaymentCode = aliceBip47.getBlindedPaymentCode(
      bobBip47,
      keyPair.privateKey as Buffer,
      // txid is reversed, as well as output number
      Buffer.from(inputsTemp[0].txid, 'hex').reverse().toString('hex') + outputNumber.toString('hex'),
    );

    // targets:

    const targets: CreateTransactionTarget[] = [];
    targets.push({
      address: bobBip47.getNotificationAddress(),
      value: 546, // minimum permissible utxo size
    });
    targets.push({
      value: 0,
      script: {
        hex: '6a4c50' + blindedPaymentCode, // no `address` here, only script (which is OP_RETURN + data payload)
      },
    });

    // finally a transaction:

    const { tx, outputs, inputs, fee, psbt } = this.createTransaction(
      utxos,
      targets,
      feeRate,
      changeAddress,
      AbstractHDElectrumWallet.defaultRBFSequence,
      false,
      0,
    );
    assert(inputs && inputs[0] && inputs[0].wif, 'inputs && inputs[0] && inputs[0].wif assert failed');
    assert(inputs[0].txid === inputsTemp[0].txid, 'inputs[0].txid === inputsTemp[0].txid assert failed'); // making sure that no funky business happened under the hood (its supposed to stay the same)

    return { tx, inputs, outputs, fee, psbt };
  }

  getBIP47PaymentCode(): string {
    if (!this._payment_code) {
      this._payment_code = this.getBIP47FromSeed().getSerializedPaymentCode();
    }

    return this._payment_code;
  }

  getBIP47NotificationAddress(): string {
    const bip47Local = this.getBIP47FromSeed();
    return bip47Local.getNotificationAddress();
  }

  /**
   * check our notification address, and decypher all payment codes people notified us
   * about (so they can pay us)
   */
  async fetchBIP47SenderPaymentCodes(): Promise<void> {
    const bip47_instance = this.getBIP47FromSeed();
    const address = bip47_instance.getNotificationAddress();
    const histories = await BlueElectrum.multiGetHistoryByAddress([address]);
    const txHashes = histories[address].map(({ tx_hash }) => tx_hash);

    const txHexs = await BlueElectrum.multiGetTransactionByTxid(txHashes, false);
    for (const txHex of Object.values(txHexs)) {
      try {
        const paymentCode = bip47_instance.getPaymentCodeFromRawNotificationTransaction(txHex);
        if (this._receive_payment_codes.includes(paymentCode)) continue; // already have it

        // final check if PC is even valid (could've been constructed by a buggy code, and our code would crash with that):
        try {
          bip47.fromPaymentCode(paymentCode);
        } catch (_) {
          continue;
        }

        this._receive_payment_codes.push(paymentCode);
        this._next_free_payment_code_address_index_receive[paymentCode] = 0; // initialize
        this._balances_by_payment_code_index[paymentCode] = { c: 0, u: 0 };
      } catch (e) {
        // do nothing
      }
    }
  }

  /**
   * for counterparties we can pay, we sync shared addresses to find the one we havent used yet.
   * this method could benefit from rewriting in batch requests, but not necessary - its only going to be called
   * once in a while (when user decides to pay a given counterparty again)
   */
  async syncBip47ReceiversAddresses(receiverPaymentCode: string) {
    this._next_free_payment_code_address_index_send[receiverPaymentCode] =
      this._next_free_payment_code_address_index_send[receiverPaymentCode] || 0; // init

    for (let c = this._next_free_payment_code_address_index_send[receiverPaymentCode]; c < 999999; c++) {
      const address = this._getBIP47AddressSend(receiverPaymentCode, c);

      this._addresses_by_payment_code_send[receiverPaymentCode] = this._addresses_by_payment_code_send[receiverPaymentCode] || {}; // init
      this._addresses_by_payment_code_send[receiverPaymentCode][c] = address;
      const histories = await BlueElectrum.multiGetHistoryByAddress([address]);
      if (histories?.[address]?.length > 0) {
        // address is used;
        continue;
      }

      // empty address, stop here, we found our latest index and filled array with shared addresses
      this._next_free_payment_code_address_index_send[receiverPaymentCode] = c;
      break;
    }
  }

  /**
   * payment codes of people who can pay us
   */
  getBIP47SenderPaymentCodes(): string[] {
    return this._receive_payment_codes;
  }

  /**
   * payment codes of people whom we can pay
   */
  getBIP47ReceiverPaymentCodes(): string[] {
    return this._send_payment_codes;
  }

  /**
   * adding counterparty whom we can pay. trusting that notificaton transaction is in place already
   */
  addBIP47Receiver(paymentCode: string) {
    if (this._send_payment_codes.includes(paymentCode)) return; // duplicates
    this._send_payment_codes.push(paymentCode);
  }

  _hdNodeToAddress(hdNode: BIP32Interface): string {
    return this._nodeToBech32SegwitAddress(hdNode);
  }

  /**
   * returns joint addresses to receive coins with a given counterparty
   */
  _getBIP47AddressReceive(paymentCode: string, index: number): string {
    if (!this._addresses_by_payment_code_receive[paymentCode]) this._addresses_by_payment_code_receive[paymentCode] = [];

    if (this._addresses_by_payment_code_receive[paymentCode][index]) {
      return this._addresses_by_payment_code_receive[paymentCode][index];
    }

    const bip47_instance = this.getBIP47FromSeed();
    const senderBIP47_instance = bip47.fromPaymentCode(paymentCode);
    const remotePaymentNode = senderBIP47_instance.getPaymentCodeNode();
    const hdNode = bip47_instance.getPaymentWallet(remotePaymentNode, index);
    const address = this._hdNodeToAddress(hdNode);
    this._address_to_wif_cache[address] = hdNode.toWIF();
    this._addresses_by_payment_code_receive[paymentCode][index] = address;
    return address;
  }

  /**
   * returns joint addresses to send coins to
   */
  _getBIP47AddressSend(paymentCode: string, index: number): string {
    if (!this._addresses_by_payment_code_send[paymentCode]) this._addresses_by_payment_code_send[paymentCode] = [];

    if (this._addresses_by_payment_code_send[paymentCode][index]) {
      // cache hit
      return this._addresses_by_payment_code_send[paymentCode][index];
    }

    const hdNode = this.getBIP47FromSeed().getReceiveWallet(BIP47Factory(ecc).fromPaymentCode(paymentCode).getPaymentCodeNode(), index);
    const address = this._hdNodeToAddress(hdNode);
    this._addresses_by_payment_code_send[paymentCode][index] = address;
    return address;
  }

  _getNextFreePaymentCodeIndexReceive(paymentCode: string) {
    return this._next_free_payment_code_address_index_receive[paymentCode] || 0;
  }

  /**
   * when sending funds to a payee, this method will return next unused joint address for him.
   * this method assumes that we synced our payee via `syncBip47ReceiversAddresses()`
   */
  _getNextFreePaymentCodeAddressSend(paymentCode: string) {
    this._next_free_payment_code_address_index_send[paymentCode] = this._next_free_payment_code_address_index_send[paymentCode] || 0;
    return this._getBIP47AddressSend(paymentCode, this._next_free_payment_code_address_index_send[paymentCode]);
  }

  _getBalancesByPaymentCodeIndex(paymentCode: string): BalanceByIndex {
    return this._balances_by_payment_code_index[paymentCode] || { c: 0, u: 0 };
  }

  _getBIP47WIF(paymentCode: string, index: number): string {
    const bip47_instance = this.getBIP47FromSeed();
    const senderBIP47_instance = bip47.fromPaymentCode(paymentCode);
    const remotePaymentNode = senderBIP47_instance.getPaymentCodeNode();
    const hdNode = bip47_instance.getPaymentWallet(remotePaymentNode, index);
    return hdNode.toWIF();
  }

  _getBIP47PubkeyByIndex(paymentCode: string, index: number): Buffer {
    const bip47_instance = this.getBIP47FromSeed();
    const senderBIP47_instance = bip47.fromPaymentCode(paymentCode);
    const remotePaymentNode = senderBIP47_instance.getPaymentCodeNode();
    const hdNode = bip47_instance.getPaymentWallet(remotePaymentNode, index);
    return hdNode.publicKey;
  }
}
