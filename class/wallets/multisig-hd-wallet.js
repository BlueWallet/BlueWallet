import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import bip39 from 'bip39';
import b58 from 'bs58check';
import { decodeUR } from 'bc-ur';
const coinSelectAccumulative = require('coinselect/accumulative');
const coinSelectSplit = require('coinselect/split');
const HDNode = require('bip32');
const bitcoin = require('bitcoinjs-lib');

export class MultisigHDWallet extends AbstractHDElectrumWallet {
  static type = 'HDmultisig';
  static typeReadable = 'Multisig Vault';

  constructor() {
    super();
    this._m = 0; //  minimum required signatures so spend (m out of n)
    this._cosigners = []; // array of xpubs or mnemonic seeds
    this._cosignersFingerprints = []; // array of according fingerprints  (if any provided)
    this._cosignersCustomPaths = []; // array of according paths (if any provided)
    this._derivationPath = '';
  }

  isLegacy() {
    return this._derivationPath === "m/45'";
  }

  isNativeSegwit() {
    return this._derivationPath === "m/48'/0'/0'/2'";
  }

  isWrappedSegwit() {
    return this._derivationPath === "m/48'/0'/0'/1'";
  }

  setWrappedSegwit() {
    this._derivationPath = "m/48'/0'/0'/1'";
  }

  setNativeSegwit() {
    this._derivationPath = "m/48'/0'/0'/2'";
  }

  setLegacy() {
    this._derivationPath = "m/45'";
  }

  setM(m) {
    this._m = +m;
  }

  /**
   * @returns {number} How many minumim signatures required to authorize a spend
   */
  getM() {
    return this._m;
  }

  /**
   * @returns {number} Total count of cosigners
   */
  getN() {
    return this._cosigners.length;
  }

  setDerivationPath(path) {
    this._derivationPath = path;
  }

  getDerivationPath() {
    return this._derivationPath;
  }

  getCosigner(index) {
    if (index === 0) throw new Error('cosigners indexation starts from 1');
    return this._cosigners[index - 1];
  }

  getFingerprint(index) {
    if (index === 0) throw new Error('cosigners fingerprints indexation starts from 1');
    return this._cosignersFingerprints[index - 1];
  }

  getCosignerForFingerprint(fp) {
    const index = this._cosignersFingerprints.indexOf(fp);
    return this._cosigners[index];
  }

  static isXpubValid(key) {
    let xpub;

    try {
      xpub = super._zpubToXpub(key);
      const hdNode = HDNode.fromBase58(xpub);
      hdNode.derive(0);
      return true;
    } catch (_) {}

    return false;
  }

  /**
   *
   * @param key {string} Either xpub or mnemonic phrase
   * @param fingerprint {string} Fingerprint for cosigner that is added as xpub
   * @param path {string} Custom path (if any) for cosigner that is added as mnemonics
   */
  addCosigner(key, fingerprint, path) {
    if (MultisigHDWallet.isXpubString(key) && !fingerprint) {
      throw new Error('fingerprint is required when adding cosigner as xpub (watch-only)');
    }

    if (!MultisigHDWallet.isXpubString(key)) {
      // mnemonics. lets derive fingerprint
      if (!bip39.validateMnemonic(key)) throw new Error('Not a valid mnemonic phrase');
      fingerprint = MultisigHDWallet.seedToFingerprint(key);
    } else {
      if (!MultisigHDWallet.isXpubValid(key)) throw new Error('Not a valid xpub: ' + key);
    }

    const index = this._cosigners.length;
    this._cosigners[index] = key;
    if (fingerprint) this._cosignersFingerprints[index] = fingerprint.toUpperCase();
    if (path) this._cosignersCustomPaths[index] = path;
  }

