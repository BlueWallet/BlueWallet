import BigNumber from 'bignumber.js';
import bitcoinMessage from 'bitcoinjs-message';
import { randomBytes } from '../rng';
import { AbstractWallet } from './abstract-wallet';
import { HDSegwitBech32Wallet } from '..';
import * as bitcoin from 'bitcoinjs-lib';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import coinSelect, { CoinSelectOutput, CoinselectReturnInput, CoinSelectTarget, CoinselectUtxo } from 'coinselect';
import coinSelectSplit from 'coinselect/split';
import { CreateTransactionResult, CreateTransactionUtxo, Transaction, Utxo } from './types';
import { ECPairAPI, ECPairFactory, Signer } from 'ecpair';

const ecc = require('tiny-secp256k1');
const ECPair: ECPairAPI = ECPairFactory(ecc);

/**
 *  Has private key and single address like "1ABCD....."
 *  (legacy P2PKH compressed)
 */
export class LegacyWallet extends AbstractWallet {
  static type = 'legacy';
  static typeReadable = 'Legacy (P2PKH)';

  _txs_by_external_index: Transaction[] = []; // eslint-disable-line camelcase
  _txs_by_internal_index: Transaction[] = []; // eslint-disable-line camelcase

  /**
   * Simple function which says that we havent tried to fetch balance
   * for a long time
   *
   * @return {boolean}
   */
  timeToRefreshBalance(): boolean {
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
  timeToRefreshTransaction(): boolean {
    for (const tx of this.getTransactions()) {
      if ((tx.confirmations ?? 0) < 7 && this._lastTxFetch < +new Date() - 5 * 60 * 1000) {
        return true;
      }
    }
    return false;
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(32);
    this.secret = ECPair.makeRandom({ rng: () => buf }).toWIF();
  }

  async generateFromEntropy(user: Buffer): Promise<void> {
    let i = 0;
    do {
      i += 1;
      const random = await randomBytes(user.length < 32 ? 32 - user.length : 0);
      const buf = Buffer.concat([user, random], 32);
      try {
        this.secret = ECPair.fromPrivateKey(buf).toWIF();
        return;
      } catch (e) {
        if (i === 5) throw e;
      }
    } while (true);
  }

  /**
   *
   * @returns {string}
   */
  getAddress(): string | false {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = ECPair.fromWIF(this.secret);
      address = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
      }).address;
    } catch (err) {
      return false;
    }
    this._address = address ?? false;

    return this._address;
  }

  /**
   * @inheritDoc
   */
  getAllExternalAddresses(): string[] {
    const address = this.getAddress();

    return address ? [address] : [];
  }

  /**
   * Fetches balance of the Wallet via API.
   * Returns VOID. Get the actual balance via getter.
   *
   * @returns {Promise.<void>}
   */
  async fetchBalance(): Promise<void> {
    try {
      const address = this.getAddress();
      if (!address) throw new Error('LegacyWallet: Invalid address');
      const balance = await BlueElectrum.getBalanceByAddress(address);
      this.balance = Number(balance.confirmed);
      this.unconfirmed_balance = Number(balance.unconfirmed);
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
  async fetchUtxo(): Promise<void> {
    try {
      const address = this.getAddress();
      if (!address) throw new Error('LegacyWallet: Invalid address');
      const utxos = await BlueElectrum.multiGetUtxoByAddress([address]);
      this.utxo = [];
      for (const arr of Object.values(utxos)) {
        this.utxo = this.utxo.concat(arr);
      }

      // now we need to fetch txhash for each input as required by PSBT
      if (LegacyWallet.type !== this.type) return; // but only for LEGACY single-address wallets
      const txhexes = await BlueElectrum.multiGetTransactionByTxid(
        this.utxo.map(u => u.txId),
        50,
        false,
      );

      const newUtxos = [];
      for (const u of this.utxo) {
        if (txhexes[u.txId]) u.txhex = txhexes[u.txId];
        newUtxos.push(u);
      }

      this.utxo = newUtxos;
    } catch (Error) {
      console.warn(Error);
    }
  }

  /**
   * Getter for previously fetched UTXO. For example:
   *     [ { height: 0,
   *    value: 666,
   *    address: 'string',
   *    txId: 'string',
   *    vout: 1,
   *    txid: 'string',
   *    amount: 666,
   *    wif: 'string',
   *    confirmations: 0 } ]
   *
   * @param respectFrozen {boolean} Add Frozen outputs
   * @returns {[]}
   */
  getUtxo(respectFrozen = false): Utxo[] {
    let ret: Utxo[] = [];
    for (const u of this.utxo) {
      if (u.txId) u.txid = u.txId;
      if (!u.confirmations && u.height) u.confirmations = BlueElectrum.estimateCurrentBlockheight() - u.height;
      ret.push(u);
    }

    if (ret.length === 0) {
      ret = this.getDerivedUtxoFromOurTransaction(); // oy vey, no stored utxo. lets attempt to derive it from stored transactions
    }

    if (!respectFrozen) {
      ret = ret.filter(({ txid, vout }) => !txid || !this.getUTXOMetadata(txid, vout).frozen);
    }
    return ret;
  }

  getDerivedUtxoFromOurTransaction(returnSpentUtxoAsWell = false): Utxo[] {
    const utxos: Utxo[] = [];

    const ownedAddressesHashmap: Record<string, boolean> = {};
    const address = this.getAddress();
    if (address) ownedAddressesHashmap[address] = true;

    /**
     * below copypasted from
     * @see AbstractHDElectrumWallet.getDerivedUtxoFromOurTransaction
     */

    for (const tx of this.getTransactions()) {
      for (const output of tx.outputs) {
        let address: string | false = false;
        if (output.scriptPubKey && output.scriptPubKey.addresses && output.scriptPubKey.addresses[0]) {
          address = output.scriptPubKey.addresses[0];
        }
        if (address && ownedAddressesHashmap[address]) {
          const value = new BigNumber(output.value).multipliedBy(100000000).toNumber();
          utxos.push({
            txid: tx.txid,
            txId: tx.txid,
            vout: output.n,
            address,
            value,
            amount: value,
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
        ret.push(utxo);
      }
    }

    return ret;
  }

  /**
   * Fetches transactions via Electrum. Returns VOID.
   * Use getter to get the actual list.   *
   * @see AbstractHDElectrumWallet.fetchTransactions()
   *
   * @return {Promise.<void>}
   */
  async fetchTransactions(): Promise<void> {
    // Below is a simplified copypaste from HD electrum wallet
    const _txsByExternalIndex: Transaction[] = [];
    const address = this.getAddress();
    const addresses2fetch = address ? [address] : [];

    // first: batch fetch for all addresses histories
    const histories = await BlueElectrum.multiGetHistoryByAddress(addresses2fetch);
    const txs: Record<
      string,
      {
        tx_hash: string; // eslint-disable-line camelcase
        height: number;
        address: string;
      }
    > = {};
    for (const history of Object.values(histories)) {
      for (const tx of history) {
        txs[tx.tx_hash] = tx;
      }
    }

    if (this.getTransactions().length === 0 && Object.values(txs).length > 1000)
      throw new Error('Addresses with history of > 1000 transactions are not supported');
    // we check existing transactions, so if there are any then user is just using his wallet and gradually reaching the theshold, which
    // is safe because in that case our cache is filled

    // next, batch fetching each txid we got
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(Object.keys(txs));
    const transactions = Object.values(txdatas);

    // now, tricky part. we collect all transactions from inputs (vin), and batch fetch them too.
    // then we combine all this data (we need inputs to see source addresses and amounts)
    const vinTxids = [];
    for (const txdata of transactions) {
      for (const vin of txdata.vin) {
        vinTxids.push(vin.txid);
      }
    }
    const vintxdatas = await BlueElectrum.multiGetTransactionByTxid(vinTxids);

    // fetched all transactions from our inputs. now we need to combine it.
    // iterating all _our_ transactions:
    const transactionsWithInputValue = transactions.map(tx => {
      return {
        ...tx,
        vin: tx.vin.map(vin => {
          const inpTxid = vin.txid;
          const inpVout = vin.vout;
          // got txid and output number of _previous_ transaction we shoud look into

          if (vintxdatas[inpTxid] && vintxdatas[inpTxid].vout[inpVout]) {
            return {
              ...vin,
              addresses: vintxdatas[inpTxid].vout[inpVout].scriptPubKey.addresses,
              value: vintxdatas[inpTxid].vout[inpVout].value,
            };
          } else {
            return vin;
          }
        }),
      };
    });

    // now, we need to put transactions in all relevant `cells` of internal hashmaps: this.transactions_by_internal_index && this.transactions_by_external_index

    for (const tx of transactionsWithInputValue) {
      for (const vin of tx.vin) {
        if ('addresses' in vin && vin.addresses && vin.addresses.indexOf(address || '') !== -1) {
          // this TX is related to our address
          const { vin, vout, ...txRest } = tx;
          const clonedTx: Transaction = {
            ...txRest,
            inputs: [...vin],
            outputs: [...vout],
          };

          _txsByExternalIndex.push(clonedTx);
        }
      }
      for (const vout of tx.vout) {
        if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.indexOf(address || '') !== -1) {
          // this TX is related to our address
          const { vin, vout, ...txRest } = tx;
          const clonedTx: Transaction = {
            ...txRest,
            inputs: [...vin],
            outputs: [...vout],
          };

          _txsByExternalIndex.push(clonedTx);
        }
      }
    }

    this._txs_by_external_index = _txsByExternalIndex;
    this._lastTxFetch = +new Date();
  }

  getTransactions(): Transaction[] {
    // a hacky code reuse from electrum HD wallet:
    this._txs_by_external_index = this._txs_by_external_index || [];
    this._txs_by_internal_index = [];

    const hd = new HDSegwitBech32Wallet();
    return hd.getTransactions.apply(this);
  }

  /**
   * Broadcast txhex. Can throw an exception if failed
   *
   * @param {String} txhex
   * @returns {Promise<boolean>}
   */
  async broadcastTx(txhex: string): Promise<boolean> {
    const broadcast = await BlueElectrum.broadcastV2(txhex);
    console.log({ broadcast });
    if (broadcast.indexOf('successfully') !== -1) return true;
    return broadcast.length === 64; // this means return string is txid (precise length), so it was broadcasted ok
  }

  coinselect(
    utxos: CoinselectUtxo[],
    targets: CoinSelectTarget[],
    feeRate: number,
    changeAddress: string,
  ): {
    inputs: CoinselectReturnInput[];
    outputs: CoinSelectOutput[];
    fee: number;
  } {
    if (!changeAddress) throw new Error('No change address provided');

    let algo = coinSelect;
    // if targets has output without a value, we want send MAX to it
    if (targets.some(i => !('value' in i))) {
      algo = coinSelectSplit;
    }

    const { inputs, outputs, fee } = algo(utxos, targets, feeRate);

    // .inputs and .outputs will be undefined if no solution was found
    if (!inputs || !outputs) {
      throw new Error('Not enough balance. Try sending smaller amount or decrease the fee.');
    }

    return { inputs, outputs, fee };
  }

  /**
   *
   * @param utxos {Array.<{vout: Number, value: Number, txId: String, address: String, txhex: String, }>} List of spendable utxos
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
    targets: CoinSelectTarget[],
    feeRate: number,
    changeAddress: string,
    sequence: number,
    skipSigning = false,
    masterFingerprint: number,
  ): CreateTransactionResult {
    if (targets.length === 0) throw new Error('No destination provided');
    const { inputs, outputs, fee } = this.coinselect(utxos, targets, feeRate, changeAddress);
    sequence = sequence || 0xffffffff; // disable RBF by default
    const psbt = new bitcoin.Psbt();
    let c = 0;
    const values: Record<number, number> = {};
    let keyPair: Signer | null = null;

    inputs.forEach(input => {
      if (!skipSigning) {
        // skiping signing related stuff
        keyPair = ECPair.fromWIF(this.secret); // secret is WIF
      }
      values[c] = input.value;
      c++;

      if (!input.txhex) throw new Error('UTXO is missing txhex of the input, which is required by PSBT for non-segwit input');

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        // non-segwit inputs now require passing the whole previous tx as Buffer
        nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
      });
    });

    const sanitizedOutputs = outputs.map(output => ({
      ...output,
      // if output has no address - this is change output
      address: output.address ?? changeAddress,
    }));

    sanitizedOutputs.forEach(output => {
      const outputData = {
        address: output.address,
        value: output.value,
      };

      psbt.addOutput(outputData);
    });

    if (!skipSigning && keyPair) {
      // skiping signing related stuff
      for (let cc = 0; cc < c; cc++) {
        psbt.signInput(cc, keyPair);
      }
    }

    let tx;
    if (!skipSigning) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }
    return { tx, inputs, outputs: sanitizedOutputs, fee, psbt };
  }

  getLatestTransactionTime(): string | 0 {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = 0;
    for (const tx of this.getTransactions()) {
      max = Math.max(new Date(tx.received ?? 0).getTime(), max);
    }
    return new Date(max).toString();
  }

  /**
   * Validates any address, including legacy, p2sh and bech32
   *
   * p2tr addresses have extra logic, rejecting all versions >1
   * @see https://github.com/BlueWallet/BlueWallet/issues/3394
   * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/1750
   * @see https://github.com/bitcoin/bips/blob/edffe529056f6dfd33d8f716fb871467c3c09263/bip-0350.mediawiki#Addresses_for_segregated_witness_outputs
   *
   * @param address
   * @returns {boolean}
   */
  isAddressValid(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address); // throws, no?

      if (!address.toLowerCase().startsWith('bc1')) return true;
      const decoded = bitcoin.address.fromBech32(address);
      if (decoded.version === 0) return true;
      if (decoded.version === 1 && decoded.data.length !== 32) return false;
      if (decoded.version === 1 && !ecc.isPoint(Buffer.concat([Buffer.from([2]), decoded.data]))) return false;
      if (decoded.version > 1) return false;
      // ^^^ some day, when versions above 1 will be actually utilized, we would need to unhardcode this
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
  static scriptPubKeyToAddress(scriptPubKey: string): string | false {
    try {
      const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
      return (
        bitcoin.payments.p2pkh({
          output: scriptPubKey2,
          network: bitcoin.networks.bitcoin,
        }).address ?? false
      );
    } catch (_) {
      return false;
    }
  }

  weOwnAddress(address: string): boolean {
    if (!address) return false;
    let cleanAddress = address;

    if (this.segwitType === 'p2wpkh') {
      cleanAddress = address.toLowerCase();
    }

    return this.getAddress() === cleanAddress || this._address === cleanAddress;
  }

  weOwnTransaction(txid: string): boolean {
    for (const tx of this.getTransactions()) {
      if (tx && tx.txid && tx.txid === txid) return true;
    }

    return false;
  }

  allowSignVerifyMessage(): boolean {
    return true;
  }

  /**
   * Check if address is a Change address. Needed for Coin control.
   * Useless for Legacy wallets, so it is always false
   *
   * @param address
   * @returns {Boolean} Either address is a change or not
   */
  addressIsChange(address: string): boolean {
    return false;
  }

  /**
   * Finds WIF corresponding to address and returns it
   *
   * @param address {string} Address that belongs to this wallet
   * @returns {string|false} WIF or false
   */
  _getWIFbyAddress(address: string): string | false {
    return this.getAddress() === address ? this.secret : false;
  }

  /**
   * Signes text message using address private key and returs signature
   *
   * @param message {string}
   * @param address {string}
   * @returns {string} base64 encoded signature
   */
  signMessage(message: string, address: string, useSegwit = true): string {
    const wif = this._getWIFbyAddress(address);
    if (!wif) throw new Error('Invalid address');
    const keyPair = ECPair.fromWIF(wif);
    const privateKey = keyPair.privateKey;
    if (!privateKey) throw new Error('Invalid private key');
    const options = this.segwitType && useSegwit ? { segwitType: this.segwitType } : undefined;
    const signature = bitcoinMessage.sign(message, privateKey, keyPair.compressed, options);
    return signature.toString('base64');
  }

  /**
   * Verifies text message signature by address
   *
   * @param message {string}
   * @param address {string}
   * @param signature {string}
   * @returns {boolean} base64 encoded signature
   */
  verifyMessage(message: string, address: string, signature: string): boolean {
    // undefined, true so it can verify Electrum signatures without errors
    try {
      return bitcoinMessage.verify(message, address, signature, undefined, true);
    } catch (e: any) {
      if (e.message === 'checkSegwitAlways can only be used with a compressed pubkey signature flagbyte') {
        // If message created with uncompressed private key, it will throw this error
        // in this case we should re-try with checkSegwitAlways flag off
        // node_modules/bitcoinjs-message/index.js:187
        return bitcoinMessage.verify(message, address, signature);
      }
      throw e;
    }
  }

  /**
   * Probes address for transactions, if there are any returns TRUE
   *
   * @returns {Promise<boolean>}
   */
  async wasEverUsed(): Promise<boolean> {
    const address = this.getAddress();
    if (!address) return Promise.resolve(false);
    const txs = await BlueElectrum.getTransactionsByAddress(address);
    return txs.length > 0;
  }
}
