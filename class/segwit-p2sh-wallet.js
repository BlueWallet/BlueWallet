import { LegacyWallet } from './legacy-wallet';
const bitcoin = require('bitcoinjs-lib');
const signer = require('../models/signer');
const BigNumber = require('bignumber.js');

export class SegwitP2SHWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'segwitP2SH';
  }

  getTypeReadable() {
    return 'SegWit (P2SH)';
  }

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret);
      let pubKey = keyPair.getPublicKeyBuffer();
      let witnessScript = bitcoin.script.witnessPubKeyHash.output.encode(
        bitcoin.crypto.hash160(pubKey),
      );
      let scriptPubKey = bitcoin.script.scriptHash.output.encode(
        bitcoin.crypto.hash160(witnessScript),
      );
      address = bitcoin.address.fromOutputScript(scriptPubKey);
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }

  createTx(utxos, amount, fee, address, memo, sequence) {
    if (sequence === undefined) {
      sequence = 0;
    }
    // transforming UTXOs fields to how module expects it
    for (let u of utxos) {
      u.confirmations = 6; // hack to make module accept 0 confirmations
      u.txid = u.tx_hash;
      u.vout = u.tx_output_n;
      u.amount = new BigNumber(u.value);
      u.amount = u.amount.div(100000000);
      u.amount = u.amount.toString(10);
    }
    console.log(
      'creating tx ',
      amount,
      ' with fee ',
      fee,
      'secret=',
      this.getSecret(),
      'from address',
      this.getAddress(),
    );
    let amountPlusFee = parseFloat(new BigNumber(amount).add(fee).toString(10));
    // to compensate that module substracts fee from amount
    return signer.createSegwitTransaction(
      utxos,
      address,
      amountPlusFee,
      fee,
      this.getSecret(),
      this.getAddress(),
      sequence,
    );
  }
}
