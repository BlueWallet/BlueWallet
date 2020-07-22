/**
 * Cashier-BTC
 * -----------
 * Self-hosted bitcoin payment gateway
 *
 * https://github.com/Overtorment/Cashier-BTC
 *
 **/
const bitcoinjs = require('bitcoinjs-lib');

const config = require('../config');

const _p2wpkh = bitcoinjs.payments.p2wpkh;
const _p2sh = bitcoinjs.payments.p2sh;
const _p2wsh = bitcoinjs.payments.p2wsh;

const toSatoshi = num => parseInt((num * 100000000).toFixed(0));

exports.createHDTransaction = function(utxos, toAddress, amount, fixedFee, changeAddress) {
  const feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  const amountToOutputSatoshi = parseInt(((amount - fixedFee) * 100000000).toFixed(0)); // how much payee should get
  const txb = new bitcoinjs.TransactionBuilder(config.network);
  txb.setVersion(1);
  let unspentAmountSatoshi = 0;
  const ourOutputs = {};
  let outputNum = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 1) {
      // using only confirmed outputs
      continue;
    }
    txb.addInput(unspent.txid, unspent.vout);
    ourOutputs[outputNum] = ourOutputs[outputNum] || {};
    ourOutputs[outputNum].keyPair = bitcoinjs.ECPair.fromWIF(unspent.wif, config.network);
    unspentAmountSatoshi += unspent.value;
    if (unspentAmountSatoshi >= amountToOutputSatoshi + feeInSatoshis) {
      // found enough inputs to satisfy payee and pay fees
      break;
    }
    outputNum++;
  }
  if (unspentAmountSatoshi < amountToOutputSatoshi + feeInSatoshis) {
    throw new Error('Not enough balance. Please, try sending a smaller amount.');
  }

  // adding outputs

  txb.addOutput(toAddress, amountToOutputSatoshi);
  if (amountToOutputSatoshi + feeInSatoshis < unspentAmountSatoshi) {
    // sending less than we have, so the rest should go back
    if (unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis > 3 * feeInSatoshis) {
      // to prevent @dust error change transferred amount should be at least 3xfee.
      // if not - we just dont send change and it wil add to fee
      txb.addOutput(changeAddress, unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis);
    }
  }

  // now, signing every input with a corresponding key

  for (let c = 0; c <= outputNum; c++) {
    txb.sign({
      prevOutScriptType: 'p2pkh',
      vin: c,
      keyPair: ourOutputs[c].keyPair,
    });
  }

  const tx = txb.build();
  return tx.toHex();
};

exports.createHDSegwitTransaction = function(utxos, toAddress, amount, fixedFee, changeAddress) {
  const feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  const amountToOutputSatoshi = parseInt(((amount - fixedFee) * 100000000).toFixed(0)); // how much payee should get
  const psbt = new bitcoinjs.Psbt({ network: config.network });
  psbt.setVersion(1);
  let unspentAmountSatoshi = 0;
  const ourOutputs = [];
  let outputNum = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 1) {
      // using only confirmed outputs
      continue;
    }
    const keyPair = bitcoinjs.ECPair.fromWIF(unspent.wif, config.network);
    const p2wpkh = _p2wpkh({
      pubkey: keyPair.publicKey,
    });
    const p2sh = _p2sh({
      redeem: p2wpkh,
    });
    psbt.addInput({
      hash: unspent.txid,
      index: unspent.vout,
      witnessUtxo: {
        script: p2sh.output,
        value: unspent.value,
      },
      redeemScript: p2wpkh.output,
    });
    ourOutputs[outputNum] = ourOutputs[outputNum] || {};
    ourOutputs[outputNum].keyPair = keyPair;
    ourOutputs[outputNum].redeemScript = p2wpkh.output;
    ourOutputs[outputNum].amount = unspent.value;
    unspentAmountSatoshi += unspent.value;
    if (unspentAmountSatoshi >= amountToOutputSatoshi + feeInSatoshis) {
      // found enough inputs to satisfy payee and pay fees
      break;
    }
    outputNum++;
  }

  if (unspentAmountSatoshi < amountToOutputSatoshi + feeInSatoshis) {
    throw new Error('Not enough balance. Please, try sending a smaller amount.');
  }

  // adding outputs

  psbt.addOutput({
    address: toAddress,
    value: amountToOutputSatoshi,
  });
  if (amountToOutputSatoshi + feeInSatoshis < unspentAmountSatoshi) {
    // sending less than we have, so the rest should go back
    if (unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis > 3 * feeInSatoshis) {
      // to prevent @dust error change transferred amount should be at least 3xfee.
      // if not - we just dont send change and it wil add to fee
      psbt.addOutput({
        address: changeAddress,
        value: unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis,
      });
    }
  }

  // now, signing every input with a corresponding key

  for (let c = 0; c <= outputNum; c++) {
    psbt.signInput(c, ourOutputs[c].keyPair);
  }

  const tx = psbt.finalizeAllInputs().extractTransaction();
  return tx.toHex();
};

