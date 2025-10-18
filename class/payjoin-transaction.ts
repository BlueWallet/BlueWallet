import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import ecc from '../blue_modules/noble_ecc';
import presentAlert from '../components/Alert';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import assert from 'assert';
import { uint8ArrayToHex } from '../blue_modules/uint8array-extras';
const ECPair = ECPairFactory(ecc);

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

// Implements IPayjoinClientWallet
// https://github.com/bitcoinjs/payjoin-client/blob/master/ts_src/wallet.ts
export default class PayjoinTransaction {
  private _psbt: bitcoin.Psbt;
  private _broadcast: (txhex: string) => Promise<true | undefined>;
  private _wallet: HDSegwitBech32Wallet;
  private _payjoinPsbt: any;

  constructor(psbt: bitcoin.Psbt, broadcast: (txhex: string) => Promise<true | undefined>, wallet: HDSegwitBech32Wallet) {
    this._psbt = psbt;
    this._broadcast = broadcast;
    this._wallet = wallet;
    this._payjoinPsbt = false;
  }

  async getPsbt() {
    // Nasty hack to get this working for now
    const unfinalized = this._psbt.clone();
    for (const [index, input] of unfinalized.data.inputs.entries()) {
      delete input.finalScriptWitness;

      assert(input.witnessUtxo, 'Internal error: input.witnessUtxo is not set');
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      const wif = this._wallet._getWifForAddress(address);
      const keyPair = ECPair.fromWIF(wif);

      unfinalized.signInput(index, keyPair);
    }

    // now, since payjoin lib expects an older version of Psbt object (from bitcoinjs-lib v6),
    // it expects `script` to be Buffer, and in v7 its actually uint8 array.
    // lets monkey patch the cloned PSBT so it returns buffers, as expected:
    const origclone = unfinalized.clone;
    unfinalized.clone = () => {
      const newPsbt = origclone.apply(unfinalized);
      const original = newPsbt.txOutputs;

      Object.defineProperty(newPsbt, 'txOutputs', {
        get() {
          return original.map(o => ({
            ...o,
            script: Buffer.from(uint8ArrayToHex(o.script), 'hex'),
          }));
        },
      });

      return newPsbt;
    };

    return unfinalized;
  }

  /**
   * Doesnt conform to spec but needed for user-facing wallet software to find out txid of payjoined transaction
   *
   * @returns {Psbt}
   */
  getPayjoinPsbt() {
    return this._payjoinPsbt;
  }

  async signPsbt(payjoinPsbt: bitcoin.Psbt) {
    // Do this without relying on private methods

    for (const [index, input] of payjoinPsbt.data.inputs.entries()) {
      assert(input.witnessUtxo, 'Internal error: input.witnessUtxo is not set');
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      try {
        const wif = this._wallet._getWifForAddress(address);
        const keyPair = ECPair.fromWIF(wif);
        payjoinPsbt.signInput(index, keyPair).finalizeInput(index);
      } catch (e) {}
    }
    this._payjoinPsbt = payjoinPsbt;
    return this._payjoinPsbt;
  }

  async broadcastTx(txHex: string) {
    try {
      const result = await this._broadcast(txHex);
      if (!result) {
        throw new Error(`Broadcast failed`);
      }
      return '';
    } catch (e: any) {
      return 'Error: ' + e.message;
    }
  }

  async scheduleBroadcastTx(txHex: string, milliseconds: number) {
    delay(milliseconds).then(async () => {
      const result = await this.broadcastTx(txHex);
      if (result === '') {
        // TODO: Improve the wording of this error message
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: 'Something was wrong with the payjoin transaction, the original transaction successfully broadcast.' });
      }
    });
  }
}
