import { LegacyWallet } from './legacy-wallet';
const bitcoin = require('bitcoinjs-lib');

/**
 * Creates Segwit P2SH Bitcoin address
 * @param pubkey
 * @param network
 * @returns {String}
 */
function pubkeyToP2shSegwitAddress(pubkey, network) {
  network = network || bitcoin.networks.bitcoin;
  const { address } = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wpkh({ pubkey, network }),
    network,
  });
  return address;
}

export class SegwitP2SHWallet extends LegacyWallet {
  static type = 'segwitP2SH';
  static typeReadable = 'SegWit (P2SH)';
  static segwitType = 'p2sh(p2wpkh)';

  static witnessToAddress(witness) {
    try {
      const pubKey = Buffer.from(witness, 'hex');
      return pubkeyToP2shSegwitAddress(pubKey);
    } catch (_) {
      return false;
    }
  }

  /**
   * Converts script pub key to p2sh address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either p2sh address or false
   */
  static scriptPubKeyToAddress(scriptPubKey) {
    try {
      const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
      return bitcoin.payments.p2sh({
        output: scriptPubKey2,
        network: bitcoin.networks.bitcoin,
      }).address;
    } catch (_) {
      return false;
    }
  }

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = bitcoin.ECPair.fromWIF(this.secret);
      const pubKey = keyPair.publicKey;
      if (!keyPair.compressed) {
        console.warn('only compressed public keys are good for segwit');
        return false;
      }
      address = pubkeyToP2shSegwitAddress(pubKey);
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
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
    // compensating for coinselect inability to deal with segwit inputs, and overriding script length for proper vbytes calculation
    for (const u of utxos) {
      u.script = { length: 50 };
    }
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

      const pubkey = keyPair.publicKey;
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
      const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh });

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        witnessUtxo: {
          script: p2sh.output,
          value: input.value,
        },
        redeemScript: p2wpkh.output,
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

  allowSendMax() {
    return true;
  }

  isSegwit() {
    return true;
  }

  allowSignVerifyMessage() {
    return true;
  }
}