exports.createHDSegwitVaultTransaction = function({
  utxos,
  address,
  amount,
  fixedFee,
  changeAddress,
  pubKeys,
  vaultTxType,
  keyPairs,
  paymentMethod,
}) {
  const feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  const amountToOutputSatoshi = parseInt(((amount - fixedFee) * 100000000).toFixed(0)); // how much payee should get
  const psbt = new bitcoinjs.Psbt({ network: config.network });
  psbt.setVersion(1);
  let unspentAmountSatoshi = 0;
  const inputKeyPairs = [];

  for (const unspent of utxos) {
    if (unspent.confirmations < 1) {
      // using only confirmed outputs
      continue;
    }
    const keyPair = bitcoinjs.ECPair.fromWIF(unspent.wif, config.network);

    const p2Vault = paymentMethod({
      pubkeys: [keyPair.publicKey, ...pubKeys],
      network: config.network,
    });

    const p2wsh = _p2wsh({
      redeem: p2Vault,
      network: config.network,
    });

    const p2sh = _p2sh({
      redeem: p2wsh,
      network: config.network,
    });

    psbt.addInput({
      hash: unspent.txid,
      index: unspent.vout,
      witnessUtxo: {
        script: p2sh.output,
        value: unspent.value,
      },
      redeemScript: p2wsh.output,
      witnessScript: p2Vault.output,
    });
    inputKeyPairs.push(keyPair);

    unspentAmountSatoshi += unspent.value;
    if (unspentAmountSatoshi >= amountToOutputSatoshi + feeInSatoshis) {
      // found enough inputs to satisfy payee and pay fees
      break;
    }
  }

  if (unspentAmountSatoshi < amountToOutputSatoshi + feeInSatoshis) {
    throw new Error('Not enough balance. Please, try sending a smaller amount.');
  }

  // adding outputs

  psbt.addOutput({
    address,
    value: amountToOutputSatoshi,
  });

  if (amountToOutputSatoshi + feeInSatoshis < unspentAmountSatoshi) {
    // sending less than we have, so the rest should go back
    if (unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis > 3 * feeInSatoshis) {
      // to prevent @dust error change transferred amount should be at least 3xfee.
      // if not - we just dont send change and it wil add to fee
      psbt.addOutput({
        address: changeAddress,
        value: unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis,
      });
    }
  }

  inputKeyPairs.forEach((keyPair, index) => {
    [keyPair, ...keyPairs].forEach(kP => psbt.signInput(index, kP));
  });

  const tx = psbt.finalizeAllInputs(vaultTxType).extractTransaction();
  return tx.toHex();
};

exports.createSegwitTransaction = function(utxos, toAddress, amount, fixedFee, WIF, changeAddress, sequence) {
  changeAddress = changeAddress || exports.WIF2segwitAddress(WIF);
  if (sequence === undefined) {
    sequence = bitcoinjs.Transaction.DEFAULT_SEQUENCE;
  }

  const feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  const keyPair = bitcoinjs.ECPair.fromWIF(WIF, config.network);
  const p2wpkh = _p2wpkh({
    pubkey: keyPair.publicKey,
    network: config.network,
  });
  const p2sh = _p2sh({
    redeem: p2wpkh,
    network: config.network,
  });

  const psbt = new bitcoinjs.Psbt({ network: config.network });
  psbt.setVersion(1);
  let unspentAmount = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) {
      // using only confirmed outputs
      continue;
    }
    const satoshis = parseInt((unspent.value * 100000000).toFixed(0));
    psbt.addInput({
      hash: unspent.txid,
      index: unspent.vout,
      sequence,
      witnessUtxo: {
        script: p2sh.output,
        value: satoshis,
      },
      redeemScript: p2wpkh.output,
    });
    unspentAmount += satoshis;
  }
  const amountToOutput = parseInt(((amount - fixedFee) * 100000000).toFixed(0));
  psbt.addOutput({
    address: toAddress,
    value: amountToOutput,
  });
  if (amountToOutput + feeInSatoshis < unspentAmount) {
    // sending less than we have, so the rest should go back

    if (unspentAmount - amountToOutput - feeInSatoshis > 3 * feeInSatoshis) {
      // to prevent @dust error change transferred amount should be at least 3xfee.
      // if not - we just dont send change and it wil add to fee
      psbt.addOutput({
        address: changeAddress,
        value: unspentAmount - amountToOutput - feeInSatoshis,
      });
    }
  }

  for (let c = 0; c < utxos.length; c++) {
    psbt.signInput(c, keyPair);
  }
  const tx = psbt.finalizeAllInputs().extractTransaction();
  return tx.toHex();
};

