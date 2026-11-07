import * as bitcoin from 'bitcoinjs-lib';
import assert from 'assert';

import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { TaprootWallet } from './wallets/taproot-wallet';
import { CreateTransactionTarget, CreateTransactionUtxo } from './wallets/types.ts';
import { CoinSelectOutput, CoinSelectReturnInput } from 'coinselect';
import { isUint8Array, uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import type { ElectrumTransaction } from '../blue_modules/BlueElectrum';
import ecc from '../blue_modules/noble_ecc';

/**
 * Thrown when transaction data from Electrum server fails verification (wrong txid, invalid signature on our input etc).
 * Malicious server can show us a forged unconfirmed tx (our inputs, attacker's outputs); if we RBF it, we pay the
 * attacker. See GHSA-6jp4-8v48-cc5v (spesmilo/electrum)
 */
export class TxVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TxVerificationError';
  }
}

/**
 * Decodes raw tx hex from Electrum server and checks that it hashes to the txid we asked for. Bad copy is dropped from
 * cache (it could be saved while connected to a malicious server), so next time we fetch a fresh one
 */
async function decodeServerTx(txid: string, hex: unknown): Promise<bitcoin.Transaction> {
  try {
    assert(typeof hex === 'string', 'not a raw tx');
    const tx = bitcoin.Transaction.fromHex(hex);
    assert(tx.getId() === txid, 'txid mismatch');
    return tx;
  } catch (_) {
    await BlueElectrum.forgetCachedTransactions([txid]);
    throw new TxVerificationError('Electrum server returned a bad transaction ' + txid);
  }
}

/**
 * Checks that input is a valid p2wpkh spend of `prevOut`: signed by the key `prevOut` pays to. Forged tx (see
 * `TxVerificationError`) reuses our inputs with copied witness, but signatures dont check out against its outputs
 */
function isValidP2wpkhSpend(tx: bitcoin.Transaction, index: number, prevOut: bitcoin.TxOutput): boolean {
  try {
    if (tx.ins[index].witness.length !== 2) return false; // padded witness inflates vsize
    const [sig, pubkey] = tx.ins[index].witness;
    if (uint8ArrayToHex(bitcoin.payments.p2wpkh({ pubkey }).output!) !== uint8ArrayToHex(prevOut.script)) return false;
    const { signature, hashType } = bitcoin.script.signature.decode(sig);
    if (hashType !== bitcoin.Transaction.SIGHASH_ALL) return false; // only SIGHASH_ALL commits to all outputs
    const hash = tx.hashForWitnessV0(index, bitcoin.payments.p2pkh({ pubkey }).output!, prevOut.value, hashType);
    return ecc.verify(hash, pubkey, signature);
  } catch (_) {
    return false;
  }
}

/**
 * Represents transaction of a BIP84 wallet.
 * Helpers for RBF, CPFP etc.
 */
export class HDSegwitBech32Transaction {
  private _txhex: string | null;
  private _txid: string | null;
  private _wallet: HDSegwitBech32Wallet | undefined;
  private _txDecoded: bitcoin.Transaction | undefined;
  private _remoteTx: ElectrumTransaction | null;
  private _mfp?: number;

