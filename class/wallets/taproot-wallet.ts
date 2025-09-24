import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

import ecc from '../../blue_modules/noble_ecc';

import { SegwitBech32Wallet } from './segwit-bech32-wallet';
import { CreateTransactionResult, CreateTransactionUtxo } from './types.ts';
import { CoinSelectTarget } from 'coinselect';
import { hexToUint8Array } from '../../blue_modules/uint8array-extras';
const ECPair = ECPairFactory(ecc);

export class TaprootWallet extends SegwitBech32Wallet {
  static readonly type = 'taproot';
  static readonly typeReadable = 'Taproot (P2TR)';
  // @ts-ignore: override
  public readonly type = TaprootWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = TaprootWallet.typeReadable;
  public readonly segwitType = 'p2wpkh';

  /**
   * Converts script pub key to a Taproot address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either bech32 address or false
   */
  static scriptPubKeyToAddress(scriptPubKey: string): string | false {
    try {
      const publicKey = hexToUint8Array(scriptPubKey);
      return bitcoin.address.fromOutputScript(publicKey, bitcoin.networks.bitcoin);
    } catch (_) {
      return false;
    }
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

  getAddress(): string | false {
    if (this._address) return this._address;
    let address;
    try {
      const keyPair = ECPair.fromWIF(this.secret);
      if (!keyPair.compressed) {
        console.warn('only compressed public keys are good for segwit');
        return false;
      }
      const xOnlyPubkey = keyPair.publicKey.subarray(1, 33);
      address = bitcoin.payments.p2tr({
        internalPubkey: xOnlyPubkey,
      }).address;
    } catch (err: any) {
      console.log(err.message);
      return false;
    }
    this._address = address ?? false;

    return this._address;
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
    const { inputs, outputs, fee } = this.coinselect(utxos, targets, feeRate);
    sequence = sequence || 0xffffffff; // default if not passed

    // Derive keyPair & x-only pubkey
    const keyPair = ECPair.fromWIF(this.secret);
    const pubkey = keyPair.publicKey; // compressed: 0x02/03 || X
    const xOnlyPub = pubkey.subarray(1, 33); // strip prefix

    // Precompute the P2TR payment (to rebuild scriptPubKey)
    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: xOnlyPub,
    });
    if (!p2tr.output) throw new Error('Could not build p2tr.output');

    const psbt = new bitcoin.Psbt();

    // Add Taproot inputs
    inputs.forEach((input, idx) => {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        witnessUtxo: {
          script: p2tr.output!,
          value: BigInt(input.value),
        },
        // tell PSBT it’s a key-path Taproot spend
        tapInternalKey: xOnlyPub,
      });
    });

    // Add outputs
    outputs.forEach(output => {
      // if output has no address - this is change output
      if (!output.address) output.address = changeAddress;
      psbt.addOutput({
        address: output.address!,
        value: BigInt(output.value),
      });
    });

    let tx;
    if (!skipSigning) {
      // Sign each input as a Taproot key-path spend
      inputs.forEach((_, idx) => {
        psbt.signTaprootInput(idx, keyPair.tweak(bitcoin.crypto.taggedHash('TapTweak', xOnlyPub)));
      });

      // Finalize all inputs (will auto-detect Taproot)
      psbt.finalizeAllInputs();
      tx = psbt.extractTransaction();
    }

    return { tx, inputs, outputs, fee, psbt };
  }
}