exports.createRBFSegwitTransaction = function(txhex, addressReplaceMap, feeDelta, WIF, utxodata) {
  if (feeDelta < 0) {
    throw Error('replace-by-fee requires increased fee, not decreased');
  }

  const tx = bitcoinjs.Transaction.fromHex(txhex);

  // looking for latest sequence number in inputs
  let highestSequence = 0;
  for (const i of tx.ins) {
    if (i.sequence > highestSequence) {
      highestSequence = i.sequence;
    }
  }
  const keyPair = bitcoinjs.ECPair.fromWIF(WIF, config.network);
  const p2wpkh = _p2wpkh({
    pubkey: keyPair.publicKey,
    network: config.network,
  });
  const p2sh = _p2sh({
    redeem: p2wpkh,
    network: config.network,
  });

  // creating TX
  const psbt = new bitcoinjs.Psbt({ network: config.network });
  psbt.setVersion(1);
  for (const unspent of tx.ins) {
    const txid = Buffer.from(unspent.hash)
      .reverse()
      .toString('hex');
    const index = unspent.index;
    const amount = utxodata[txid][index];
    psbt.addInput({
      hash: txid,
      index,
      sequence: highestSequence + 1,
      witnessUtxo: {
        script: p2sh.output,
        value: amount,
      },
      redeemScript: p2wpkh.output,
    });
  }

  for (const o of tx.outs) {
    const outAddress = bitcoinjs.address.fromOutputScript(o.script, config.network);
    if (addressReplaceMap[outAddress]) {
      // means this is DESTINATION address, not messing with it's amount
      // but replacing the address itseld
      psbt.addOutput({
        address: addressReplaceMap[outAddress],
        value: o.value,
      });
    } else {
      // CHANGE address, so we deduct increased fee from here
      const feeDeltaInSatoshi = parseInt((feeDelta * 100000000).toFixed(0));
      psbt.addOutput({
        address: outAddress,
        value: o.value - feeDeltaInSatoshi,
      });
    }
  }

  // signing
  for (let c = 0; c < tx.ins.length; c++) {
    psbt.signInput(c, keyPair);
  }

  const newTx = psbt.finalizeAllInputs().extractTransaction();
  return newTx.toHex();
};

exports.generateNewSegwitAddress = function() {
  const keyPair = bitcoinjs.ECPair.makeRandom({ network: config.network });
  const address = bitcoinjs.payments.p2sh({
    network: config.network,
    redeem: bitcoinjs.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: config.network,
    }),
  }).address;

  return {
    address,
    WIF: keyPair.toWIF(),
  };
};

exports.URI = function(paymentInfo) {
  let uri = 'bitcoin:';
  uri += paymentInfo.address;
  uri += '?amount=';
  uri += parseFloat(paymentInfo.amount / 100000000);
  uri += '&message=';
  uri += encodeURIComponent(paymentInfo.message);
  if (paymentInfo.label) {
    uri += '&label=';
    uri += encodeURIComponent(paymentInfo.label);
  }

  return uri;
};

exports.WIF2segwitAddress = function(WIF) {
  const keyPair = bitcoinjs.ECPair.fromWIF(WIF, config.network);
  return bitcoinjs.payments.p2sh({
    network: config.network,
    redeem: bitcoinjs.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: config.network,
    }),
  }).address;
};

exports.createTransaction = function(utxos, toAddress, _amount, _fixedFee, WIF, fromAddress) {
  const fixedFee = toSatoshi(_fixedFee);
  const amountToOutput = toSatoshi(_amount - _fixedFee);
  const pk = bitcoinjs.ECPair.fromWIF(WIF, config.network); // eslint-disable-line new-cap
  const txb = new bitcoinjs.TransactionBuilder(config.network);
  txb.setVersion(1);
  let unspentAmount = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) {
      // using only confirmed outputs
      continue;
    }
    txb.addInput(unspent.txid, unspent.vout);
    unspentAmount += toSatoshi(unspent.value);
  }
  txb.addOutput(toAddress, amountToOutput);

  if (amountToOutput + fixedFee < unspentAmount) {
    // sending less than we have, so the rest should go back
    txb.addOutput(fromAddress, unspentAmount - amountToOutput - fixedFee);
  }

  for (let c = 0; c < utxos.length; c++) {
    txb.sign({
      prevOutScriptType: 'p2pkh',
      vin: c,
      keyPair: pk,
    });
  }

  return txb.build().toHex();
};
