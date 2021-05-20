import BigNumber from 'bignumber.js';
import bitcoinMessage from 'bitcoinjs-message';
import { randomBytes } from '../rng';
import { AbstractWallet } from './abstract-wallet';
import { HDSegwitBech32Wallet } from '..';
const bitcoin = require('bitcoinjs-lib');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const coinSelect = require('coinselect');
const coinSelectSplit = require('coinselect/split');

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
    for (const tx of this.getTransactions()) {
      if (tx.confirmations < 7 && this._lastTxFetch < +new Date() - 5 * 60 * 1000) {
        return true;
      }
    }
    return false;
  }

  async generate() {
    const buf = await randomBytes(32);
    this.secret = bitcoin.ECPair.makeRandom({ rng: () => buf }).toWIF();
  }

  async generateFromEntropy(user) {
    let i = 0;
    do {
      i += 1;
      const random = await randomBytes(user.length < 32 ? 32 - user.length : 0);
      const buf = Buffer.concat([user, random], 32);
      try {
        this.secret = bitcoin.ECPair.fromPrivateKey(buf).toWIF();
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
  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = bitcoin.ECPair.fromWIF(this.secret);
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
   * @inheritDoc
   */
  getAllExternalAddresses() {
    return [this.getAddress()];
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
  async fetchUtxo() {
    try {
      const utxos = await BlueElectrum.multiGetUtxoByAddress([this.getAddress()]);
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
  getUtxo(respectFrozen = false) {
    let ret = [];
    for (const u of this.utxo) {
      if (u.txId) u.txid = u.txId;
      if (!u.confirmations && u.height) u.confirmations = BlueElectrum.estimateCurrentBlockheight() - u.height;
      ret.push(u);
    }

    if (ret.length === 0) {
      ret = this.getDerivedUtxoFromOurTransaction(); // oy vey, no stored utxo. lets attempt to derive it from stored transactions
    }

    if (!respectFrozen) {
      ret = ret.filter(({ txid, vout }) => !this.getUTXOMetadata(txid, vout).frozen);
    }
    return ret;
  }

  getDerivedUtxoFromOurTransaction(returnSpentUtxoAsWell = false) {
    const utxos = [];

    const ownedAddressesHashmap = {};
    ownedAddressesHashmap[this.getAddress()] = true;

    /**
     * below copypasted from
     * @see AbstractHDElectrumWallet.getDerivedUtxoFromOurTransaction
     */

    for (const tx of this.getTransactions()) {
      for (const output of tx.outputs) {
        let address = false;
        if (output.scriptPubKey && output.scriptPubKey.addresses && output.scriptPubKey.addresses[0]) {
          address = output.scriptPubKey.addresses[0];
        }
        if (ownedAddressesHashmap[address]) {
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
            height: BlueElectrum.estimateCurrentBlockheight() - tx.confirmations,
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
  async fetchTransactions() {
    // Below is a simplified copypaste from HD electrum wallet
    const _txsByExternalIndex = [];
    const addresses2fetch = [this.getAddress()];

    // first: batch fetch for all addresses histories
    const histories = await BlueElectrum.multiGetHistoryByAddress(addresses2fetch);
    const txs = {};
    for (const history of Object.values(histories)) {
      for (const tx of history) {
        txs[tx.tx_hash] = tx;
      }
    }

    // next, batch fetching each txid we got
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(Object.keys(txs));

    // now, tricky part. we collect all transactions from inputs (vin), and batch fetch them too.
    // then we combine all this data (we need inputs to see source addresses and amounts)
    const vinTxids = [];
    for (const txdata of Object.values(txdatas)) {
      for (const vin of txdata.vin) {
        vinTxids.push(vin.txid);
      }
    }
    const vintxdatas = await BlueElectrum.multiGetTransactionByTxid(vinTxids);

    // fetched all transactions from our inputs. now we need to combine it.
    // iterating all _our_ transactions:
    for (const txid of Object.keys(txdatas)) {
      // iterating all inputs our our single transaction:
      for (let inpNum = 0; inpNum < txdatas[txid].vin.length; inpNum++) {
        const inpTxid = txdatas[txid].vin[inpNum].txid;
        const inpVout = txdatas[txid].vin[inpNum].vout;
        // got txid and output number of _previous_ transaction we shoud look into
        if (vintxdatas[inpTxid] && vintxdatas[inpTxid].vout[inpVout]) {
          // extracting amount & addresses from previous output and adding it to _our_ input:
          txdatas[txid].vin[inpNum].addresses = vintxdatas[inpTxid].vout[inpVout].scriptPubKey.addresses;
          txdatas[txid].vin[inpNum].value = vintxdatas[inpTxid].vout[inpVout].value;
        }
      }
    }

    // now, we need to put transactions in all relevant `cells` of internal hashmaps: this.transactions_by_internal_index && this.transactions_by_external_index

    for (const tx of Object.values(txdatas)) {
      for (const vin of tx.vin) {
        if (vin.addresses && vin.addresses.indexOf(this.getAddress()) !== -1) {
          // this TX is related to our address
          const clonedTx = Object.assign({}, tx);
          clonedTx.inputs = tx.vin.slice(0);
          clonedTx.outputs = tx.vout.slice(0);
          delete clonedTx.vin;
          delete clonedTx.vout;

          _txsByExternalIndex.push(clonedTx);
        }
      }
      for (const vout of tx.vout) {
        if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.indexOf(this.getAddress()) !== -1) {
          // this TX is related to our address
          const clonedTx = Object.assign({}, tx);
          clonedTx.inputs = tx.vin.slice(0);
          clonedTx.outputs = tx.vout.slice(0);
          delete clonedTx.vin;
          delete clonedTx.vout;

          _txsByExternalIndex.push(clonedTx);
        }
      }
    }

    this._txs_by_external_index = _txsByExternalIndex;
    this._lastTxFetch = +new Date();
  }

  getTransactions() {
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
  async broadcastTx(txhex) {
    const broadcast = await BlueElectrum.broadcastV2(txhex);
    console.log({ broadcast });
    if (broadcast.indexOf('successfully') !== -1) return true;
    return broadcast.length === 64; // this means return string is txid (precise length), so it was broadcasted ok
  }

  coinselect(utxos, targets, feeRate, changeAddress) {
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
  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false, masterFingerprint) {
    if (targets.length === 0) throw new Error('No destination provided');
    const { inputs, outputs, fee } = this.coinselect(utxos, targets, feeRate, changeAddress);
    sequence = sequence || 0xffffffff; // disable RBF by default
    const psbt = new bitcoin.Psbt();
    let c = 0;
    const values = {};
    let keyPair;

    inputs.forEach(input => {
      if (!skipSigning) {
        // skiping signing related stuff
        keyPair = bitcoin.ECPair.fromWIF(this.secret); // secret is WIF
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

    outputs.forEach(output => {
      // if output has no address - this is change output
      if (!output.address) {
        output.address = changeAddress;
      }

      const outputData = {
        address: output.address,
        value: output.value,
      };

      psbt.addOutput(outputData);
    });

    if (!skipSigning) {
      // skiping signing related stuff
      for (let cc = 0; cc < c; cc++) {
        psbt.signInput(cc, keyPair);
      }
    }

    let tx;
    if (!skipSigning) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }
    return { tx, inputs, outputs, fee, psbt };
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
    try {
      const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
      return bitcoin.payments.p2pkh({
        output: scriptPubKey2,
        network: bitcoin.networks.bitcoin,
      }).address;
    } catch (_) {
      return false;
    }
  }

  weOwnAddress(address) {
    if (!address) return false;
    let cleanAddress = address;

    if (this.segwitType === 'p2wpkh') {
      cleanAddress = address.toLowerCase();
    }

    return this.getAddress() === cleanAddress || this._address === cleanAddress;
  }

  weOwnTransaction(txid) {
    for (const tx of this.getTransactions()) {
      if (tx && tx.txid && tx.txid === txid) return true;
    }

    return false;
  }

  allowSignVerifyMessage() {
    return true;
  }

  /**
   * Check if address is a Change address. Needed for Coin control.
   * Useless for Legacy wallets, so it is always false
   *
   * @param address
   * @returns {Boolean} Either address is a change or not
   */
  addressIsChange(address) {
    return false;
  }

  /**
   * Finds WIF corresponding to address and returns it
   *
   * @param address {string} Address that belongs to this wallet
   * @returns {string|false} WIF or false
   */
  _getWIFbyAddress(address) {
    return this.getAddress() === address ? this.secret : null;
  }

  /**
   * Signes text message using address private key and returs signature
   *
   * @param message {string}
   * @param address {string}
   * @returns {string} base64 encoded signature
   */
  signMessage(message, address, useSegwit = true) {
    const wif = this._getWIFbyAddress(address);
    if (wif === null) throw new Error('Invalid address');
    const keyPair = bitcoin.ECPair.fromWIF(wif);
    const privateKey = keyPair.privateKey;
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
  verifyMessage(message, address, signature) {
    // null, true so it can verify Electrum signatores without errors
    return bitcoinMessage.verify(message, address, signature, null, true);
  }

  /**
   * Probes address for transactions, if there are any returns TRUE
   *
   * @returns {Promise<boolean>}
   */
  async wasEverUsed() {
    const txs = await BlueElectrum.getTransactionsByAddress(this.getAddress());
    return txs.length > 0;
  }
}
