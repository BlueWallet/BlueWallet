import { AbstractHDWallet } from './abstract-hd-wallet';
import { NativeModules } from 'react-native';
import bip39 from 'bip39';
import BigNumber from 'bignumber.js';
import b58 from 'bs58check';

const bitcoin = require('bitcoinjs-lib');
const BlueElectrum = require('../BlueElectrum');
const HDNode = require('bip32');
const coinSelectAccumulative = require('coinselect/accumulative');
const coinSelectSplit = require('coinselect/split');

const { RNRandomBytes } = NativeModules;

/**
 * HD Wallet (BIP39).
 * In particular, BIP84 (Bech32 Native Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 */
export class HDSegwitBech32Wallet extends AbstractHDWallet {
  static type = 'HDsegwitBech32';
  static typeReadable = 'HD SegWit (BIP84 Bech32 Native)';
  static defaultRBFSequence = 2147483648; // 1 << 31, minimum for replaceable transactions as per BIP68

  constructor() {
    super();

    this._utxo = [];
  }

  allowBatchSend() {
    return true;
  }

  allowSendMax(): boolean {
    return true;
  }

  /**
   * @inheritDoc
   */
  timeToRefreshTransaction() {
    for (const tx of this.getTransactions()) {
      if (tx.confirmations < 7) return true;
    }
    return false;
  }

  allowSend() {
    return true;
  }

