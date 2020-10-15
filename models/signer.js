/**
 * Cashier-BTC
 * -----------
 * Self-hosted bitcoin payment gateway
 *
 * https://github.com/Overtorment/Cashier-BTC
 *
 **/
import * as bitcoinjs from 'bitcoinjs-lib';

import config from '../config';
import { btcToSatoshi } from '../utils/bitcoin';
import {
  getUtxosWithMinimumRest,
  getUtxosFromMaxToMin,
  getUtxosFromMinToMax,
  splitChange,
  getUtxosAmount,
  getFeeValue,
} from './utils';

const BlueElectrum = require('../BlueElectrum');
const i18n = require('../loc');

const _p2wpkh = bitcoinjs.payments.p2wpkh;
const _p2sh = bitcoinjs.payments.p2sh;
const _p2wsh = bitcoinjs.payments.p2wsh;

exports.createHDTransaction = async function(utxos, toAddress, amount, fixedFee, changeAddress) {
  const feeInSatoshis = btcToSatoshi(fixedFee, 0);
  const amountToOutputSatoshi = btcToSatoshi(amount - fixedFee, 0); // how much payee should get
  const txb = new bitcoinjs.TransactionBuilder(config.network);
  txb.setVersion(1);
  let unspentAmountSatoshi = 0;
  const ourOutputs = {};
  let outputNum = 0;
  const unspentUtxos = getUtxosFromMinToMax(utxos, btcToSatoshi(amount, 0));

  if (unspentUtxos === null) {
    throw new Error(i18n.transactions.errors.notEnoughBalance);
  }
  const utxosAmount = getUtxosAmount(unspentUtxos);

  for (const unspent of unspentUtxos) {
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

  // adding outputs

  let finalRestValueSatoshi = 0;

  txb.addOutput(toAddress, amountToOutputSatoshi);
  if (amountToOutputSatoshi + feeInSatoshis < unspentAmountSatoshi) {
    const restValue = unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis;
    const dustValue = await BlueElectrum.getDustValue();
    // sending less than we have, so the rest should go back
    if (restValue > dustValue) {
      finalRestValueSatoshi += restValue;
      txb.addOutput(changeAddress, restValue);
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

  return {
    tx: tx.toHex(),
    fee: getFeeValue({ utxosAmount, amountSend: amountToOutputSatoshi, restValue: finalRestValueSatoshi }),
  };
};

exports.createHDSegwitTransaction = async function(utxos, toAddress, amount, fixedFee, changeAddress) {
  const feeInSatoshis = btcToSatoshi(fixedFee, 0);
  const amountToOutputSatoshi = btcToSatoshi(amount - fixedFee, 0); // how much payee should get
  const psbt = new bitcoinjs.Psbt({ network: config.network });
  psbt.setVersion(1);
  let unspentAmountSatoshi = 0;
  const ourOutputs = [];
  let outputNum = 0;

  const unspentUtxos = getUtxosFromMinToMax(utxos, btcToSatoshi(amount, 0));

  if (unspentUtxos === null) {
    throw new Error(i18n.transactions.errors.notEnoughBalance);
  }
  const utxosAmount = getUtxosAmount(unspentUtxos);

  for (const unspent of unspentUtxos) {
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

  // adding outputs

  psbt.addOutput({
    address: toAddress,
    value: amountToOutputSatoshi,
  });
  let finalRestValueSatoshi = 0;

  if (amountToOutputSatoshi + feeInSatoshis < unspentAmountSatoshi) {
    const restValue = unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis;
    const dustValue = await BlueElectrum.getDustValue();
    // sending less than we have, so the rest should go back
    if (restValue > dustValue) {
      finalRestValueSatoshi += restValue;
      psbt.addOutput({
        address: changeAddress,
        value: restValue,
      });
    }
  }

  // now, signing every input with a corresponding key

  for (let c = 0; c <= outputNum; c++) {
    psbt.signInput(c, ourOutputs[c].keyPair);
  }

  const tx = psbt.finalizeAllInputs().extractTransaction();
  return {
    tx: tx.toHex(),
    fee: getFeeValue({ utxosAmount, amountSend: amountToOutputSatoshi, restValue: finalRestValueSatoshi }),
  };
};

exports.createHDSegwitVaultTransaction = async function({
  utxos,
  address,
  amount,
  fixedFee,
  changeAddresses,
  pubKeys,
  vaultTxType,
  keyPairs,
  paymentMethod,
}) {
  const feeInSatoshis = btcToSatoshi(fixedFee, 0);
  const amountToOutputSatoshi = btcToSatoshi(amount - fixedFee, 0); // how much payee should get
  const psbt = new bitcoinjs.Psbt({ network: config.network });
  psbt.setVersion(1);
  let unspentAmountSatoshi = 0;
  const inputKeyPairs = [];

  let unspentUtxos;

  const amountSatoshis = btcToSatoshi(amount, 0);
  const isAlert = vaultTxType === bitcoinjs.payments.VaultTxType.Alert;

  if (isAlert) {
    unspentUtxos = getUtxosWithMinimumRest(utxos, amountSatoshis);
  } else {
    unspentUtxos = getUtxosFromMaxToMin(utxos, amountSatoshis);
  }

  if (unspentUtxos === null) {
    throw new Error(i18n.transactions.errors.notEnoughBalance);
  }
  const utxosAmount = getUtxosAmount(unspentUtxos);

  for (const unspent of unspentUtxos) {
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

  // adding outputs

  psbt.addOutput({
    address,
    value: amountToOutputSatoshi,
  });

  let finalRestValueSatoshi = 0;
  if (amountToOutputSatoshi + feeInSatoshis < unspentAmountSatoshi) {
    const restValue = unspentAmountSatoshi - amountToOutputSatoshi - feeInSatoshis;

    const changes = await splitChange(restValue);

    changes.forEach((change, index) => {
      finalRestValueSatoshi += change;
      psbt.addOutput({
        address: changeAddresses[index],
        value: change,
      });
    });
  }

  inputKeyPairs.forEach((keyPair, index) => {
    [keyPair, ...keyPairs].forEach(kP => psbt.signInput(index, kP));
  });

  const tx = psbt.finalizeAllInputs(vaultTxType).extractTransaction();

  return {
    tx: tx.toHex(),
    fee: getFeeValue({ utxosAmount, amountSend: amountToOutputSatoshi, restValue: finalRestValueSatoshi }),
  };
};

exports.createSegwitTransaction = async function(utxos, toAddress, amount, fixedFee, WIF, changeAddress, sequence) {
  changeAddress = changeAddress || exports.WIF2segwitAddress(WIF);

  if (sequence === undefined) {
    sequence = bitcoinjs.Transaction.DEFAULT_SEQUENCE;
  }

  const feeInSatoshis = btcToSatoshi(fixedFee, 0);

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
  const unspentUtxos = getUtxosFromMinToMax(utxos, btcToSatoshi(amount, 0));

  if (unspentUtxos === null) {
    throw new Error(i18n.transactions.errors.notEnoughBalance);
  }

  const utxosAmount = getUtxosAmount(unspentUtxos);

  let unspentAmount = 0;
  for (const unspent of unspentUtxos) {
    psbt.addInput({
      hash: unspent.txid,
      index: unspent.vout,
      sequence,
      witnessUtxo: {
        script: p2sh.output,
        value: unspent.value,
      },
      redeemScript: p2wpkh.output,
    });
    unspentAmount += unspent.value;
  }
  const amountToOutput = btcToSatoshi(amount - fixedFee, 0);

  psbt.addOutput({
    address: toAddress,
    value: amountToOutput,
  });
  let finalRestValueSatoshi = 0;

  if (amountToOutput + feeInSatoshis < unspentAmount) {
    // sending less than we have, so the rest should go back

    const restValue = unspentAmount - amountToOutput - feeInSatoshis;
    const dustValue = await BlueElectrum.getDustValue();

    if (restValue > dustValue) {
      finalRestValueSatoshi += restValue;
      psbt.addOutput({
        address: changeAddress,
        value: restValue,
      });
    }
  }

  for (let c = 0; c < unspentUtxos.length; c++) {
    psbt.signInput(c, keyPair);
  }
  const tx = psbt.finalizeAllInputs().extractTransaction();
  return {
    tx: tx.toHex(),
    fee: getFeeValue({ utxosAmount, amountSend: amountToOutput, restValue: finalRestValueSatoshi }),
  };
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

exports.createTransaction = async function(utxos, toAddress, _amount, _fixedFee, WIF, fromAddress) {
  const fixedFee = btcToSatoshi(_fixedFee, 0);
  const amountToOutput = btcToSatoshi(_amount - _fixedFee, 0);
  const pk = bitcoinjs.ECPair.fromWIF(WIF, config.network); // eslint-disable-line new-cap
  const txb = new bitcoinjs.TransactionBuilder(config.network);
  txb.setVersion(1);
  let unspentAmount = 0;
  const unspentUtxos = getUtxosFromMinToMax(utxos, btcToSatoshi(_amount, 0));

  if (unspentUtxos === null) {
    throw new Error(i18n.transactions.errors.notEnoughBalance);
  }
  const utxosAmount = getUtxosAmount(unspentUtxos);

  for (const unspent of unspentUtxos) {
    txb.addInput(unspent.txid, unspent.vout);
    unspentAmount += unspent.value;
  }
  txb.addOutput(toAddress, amountToOutput);

  let finalRestValueSatoshi = 0;

  if (amountToOutput + fixedFee < unspentAmount) {
    const restValue = unspentAmount - amountToOutput - fixedFee;
    const dustValue = await BlueElectrum.getDustValue();
    // sending less than we have, so the rest should go back
    if (restValue > dustValue) {
      finalRestValueSatoshi += restValue;
      txb.addOutput(fromAddress, restValue);
    }
  }

  for (let c = 0; c < utxos.length; c++) {
    txb.sign({
      prevOutScriptType: 'p2pkh',
      vin: c,
      keyPair: pk,
    });
  }

  return {
    tx: txb.build().toHex(),
    fee: getFeeValue({ utxosAmount, amountSend: amountToOutput, restValue: finalRestValueSatoshi }),
  };
};

exports.signAndFinalizePSBT = function(encodedPSBT, keyPairs, vaultTxType = bitcoinjs.VaultTxType.NonVault) {
  const psbt = bitcoinjs.Psbt.fromBase64(encodedPSBT, {
    network: config.network,
  });

  keyPairs.forEach(keyPair => {
    psbt.signAllInputs(keyPair);
  });

  return {
    tx: psbt.finalizeAllInputs(vaultTxType).extractTransaction(),
    fee: psbt.getFee(),
  };
};
