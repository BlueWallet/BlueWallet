const bitcoin = require("bitcoinjs-lib");

export function requestPayjoin(psbt, remoteCall) {
  var clonedPsbt = new bitcoin.Psbt(); //= psbt.clone();
  clonedPsbt.finalizeAllInputs();

  // We make sure we don't send unnecessary information to the receiver
  for (let index = 0; index < clonedPsbt.inputCount; index++) {
    clonedPsbt.clearFinalizedInput(index);
  }
  clonedPsbt.data.outputs.forEach(output => {
    output.bip32Derivation = [];
  });
  clonedPsbt.data.globalMap.globalXpub = [];

  var payjoinPsbt = new bitcoin.Psbt(); //await remoteCall(clonedPsbt.toHex());
  if (!payjoinPsbt) return null;

  // We make sure we don't sign things what should not be signed
  for (let index = 0; index < payjoinPsbt.inputCount; index++) {
    //Is Finalized
    if (
      payjoinPsbt.data.inputs[i].finalScriptSig != null &&
      payjoinPsbt.data.inputs[i].finalScriptWitness != null
    )
      payjoinPsbt.clearFinalizedInput(index);
  }
  for (let index = 0; index < payjoinPsbt.data.outputs.length; index++) {
    const output = payjoinPsbt.data.outputs[index];
    // Make sure only the only our output have any information
    output.bip32Derivation = [];
    psbt.data.outputs.forEach(originalOutput => {
      //update the payjoin outputs 
      //TODO how to get scriptpubkey in bitcoinjs psbt outputs?
      if (output.ScriptPubKey == originalOutput.bip32Derivation.pubkey)
        payjoinPsbt.updateOutput(index, originalOutput);
    });
  }

  // no inputs were added?
  if(clonedPsbt.inputCount <= payjoinPsbt.inputCount){
      return null;
  }
  //

}