  async generate() {
    const that = this;
    return new Promise(function(resolve) {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(32, (err, buf) => {
          // eslint-disable-line
          if (err) throw err;
          that.setSecret(bip39.entropyToMnemonic(buf.toString('hex')));
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(32, (err, bytes) => {
        if (err) throw new Error(err);
        const b = Buffer.from(bytes, 'base64').toString('hex');
        that.setSecret(bip39.entropyToMnemonic(b));
        resolve();
      });
    });
  }

  /**
   * Get internal/external WIF by wallet index
   * @param {Boolean} internal
   * @param {Number} index
   * @returns {string|false} Either string WIF or FALSE if error happened
   * @private
   */
  _getWIFByIndex(index) {
    if (!this.secret) return false;
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = HDNode.fromSeed(seed);
    const path = `m/84'/440'/0'/0/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodeAddressByIndex(index) {
    index = index * 1; // cast to int
    return this._address[index];
  }

  generateAddresses() {
    if (!this._node0) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    for (let index = 0; index < this.num_addresses; index++) {
      const address = this.constructor._nodeToBech32SegwitAddress(this._node0.derive(index));
      this._address.push(address);
      this._address_to_wif_cache[address] = this._getWIFByIndex(index);
      this._addr_balances[address] = {
        total: 0,
        c: 0,
        u: 0,
      };
      console.warn(this._addr_balances);
    }
  }

  _getNodePubkeyByIndex(index) {
    index = index * 1; // cast to int

    if (!this._node0) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    console.warn(this._node0.derive(index).publicKey);
    console.warn(this.constructor._nodeToBech32SegwitAddress(this._node0.derive(index)));
    return this._node0.derive(index).publicKey;
  }

  /**
   * Returning zpub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} zpub
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = HDNode.fromSeed(seed);

    const path = "m/84'/440'/0'";
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  _getDerivationPathByAddress(address) {
    const path = "m/84'/440'/0'/0/";
    const index = this._address.indexOf(address);
    if (index === -1) return false;
    return path + index;
  }

  _getPubkeyByAddress(address) {
    const index = this._address.indexOf(address);
    if (index === -1) return false;
    return this._getNodePubkeyByIndex(index);
  }

  /**
   * @deprecated
   */
  createTx(utxos, amount, fee, address) {
    throw new Error('Deprecated');
  }

  /**
   *
   * @param utxos {Array.<{vout: Number, value: Number, txId: String, address: String}>} List of spendable utxos
   * @param targets {Array.<{value: Number, address: String}>} Where coins are going. If theres only 1 target and that target has no value - this will send MAX to that address (respecting fee rate)
   * @param feeRate {Number} satoshi per byte
   * @param changeAddress {String} Excessive coins will go back to that address
   * @param sequence {Number} Used in RBF
   * @param skipSigning {boolean} Whether we should skip signing, use returned `psbt` in that case
   * @returns {{outputs: Array, tx: Transaction, inputs: Array, fee: Number, psbt: Psbt}}
   */
  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false) {
    if (!changeAddress) throw new Error('No change address provided');
    sequence = sequence || HDSegwitBech32Wallet.defaultRBFSequence;
    let algo = coinSelectAccumulative;
    if (targets.length === 1 && targets[0] && !targets[0].value) {
      // we want to send MAX
      algo = coinSelectSplit;
    }
    const { inputs, outputs, fee } = algo(utxos, targets, feeRate);

    // .inputs and .outputs will be undefined if no solution was found
    if (!inputs || !outputs) {
      throw new Error('Not enough balance. Try sending smaller amount');
    }

    const psbt = new bitcoin.Psbt();

    let c = 0;
    const keypairs = {};
    const values = {};

    inputs.forEach(input => {
      let keyPair;
      if (!skipSigning) {
        // skiping signing related stuff
        keyPair = bitcoin.ECPair.fromWIF(this._getWifForAddress(input.address));
        keypairs[c] = keyPair;
      }
      values[c] = input.value;
      c++;
      if (!skipSigning) {
        // skiping signing related stuff
        if (!input.address || !this._getWifForAddress(input.address))
          throw new Error('Internal error: no address or WIF to sign input');
      }
      const pubkey = this._getPubkeyByAddress(input.address);
      const masterFingerprint = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      // this is not correct fingerprint, as we dont know real fingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub
      const path = this._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        bip32Derivation: [
          {
            masterFingerprint,
            path,
            pubkey,
          },
        ],
        witnessUtxo: {
          script: p2wpkh.output,
          value: input.value,
        },
      });
    });

    outputs.forEach(output => {
      // if output has no address - this is change output
      let change = false;
      if (!output.address) {
        change = true;
        output.address = changeAddress;
      }

      const path = this._getDerivationPathByAddress(output.address);
      const pubkey = this._getPubkeyByAddress(output.address);
      const masterFingerprint = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      // this is not correct fingerprint, as we dont know realfingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub

      const outputData = {
        address: output.address,
        value: output.value,
      };

      if (change) {
        outputData['bip32Derivation'] = [
          {
            masterFingerprint,
            path,
            pubkey,
          },
        ];
      }

      psbt.addOutput(outputData);
    });

    if (!skipSigning) {
      // skiping signing related stuff
      for (let cc = 0; cc < c; cc++) {
        psbt.signInput(cc, keypairs[cc]);
      }
    }

    let tx;
    if (!skipSigning) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }
    return { tx, inputs, outputs, fee, psbt };
  }

  /**
   * Combines 2 PSBTs into final transaction from which you can
   * get HEX and broadcast
   *
   * @param base64one {string}
   * @param base64two {string}
   * @returns {Transaction}
   */
  combinePsbt(base64one, base64two) {
    const final1 = bitcoin.Psbt.fromBase64(base64one);
    const final2 = bitcoin.Psbt.fromBase64(base64two);
    final1.combine(final2);
    return final1.finalizeAllInputs().extractTransaction();
  }

  /**
   * Creates Segwit Bech32 Bitcoin address
   *
   * @param hdNode
   * @returns {String}
   */
  static _nodeToBech32SegwitAddress(hdNode) {
    return bitcoin.payments.p2wpkh({
      pubkey: hdNode.publicKey,
    }).address;
  }

  /**
   * Converts zpub to xpub
   *
   * @param {String} zpub
   * @returns {String} xpub
   */
  static _zpubToXpub(zpub) {
    let data = b58.decode(zpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  /**
   * Broadcast txhex. Can throw an exception if failed
   *
   * @param {String} txhex
   * @returns {Promise<boolean>}
   */
  async broadcastTx(txhex) {
    const broadcast = await BlueElectrum.broadcastV2(txhex);
    console.log({ broadcast });
    if (broadcast.indexOf('successfully') !== -1) return true;
    return broadcast.length === 64; // this means return string is txid (precise length), so it was broadcasted ok
  }
}
