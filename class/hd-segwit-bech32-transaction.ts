import * as bitcoin from 'bitcoinjs-lib';
import assert from 'assert';

import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { CreateTransactionUtxo } from './wallets/types.ts';
import { CoinSelectOutput, CoinSelectReturnInput } from 'coinselect';
import { isUint8Array, uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import type { ElectrumTransaction } from '../blue_modules/BlueElectrum';
import ecc from '../blue_modules/noble_ecc';

/**
 * Thrown when data from Electrum server about a transaction can't be verified (wrong txid, invalid signature on our
 * input etc). Such transaction must not be used as a base for RBF/CPFP.
 */
export class TxVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TxVerificationError';
  }
}

export const isTxVerificationError = (error: unknown): boolean =>
  error instanceof TxVerificationError || (error instanceof Error && error.name === 'TxVerificationError');

/**
 * Thrown when a transaction checks out, but this wallet can't build a replacement (RBF) for it, e.g. it spends coins
 * this wallet doesn't control or has an output we can't recreate.
 */
export class TxNotReplaceableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TxNotReplaceableError';
  }
}

export const isTxNotReplaceableError = (error: unknown): boolean =>
  error instanceof TxNotReplaceableError || (error instanceof Error && error.name === 'TxNotReplaceableError');

/**
 * Decodes raw tx hex that came from Electrum server (or its cache). Garbage is treated as unverifiable server data, so
 * callers can drop the cached copy and refetch.
 */
function decodeServerTxhex(hex: string): bitcoin.Transaction {
  try {
    return bitcoin.Transaction.fromHex(hex);
  } catch (_) {
    throw new TxVerificationError('Electrum server returned a transaction that cannot be decoded');
  }
}

/**
 * Max witness bytes (of a single input) we count when estimating size of a transaction whose witness we cant verify.
 * That is a typical p2wpkh witness (1 byte items count + 1+72 bytes signature + 1+33 bytes pubkey), p2tr key-path spend
 * is even smaller.
 */
const UNVERIFIED_WITNESS_MAX_BYTES = 108;

const varIntLength = (n: number): number => (n < 0xfd ? 1 : n <= 0xffff ? 3 : n <= 0xffffffff ? 5 : 9);

const witnessByteLength = (witness: Uint8Array[]): number =>
  varIntLength(witness.length) + witness.reduce((sum, item) => sum + varIntLength(item.length) + item.length, 0);

/**
 * Checks that input `inIndex` of `tx` is a valid P2WPKH spend of `prevOutScript` worth `value` sats.
 * Electrum servers are not trusted to tell us the truth about unconfirmed transactions: a malicious server
 * can show us a conflicting tx with our inputs (and our copied witness) but with outputs paying the attacker.
 * Such tx has invalid signatures, so we must never build a replacement (RBF) based on it.
 * See GHSA-6jp4-8v48-cc5v (spesmilo/electrum).
 */
