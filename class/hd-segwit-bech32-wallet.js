import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import b58 from 'bs58check';
import { NativeModules } from 'react-native';

import config from '../config';
import { electrumVaultMnemonicToSeed } from '../utils/crypto';
import { AbstractHDWallet } from './abstract-hd-wallet';

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
  static typeReadable = 'HD SegWit';
  static defaultRBFSequence = 2147483648; // 1 << 31, minimum for replaceable transactions as per BIP68
  static randomBytesSize = 16;

  constructor({ isElectrumVault } = {}) {
    super();
    if (isElectrumVault !== undefined) {
      this.isElectrumVault = isElectrumVault;
    }
  }

  setPassword(password) {
    this.password = password;
  }

  getSeed() {
    if (this.isElectrumVault) {
      return electrumVaultMnemonicToSeed(this.secret, this.password);
    }
    return bip39.mnemonicToSeed(this.secret);
  }

  allowBatchSend() {
    return true;
  }

  allowSendMax() {
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
    return new Promise(resolve => {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        // eslint-disable-next-line no-undef
        return crypto.randomBytes(HDSegwitBech32Wallet.randomBytesSize, async (err, buf) => {
          if (err) throw err;
          await this.setSecret(bip39.entropyToMnemonic(buf.toString('hex')));
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(HDSegwitBech32Wallet.randomBytesSize, async (err, bytes) => {
        if (err) throw new Error(err);
        const b = Buffer.from(bytes, 'base64').toString('hex');
        await this.setSecret(bip39.entropyToMnemonic(b));
        resolve();
      });
    });
  }

  _getPath(path = '') {
    const basePath = this.isElectrumVault ? "m/0'" : "m/84'/440'/0'";
    return `${basePath}${path}`;
  }

  /**
   * Get internal/external WIF by wallet index
   * @param {Boolean} internal
   * @param {Number} index
   * @returns {string|false} Either string WIF or FALSE if error happened
   * @private
   */
  async _getWIFByIndex(index) {
    if (!this.seed) {
      this.seed = await this.getSeed();
    }
    const root = HDNode.fromSeed(this.seed, config.network);
    const path = this._getPath(`/0/${index}`);
    const child = root.derivePath(path);
    return child.toWIF();
  }

  _getNodeAddressByIndex(index) {
    index = index * 1; // cast to int
    return this._address[index];
  }

  async generateAddresses() {
    if (!this._node0) {
      const xpub = this.constructor._zpubToXpub(await this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    for (let index = 0; index < this.num_addresses; index++) {
      const address = this.constructor._nodeToBech32SegwitAddress(this._node0.derive(index));
      this._address.push(address);
      this._address_to_wif_cache[address] = await this._getWIFByIndex(index);
      this._addr_balances[address] = {
        total: 0,
        c: 0,
        u: 0,
      };
    }
  }

  async _getNodePubkeyByIndex(index) {
    index = index * 1; // cast to int

    if (!this._node0) {
      const xpub = this.constructor._zpubToXpub(await this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }
    return this._node0.derive(index).publicKey;
  }

  /**
   * Returning zpub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} zpub
   */
  async getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    this.seed = await this.getSeed();
    const root = HDNode.fromSeed(this.seed, config.network);

    const path = this._getPath();
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
    const path = this._getPath('/0/');

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
  createTx() {
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
  async createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false) {
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

    const psbt = new bitcoin.Psbt({ network: config.network });
    let c = 0;
    const keypairs = {};
    const values = {};

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      let keyPair;
      if (!skipSigning) {
        // skiping signing related stuff

        keyPair = bitcoin.ECPair.fromWIF(this._getWifForAddress(input.address), config.network);
        keypairs[c] = keyPair;
      }
      values[c] = input.value;
      c++;
      if (!skipSigning) {
        // skiping signing related stuff
        if (!input.address || !this._getWifForAddress(input.address))
          throw new Error('Internal error: no address or WIF to sign input');
      }
      const pubkey = await this._getPubkeyByAddress(input.address);
      const masterFingerprint = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      // this is not correct fingerprint, as we dont know real fingerprint - we got zpub with 84/0, but fingerpting
      // should be from root. basically, fingerprint should be provided from outside  by user when importing zpub
      const path = this._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey, network: config.network });
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
    }

    for (let k = 0; k < outputs.length; k++) {
      const output = outputs[k];
      // if output has no address - this is change output
      let change = false;
      if (!output.address) {
        change = true;
        output.address = changeAddress;
      }

      const path = this._getDerivationPathByAddress(output.address);
      const pubkey = await this._getPubkeyByAddress(output.address);
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
    }

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
    const final1 = bitcoin.Psbt.fromBase64(base64one, { network: config.network });
    const final2 = bitcoin.Psbt.fromBase64(base64two, { network: config.network });
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
      network: config.network,
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
}
