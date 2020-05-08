import * as bitcoin from 'bitcoinjs-lib';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export default class PayjoinWallet {
  constructor(psbt, broadcast, wallet) {
    this.psbt = psbt;
    this.broadcast = broadcast;
    this.wallet = wallet;
  }

  /**
   * @async
   * This creates a fully signed, finalized, and valid Psbt.
   *
   * @return {Promise<Psbt>} The Original non-payjoin Psbt for submission to
   * the payjoin server.
   */
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

  /**
   * @async
   * This takes the payjoin Psbt and signs, and finalizes any un-finalized
   * inputs. Any checks against the payjoin proposal Psbt should be done here.
   * However, this library does perform some sanity checks.
   *
   * @param {Psbt} payjoinProposal - A Psbt proposal for the payjoin. It is
   * assumed that all inputs added by the server are signed and finalized. All
   * of the PayjoinClientWallet's inputs should be unsigned and unfinalized.
   * @return {Psbt} The signed and finalized payjoin proposal Psbt
   * for submission to the payjoin server.
   */
  async signPsbt(payjoinPsbt) {
    // Do this without relying on private methods
    payjoinPsbt.data.inputs.forEach((input, index) => {
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      try {
        const wif = this.wallet._getWifForAddress(address);
        const keyPair = bitcoin.ECPair.fromWIF(wif);
        payjoinPsbt.signInput(index, keyPair).finalizeInput(index);
      } catch(e) {}
    });

    return payjoinPsbt;
  }

  /**
   * @async
   * This takes the fully signed and constructed payjoin transaction hex and
   * broadcasts it to the network. It returns true if succeeded and false if
   * broadcasting returned any errors.
   *
   * @param {string} txHex - A fully valid transaction hex string.
   * @return {string} Empty string ('') if succeeded, RPC error
   * message string etc. if failed.
   */
  async broadcastTx(txHex) {
    // TODO: Make sure we correctly handle errors and pass a string back
    return this.broadcast(txHex);
  }

  /**
   * @async
   * This takes the original transaction (submitted to the payjoin server at
   * the beginning) and attempts to broadcast it X milliSeconds later.
   * Notably, this MUST NOT throw an error if the broadcast fails, and if
   * the broadcast succeeds it MUST be noted that something was wrong with
   * the payjoin transaction.
   *
   * @param {string} txHex - A fully valid transaction hex string.
   * @param {number} milliSeconds - The number of milliSeconds to wait until
   * attempting to broadcast
   * @return {void} This should return once the broadcast is scheduled
   * via setTimeout etc. (Do not wait until the broadcast occurs to return)
   */
  async scheduleBroadcastTx(txHex, milliseconds) {
    // TODO: If this suceeds we should notify the user the payjoin failed
    return delay(milliseconds).then(() => this.broadcastTx(txHex));
  }

  /**
   * @async
   * This takes a psbt and calculates the sum paid to us.
   * Calculated as below. See example in the tests for a BIP32 wallet.
   * (total value of outputs to me) - (total value of inputs from me)
   * So if I am sending money to someone, it will be negative, if I am
   * receiving money from someone it will be positive.
   *
   * @param {Psbt} psbt - A psbt provided from getPsbt or the payjoinProposal
   * from the server.
   * @return {number} The sum in satoshis that would be paid to your wallet.
   * Negative if paying out.
   */
  async getSumPaidToUs(psbt) {
    let sumPaidToUs = 0;
    // TODO: calculate sumPaidToUs

    return sumPaidToUs;
  }
}
