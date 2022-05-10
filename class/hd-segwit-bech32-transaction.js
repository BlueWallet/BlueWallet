import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
const bitcoin = require('bitcoinjs-lib');
const BlueElectrum = require('../blue_modules/BlueElectrum');
const reverse = require('buffer-reverse');
const BigNumber = require('bignumber.js');

/**
 * Represents transaction of a BIP84 wallet.
 * Helpers for RBF, CPFP etc.
 */
export class HDSegwitBech32Transaction {
  /**
   * @param txhex {string|null} Object is initialized with txhex
   * @param txid {string|null} If txhex not present - txid whould be present
   * @param wallet {HDSegwitBech32Wallet|null} If set - a wallet object to which transacton belongs
   */
  constructor(txhex, txid, wallet) {
    if (!txhex && !txid) throw new Error('Bad arguments');
    this._txhex = txhex;
    this._txid = txid;

    if (wallet) {
      if (wallet.type === HDSegwitBech32Wallet.type) {
        /** @type {HDSegwitBech32Wallet} */
        this._wallet = wallet;
      } else {
        throw new Error('Only HD Bech32 wallets supported');
      }
    }

    if (this._txhex) this._txDecoded = bitcoin.Transaction.fromHex(this._txhex);
    this._remoteTx = null;
  }

  /**
   * If only txid present - we fetch hex
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTxhexAndDecode() {
    const hexes = await BlueElectrum.multiGetTransactionByTxid([this._txid], 10, false);
    this._txhex = hexes[this._txid];
    if (!this._txhex) throw new Error("Transaction can't be found in mempool");
    this._txDecoded = bitcoin.Transaction.fromHex(this._txhex);
  }

  /**
   * Returns max used sequence for this transaction. Next RBF transaction
   * should have this sequence + 1
   *
   * @returns {Promise<number>}
   */
  async getMaxUsedSequence() {
    if (!this._txDecoded) await this._fetchTxhexAndDecode();

    let max = 0;
    for (const inp of this._txDecoded.ins) {
      max = Math.max(inp.sequence, max);
    }

    return max;
  }

  /**
   * Basic check that Sequence num for this TX is replaceable
   *
   * @returns {Promise<boolean>}
   */
  async isSequenceReplaceable() {
    return (await this.getMaxUsedSequence()) < bitcoin.Transaction.DEFAULT_SEQUENCE;
  }

  /**
   * If internal extended tx data not set - this is a method
   * to fetch and set this data from electrum. Its different data from
   * decoded hex - it contains confirmations etc.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRemoteTx() {
    const result = await BlueElectrum.multiGetTransactionByTxid([this._txid || this._txDecoded.getId()]);
    this._remoteTx = Object.values(result)[0];
  }

  /**
   * Fetches from electrum actual confirmations number for this tx
   *
   * @returns {Promise<Number>}
   */
  async getRemoteConfirmationsNum() {
    if (!this._remoteTx) await this._fetchRemoteTx();
    return this._remoteTx.confirmations || 0; // stupid undefined
  }

