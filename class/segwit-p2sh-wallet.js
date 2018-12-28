import { LegacyWallet } from './legacy-wallet';
const bitcoin = require('bitcoinjs-lib');
const signer = require('../models/signer');
const BigNumber = require('bignumber.js');

export class SegwitP2SHWallet extends LegacyWallet {
  static type = 'segwitP2SH';
  static typeReadable = 'SegWit (P2SH)';

  allowRBF() {
    return true;
  }

  static witnessToAddress(witness) {
    const pubKey = Buffer.from(witness, 'hex');
    const pubKeyHash = bitcoin.crypto.hash160(pubKey);
    const redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash);
    const redeemScriptHash = bitcoin.crypto.hash160(redeemScript);
    const scriptPubkey = bitcoin.script.scriptHash.output.encode(redeemScriptHash);
    return bitcoin.address.fromOutputScript(scriptPubkey, bitcoin.networks.bitcoin);
  }

  getAddress() {
    if (this._address) return this._address;
    let address;
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret);
      let pubKey = keyPair.getPublicKeyBuffer();
      let witnessScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(pubKey));
      let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(witnessScript));
      address = bitcoin.address.fromOutputScript(scriptPubKey);
    } catch (err) {
      return false;
    }
    this._address = address;

    return this._address;
  }

  /**
   * Takes UTXOs (as presented by blockcypher api), transforms them into
   * format expected by signer module, creates tx and returns signed string txhex.
   *
   * @param utxos Unspent outputs, expects blockcypher format
   * @param amount
   * @param fee
   * @param address
   * @param memo
   * @param sequence By default zero. Increased with each transaction replace.
   * @return string Signed txhex ready for broadcast
   */
  createTx(utxos, amount, fee, address, memo, sequence) {
    // TODO: memo is not used here, get rid of it
    if (sequence === undefined) {
      sequence = 0;
    }
    // transforming UTXOs fields to how module expects it
    for (let u of utxos) {
      u.confirmations = 6; // hack to make module accept 0 confirmations
      u.txid = u.tx_hash;
      u.vout = u.tx_output_n;
      u.amount = new BigNumber(u.value);
      u.amount = u.amount.dividedBy(100000000);
      u.amount = u.amount.toString(10);
    }
    // console.log('creating tx ', amount, ' with fee ', fee, 'secret=', this.getSecret(), 'from address', this.getAddress());
    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    // to compensate that module substracts fee from amount
    return signer.createSegwitTransaction(utxos, address, amountPlusFee, fee, this.getSecret(), this.getAddress(), sequence);
  }
}