  _getExternalAddressByIndex(index) {
    if (!this._m) throw new Error('m is not set');
    const pubkeys = [];
    for (const cosigner of this._cosigners) {
      let xpub = cosigner;
      if (!MultisigHDWallet.isXpubString(cosigner)) {
        xpub = MultisigHDWallet.seedToXpub(cosigner, this._derivationPath);
      }
      const xpub1 = this.constructor._zpubToXpub(xpub);
      const hdNode0 = HDNode.fromBase58(xpub1);
      const _node0 = hdNode0.derive(0);
      pubkeys.push(_node0.derive(index).publicKey);
    }

    if (this.isWrappedSegwit()) {
      const { address } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh({
          redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
        }),
      });
      return address;
    } else if (this.isNativeSegwit()) {
      const { address } = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });
      return address;
    } else if (this.isLegacy()) {
      const { address } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });
      return address;
    } else {
      throw new Error('Dont know how to make address');
    }
  }

  _getInternalAddressByIndex(index) {
    if (!this._m) throw new Error('m is not set');
    const pubkeys = [];
    for (const cosigner of this._cosigners) {
      let xpub = cosigner;
      if (!MultisigHDWallet.isXpubString(cosigner)) {
        xpub = MultisigHDWallet.seedToXpub(cosigner, this._derivationPath);
      }
      const xpub1 = this.constructor._zpubToXpub(xpub);
      const hdNode0 = HDNode.fromBase58(xpub1);
      const _node0 = hdNode0.derive(1);
      pubkeys.push(_node0.derive(index).publicKey);
    }

    if (this.isWrappedSegwit()) {
      const { address } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh({
          redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
        }),
      });

      return address;
    } else if (this.isNativeSegwit()) {
      const { address } = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });

      return address;
    } else if (this.isLegacy()) {
      const { address } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });
      return address;
    } else {
      throw new Error('Dont know how to make address');
    }
  }

  static seedToXpub(mnemonic, path) {
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);

    const child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();

    return this._xpub;
  }

  /**
   * @param mnemonic {string} Mnemonic seed phrase
   * @returns {string} Hex string of fingerprint derived from mnemonics. Always has lenght of 8 chars and correct leading zeroes
   */
  static seedToFingerprint(mnemonic) {
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    let hex = root.fingerprint.toString('hex');
    while (hex.length < 8) hex = '0' + hex; // leading zeroes
    return hex.toUpperCase();
  }

  /**
   * Returns xpub with correct prefix accodting to this objects set derivation path, for example 'Zpub' (with
   * capital Z) for bech32 multisig
   * @see https://github.com/satoshilabs/slips/blob/master/slip-0132.md
   *
   * @param xpub {string} Any kind of xpub, including zpub etc since we are only swapping the prefix bytes
   * @returns {string}
   */
  convertXpubToMultisignatureXpub(xpub) {
    let data = b58.decode(xpub);
    data = data.slice(4);
    switch (this._derivationPath) {
      case "m/48'/0'/0'/2'":
        return b58.encode(Buffer.concat([Buffer.from('02aa7ed3', 'hex'), data]));
      case "m/48'/0'/0'/1'":
        return b58.encode(Buffer.concat([Buffer.from('0295b43f', 'hex'), data]));
    }

    return xpub;
  }

  static isXpubString(xpub) {
    return xpub.toLowerCase().startsWith('xpub') || xpub.toLowerCase().startsWith('ypub') || xpub.toLowerCase().startsWith('zpub');
  }

  setSecret(secret) {
    if (secret.startsWith('UR:BYTES')) {
      const decoded = decodeUR([secret]);
      const b = Buffer.from(decoded, 'hex');
      secret = b.toString();
    }

    // is it Coldcard json file?
    let json;
    try {
      json = JSON.parse(secret);
    } catch (_) {}
    if (json && json.xfp && json.p2wsh_deriv && json.p2wsh) {
      this.addCosigner(json.p2wsh, json.xfp); // technically we dont need deriv (json.p2wsh_deriv), since cosigner is already an xpub
      return;
    }

    // coldcard & cobo format:
    for (const line of secret.split('\n')) {
      if (line.startsWith('#')) continue;
      const [key, value] = line.split(':');

      switch (key) {
        case 'Name':
          this.setLabel('Multisig Vault ' + value.trim());
          break;
        case 'Policy':
          this.setM(parseInt(value.trim().split('of')[0].trim()));
          break;
        case 'Derivation':
          this.setDerivationPath(value.trim());
          break;
        case 'Format':
          // nop
          break;
        default:
          if (key && value && MultisigHDWallet.isXpubString(value.trim())) {
            this.addCosigner(value.trim(), key);
          }
          break;
      }
    }
  }

  _getDerivationPathByAddressWithCustomPath(address, customPathPrefix) {
    const path = customPathPrefix || this._derivationPath;
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._getExternalAddressByIndex(c) === address) return path + '/0/' + c;
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._getInternalAddressByIndex(c) === address) return path + '/1/' + c;
    }

    return false;
  }

  /**
   * @inheritDoc
   */
  _getWifForAddress(address) {
    // todo ?
  }

  /**
   * @returns {Buffer|boolean} Either buffer with pubkey or false
   */
  _getPubkeyByAddress(address) {
    throw new Error('Not applicable in multisig');
  }

  _getDerivationPathByAddress(address) {
    throw new Error('Not applicable in multisig');
  }

  _addPsbtInput(psbt, input, sequence, masterFingerprintBuffer) {
    const bip32Derivation = []; // array per each pubkey thats gona be used
    const pubkeys = [];
    for (let c = 0; c < this._cosigners.length; c++) {
      const cosigner = this._cosigners[c];
      const path = this._getDerivationPathByAddressWithCustomPath(input.address, this._cosignersCustomPaths[c] || this._derivationPath);
      // ^^ path resembles _custom path_, if provided by user during setup, otherwise default path for wallet type gona be used
      const masterFingerprint = this._cosignersFingerprints[c]
        ? Buffer.from(this._cosignersFingerprints[c], 'hex')
        : Buffer.from(MultisigHDWallet.seedToFingerprint(cosigner), 'hex');
      // ^^ fingerprint either prodived during setup OR derived from mnemonics

      let xpub = cosigner;
      if (!MultisigHDWallet.isXpubString(cosigner)) {
        xpub = MultisigHDWallet.seedToXpub(cosigner, this._cosignersCustomPaths[c] || this._derivationPath);
      }
      xpub = this.constructor._zpubToXpub(xpub);
      const hdNode0 = HDNode.fromBase58(xpub);
      const splt = path.split('/');
      const internal = +splt[splt.length - 2];
      const index = +splt[splt.length - 1];
      const _node0 = hdNode0.derive(internal);
      const pubkey = _node0.derive(index).publicKey;
      pubkeys.push(pubkey);

      // console.warn({masterFingerprint, path, pubkey});
      bip32Derivation.push({
        masterFingerprint,
        path,
        pubkey,
      });
    }

    if (this.isNativeSegwit()) {
      const p2wsh = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });
      const witnessScript = p2wsh.redeem.output;

      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        sequence,
        bip32Derivation,
        witnessUtxo: {
          script: p2wsh.output,
          value: input.value,
        },
        witnessScript,
        // hw wallets now require passing the whole previous tx as Buffer, as if it was non-segwit input, to mitigate
        // some hw wallets attack vector
        nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
      });
    } else if (this.isWrappedSegwit()) {
      const p2shP2wsh = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh({
          redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
        }),
      });
      const witnessScript = p2shP2wsh.redeem.redeem.output;
      const redeemScript = p2shP2wsh.redeem.output;

      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        sequence,
        bip32Derivation,
        witnessUtxo: {
          script: p2shP2wsh.output,
          value: input.value,
        },
        witnessScript,
        redeemScript,
        // hw wallets now require passing the whole previous tx as Buffer, as if it was non-segwit input, to mitigate
        // some hw wallets attack vector
        nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
      });
    } else if (this.isLegacy()) {
      const p2sh = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });
      const redeemScript = p2sh.redeem.output;
      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        sequence,
        bip32Derivation,
        redeemScript,
        nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
      });
    } else {
      throw new Error('Dont know how to add input');
    }

    return psbt;
  }

  _getOutputDataForChange(outputData) {
    const bip32Derivation = []; // array per each pubkey thats gona be used
    const pubkeys = [];
    for (let c = 0; c < this._cosigners.length; c++) {
      const cosigner = this._cosigners[c];
      const path = this._getDerivationPathByAddressWithCustomPath(
        outputData.address,
        this._cosignersCustomPaths[c] || this._derivationPath,
      );
      // ^^ path resembles _custom path_, if provided by user during setup, otherwise default path for wallet type gona be used
      const masterFingerprint = this._cosignersFingerprints[c]
        ? Buffer.from(this._cosignersFingerprints[c], 'hex')
        : Buffer.from(MultisigHDWallet.seedToFingerprint(cosigner), 'hex');
      // ^^ fingerprint either prodived during setup OR derived from mnemonics

      let xpub = cosigner;
      if (!MultisigHDWallet.isXpubString(cosigner)) {
        xpub = MultisigHDWallet.seedToXpub(cosigner, this._cosignersCustomPaths[c] || this._derivationPath);
      }
      xpub = this.constructor._zpubToXpub(xpub);
      const hdNode0 = HDNode.fromBase58(xpub);
      const splt = path.split('/');
      const internal = +splt[splt.length - 2];
      const index = +splt[splt.length - 1];
      const _node0 = hdNode0.derive(internal);
      const pubkey = _node0.derive(index).publicKey;
      pubkeys.push(pubkey);

      /* console.warn({
        masterFingerprint,
        path,
        pubkey,
      }); */
      bip32Derivation.push({
        masterFingerprint,
        path,
        pubkey,
      });
    }

    outputData.bip32Derivation = bip32Derivation;

    if (this.isLegacy()) {
      const p2sh = bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) });
      outputData.redeemScript = p2sh.output;
    } else if (this.isWrappedSegwit()) {
      // todo
    } else if (this.isNativeSegwit()) {
      // todo
    } else {
      throw new Error('not implemented');
    }

    return outputData;
  }

  howManySignaturesCanWeMake() {
    let howManyPrivKeysWeGot = 0;
    for (const cosigner of this._cosigners) {
      if (!MultisigHDWallet.isXpubString(cosigner)) howManyPrivKeysWeGot++;
    }

    return howManyPrivKeysWeGot;
  }

  /**
   * @inheritDoc
   */
  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false, masterFingerprint) {
    if (targets.length === 0) throw new Error('No destination provided');
    if (this.howManySignaturesCanWeMake() === 0) skipSigning = true;

    if (!changeAddress) throw new Error('No change address provided');
    sequence = sequence || AbstractHDElectrumWallet.defaultRBFSequence;

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

    let psbt = new bitcoin.Psbt();

    let c = 0;
    inputs.forEach(input => {
      c++;
      psbt = this._addPsbtInput(psbt, input, sequence);
    });

    outputs.forEach(output => {
      // if output has no address - this is change output
      let change = false;
      if (!output.address) {
        change = true;
        output.address = changeAddress;
      }

      let outputData = {
        address: output.address,
        value: output.value,
      };

      if (change) {
        outputData = this._getOutputDataForChange(outputData);
      }

      psbt.addOutput(outputData);
    });

    if (!skipSigning) {
      for (let cc = 0; cc < c; cc++) {
        for (const cosigner of this._cosigners) {
          if (!MultisigHDWallet.isXpubString(cosigner)) {
            // ok this is a mnemonic, lets try to sign
            const seed = bip39.mnemonicToSeed(cosigner);
            const hdRoot = bitcoin.bip32.fromSeed(seed);
            psbt.signInputHD(cc, hdRoot);
          }
        }
      }
    }

    let tx;
    if (!skipSigning && this.howManySignaturesCanWeMake() >= this.getM()) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }
    return { tx, inputs, outputs, fee, psbt };
  }

  /**
   * @see https://github.com/bitcoin/bips/blob/master/bip-0067.mediawiki
   *
   * @param bufArr {Array.<Buffer>}
   * @returns {Array.<Buffer>}
   */
  static sortBuffers(bufArr) {
    return bufArr.sort(Buffer.compare);
  }
}
