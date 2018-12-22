/**
 * Cashier-BTC
 * -----------
 * Self-hosted bitcoin payment gateway
 *
 * https://github.com/Overtorment/Cashier-BTC
 *
 **/
let bitcoinjs = require('bitcoinjs-lib');
const toSatoshi = num => parseInt((num * 100000000).toFixed(0));

exports.createHDTransaction = function(utxos, toAddress, amount, fixedFee, changeAddress) {
  let feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  let amountToOutputSatoshi = parseInt(((amount - fixedFee) * 100000000).toFixed(0)); // how much payee should get
  let txb = new bitcoinjs.TransactionBuilder();
  let unspentAmountSatoshi = 0;
  let ourOutputs = {};
  let outputNum = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) {
      // using only confirmed outputs
      continue;
    }
    txb.addInput(unspent.txid, unspent.vout);
    ourOutputs[outputNum] = ourOutputs[outputNum] || {};
    ourOutputs[outputNum].keyPair = bitcoinjs.ECPair.fromWIF(unspent.wif);
    unspentAmountSatoshi += unspent.amount;
    if (unspentAmountSatoshi >= amountToOutputSatoshi + feeInSatoshis) {
      // found enough inputs to satisfy payee and pay fees
      break;
    }
    outputNum++;
  }

  if (unspentAmountSatoshi < amountToOutputSatoshi + feeInSatoshis) {
    throw new Error('Not enough confirmed inputs');
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
    txb.sign(c, ourOutputs[c].keyPair);
  }

  let tx = txb.build();
  return tx.toHex();
};

exports.createHDSegwitTransaction = function(utxos, toAddress, amount, fixedFee, changeAddress) {
  let feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  let amountToOutputSatoshi = parseInt(((amount - fixedFee) * 100000000).toFixed(0)); // how much payee should get
  let txb = new bitcoinjs.TransactionBuilder();
  let unspentAmountSatoshi = 0;
  let ourOutputs = {};
  let outputNum = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) {
      // using only confirmed outputs
      continue;
    }
    txb.addInput(unspent.txid, unspent.vout);
    ourOutputs[outputNum] = ourOutputs[outputNum] || {};
    let keyPair = bitcoinjs.ECPair.fromWIF(unspent.wif);
    let pubKey = keyPair.getPublicKeyBuffer();
    let pubKeyHash = bitcoinjs.crypto.hash160(pubKey);
    let redeemScript = bitcoinjs.script.witnessPubKeyHash.output.encode(pubKeyHash);
    ourOutputs[outputNum].keyPair = keyPair;
    ourOutputs[outputNum].redeemScript = redeemScript;
    ourOutputs[outputNum].amount = unspent.amount;
    unspentAmountSatoshi += unspent.amount;
    if (unspentAmountSatoshi >= amountToOutputSatoshi + feeInSatoshis) {
      // found enough inputs to satisfy payee and pay fees
      break;
    }
    outputNum++;
  }

  if (unspentAmountSatoshi < amountToOutputSatoshi + feeInSatoshis) {
    throw new Error('Not enough confirmed inputs');
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
    txb.sign(c, ourOutputs[c].keyPair, ourOutputs[c].redeemScript, null, ourOutputs[c].amount);
  }

  let tx = txb.build();
  return tx.toHex();
};

exports.createSegwitTransaction = function(utxos, toAddress, amount, fixedFee, WIF, changeAddress, sequence) {
  changeAddress = changeAddress || exports.WIF2segwitAddress(WIF);
  if (sequence === undefined) {
    sequence = bitcoinjs.Transaction.DEFAULT_SEQUENCE;
  }

  let feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0));
  let keyPair = bitcoinjs.ECPair.fromWIF(WIF);
  let pubKey = keyPair.getPublicKeyBuffer();
  let pubKeyHash = bitcoinjs.crypto.hash160(pubKey);
  let redeemScript = bitcoinjs.script.witnessPubKeyHash.output.encode(pubKeyHash);

  let txb = new bitcoinjs.TransactionBuilder();
  let unspentAmount = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) {
      // using only confirmed outputs
      continue;
    }
    txb.addInput(unspent.txid, unspent.vout, sequence);
    unspentAmount += parseInt((unspent.amount * 100000000).toFixed(0));
  }
  let amountToOutput = parseInt(((amount - fixedFee) * 100000000).toFixed(0));
  txb.addOutput(toAddress, amountToOutput);
  if (amountToOutput + feeInSatoshis < unspentAmount) {
    // sending less than we have, so the rest should go back

    if (unspentAmount - amountToOutput - feeInSatoshis > 3 * feeInSatoshis) {
      // to prevent @dust error change transferred amount should be at least 3xfee.
      // if not - we just dont send change and it wil add to fee
      txb.addOutput(changeAddress, unspentAmount - amountToOutput - feeInSatoshis);
    }
  }

  for (let c = 0; c < utxos.length; c++) {
    txb.sign(c, keyPair, redeemScript, null, parseInt((utxos[c].amount * 100000000).toFixed(0)));
  }

  let tx = txb.build();
  return tx.toHex();
};

