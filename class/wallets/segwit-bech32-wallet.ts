import * as bitcoin from 'bitcoinjs-lib';
import { CoinSelectTarget } from 'coinselect';
import { ECPairFactory } from 'ecpair';

import ecc from '../../blue_modules/noble_ecc';
import { LegacyWallet } from './legacy-wallet';
import { CreateTransactionResult, CreateTransactionUtxo } from './types';

const ECPair = ECPairFactory(ecc);

export class SegwitBech32Wallet extends LegacyWallet {
  static readonly type = 'segwitBech32';
  static readonly typeReadable = 'P2 WPKH';
  // @ts-ignore: override
  public readonly type = SegwitBech32Wallet.type;
  // @ts-ignore: override
  public readonly typeReadable = SegwitBech32Wallet.typeReadable;
  public readonly segwitType = 'p2wpkh';

  getAddress(): string | false {
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
    this._address = address ?? false;

    return this._address;
  }

  static witnessToAddress(witness: string): string | false {
    try {
      const pubkey = Buffer.from(witness, 'hex');
      return (
        bitcoin.payments.p2wpkh({
          pubkey,
          network: bitcoin.networks.bitcoin,
        }).address ?? false
      );
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
  static scriptPubKeyToAddress(scriptPubKey: string): string | false {
    try {
      const scriptPubKey2 = Buffer.from(scriptPubKey, 'hex');
      return (
        bitcoin.payments.p2wpkh({
          output: scriptPubKey2,
          network: bitcoin.networks.bitcoin,
        }).address ?? false
      );
    } catch (_) {
      return false;
    }
  }

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
    // compensating for coinselect inability to deal with segwit inputs, and overriding script length for proper vbytes calculation
    for (const u of utxos) {
      u.script = { length: 27 };
    }
    const { inputs, outputs, fee } = this.coinselect(utxos, targets, feeRate);
    sequence = sequence || 0xffffffff; // disable RBF by default
    const psbt = new bitcoin.Psbt();
    let c = 0;
    const values: Record<number, number> = {};
    const keyPair = ECPair.fromWIF(this.secret);

    inputs.forEach(input => {
      values[c] = input.value;
      c++;

      const pubkey = keyPair.publicKey;
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
      if (!p2wpkh.output) {
        throw new Error('Internal error: no p2wpkh.output during createTransaction()');
      }

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
