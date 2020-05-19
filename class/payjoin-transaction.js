/* global alert */
import * as bitcoin from 'bitcoinjs-lib';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// Implements IPayjoinClientWallet
// https://github.com/Kukks/payjoin-client-js/blob/715f76da6ef8ffd03b6654c329655fdc3c8aa6c3/ts_src/wallet.ts
export default class PayjoinTransaction {
  constructor(psbt, broadcast, wallet) {
    this.psbt = psbt;
    this.broadcast = broadcast;
    this.wallet = wallet;
  }

  async getPsbt() {
    // Nasty hack to get this working for now
    const unfinalized = this.psbt.clone();
    unfinalized.data.inputs.forEach((input, index) => {
      delete input.finalScriptWitness;

      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      const wif = this.wallet._getWifForAddress(address);
      const keyPair = bitcoin.ECPair.fromWIF(wif);

      unfinalized.signInput(index, keyPair);
    });

    return unfinalized;
  }

  async signPsbt(payjoinPsbt) {
    // Do this without relying on private methods
    payjoinPsbt.data.inputs.forEach((input, index) => {
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      try {
        const wif = this.wallet._getWifForAddress(address);
        const keyPair = bitcoin.ECPair.fromWIF(wif);
        payjoinPsbt.signInput(index, keyPair).finalizeInput(index);
      } catch (e) {}
    });

    return payjoinPsbt;
  }

  async broadcastTx(txHex) {
    try {
      const result = await this.broadcast(txHex);
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

  async getSumPaidToUs(psbt) {
    let sumPaidToUs = 0;

    psbt.data.inputs.forEach(input => {
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      if (this.wallet.weOwnAddress(address)) {
        sumPaidToUs -= input.witnessUtxo.value;
      }
    });

    psbt.txOutputs.forEach(output => {
      if (this.wallet.weOwnAddress(output.address)) {
        sumPaidToUs += output.value;
      }
    });

    return sumPaidToUs;
  }
}