  /**
   * @param txhex {string|null} Object is initialized with txhex
   * @param txid {string|null} If txhex not present - txid whould be present
   * @param wallet {HDSegwitBech32Wallet|null} If set - a wallet object to which transacton belongs
   * @param mfp {number|undefined} set mfp if it is an HD Segwit Bech32 watch-only wallet
   */
  constructor(txhex: string | null, txid: string | null, wallet: HDSegwitBech32Wallet | null, mfp?: number) {
    if (!txhex && !txid) throw new Error('Bad arguments');
    this._txhex = txhex;
    this._txid = txid;

    if (mfp !== undefined) {
      this._mfp = mfp;
    }

    if (wallet) {
      if (wallet.type === HDSegwitBech32Wallet.type) {
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
    assert(this._txid, 'this._txid must be a string');
    const hexes = await BlueElectrum.multiGetTransactionByTxid([this._txid], false, 10);
    this._txhex = hexes[this._txid];
    if (!this._txhex) throw new Error("Transaction can't be found in mempool");
    this._txDecoded = await decodeServerTx(this._txid, this._txhex);
  }

  /**
   * Returns max used sequence for this transaction. Next RBF transaction
   * should have this sequence + 1
   *
   * @returns {Promise<number>}
   */
  async getMaxUsedSequence() {
    if (!this._txDecoded) await this._fetchTxhexAndDecode();
    assert(this._txDecoded, 'Could not fetch tx and decode');

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
  async _fetchRemoteTx(): Promise<ElectrumTransaction> {
    const result = await BlueElectrum.multiGetTransactionByTxid([this._txid || this._txDecoded!.getId()], true);
    const remoteTx = Object.values(result)[0];
    if (!remoteTx) throw new Error('Transaction not found on Electrum');
    this._remoteTx = remoteTx;
    return remoteTx;
  }

  /**
   * Fetches from electrum actual confirmations number for this tx
   *
   * @returns {Promise<Number>}
   */
  async getRemoteConfirmationsNum() {
    const remoteTx = this._remoteTx ?? (await this._fetchRemoteTx());
    return remoteTx.confirmations || 0; // stupid undefined
  }

  /**
   * Checks that tx belongs to a wallet and also
   * tx value is < 0, which means its a spending transaction
   * definitely initiated by us, can be RBF'ed.
   *
   * @returns {Promise<boolean>}
   */
  async isOurTransaction() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    let found = false;
    for (const tx of this._wallet.getTransactions()) {
      if (tx.txid === (this._txid || this._txDecoded!.getId())) {
        // its our transaction, and its spending transaction, which means we initiated it
        if (tx.value && tx.value < 0) found = true;
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
      if (tx.txid === (this._txid || this._txDecoded!.getId())) {
        if (tx.value && tx.value > 0) found = true;
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
    if (!this._txDecoded) await this._fetchTxhexAndDecode();
    assert(this._txDecoded, 'could not fetch tx and decode');
    const txid = this._txid || this._txDecoded.getId();

    const prevInputs = [];
    for (const inp of this._txDecoded.ins) {
      prevInputs.push(uint8ArrayToHex(new Uint8Array(inp.hash).reverse()));
    }

    // raw hexes (not server-decoded jsons), so we can check them against txids
    const prevHexes = await BlueElectrum.multiGetTransactionByTxid(prevInputs, false);
    const prevTransactions: Record<string, bitcoin.Transaction> = {};
    for (const prevTxid of prevInputs) {
      prevTransactions[prevTxid] = await decodeServerTx(prevTxid, prevHexes[prevTxid]);
    }

    // fetched, now lets count how much satoshis went in
    let wentIn = 0;
    const utxos: CreateTransactionUtxo[] = [];
    for (let i = 0; i < this._txDecoded.ins.length; i++) {
      const inp = this._txDecoded.ins[i];
      const reversedHash = uint8ArrayToHex(new Uint8Array(inp.hash).reverse());
      const prevOut = prevTransactions[reversedHash].outs[inp.index];
      if (!prevOut) throw new TxVerificationError('Previous output of an input is missing');
      const value = Number(prevOut.value);
      wentIn += value;
      const address = SegwitBech32Wallet.scriptPubKeyToAddress(uint8ArrayToHex(prevOut.script));
      if (!address || !this._wallet.weOwnAddress(address)) continue; // not our input (e.g. incoming tx), nothing to check
      if (!isValidP2wpkhSpend(this._txDecoded, i, prevOut)) {
        await BlueElectrum.forgetCachedTransactions([txid]);
        throw new TxVerificationError('Invalid signature on our input, transaction was not created by this wallet');
      }
      utxos.push({ vout: inp.index, value, txid: reversedHash, address });
    }

    // counting how much went into actual outputs

    let wasSpent = 0;
    for (const outp of this._txDecoded.outs) {
      wasSpent += Number(outp.value);
    }

    const fee = wentIn - wasSpent;
    if (fee < 0) throw new TxVerificationError('Transaction fee is negative');
    let feeRate = Math.floor(fee / this._txDecoded.virtualSize());
    if (feeRate === 0) feeRate = 1;

    // lets take a look at change, and outputs we own that current transaction creates (can be used in CPFP)
    let changeAmount = 0;
    const targets: CreateTransactionTarget[] = [];
    const unconfirmedUtxos = [];
    for (let n = 0; n < this._txDecoded.outs.length; n++) {
      const outp = this._txDecoded.outs[n];
      const value = Number(outp.value);
      const address = TaprootWallet.scriptPubKeyToAddress(uint8ArrayToHex(outp.script));
      if (address && this._wallet.weOwnAddress(address)) {
        changeAmount += value;
        unconfirmedUtxos.push({ vout: n, value, txid, address });
      } else if (address) {
        // this is target
        targets.push({ value, address });
      } else {
        // e.g. OP_RETURN, can only be re-created as is
        targets.push({ value, script: { hex: uint8ArrayToHex(outp.script) } });
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
    assert(this._txDecoded, 'could not fetch tx and decode');

    const spentUtxos = this._wallet.getDerivedUtxoFromOurTransaction(true);
    for (const inp of this._txDecoded.ins) {
      const txidInUtxo = uint8ArrayToHex(new Uint8Array(inp.hash).reverse());

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
    assert(this._txDecoded, 'could not fetch tx and decode');

    if (await this.thereAreUnknownInputsInTx()) return false;

    // if theres at least one output we dont own - we can cancel this transaction!
    for (const outp of this._txDecoded.outs) {
      const outpScript = outp.script;
      if (
        !this._wallet.weOwnAddress(
          String(SegwitBech32Wallet.scriptPubKeyToAddress(isUint8Array(outpScript) ? uint8ArrayToHex(outpScript) : outpScript)),
        )
      )
        return true;
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
  async createRBFcancelTx(newFeerate: number) {
    if (!this._wallet) throw new Error('Wallet required for this method');

    const { feeRate, utxos } = await this.getInfo();

    if (utxos.length !== this._txDecoded!.ins.length) throw new Error('Not all inputs are ours');
    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    // if there is no secret then its a watch only wallet, skip signing and also pass the masterfingerprint
    if (!this._wallet.secret) {
      return this._wallet.createTransaction(
        utxos,
        [{ address: myAddress }],
        newFeerate,
        myAddress,
        (await this.getMaxUsedSequence()) + 1,
        true,
        this._mfp ?? 0,
      );
    }

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
  async createRBFbumpFee(newFeerate: number) {
    if (!this._wallet) throw new Error('Wallet required for this method');

    const { feeRate, targets, changeAmount, utxos } = await this.getInfo();

    if (utxos.length !== this._txDecoded!.ins.length) throw new Error('Not all inputs are ours');
    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    if (changeAmount === 0) delete targets.find(t => t.address)?.value;
    // looks like this was sendMAX transaction (because there was no change), so we cant reuse amount in this
    // target since fee wont change. removing the amount so `createTransaction` will sendMAX correctly with new feeRate

    if (targets.length === 0) {
      // looks like this was cancelled tx with single change output, so it wasnt included in `this.getInfo()` targets
      // so we add output paying ourselves:
      targets.push({ address: this._wallet._getInternalAddressByIndex(this._wallet.next_free_change_address_index) });
      // not checking emptiness on purpose: it could unpredictably generate too far address because of unconfirmed tx.
    }

    // if there is no secret then its a watch only wallet, skip signing and also pass the masterfingerprint
    if (!this._wallet.secret) {
      return this._wallet.createTransaction(
        utxos,
        targets,
        newFeerate,
        myAddress,
        (await this.getMaxUsedSequence()) + 1,
        true,
        this._mfp ?? 0,
      );
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
  async createCPFPbumpFee(newFeerate: number) {
    if (!this._wallet) throw new Error('Wallet required for this method');

    const { feeRate, fee: oldFee, unconfirmedUtxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    // calculating feerate for CPFP tx so that average between current and CPFP tx will equal newFeerate.
    // this works well if both txs are +/- equal size in bytes
    const targetFeeRate = 2 * newFeerate - feeRate;

    let add = 0;
    let tx: bitcoin.Transaction | undefined, inputs: CoinSelectReturnInput[], outputs: CoinSelectOutput[], fee: number;
    while (add <= 128) {
      const createdTx = this._wallet.createTransaction(
        unconfirmedUtxos,
        [{ address: myAddress }],
        targetFeeRate + add,
        myAddress,
        HDSegwitBech32Wallet.defaultRBFSequence,
      );
      tx = createdTx.tx;
      inputs = createdTx.inputs;
      outputs = createdTx.outputs;
      fee = createdTx.fee;
      assert(tx, 'tx is createCPFPbumpFee() is undefined');
      const combinedFeeRate = (oldFee + fee) / (this._txDecoded!.virtualSize() + tx.virtualSize()); // avg
      if (combinedFeeRate < newFeerate) {
        add *= 2;
        if (!add) add = 2;
      } else {
        // reached target feerate
        break;
      }
    }

    // Non-null assertions are safe here because the while loop always runs at least once (add starts at 0)
    return { tx: tx!, inputs: inputs!, outputs: outputs!, fee: fee! };
  }
}
