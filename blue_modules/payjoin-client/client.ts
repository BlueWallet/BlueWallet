import { PsbtTxInput, PsbtTxOutput } from 'bitcoinjs-lib';
import { areUint8ArraysEqual } from '../uint8array-extras';
import { IPayjoinRequester, PayjoinRequester } from './request';
import { PayjoinClientOptionalParameters, PsbtInput, PsbtOutput } from './types';
import {
  getEndpointUrl,
  getFee,
  getInputIndex,
  getInputScriptPubKeyType,
  getInputsScriptPubKeyType,
  getVirtualSize,
  hasKeypathInformationSet,
  isFinalized,
} from './utils';
import { IPayjoinClientWallet } from './wallet';

const BROADCAST_ATTEMPT_TIME = 2 * 60 * 1000; // 2 minutes

interface PayjoinClientOptsBase {
  wallet: IPayjoinClientWallet;
  paymentScript: Uint8Array; // v7: was Buffer
  payjoinParameters?: PayjoinClientOptionalParameters;
}

interface PayjoinClientOptsUrl extends PayjoinClientOptsBase {
  payjoinUrl: string;
  getEndpointUrl?: (url: string, payjoinParameters?: PayjoinClientOptionalParameters) => string;
}

interface PayjoinClientOptsRequester extends PayjoinClientOptsBase {
  payjoinRequester: IPayjoinRequester;
}

export type PayjoinClientOpts = PayjoinClientOptsUrl | PayjoinClientOptsRequester;

function isRequesterOpts(opts: PayjoinClientOpts): opts is PayjoinClientOptsRequester {
  return (opts as PayjoinClientOptsRequester).payjoinRequester !== undefined;
}

export class PayjoinClient {
  private wallet: IPayjoinClientWallet;
  private paymentScript: Uint8Array;
  private payjoinRequester: IPayjoinRequester;
  private payjoinParameters?: PayjoinClientOptionalParameters;

  constructor(opts: PayjoinClientOpts) {
    if (!opts?.wallet) {
      throw new Error('wallet (IPayjoinClientWallet) was not provided to PayjoinClient');
    }
    if (!opts.paymentScript) {
      throw new Error('paymentScript (output script of BIP21 destination) was not provided to PayjoinClient');
    }
    this.wallet = opts.wallet;
    this.paymentScript = opts.paymentScript;
    this.payjoinParameters = opts.payjoinParameters;
    if (isRequesterOpts(opts)) {
      this.payjoinRequester = opts.payjoinRequester;
    } else if (!opts.payjoinUrl) {
      throw new Error(
        'payjoinUrl (value of the key pj of BIP21) OR payjoinRequester (IPayjoinRequester) was not provided to PayjoinClient',
      );
    } else {
      const endpointFunc = opts.getEndpointUrl || getEndpointUrl;
      this.payjoinRequester = new PayjoinRequester(endpointFunc(opts.payjoinUrl, opts.payjoinParameters));
    }
  }

