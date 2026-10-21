import { Psbt } from 'bitcoinjs-lib';
import { areUint8ArraysEqual } from '../uint8array-extras';
import { PayjoinClientOptionalParameters, PsbtInput } from './types';

export enum ScriptPubKeyType {
  /** Reserved for scripts that are unsupported. */
  Unsupported,
  /** P2PKH */
  Legacy,
  /** P2WPKH */
  Segwit,
  /** P2WPKH-P2SH */
  SegwitP2SH,
}

export function getFee(feeRate: number, size: number): number {
  return feeRate * size;
}

export function getInputScriptPubKeyType(psbt: Psbt, i: number): ScriptPubKeyType {
  switch (psbt.getInputType(i)) {
    case 'witnesspubkeyhash':
      return ScriptPubKeyType.Segwit;
    case 'p2sh-witnesspubkeyhash':
      return ScriptPubKeyType.SegwitP2SH;
    case 'pubkeyhash':
      return ScriptPubKeyType.Legacy;
    default:
      return ScriptPubKeyType.Unsupported;
  }
}

export function getInputsScriptPubKeyType(psbt: Psbt): ScriptPubKeyType {
  if (psbt.data.inputs.filter(i => !i.witnessUtxo && !i.nonWitnessUtxo).length > 0) {
    throw new Error('The psbt should be able to be finalized with utxo information');
  }

  const types = new Set<ScriptPubKeyType>();
  for (let i = 0; i < psbt.data.inputs.length; i++) {
    types.add(getInputScriptPubKeyType(psbt, i));
  }
  if (types.size > 1) throw new Error('Inputs must all be the same type');

  return types.values().next().value as ScriptPubKeyType;
}

export function hasKeypathInformationSet(item: { bip32Derivation?: unknown[] }): boolean {
  return !!item.bip32Derivation && item.bip32Derivation.length > 0;
}

export function isFinalized(input: PsbtInput): boolean {
  return input.finalScriptSig !== undefined || input.finalScriptWitness !== undefined;
}

export function getInputIndex(psbt: Psbt, prevOutHash: Uint8Array, prevOutIndex: number): number {
  for (const [index, input] of psbt.txInputs.entries()) {
    if (areUint8ArraysEqual(input.hash, prevOutHash) && input.index === prevOutIndex) {
      return index;
    }
  }
  return -1;
}

export function getVirtualSize(scriptPubKeyType?: ScriptPubKeyType): number {
  switch (scriptPubKeyType) {
    case ScriptPubKeyType.Legacy:
      return 148;
    case ScriptPubKeyType.Segwit:
      return 68;
    case ScriptPubKeyType.SegwitP2SH:
      return 91;
    default:
      return 110;
  }
}

function setParam(url: string, key: string, value: string): string {
  const parsedURL = new URL(url);
  parsedURL.searchParams.set(key, value);
  return parsedURL.href;
}

export function getEndpointUrl(
  url: string,
  payjoinParameters?: PayjoinClientOptionalParameters,
  setParamFunc: (url: string, key: string, value: string) => string = setParam,
): string {
  if (!payjoinParameters) return url;
  let result = url;
  if (payjoinParameters.disableOutputSubstitution !== undefined) {
    result = setParamFunc(result, 'disableoutputsubstitution', payjoinParameters.disableOutputSubstitution.toString());
  }
  if (payjoinParameters.payjoinVersion !== undefined) {
    result = setParamFunc(result, 'v', payjoinParameters.payjoinVersion.toString());
  }
  if (payjoinParameters.minimumFeeRate !== undefined) {
    result = setParamFunc(result, 'minfeerate', payjoinParameters.minimumFeeRate.toString());
  }
  if (payjoinParameters.maxAdditionalFeeContribution !== undefined) {
    result = setParamFunc(result, 'maxadditionalfeecontribution', payjoinParameters.maxAdditionalFeeContribution.toString());
  }
  if (payjoinParameters.additionalFeeOutputIndex !== undefined) {
    result = setParamFunc(result, 'additionalfeeoutputindex', payjoinParameters.additionalFeeOutputIndex.toString());
  }
  return result;
}