exports.createRBFSegwitTransaction = function(txhex, addressReplaceMap, feeDelta, WIF, utxodata) {
  if (feeDelta < 0) {
    throw Error('replace-by-fee requires increased fee, not decreased');
  }

  let tx = bitcoinjs.Transaction.fromHex(txhex);

  // looking for latest sequence number in inputs
  let highestSequence = 0;
  for (let i of tx.ins) {
    if (i.sequence > highestSequence) {
      highestSequence = i.sequence;
    }
  }

  // creating TX
  let txb = new bitcoinjs.TransactionBuilder();
  for (let unspent of tx.ins) {
    txb.addInput(unspent.hash.reverse().toString('hex'), unspent.index, highestSequence + 1);
  }

  for (let o of tx.outs) {
    let outAddress = bitcoinjs.address.fromOutputScript(o.script);
    if (addressReplaceMap[outAddress]) {
      // means this is DESTINATION address, not messing with it's amount
      // but replacing the address itseld
      txb.addOutput(addressReplaceMap[outAddress], o.value);
    } else {
      // CHANGE address, so we deduct increased fee from here
      let feeDeltaInSatoshi = parseInt((feeDelta * 100000000).toFixed(0));
      txb.addOutput(outAddress, o.value - feeDeltaInSatoshi);
    }
  }

  // signing
  let keyPair = bitcoinjs.ECPair.fromWIF(WIF);
  let pubKey = keyPair.getPublicKeyBuffer();
  let pubKeyHash = bitcoinjs.crypto.hash160(pubKey);
  let redeemScript = bitcoinjs.script.witnessPubKeyHash.output.encode(pubKeyHash);
  for (let c = 0; c < tx.ins.length; c++) {
    let txid = tx.ins[c].hash.reverse().toString('hex');
    let index = tx.ins[c].index;
    let amount = utxodata[txid][index];
    txb.sign(c, keyPair, redeemScript, null, amount);
  }

  let newTx = txb.build();
  return newTx.toHex();
};

exports.generateNewSegwitAddress = function() {
  let keyPair = bitcoinjs.ECPair.makeRandom();
  let pubKey = keyPair.getPublicKeyBuffer();

  let witnessScript = bitcoinjs.script.witnessPubKeyHash.output.encode(bitcoinjs.crypto.hash160(pubKey));
  let scriptPubKey = bitcoinjs.script.scriptHash.output.encode(bitcoinjs.crypto.hash160(witnessScript));
  let address = bitcoinjs.address.fromOutputScript(scriptPubKey);

  return {
    address: address,
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
  let keyPair = bitcoinjs.ECPair.fromWIF(WIF);
  let pubKey = keyPair.getPublicKeyBuffer();
  let witnessScript = bitcoinjs.script.witnessPubKeyHash.output.encode(bitcoinjs.crypto.hash160(pubKey));
  let scriptPubKey = bitcoinjs.script.scriptHash.output.encode(bitcoinjs.crypto.hash160(witnessScript));
  return bitcoinjs.address.fromOutputScript(scriptPubKey);
};

exports.createTransaction = function(utxos, toAddress, _amount, _fixedFee, WIF, fromAddress) {
  let fixedFee = toSatoshi(_fixedFee);
  let amountToOutput = toSatoshi(_amount - _fixedFee);
  let pk = bitcoinjs.ECPair.fromWIF(WIF); // eslint-disable-line new-cap
  let txb = new bitcoinjs.TransactionBuilder();
  let unspentAmount = 0;
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) {
      // using only confirmed outputs
      continue;
    }
    txb.addInput(unspent.txid, unspent.vout);
    unspentAmount += toSatoshi(unspent.amount);
  }
  txb.addOutput(toAddress, amountToOutput);

  if (amountToOutput + fixedFee < unspentAmount) {
    // sending less than we have, so the rest should go back
    txb.addOutput(fromAddress, unspentAmount - amountToOutput - fixedFee);
  }

  for (let c = 0; c < utxos.length; c++) {
    txb.sign(c, pk);
  }

  return txb.build().toHex();
};