function isValidP2wpkhSpend(tx: bitcoin.Transaction, inIndex: number, prevOutScript: Uint8Array, value: bigint): boolean {
  try {
    const inp = tx.ins[inIndex];
    if (inp.script.length !== 0 || inp.witness.length !== 2) return false;
    const [sig, pubkey] = inp.witness;
    const expectedOutput = bitcoin.payments.p2wpkh({ pubkey }).output;
    if (!expectedOutput || uint8ArrayToHex(expectedOutput) !== uint8ArrayToHex(prevOutScript)) return false;
    const { signature, hashType } = bitcoin.script.signature.decode(sig);
    if (hashType !== bitcoin.Transaction.SIGHASH_ALL) return false;
    const scriptCode = bitcoin.payments.p2pkh({ pubkey }).output;
    if (!scriptCode) return false;
    const hash = tx.hashForWitnessV0(inIndex, scriptCode, value, hashType);
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
    try {
      await this._fetchTxhexAndDecodeOnce();
    } catch (error) {
      if (!isTxVerificationError(error)) throw error;
      // bad copy might come from cache (e.g. saved while connected to a malicious server), retrying with a fresh one
      await BlueElectrum.forgetCachedTransactions([this._txid]);
      await this._fetchTxhexAndDecodeOnce();
    }
  }

  async _fetchTxhexAndDecodeOnce() {
    assert(this._txid, 'this._txid must be a string');
    const hexes = await BlueElectrum.multiGetTransactionByTxid([this._txid], false, 10);
    const hex = hexes[this._txid];
    if (!hex) throw new Error("Transaction can't be found in mempool");
    if (typeof hex !== 'string') throw new TxVerificationError('Electrum server did not return raw transaction');
    const decoded = decodeServerTxhex(hex);
    if (decoded.getId() !== this._txid) throw new TxVerificationError('Electrum server returned a transaction with unexpected txid');
    this._txhex = hex;
    this._txDecoded = decoded;
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
   * Throws `TxVerificationError` if data from Electrum server can't be verified. With `replacement` set ('bump' or
   * 'cancel') it also throws `TxNotReplaceableError` if this wallet can't build such RBF replacement.
   *
   * @param replacement {'bump'|'cancel'|undefined} set when info is needed for an RBF replacement (not for CPFP)
   * @returns {Promise<{fee: number, utxos: Array, unconfirmedUtxos: Array, changeAmount: number, feeRate: number, vsize: number, targets: Array}>}
   */
  async getInfo(replacement?: 'bump' | 'cancel') {
    let info;
    try {
      info = await this._getInfo();
    } catch (error) {
      if (!isTxVerificationError(error) || !this._txDecoded) throw error;
      // bad copies of this tx or its parents might come from cache (e.g. saved while connected to a malicious server).
      // dropping them and retrying once with fresh data from the server:
      const txids = this._txDecoded.ins.map(inp => uint8ArrayToHex(new Uint8Array(inp.hash).reverse()));
      if (this._txid) {
        txids.push(this._txid);
        this._txDecoded = undefined;
        this._txhex = null;
      }
      await BlueElectrum.forgetCachedTransactions(txids);
      info = await this._getInfo();
    }

    if (replacement) {
      // RBF replacement re-spends the same inputs, so we must own (and be able to sign) all of them
      if (info.utxos.length !== this._txDecoded!.ins.length) {
        throw new TxNotReplaceableError('Not all inputs of this transaction are ours, cannot replace it');
      }
      // bump re-creates all outputs, but only the ones paying to an address are supported (e.g. not OP_RETURN)
      if (replacement === 'bump' && info.targets.length + info.unconfirmedUtxos.length !== this._txDecoded!.outs.length) {
        throw new TxNotReplaceableError('Unsupported output in transaction');
      }
    }

    return info;
  }

  async _getInfo() {
    if (!this._wallet) throw new Error('Wallet required for this method');
    if (!this._txDecoded) await this._fetchTxhexAndDecode();
    assert(this._txDecoded, 'could not fetch tx and decode');
    const txid = this._txid || this._txDecoded.getId();

    const prevInputs = [];
    for (const inp of this._txDecoded.ins) {
      prevInputs.push(uint8ArrayToHex(new Uint8Array(inp.hash).reverse()));
    }

    // fetching raw hex (not server-decoded json) so we can check it against txid
    const prevTxHexes = await BlueElectrum.multiGetTransactionByTxid(prevInputs, false);
    const prevTransactions: Record<string, bitcoin.Transaction> = {};
    for (const [prevTxid, hex] of Object.entries(prevTxHexes)) {
      if (typeof hex !== 'string') continue; // not raw hex, cant check it. such input is refused below
      const decoded = decodeServerTxhex(hex);
      if (decoded.getId() !== prevTxid) throw new TxVerificationError('Electrum server returned a transaction with unexpected txid');
      prevTransactions[prevTxid] = decoded;
    }

    // fetched, now lets count how much satoshis went in
    let wentIn = 0;
    const utxos: CreateTransactionUtxo[] = [];
    const verifiedInputs = new Set<number>(); // inputs with checked signature, so their witness is real
    for (let i = 0; i < this._txDecoded.ins.length; i++) {
      const inp = this._txDecoded.ins[i];
      const reversedHash = uint8ArrayToHex(new Uint8Array(inp.hash).reverse());
      const prevOut = prevTransactions[reversedHash]?.outs[inp.index];
      // without previous output we dont know how much went in, so fee (and feerate) would be wrong, possibly negative
      if (!prevOut) throw new TxVerificationError('Electrum server did not return previous transaction of an input');
      const value = Number(prevOut.value);
      wentIn += value;

      let address: string;
      try {
        address = bitcoin.address.fromOutputScript(prevOut.script);
      } catch (_) {
        continue; // not a standard address, definitely not ours
      }
      if (!this._wallet.weOwnAddress(address)) continue; // not our input, nothing to verify (e.g. incoming tx)

      if (!isValidP2wpkhSpend(this._txDecoded, i, prevOut.script, prevOut.value)) {
        throw new TxVerificationError('Transaction has invalid signature on our input, it was not created by this wallet');
      }
      verifiedInputs.add(i);
      utxos.push({ vout: inp.index, value, txid: reversedHash, address });
    }

    // counting how much went into actual outputs

    let wasSpent = 0;
    for (const outp of this._txDecoded.outs) {
      wasSpent += Number(outp.value);
    }

    const fee = wentIn - wasSpent;
    // amounts are bound by txids, so negative fee means server data is wrong. zero fee is fine (e.g. package relay)
    if (fee < 0) throw new TxVerificationError('Transaction fee is negative');
    const vsize = this._getVsizeForFeerate(verifiedInputs);
    const feeRate = Math.floor(fee / vsize);

    // lets take a look at change, and outputs we own that current transaction creates (can be used in CPFP).
    // outputs are taken from the (txid-checked) raw tx, not from the server-decoded json
    let changeAmount = 0;
    const targets: { value?: number; address: string }[] = [];
    const unconfirmedUtxos = [];
    for (let n = 0; n < this._txDecoded.outs.length; n++) {
      const outp = this._txDecoded.outs[n];
      const value = Number(outp.value);
      let address: string | undefined;
      try {
        address = bitcoin.address.fromOutputScript(outp.script);
      } catch (_) {}

      if (address && this._wallet.weOwnAddress(address)) {
        changeAmount += value;
        unconfirmedUtxos.push({ vout: n, value, txid, address });
      } else {
        // this is target. outputs without address (e.g. OP_RETURN) are skipped, RBF bump refuses such txs
        if (address) targets.push({ value, address });
      }
    }

    return { fee, feeRate, vsize, targets, changeAmount, utxos, unconfirmedUtxos };
  }

  /**
   * Virtual size of this transaction, to be used for feerate calculations. Witness is not covered by txid, so server
   * can pad witness of inputs we cant verify (e.g. not ours) and make transaction look bigger (and its feerate lower,
   * which would make CPFP overpay). For such inputs we count at most `UNVERIFIED_WITNESS_MAX_BYTES` witness bytes, so
   * this is never bigger than the real vsize (and feerate is never lower than the real one).
   *
   * @param verifiedInputs indexes of inputs whose witness was verified, their actual witness size is used
   */
  _getVsizeForFeerate(verifiedInputs: Set<number>): number {
    assert(this._txDecoded, 'transaction not decoded');
    const tx = this._txDecoded;
    let weight = tx.byteLength(false) * 4;
    if (tx.hasWitnesses()) {
      weight += 2; // segwit marker & flag
      tx.ins.forEach((inp, i) => {
        const witnessBytes = witnessByteLength(inp.witness);
        weight += verifiedInputs.has(i) ? witnessBytes : Math.min(witnessBytes, UNVERIFIED_WITNESS_MAX_BYTES);
      });
    }
    return Math.max(1, Math.ceil(weight / 4));
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
    if (!this._remoteTx) await this._fetchRemoteTx();

    const { feeRate, utxos } = await this.getInfo('cancel');

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
    if (!this._remoteTx) await this._fetchRemoteTx();

    const { feeRate, targets, changeAmount, utxos } = await this.getInfo('bump');

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
    if (!this._remoteTx) await this._fetchRemoteTx();

    const { feeRate, fee: oldFee, vsize: oldVsize, unconfirmedUtxos } = await this.getInfo();

    if (newFeerate <= feeRate) throw new Error('New feerate should be bigger than the old one');
    const myAddress = await this._wallet.getChangeAddressAsync();

    // calculating feerate for CPFP tx so that average between current and CPFP tx will equal newFeerate.
    // this works well if both txs are +/- equal size in bytes
    const targetFeeRate = 2 * newFeerate - feeRate;

    let add = 0;
    let maxFeeRate = Infinity;
    let tx: bitcoin.Transaction | undefined, inputs: CoinSelectReturnInput[], outputs: CoinSelectOutput[], fee: number;
    while (add <= 128) {
      const childFeeRate = Math.min(targetFeeRate + add, maxFeeRate);
      const createdTx = this._wallet.createTransaction(
        unconfirmedUtxos,
        [{ address: myAddress }],
        childFeeRate,
        myAddress,
        HDSegwitBech32Wallet.defaultRBFSequence,
      );
      tx = createdTx.tx;
      inputs = createdTx.inputs;
      outputs = createdTx.outputs;
      fee = createdTx.fee;
      assert(tx, 'tx is createCPFPbumpFee() is undefined');
      const combinedFeeRate = (oldFee + fee) / (oldVsize + tx.virtualSize()); // avg
      if (combinedFeeRate >= newFeerate) break; // reached target feerate
      if (childFeeRate >= maxFeeRate) break; // child alone already pays for the whole package, no point paying more
      // child paying `fullPackageFeeRate` covers newFeerate for both txs even if parent paid nothing, so there is no
      // reason to go way above it. bound is loose (x2) so normal CPFP stays exactly as it was, it only stops runaway
      const fullPackageFeeRate = Math.ceil((newFeerate * (oldVsize + tx.virtualSize())) / tx.virtualSize());
      maxFeeRate = Math.max(targetFeeRate, 2 * fullPackageFeeRate + 2);
      if (childFeeRate >= maxFeeRate) break;
      add *= 2;
      if (!add) add = 2;
    }

    // Non-null assertions are safe here because the while loop always runs at least once (add starts at 0)
    return { tx: tx!, inputs: inputs!, outputs: outputs!, fee: fee! };
  }
}
