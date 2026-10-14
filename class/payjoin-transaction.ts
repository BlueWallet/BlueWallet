import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import ecc from '../blue_modules/noble_ecc';
import { areUint8ArraysEqual } from '../blue_modules/uint8array-extras';
import {
  getVirtualSize,
  IPayjoinClientWallet,
  PayjoinClient,
  PayjoinClientOptionalParameters,
  ScriptPubKeyType,
} from '../blue_modules/payjoin-client';
import presentAlert from '../components/Alert';
import { errorMessage } from '../blue_modules/errorMessage';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { CreateTransactionTarget } from './wallets/types';
import assert from 'assert';
const ECPair = ECPairFactory(ecc);

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export default class PayjoinTransaction implements IPayjoinClientWallet {
  private _psbt: bitcoin.Psbt;
  private _broadcast: (txhex: string) => Promise<true | undefined>;
  private _wallet: HDSegwitBech32Wallet;
  private _payjoinPsbt: bitcoin.Psbt | false;
  private _signedProposal: bitcoin.Psbt | false;
  private _originalTxid: string;
  private _originalBroadcast: boolean;

  constructor(psbt: bitcoin.Psbt, broadcast: (txhex: string) => Promise<true | undefined>, wallet: HDSegwitBech32Wallet) {
    this._psbt = psbt;
    this._broadcast = broadcast;
    this._wallet = wallet;
    this._payjoinPsbt = false;
    this._signedProposal = false;
    this._originalTxid = psbt.extractTransaction().getId();
    this._originalBroadcast = false;
  }

  createClient(paymentScript: Uint8Array, payjoinUrl: string, payjoinParameters?: PayjoinClientOptionalParameters): PayjoinClient {
    return new PayjoinClient({ paymentScript, wallet: this, payjoinUrl, payjoinParameters });
  }

  /**
   * Output script of the recipient the BIP21 `pj=` came with. Batched sends may carry other recipients, and the
   * address may have been edited after the BIP21 was pasted; only that exact recipient may be substituted by the receiver.
   */
  static paymentScriptFor(recipients: CreateTransactionTarget[], payjoinAddress?: string): Uint8Array | undefined {
    if (!payjoinAddress) return undefined;
    let wanted: Uint8Array;
    try {
      wanted = bitcoin.address.toOutputScript(payjoinAddress);
    } catch {
      return undefined;
    }
    for (const recipient of recipients) {
      if (!recipient.address) continue;
      try {
        const script = bitcoin.address.toOutputScript(recipient.address);
        if (areUint8ArraysEqual(script, wanted)) return script;
      } catch {}
    }
    return undefined;
  }

  /**
   * BIP78 sender parameters: the receiver must keep our fee rate, and may take the fee for one extra p2wpkh input
   * from our change (the "fee output"). Without a fee output BTCPay cannot pay for its input and refuses to payjoin.
   */
  payjoinParameters(feeRate: number): PayjoinClientOptionalParameters {
    const params: PayjoinClientOptionalParameters = { minimumFeeRate: feeRate };
    const changeIndex = this.getChangeOutputIndex();
    if (changeIndex !== undefined) {
      params.additionalFeeOutputIndex = changeIndex;
      params.maxAdditionalFeeContribution = Math.ceil(feeRate * getVirtualSize(ScriptPubKeyType.Segwit));
    }
    return params;
  }

  private getChangeOutputIndex(): number | undefined {
    const change = new Set<string>();
    for (let c = 0; c < this._wallet.next_free_change_address_index + this._wallet.gap_limit; c++) {
      change.add(this._wallet._getInternalAddressByIndex(c));
    }
    const index = this._psbt.txOutputs.findIndex(o => !!o.address && change.has(o.address));
    return index === -1 ? undefined : index;
  }

  /** Transaction that actually went out: the payjoin one if it was broadcast, otherwise the original. */
  getSentTransaction(): { txid: string; fee: bigint } {
    const psbt = this._payjoinPsbt || this._psbt;
    return { txid: psbt.extractTransaction().getId(), fee: psbt.getFee() };
  }

  async getPsbt() {
    // wallet.createTransaction() hands us a finalized psbt; the client needs it signed but not finalized
    const unfinalized = this._psbt.clone();
    for (const [index, input] of unfinalized.data.inputs.entries()) {
      delete input.finalScriptWitness;

      assert(input.witnessUtxo, 'Internal error: input.witnessUtxo is not set');
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      const wif = this._wallet._getWifForAddress(address);
      unfinalized.signInput(index, ECPair.fromWIF(wif));
    }
    return unfinalized;
  }

  /**
   * Doesnt conform to spec but needed for user-facing wallet software to find out txid of payjoined transaction.
   * Set only once the payjoin tx was actually broadcast.
   */
  getPayjoinPsbt() {
    return this._payjoinPsbt;
  }

  /**
   * True when the client fell back to broadcasting the original (non-payjoin) transaction, i.e. the payment
   * went through even though `run()` rejected.
   */
  wasOriginalBroadcast() {
    return this._originalBroadcast;
  }

  async signPsbt(payjoinPsbt: bitcoin.Psbt) {
    for (const [index, input] of payjoinPsbt.data.inputs.entries()) {
      if (input.finalScriptWitness || input.finalScriptSig) continue; // receiver's input, already finalized
      assert(input.witnessUtxo, 'Internal error: input.witnessUtxo is not set');
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script);
      const wif = this._wallet._getWifForAddress(address);
      payjoinPsbt.signInput(index, ECPair.fromWIF(wif)).finalizeInput(index);
    }
    this._signedProposal = payjoinPsbt;
    return payjoinPsbt;
  }

  async broadcastTx(txHex: string) {
    try {
      const result = await this._broadcast(txHex);
      if (!result) {
        throw new Error(`Broadcast failed`);
      }
      if (bitcoin.Transaction.fromHex(txHex).getId() === this._originalTxid) {
        this._originalBroadcast = true;
      } else {
        this._payjoinPsbt = this._signedProposal;
      }
      return '';
    } catch (e) {
      return 'Error: ' + errorMessage(e);
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