  /**
   * Checks that tx belongs to a wallet and also
   * tx value is < 0, which means its a spending transaction
   * definately initiated by us, can be RBF'ed.
   *
   * @returns {Promise<boolean>}
   */
  async isOurTransaction() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    let found = false;
    for (const tx of this._wallet.getTransactions()) {
      if (tx.txid === (this._txid || this._txDecoded.getId())) {
        // its our transaction, and its spending transaction, which means we initiated it
        if (tx.value < 0) found = true;
      }
    }
    return found;
  }

  /**
   * Checks that tx belongs to a wallet and also
   * tx value is > 0, which means its a receiving transaction and thus
   * can be CPFP'ed.
   *
   * @returns {Promise<boolean>}
   */
  async isToUsTransaction() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    let found = false;
    for (const tx of this._wallet.getTransactions()) {
      if (tx.txid === (this._txid || this._txDecoded.getId())) {
        if (tx.value > 0) found = true;
      }
    }
    return found;
  }

  /**
   * Returns all the info about current transaction which is needed to do a replacement TX
   * * fee - current tx fee
   * * utxos - UTXOs current tx consumes
   * * changeAmount - amount of satoshis that sent to change address (or addresses) we control
   * * feeRate - sat/byte for current tx
   * * targets - destination(s) of funds (outputs we do not control)
   * * unconfirmedUtxos - UTXOs created by this transaction (only the ones we control)
   *
   * @returns {Promise<{fee: number, utxos: Array, unconfirmedUtxos: Array, changeAmount: number, feeRate: number, targets: Array}>}
   */
  async getInfo() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();
    if (!this._txDecoded) await this._fetchTxhexAndDecode();

    const prevInputs = [];
    for (const inp of this._txDecoded.ins) {
      let reversedHash = Buffer.from(reverse(inp.hash));
      reversedHash = reversedHash.toString('hex');
      prevInputs.push(reversedHash);
    }

    const prevTransactions = await BlueElectrum.multiGetTransactionByTxid(prevInputs);

    // fetched, now lets count how much satoshis went in
    let wentIn = 0;
    const utxos = [];
    for (const inp of this._txDecoded.ins) {
      let reversedHash = Buffer.from(reverse(inp.hash));
      reversedHash = reversedHash.toString('hex');
      if (prevTransactions[reversedHash] && prevTransactions[reversedHash].vout && prevTransactions[reversedHash].vout[inp.index]) {
        let value = prevTransactions[reversedHash].vout[inp.index].value;
        value = new BigNumber(value).multipliedBy(100000000).toNumber();
        wentIn += value;
        const address = SegwitBech32Wallet.witnessToAddress(inp.witness[inp.witness.length - 1]);
        utxos.push({ vout: inp.index, value: value, txId: reversedHash, address: address });
      }
    }

    // counting how much went into actual outputs

    let wasSpent = 0;
    for (const outp of this._txDecoded.outs) {
      wasSpent += +outp.value;
    }

    const fee = wentIn - wasSpent;
    let feeRate = Math.floor(fee / this._txDecoded.virtualSize());
    if (feeRate === 0) feeRate = 1;

    // lets take a look at change
    let changeAmount = 0;
    const targets = [];
    for (const outp of this._remoteTx.vout) {
      const address = outp.scriptPubKey.addresses[0];
      const value = new BigNumber(outp.value).multipliedBy(100000000).toNumber();
      if (this._wallet.weOwnAddress(address)) {
        changeAmount += value;
      } else {
        // this is target
        targets.push({ value: value, address: address });
      }
    }

    // lets find outputs we own that current transaction creates. can be used in CPFP
    const unconfirmedUtxos = [];
    for (const outp of this._remoteTx.vout) {
      const address = outp.scriptPubKey.addresses[0];
      const value = new BigNumber(outp.value).multipliedBy(100000000).toNumber();
      if (this._wallet.weOwnAddress(address)) {
        unconfirmedUtxos.push({
          vout: outp.n,
          value: value,
          txId: this._txid || this._txDecoded.getId(),
          address: address,
        });
      }
    }

    return { fee, feeRate, targets, changeAmount, utxos, unconfirmedUtxos };
  }

  /**
   * We get _all_ our UTXOs (even spent kek),
   * and see if each input in this transaction's UTXO is in there. If its not there - its an unknown
   * input, we dont own it (possibly a payjoin transaction), and we cant do RBF
   *
   * @returns {Promise<boolean>}
   */
  async thereAreUnknownInputsInTx() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._txDecoded) await this._fetchTxhexAndDecode();

    const spentUtxos = this._wallet.getDerivedUtxoFromOurTransaction(true);
    for (const inp of this._txDecoded.ins) {
      const txidInUtxo = reverse(inp.hash).toString('hex');

      let found = false;
      for (const spentU of spentUtxos) {
        if (spentU.txid === txidInUtxo && spentU.vout === inp.index) found = true;
      }

      if (!found) {
        return true;
      }
    }
  }

  /**
   * Checks if all outputs belong to us, that
   * means we already canceled this tx and we can only bump fees
   *
   * @returns {Promise<boolean>}
   */
  async canCancelTx() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._txDecoded) await this._fetchTxhexAndDecode();

    if (await this.thereAreUnknownInputsInTx()) return false;

    // if theres at least one output we dont own - we can cancel this transaction!
    for (const outp of this._txDecoded.outs) {
      if (!this._wallet.weOwnAddress(SegwitBech32Wallet.scriptPubKeyToAddress(outp.script))) return true;
    }

    return false;
  }

  async canBumpTx() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._txDecoded) await this._fetchTxhexAndDecode();

    if (await this.thereAreUnknownInputsInTx()) return false;

    return true;
  }

  /**
   * Creates an RBF transaction that can replace previous one and basically cancel it (rewrite
   * output to the one our wallet controls). Note, this cannot add more utxo in RBF transaction if
   * newFeerate is too high
   *
   * @param newFeerate {number} Sat/byte. Should be greater than previous tx feerate
   * @returns {Promise<{outputs: Array, tx: Transaction, inputs: Array, fee: Number}>}
   */
  async createRBFcancelTx(newFeerate) {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();

    const { feeRate, utxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    return this._wallet.createTransaction(
      utxos,
      [{ address: myAddress }],
      newFeerate,
      /* meaningless in this context */ myAddress,
      (await this.getMaxUsedSequence()) + 1,
    );
  }

  /**
   * Creates an RBF transaction that can bumps fee of previous one. Note, this cannot add more utxo in RBF
   * transaction if newFeerate is too high
   *
   * @param newFeerate {number} Sat/byte
   * @returns {Promise<{outputs: Array, tx: Transaction, inputs: Array, fee: Number}>}
   */
  async createRBFbumpFee(newFeerate) {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();

    const { feeRate, targets, changeAmount, utxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    if (changeAmount === 0) delete targets[0].value;
    // looks like this was sendMAX transaction (because there was no change), so we cant reuse amount in this
    // target since fee wont change. removing the amount so `createTransaction` will sendMAX correctly with new feeRate

    if (targets.length === 0) {
      // looks like this was cancelled tx with single change output, so it wasnt included in `this.getInfo()` targets
      // so we add output paying ourselves:
      targets.push({ address: this._wallet._getInternalAddressByIndex(this._wallet.next_free_change_address_index) });
      // not checking emptiness on purpose: it could unpredictably generate too far address because of unconfirmed tx.
    }

    return this._wallet.createTransaction(utxos, targets, newFeerate, myAddress, (await this.getMaxUsedSequence()) + 1);
  }

  /**
   * Creates a CPFP transaction that can bumps fee of previous one (spends created but not confirmed outputs
   * that belong to us). Note, this cannot add more utxo in CPFP transaction if newFeerate is too high
   *
   * @param newFeerate {number} sat/byte
   * @returns {Promise<{outputs: Array, tx: Transaction, inputs: Array, fee: Number}>}
   */
  async createCPFPbumpFee(newFeerate) {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._remoteTx) await this._fetchRemoteTx();

    const { feeRate, fee: oldFee, unconfirmedUtxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    // calculating feerate for CPFP tx so that average between current and CPFP tx will equal newFeerate.
    // this works well if both txs are +/- equal size in bytes
    const targetFeeRate = 2 * newFeerate - feeRate;

    let add = 0;
    while (add <= 128) {
      // eslint-disable-next-line no-var
      var { tx, inputs, outputs, fee } = this._wallet.createTransaction(
        unconfirmedUtxos,
        [{ address: myAddress }],
        targetFeeRate + add,
        myAddress,
        HDSegwitBech32Wallet.defaultRBFSequence,
      );
      const combinedFeeRate = (oldFee + fee) / (this._txDecoded.virtualSize() + tx.virtualSize()); // avg
      if (Math.round(combinedFeeRate) < newFeerate) {
        add *= 2;
        if (!add) add = 2;
      } else {
        // reached target feerate
        break;
      }
    }

    return { tx, inputs, outputs, fee };
  }
}
