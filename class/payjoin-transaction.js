import * as bitcoin from 'bitcoinjs-lib';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import alert from '../components/Alert';
import { ECPairFactory } from 'ecpair';
const ecc = require('tiny-secp256k1');
const ECPair = ECPairFactory(ecc);

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// Implements IPayjoinClientWallet
// https://github.com/bitcoinjs/payjoin-client/blob/master/ts_src/wallet.ts
export default class PayjoinTransaction {
  constructor(psbt, broadcast, wallet) {
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

      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      const wif = this._wallet._getWifForAddress(address);
      const keyPair = ECPair.fromWIF(wif);

      unfinalized.signInput(index, keyPair);
    }

    return unfinalized;
  }

  /**
   * Doesnt conform to spec but needed for user-facing wallet software to find out txid of payjoined transaction
   *
   * @returns {boolean|Psbt}
   */
  getPayjoinPsbt() {
    return this._payjoinPsbt;
  }

  async signPsbt(payjoinPsbt) {
    // Do this without relying on private methods

    for (const [index, input] of payjoinPsbt.data.inputs.entries()) {
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

  async broadcastTx(txHex) {
    try {
      const result = await this._broadcast(txHex);
      if (!result) {
        throw new Error(`Broadcast failed`);
      }
      return '';
    } catch (e) {
      return 'Error: ' + e.message;
    }
  }

  async scheduleBroadcastTx(txHex, milliseconds) {
    delay(milliseconds).then(async () => {
      const result = await this.broadcastTx(txHex);
      if (result === '') {
        // TODO: Improve the wording of this error message
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert('Something was wrong with the payjoin transaction, the original transaction sucessfully broadcast.');
      }
    });
  }

  async isOwnOutputScript(outputScript) {
    const address = bitcoin.address.fromOutputScript(outputScript);

    return this._wallet.weOwnAddress(address);
  }
}
