const bitcoin = require('bitcoinjs-lib')

export function requestPayjoin(psbt, remoteCall) {
  var clonedPsbt = new bitcoin.Psbt() //= psbt.clone();
  clonedPsbt.finalizeAllInputs()

  // We make sure we don't send unnecessary information to the receiver
  for (let index = 0; index < clonedPsbt.inputCount; index++) {
    clonedPsbt.clearFinalizedInput(index)
  }
  clonedPsbt.data.outputs.forEach((output) => {
    delete output.bip32Derivation
  })
  delete clonedPsbt.data.globalMap.globalXpub

  var payjoinPsbt = new bitcoin.Psbt() //await remoteCall(clonedPsbt.toHex());
  if (!payjoinPsbt) return null
  // no inputs were added?
  if (clonedPsbt.inputCount <= payjoinPsbt.inputCount) {
    return null
  }

  // We make sure we don't sign things what should not be signed
  for (let index = 0; index < payjoinPsbt.inputCount; index++) {
    //Is Finalized
    if (
      payjoinPsbt.data.inputs[i].finalScriptSig !== undefined ||
      payjoinPsbt.data.inputs[i].finalScriptWitness !== undefined
    )
      payjoinPsbt.clearFinalizedInput(index)
  }
  for (let index = 0; index < payjoinPsbt.data.outputs.length; index++) {
    const output = payjoinPsbt.data.outputs[index]
    // TODO: bitcoinjs-lib to expose outputs to Psbt class
    // instead of using private (JS has no private) attributes
    const outputLegacy = payjoinPsbt.__CACHE.__TX.outs[index]
    // Make sure only the only our output have any information
    delete output.bip32Derivation
    psbt.data.outputs.forEach((originalOutput) => {
      //update the payjoin outputs
      if (
        outputLegacy.script.equals(
          // TODO: what if output is P2SH or P2WSH or anything other than P2WPKH?
          // Can we assume output will contain redeemScript and witnessScript?
          // If so, we could decompile scriptPubkey, RS, and WS, and search for
          // the pubkey and its hash160.
          bitcoin.payments.p2wpkh({
            pubkey: originalOutput.bip32Derivation.pubkey,
          }).output,
        )
      )
        payjoinPsbt.updateOutput(index, originalOutput)
    })
  }
  //
}
