import { HDSegwitBech32Wallet, SegwitBech32Wallet } from './';
const bitcoin = require('bitcoinjs5');
const BlueElectrum = require('../BlueElectrum');
const reverse = require('buffer-reverse');
const BigNumber = require('bignumber.js');

/**
 * Represents transaction of a BIP84 wallet.
 * Helpers for RBF, CPFP etc.
 */
export class HDSegwitBech32Transaction {
  /**
   * @param txhex string Object initialized with txhex
   * @param wallet {HDSegwitBech32Wallet} If set - a wallet object to which transacton belongs
   */
  constructor(txhex, wallet) {
    this._txhex = txhex;

    if (wallet) {
      if (wallet.type === HDSegwitBech32Wallet.type) {
        /** @type {HDSegwitBech32Wallet} */
        this._wallet = wallet;
      } else {
        throw new Error('Only HD Bech32 wallets supported');
      }
    }

    this._txDecoded = bitcoin.Transaction.fromHex(this._txhex);
    this._remoteTx = null;
  }

  /**
   * Returns max used sequence for this transaction. Next RBF transaction
   * should have this sequence + 1
   *
   * @returns {number}
   */
  getMaxUsedSequence() {
    let max = 0;
    for (let inp of this._txDecoded.ins) {
      max = Math.max(inp.sequence, max);
    }

    return max;
  }

  /**
   * Basic check that Sequence num for this TX is replaceable
   *
   * @returns {boolean}
   */
  isSequenceReplaceable() {
    return this.getMaxUsedSequence() < bitcoin.Transaction.DEFAULT_SEQUENCE;
  }

  /**
   * If internal extended tx data not set - this is a method
   * to fetch and set this data from electrum
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRemoteTx() {
    let result = await BlueElectrum.multiGetTransactionByTxid([this._txDecoded.getId()]);
    this._remoteTx = Object.values(result)[0];
  }

  /**
   * Fetches from electrum actual confirmations number for this tx
   *
   * @returns {Promise<Number>}
   */
  async getRemoteConfirmationsNum() {
    if (!this._remoteTx) await this._fetchRemoteTx();
    return this._remoteTx.confirmations;
  }

  /**
   * Checks that tx belongs to a wallet and also
   * tx value is < 0, which means its a spending transaction
   * definately initiated by us.
   *
   * @returns {Promise<boolean>}
   */
  async isOurTransaction() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    let found = false;
    for (let tx of this._wallet.getTransactions()) {
      if (tx.txid === this._txDecoded.getId()) {
        // its our transaction, and its spending transaction, which means we initiated it
        if (tx.value < 0) found = true;
      }
    }
    return found;
  }

  async getInfo() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();

    let prevInputs = [];
    for (let inp of this._txDecoded.ins) {
      let reversedHash = Buffer.from(reverse(inp.hash));
      reversedHash = reversedHash.toString('hex');
      prevInputs.push(reversedHash);
    }

    let prevTransactions = await BlueElectrum.multiGetTransactionByTxid(prevInputs);

    // fetched, now lets count how much satoshis went in
    let wentIn = 0;
    let utxos = [];
    for (let inp of this._txDecoded.ins) {
      let reversedHash = Buffer.from(reverse(inp.hash));
      reversedHash = reversedHash.toString('hex');
      if (prevTransactions[reversedHash] && prevTransactions[reversedHash].vout && prevTransactions[reversedHash].vout[inp.index]) {
        let value = prevTransactions[reversedHash].vout[inp.index].value;
        value = new BigNumber(value).multipliedBy(100000000).toNumber();
        wentIn += value;
        let address = SegwitBech32Wallet.witnessToAddress(inp.witness[inp.witness.length - 1]);
        utxos.push({ vout: inp.index, value: value, txId: reversedHash, address: address });
      }
    }

    // counting how much went into actual outputs

    let wasSpent = 0;
    for (let outp of this._txDecoded.outs) {
      wasSpent += +outp.value;
    }

    let fee = wentIn - wasSpent;
    let feeRate = Math.floor(fee / (this._txhex.length / 2));

    // lets take a look at change
    let changeAmount = 0;
    let targets = [];
    for (let outp of this._remoteTx.vout) {
      let address = outp.scriptPubKey.addresses[0];
      let value = new BigNumber(outp.value).multipliedBy(100000000).toNumber();
      if (this._wallet.weOwnAddress(address)) {
        changeAmount += value;
      } else {
        // this is target
        targets.push({ value: value, address: address });
      }
    }

    return { fee, feeRate, targets, changeAmount, utxos };

    // this means...
    // let maxPossibleFee = fee + changeAmount;
    // let maxPossibleFeeRate = Math.floor(maxPossibleFee / (this._txhex.length / 2));
    // console.warn({maxPossibleFeeRate});
  }

  /**
   * Checks if tx has single output and that output belongs to us - that
   * means we already canceled this tx and we can only bump fees. Or plain all outputs belong to us.
   * @returns {boolean}
   */
  canCancelTx() {
    if (!this._wallet) throw new Error('Wallet required for this method');

    // if theres at least one output we dont own - we can cancel this transaction!
    for (let outp of this._txDecoded.outs) {
      if (!this._wallet.weOwnAddress(SegwitBech32Wallet.scriptPubKeyToAddress(outp.script))) return true;
    }

    return false;
  }

  /**
   * @param newFeerate
   * @returns {Promise<{outputs: Array, tx: HDSegwitBech32Transaction, inputs: Array, fee: Number}>}
   */
  async createRBFcancelTx(newFeerate) {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();

    let { feeRate, utxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    let myAddress = await this._wallet.getChangeAddressAsync();

    return this._wallet.createTransaction(
      utxos,
      [{ address: myAddress }],
      newFeerate,
      /* meaningless in this context */ myAddress,
      this.getMaxUsedSequence() + 1,
    );
  }

  /**
   * @param newFeerate
   * @returns {Promise<{outputs: Array, tx: HDSegwitBech32Transaction, inputs: Array, fee: Number}>}
   */
  async createRBFbumpFee(newFeerate) {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();

    let { feeRate, targets, utxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    let myAddress = await this._wallet.getChangeAddressAsync();

    return this._wallet.createTransaction(utxos, targets, newFeerate, myAddress, this.getMaxUsedSequence() + 1);
  }
}