  async run(): Promise<void> {
    const psbt = await this.wallet.getPsbt();
    const clonedPsbt = psbt.clone();
    const originalType = getInputsScriptPubKeyType(clonedPsbt);
    clonedPsbt.finalizeAllInputs();

    const originalTxHex = clonedPsbt.extractTransaction().toHex();
    const broadcastOriginalNow = (): Promise<string> => this.wallet.broadcastTx(originalTxHex);

    try {
      // We make sure we don't send unnecessary information to the receiver
      for (let index = 0; index < clonedPsbt.inputCount; index++) {
        clonedPsbt.clearFinalizedInput(index);
      }
      clonedPsbt.data.outputs.forEach(output => {
        delete output.bip32Derivation;
      });
      delete clonedPsbt.data.globalMap.globalXpub;
      const originalInputs = clonedPsbt.txInputs.map((value, index): { originalTxIn: PsbtTxInput; signedPSBTInput: PsbtInput } => ({
        originalTxIn: value,
        signedPSBTInput: psbt.data.inputs[index],
      }));
      const originalOutputs = clonedPsbt.txOutputs.map(
        (value, index): { originalTxOut: PsbtTxOutput; signedPSBTOutput: PsbtOutput; index: number } => ({
          originalTxOut: value,
          signedPSBTOutput: psbt.data.outputs[index],
          index,
        }),
      );
      const feeOutput =
        this.payjoinParameters?.additionalFeeOutputIndex !== undefined
          ? originalOutputs[this.payjoinParameters.additionalFeeOutputIndex]
          : null;
      const originalFeeRate = clonedPsbt.getFeeRate();
      const allowOutputSubstitution = !(
        this.payjoinParameters?.disableOutputSubstitution !== undefined && this.payjoinParameters?.disableOutputSubstitution
      );
      const payjoinPsbt = await this.payjoinRequester.requestPayjoin(clonedPsbt);
      if (!payjoinPsbt) throw new Error("We did not get the receiver's PSBT");

      if (payjoinPsbt.data.globalMap.globalXpub && (payjoinPsbt.data.globalMap.globalXpub as unknown[]).length > 0) {
        throw new Error("GlobalXPubs should not be included in the receiver's PSBT");
      }
      if (payjoinPsbt.version !== clonedPsbt.version) {
        throw new Error('The proposal PSBT changed the transaction version');
      }
      if (payjoinPsbt.locktime !== clonedPsbt.locktime) {
        throw new Error('The proposal PSBT changed the nLocktime');
      }

      const sequences = new Set<number>();

      // For each inputs in the proposal:
      for (let i = 0; i < payjoinPsbt.data.inputs.length; i++) {
        const proposedPSBTInput = payjoinPsbt.data.inputs[i];
        if (hasKeypathInformationSet(proposedPSBTInput)) throw new Error('The receiver added keypaths to an input');
        if (proposedPSBTInput.partialSig && proposedPSBTInput.partialSig.length > 0) {
          throw new Error('The receiver added partial signatures to an input');
        }

        const proposedTxIn = payjoinPsbt.txInputs[i];
        const ourInputIndex = getInputIndex(clonedPsbt, proposedTxIn.hash, proposedTxIn.index);
        const isOurInput = ourInputIndex >= 0;
        if (isOurInput) {
          const input = originalInputs.splice(0, 1)[0];
          if (input.originalTxIn.sequence !== proposedTxIn.sequence) {
            throw new Error('The proposedTxIn modified the sequence of one of our inputs');
          }
          if (isFinalized(proposedPSBTInput)) throw new Error('The receiver finalized one of our inputs');
          if (proposedPSBTInput.nonWitnessUtxo || proposedPSBTInput.witnessUtxo) {
            throw new Error('The receiver added non_witness_utxo or witness_utxo to one of our inputs');
          }
          if (proposedTxIn.sequence != null) sequences.add(proposedTxIn.sequence);

          // Fill up the info from the original PSBT input so we can sign and get fees.
          proposedPSBTInput.bip32Derivation = input.signedPSBTInput.bip32Derivation || [];
          proposedPSBTInput.nonWitnessUtxo = input.signedPSBTInput.nonWitnessUtxo;
          proposedPSBTInput.witnessUtxo = input.signedPSBTInput.witnessUtxo;
          proposedPSBTInput.redeemScript = input.signedPSBTInput.redeemScript;
          proposedPSBTInput.sighashType = input.signedPSBTInput.sighashType;
        } else {
          if (!isFinalized(proposedPSBTInput)) throw new Error('The receiver did not finalized one of their input');
          if (!proposedPSBTInput.nonWitnessUtxo && !proposedPSBTInput.witnessUtxo) {
            throw new Error('The receiver did not specify non_witness_utxo or witness_utxo for one of their inputs');
          }
          if (proposedTxIn.sequence != null) sequences.add(proposedTxIn.sequence);
          if (originalType !== getInputScriptPubKeyType(payjoinPsbt, i)) throw new Error('Mixed input type detected in the proposal');
        }
      }

      if (originalInputs.length !== 0) throw new Error('Some of our inputs are not included in the proposal');
      if (sequences.size !== 1) throw new Error('Mixed sequence detected in the proposal');

      const originalFee = clonedPsbt.getFee(); // v7: bigint
      let newFee: bigint;
      const signedPsbt = await this.wallet.signPsbt(payjoinPsbt);
      try {
        newFee = signedPsbt.getFee();
      } catch (e) {
        throw new Error('The payjoin receiver did not included UTXO information to calculate fee correctly');
      }
      const additionalFee = newFee - originalFee;
      if (additionalFee < 0n) throw new Error('The receiver decreased absolute fee');

      // For each outputs in the proposal:
      for (let i = 0; i < payjoinPsbt.data.outputs.length; i++) {
        const proposedPSBTOutput = payjoinPsbt.data.outputs[i];
        const proposedTxOut = payjoinPsbt.txOutputs[i];

        if (hasKeypathInformationSet(proposedPSBTOutput)) throw new Error('The receiver added keypaths to an output');

        if (originalOutputs.length === 0) continue;
        const originalOutput = originalOutputs[0];
        const isOriginalOutput = areUint8ArraysEqual(originalOutput.originalTxOut.script, proposedTxOut.script);
        const substitutedOutput =
          !isOriginalOutput && allowOutputSubstitution && areUint8ArraysEqual(originalOutput.originalTxOut.script, this.paymentScript);
        if (isOriginalOutput || substitutedOutput) {
          originalOutputs.splice(0, 1);
          if (
            feeOutput &&
            originalOutput.index === this.payjoinParameters?.additionalFeeOutputIndex &&
            this.payjoinParameters?.maxAdditionalFeeContribution &&
            proposedTxOut.value !== feeOutput.originalTxOut.value
          ) {
            const actualContribution = feeOutput.originalTxOut.value - proposedTxOut.value; // v7: bigint
            // The amount that was substracted from the output's value is less or equal to maxadditionalfeecontribution
            if (actualContribution > BigInt(this.payjoinParameters.maxAdditionalFeeContribution)) {
              throw new Error('The actual contribution is more than maxadditionalfeecontribution');
            }
            // Make sure the actual contribution is only paying fee
            if (actualContribution > additionalFee) throw new Error('The actual contribution is not only paying fee');
            // Make sure the actual contribution is only paying for fee incurred by additional inputs
            const additionalInputsCount = payjoinPsbt.txInputs.length - clonedPsbt.txInputs.length;
            const maxForAdditionalInputs = BigInt(
              Math.floor(getFee(originalFeeRate, getVirtualSize(originalType)) * additionalInputsCount),
            );
            if (actualContribution > maxForAdditionalInputs) {
              throw new Error('The actual contribution is not only paying for additional inputs');
            }
          } else if (allowOutputSubstitution && areUint8ArraysEqual(originalOutput.originalTxOut.script, this.paymentScript)) {
            // That's the payment output, the receiver may have changed it.
          } else if (originalOutput.originalTxOut.value > proposedTxOut.value) {
            throw new Error('The receiver decreased the value of one of the outputs');
          }
          // We fill up information we had on the signed PSBT, so we can sign it.
          payjoinPsbt.updateOutput(i, proposedPSBTOutput);
        }
      }
      // Verify that all of sender's outputs from the original PSBT are in the proposal.
      if (originalOutputs.length !== 0) {
        if (
          !allowOutputSubstitution ||
          originalOutputs.length !== 1 ||
          !areUint8ArraysEqual(originalOutputs.splice(0, 1)[0].originalTxOut.script, this.paymentScript)
        ) {
          throw new Error('Some of our outputs are not included in the proposal');
        }
      }

      if (this.payjoinParameters?.minimumFeeRate) {
        let newFeeRate: number;
        try {
          newFeeRate = payjoinPsbt.getFeeRate();
        } catch {
          throw new Error('The payjoin receiver did not included UTXO information to calculate fee correctly');
        }
        if (newFeeRate < this.payjoinParameters.minimumFeeRate) {
          throw new Error('The payjoin receiver created a payjoin with a too low fee rate');
        }
      }

      const tx = signedPsbt.extractTransaction();

      // Now broadcast. If this fails, there's a possibility the server is
      // trying to leak information by double spending an input, this is why
      // we schedule broadcast of original BEFORE we broadcast the payjoin.
      // And it is why schedule broadcast is expected to fail. (why you must
      // not throw an error.)
      const response = await this.wallet.broadcastTx(tx.toHex());
      if (response !== '') {
        throw new Error('payjoin tx failed to broadcast.\nReason:\n' + response);
      } else {
        await this.wallet.scheduleBroadcastTx(originalTxHex, BROADCAST_ATTEMPT_TIME);
      }
    } catch (e) {
      // If anything goes wrong, broadcast original immediately.
      await broadcastOriginalNow();
      throw e;
    }
  }
}
