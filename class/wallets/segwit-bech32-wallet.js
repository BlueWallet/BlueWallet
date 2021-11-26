import { LegacyWallet } from './legacy-wallet';
import { ECPair } from 'ecpair';
const bitcoin = require('bitcoinjs-lib');

export class SegwitBech32Wallet extends LegacyWallet {
  static type = 'segwitBech32';
  static typeReadable = 'P2 WPKH';
  static segwitType = 'p2wpkh';

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = ECPair.fromWIF(this.secret);
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
    try {
      const pubKey = Buffer.from(witness, 'hex');
      return bitcoin.payments.p2wpkh({
        pubkey: pubKey,
        network: bitcoin.networks.bitcoin,
      }).address;
    } catch (_) {
      return false;
    }
  }

  /**
   * Converts script pub key to bech32 address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either bech32 address or false
   */
  static scriptPubKeyToAddress(scriptPubKey) {
    try {
      const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
      return bitcoin.payments.p2wpkh({
        output: scriptPubKey2,
        network: bitcoin.networks.bitcoin,
      }).address;
    } catch (_) {
      return false;
    }
  }

  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false, masterFingerprint) {
    if (targets.length === 0) throw new Error('No destination provided');
    // compensating for coinselect inability to deal with segwit inputs, and overriding script length for proper vbytes calculation
    for (const u of utxos) {
      u.script = { length: 27 };
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
        keyPair = ECPair.fromWIF(this.secret); // secret is WIF
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

  isSegwit() {
    return true;
  }

  allowSignVerifyMessage() {
    return true;
  }
}
