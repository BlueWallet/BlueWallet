import { LegacyWallet } from './legacy-wallet';
const bitcoin = require('bitcoinjs-lib');
const coinSelectAccumulative = require('coinselect/accumulative');
const coinSelectSplit = require('coinselect/split');

export class SegwitBech32Wallet extends LegacyWallet {
  static type = 'segwitBech32';
  static typeReadable = 'P2 WPKH';

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = bitcoin.ECPair.fromWIF(this.secret);
      if (!keyPair.compressed) {
        console.warn('only compressed public keys are good for segwit');
        return false;
      }
      address = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
      }).address;
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }

  static witnessToAddress(witness) {
    const pubKey = Buffer.from(witness, 'hex');
    return bitcoin.payments.p2wpkh({
      pubkey: pubKey,
      network: bitcoin.networks.bitcoin,
    }).address;
  }

  /**
   * Converts script pub key to bech32 address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either bech32 address or false
   */
  static scriptPubKeyToAddress(scriptPubKey) {
    const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
    let ret;
    try {
      ret = bitcoin.payments.p2wpkh({
        output: scriptPubKey2,
        network: bitcoin.networks.bitcoin,
      }).address;
    } catch (_) {
      return false;
    }
    return ret;
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
    if (!changeAddress) throw new Error('No change address provided');
    sequence = sequence || 0xffffffff; // disable RBF by default

    let algo = coinSelectAccumulative;
    if (targets.length === 1 && targets[0] && !targets[0].value) {
      // we want to send MAX
      algo = coinSelectSplit;
    }

    const { inputs, outputs, fee } = algo(utxos, targets, feeRate);

    // .inputs and .outputs will be undefined if no solution was found
    if (!inputs || !outputs) {
      throw new Error('Not enough balance. Try sending smaller amount');
    }

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

      const pubkey = keyPair.publicKey;
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        witnessUtxo: {
          script: p2wpkh.output,
          value: input.value,
        },
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

  allowSend() {
    return true;
  }

  allowSendMax() {
    return true;
  }
}
