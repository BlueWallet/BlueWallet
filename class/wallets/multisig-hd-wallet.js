import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import * as bip39 from 'bip39';
import b58 from 'bs58check';
import { decodeUR } from '../../blue_modules/ur';
import { ECPairFactory } from 'ecpair';
const ecc = require('tiny-secp256k1');
const ECPair = ECPairFactory(ecc);
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const HDNode = require('bip32');
const bitcoin = require('bitcoinjs-lib');
const createHash = require('create-hash');
const reverse = require('buffer-reverse');
const mn = require('electrum-mnemonic');

const electrumSegwit = passphrase => ({
  prefix: mn.PREFIXES.segwit,
  ...(passphrase ? { passphrase } : {}),
});

const electrumStandart = passphrase => ({
  prefix: mn.PREFIXES.standard,
  ...(passphrase ? { passphrase } : {}),
});

const ELECTRUM_SEED_PREFIX = 'electrumseed:';

export class MultisigHDWallet extends AbstractHDElectrumWallet {
  static type = 'HDmultisig';
  static typeReadable = 'Multisig Vault';

  static FORMAT_P2WSH = 'p2wsh';
  static FORMAT_P2SH_P2WSH = 'p2sh-p2wsh';
  static FORMAT_P2SH_P2WSH_ALT = 'p2wsh-p2sh';
  static FORMAT_P2SH = 'p2sh';

  static PATH_NATIVE_SEGWIT = "m/48'/0'/0'/2'";
  static PATH_WRAPPED_SEGWIT = "m/48'/0'/0'/1'";
  static PATH_LEGACY = "m/45'";

  constructor() {
    super();
    this._m = 0; //  minimum required signatures so spend (m out of n)
    this._cosigners = []; // array of xpubs or mnemonic seeds
    this._cosignersFingerprints = []; // array of according fingerprints  (if any provided)
    this._cosignersCustomPaths = []; // array of according paths (if any provided)
    this._cosignersPassphrases = []; // array of according passphrases (if any provided)
    this._derivationPath = '';
    this._isNativeSegwit = false;
    this._isWrappedSegwit = false;
    this._isLegacy = false;
    this.gap_limit = 10;
  }

  isLegacy() {
    return this._isLegacy;
  }

  isNativeSegwit() {
    return this._isNativeSegwit;
  }

  isWrappedSegwit() {
    return this._isWrappedSegwit;
  }

  setWrappedSegwit() {
    this._isWrappedSegwit = true;
  }

  setNativeSegwit() {
    this._isNativeSegwit = true;
  }

  setLegacy() {
    this._isLegacy = true;
  }

  setM(m) {
    this._m = m;
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
    switch (this._derivationPath) {
      case "m/48'/0'/0'/2'":
        this._isNativeSegwit = true;
        break;
      case "m/48'/0'/0'/1'":
        this._isWrappedSegwit = true;
        break;
      case "m/45'":
        this._isLegacy = true;
        break;
      case "m/44'":
        this._isLegacy = true;
        break;
    }
  }

  getCustomDerivationPathForCosigner(index) {
    if (index === 0) throw new Error('cosigners indexation starts from 1');
    if (index > this.getN()) return false;
    return this._cosignersCustomPaths[index - 1] || this.getDerivationPath();
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

  getPassphrase(index) {
    if (index === 0) throw new Error('cosigners indexation starts from 1');
    return this._cosignersPassphrases[index - 1];
  }

  static isXpubValid(key) {
    let xpub;

    try {
      xpub = super._zpubToXpub(key);
      HDNode.fromBase58(xpub);
      return true;
    } catch (_) {}

    return false;
  }

  static isXprvValid(xprv) {
    try {
      xprv = MultisigHDWallet.convertMultisigXprvToRegularXprv(xprv);
      HDNode.fromBase58(xprv);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   *
   * @param key {string} Either xpub or mnemonic phrase
   * @param fingerprint {string} Fingerprint for cosigner that is added as xpub
   * @param path {string} Custom path (if any) for cosigner that is added as mnemonics
   * @param passphrase {string} BIP38 Passphrase (if any)
   */
  addCosigner(key, fingerprint, path, passphrase) {
    if (MultisigHDWallet.isXpubString(key) && !fingerprint) {
      throw new Error('fingerprint is required when adding cosigner as xpub (watch-only)');
    }

    if (path && !this.constructor.isPathValid(path)) {
      throw new Error('path is not valid');
    }

    if (MultisigHDWallet.isXprvString(key)) {
      // nop, but probably should validate xprv
    } else if (MultisigHDWallet.isXpubString(key)) {
      // nop, just validate
      if (!MultisigHDWallet.isXpubValid(key)) throw new Error('Not a valid xpub: ' + key);
    } else if (key.startsWith(ELECTRUM_SEED_PREFIX) && fingerprint && path) {
      // its an electrum seed
      const mnemonic = key.replace(ELECTRUM_SEED_PREFIX, '');
      try {
        mn.mnemonicToSeedSync(mnemonic, electrumStandart(passphrase));
        this.setLegacy();
      } catch (_) {
        try {
          mn.mnemonicToSeedSync(mnemonic, electrumSegwit(passphrase));
          this.setNativeSegwit();
        } catch (__) {
          throw new Error('Not a valid electrum seed');
        }
      }
    } else {
      // mnemonics. lets derive fingerprint (if it wasnt provided)
      if (!bip39.validateMnemonic(key)) throw new Error('Not a valid mnemonic phrase');
      fingerprint = fingerprint || MultisigHDWallet.mnemonicToFingerprint(key, passphrase);
    }

    if (fingerprint && this._cosignersFingerprints.indexOf(fingerprint.toUpperCase()) !== -1 && fingerprint !== '00000000') {
      // 00000000 is a special case, means we have no idea what the FP is but its okay
      throw new Error('Duplicate fingerprint');
    }

    const index = this._cosigners.length;
    this._cosigners[index] = key;
    if (fingerprint) this._cosignersFingerprints[index] = fingerprint.toUpperCase();
    if (path) this._cosignersCustomPaths[index] = path;
    if (passphrase) this._cosignersPassphrases[index] = passphrase;
  }

  static convertMultisigXprvToRegularXprv(Zprv) {
    let data = b58.decode(Zprv);
    data = data.slice(4);
    return b58.encode(Buffer.concat([Buffer.from('0488ade4', 'hex'), data]));
  }

  static convertXprvToXpub(xprv) {
    const restored = HDNode.fromBase58(MultisigHDWallet.convertMultisigXprvToRegularXprv(xprv));
    return restored.neutered().toBase58();
  }

  /**
   * Stored cosigner can be EITHER xpub (or Zpub or smth), OR mnemonic phrase. This method converts it to xpub
   *
   * @param cosigner {string} Zpub (or similar) or mnemonic seed
   * @returns {string} xpub
   * @private
   */
  _getXpubFromCosigner(cosigner) {
    if (MultisigHDWallet.isXprvString(cosigner)) cosigner = MultisigHDWallet.convertXprvToXpub(cosigner);
    let xpub = cosigner;
    if (!MultisigHDWallet.isXpubString(cosigner)) {
      const index = this._cosigners.indexOf(cosigner);
      xpub = MultisigHDWallet.seedToXpub(
        cosigner,
        this._cosignersCustomPaths[index] || this._derivationPath,
        this._cosignersPassphrases[index],
      );
    }
    return this.constructor._zpubToXpub(xpub);
  }

  _getExternalAddressByIndex(index) {
    if (!this._m) throw new Error('m is not set');
    index = +index;
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    const address = this._getAddressFromNode(0, index);
    this.external_addresses_cache[index] = address;
    return address;
  }

  _getAddressFromNode(nodeIndex, index) {
    const pubkeys = [];
    for (const [cosignerIndex, cosigner] of this._cosigners.entries()) {
      this._nodes = this._nodes || [];
      this._nodes[nodeIndex] = this._nodes[nodeIndex] || [];
      let _node;

      if (!this._nodes[nodeIndex][cosignerIndex]) {
        const xpub = this._getXpubFromCosigner(cosigner);
        const hdNode = HDNode.fromBase58(xpub);
        _node = hdNode.derive(nodeIndex);
        this._nodes[nodeIndex][cosignerIndex] = _node;
      } else {
        _node = this._nodes[nodeIndex][cosignerIndex];
      }

      pubkeys.push(_node.derive(index).publicKey);
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
    index = +index;
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    const address = this._getAddressFromNode(1, index);
    this.internal_addresses_cache[index] = address;
    return address;
  }

  static seedToXpub(mnemonic, path, passphrase) {
    let seed;
    if (mnemonic.startsWith(ELECTRUM_SEED_PREFIX)) {
      seed = MultisigHDWallet.convertElectrumMnemonicToSeed(mnemonic, passphrase);
    } else {
      seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    }

    const root = HDNode.fromSeed(seed);
    const child = root.derivePath(path).neutered();
    return child.toBase58();
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
    if (this.isNativeSegwit()) {
      return b58.encode(Buffer.concat([Buffer.from('02aa7ed3', 'hex'), data]));
    } else if (this.isWrappedSegwit()) {
      return b58.encode(Buffer.concat([Buffer.from('0295b43f', 'hex'), data]));
    }

    return xpub;
  }

  convertXprvToMultisignatureXprv(xpub) {
    let data = b58.decode(xpub);
    data = data.slice(4);
    if (this.isNativeSegwit()) {
      return b58.encode(Buffer.concat([Buffer.from('02aa7a99', 'hex'), data]));
    } else if (this.isWrappedSegwit()) {
      return b58.encode(Buffer.concat([Buffer.from('0295b005', 'hex'), data]));
    }

    return xpub;
  }

  static isXpubString(xpub) {
    return ['xpub', 'ypub', 'zpub', 'Ypub', 'Zpub'].includes(xpub.substring(0, 4));
  }

  static isXprvString(xpub) {
    return ['xprv', 'yprv', 'zprv', 'Yprv', 'Zprv'].includes(xpub.substring(0, 4));
  }

  /**
   * Converts fingerprint that is stored as a deciman number to hex string (all caps)
   *
   * @param xfp {number} For example 64392470
   * @returns {string} For example 168DD603
   */
  static ckccXfp2fingerprint(xfp) {
    let masterFingerprintHex = Number(xfp).toString(16);
    while (masterFingerprintHex.length < 8) masterFingerprintHex = '0' + masterFingerprintHex; // conversion without explicit zero might result in lost byte

    // poor man's little-endian conversion:
    // ¯\_(ツ)_/¯
    return (
      masterFingerprintHex[6] +
      masterFingerprintHex[7] +
      masterFingerprintHex[4] +
      masterFingerprintHex[5] +
      masterFingerprintHex[2] +
      masterFingerprintHex[3] +
      masterFingerprintHex[0] +
      masterFingerprintHex[1]
    ).toUpperCase();
  }

  getXpub() {
    return this.getSecret(true);
  }

  getSecret(coordinationSetup = false) {
    let ret = '# BlueWallet Multisig setup file\n';
    if (coordinationSetup) ret += '# this file contains only public keys and is safe to\n# distribute among cosigners\n';
    if (!coordinationSetup) ret += '# this file may contain private information\n';
    ret += '#\n';
    ret += 'Name: ' + this.getLabel() + '\n';
    ret += 'Policy: ' + this.getM() + ' of ' + this.getN() + '\n';

    let hasCustomPaths = 0;
    const customPaths = {};
    for (let index = 0; index < this.getN(); index++) {
      if (this._cosignersCustomPaths[index]) hasCustomPaths++;
      if (this._cosignersCustomPaths[index]) customPaths[this._cosignersCustomPaths[index]] = 1;
    }

    let printedGlobalDerivation = false;

    if (this.getDerivationPath()) customPaths[this.getDerivationPath()] = 1;
    if (Object.keys(customPaths).length === 1) {
      // we have exactly one path, for everyone. lets just print it
      for (const path of Object.keys(customPaths)) {
        ret += 'Derivation: ' + path + '\n';
        printedGlobalDerivation = true;
      }
    }

    if (hasCustomPaths !== this.getN() && !printedGlobalDerivation) {
      printedGlobalDerivation = true;
      ret += 'Derivation: ' + this.getDerivationPath() + '\n';
    }

    if (this.isNativeSegwit()) {
      ret += 'Format: P2WSH\n';
    } else if (this.isWrappedSegwit()) {
      ret += 'Format: P2SH-P2WSH\n';
    } else if (this.isLegacy()) {
      ret += 'Format: P2SH\n';
    } else {
      ret += 'Format: unknown\n';
    }
    ret += '\n';

    for (let index = 0; index < this.getN(); index++) {
      if (
        this._cosignersCustomPaths[index] &&
        ((printedGlobalDerivation && this._cosignersCustomPaths[index] !== this.getDerivationPath()) || !printedGlobalDerivation)
      ) {
        ret += '# derivation: ' + this._cosignersCustomPaths[index] + '\n';
        // if we printed global derivation and this cosigned _has_ derivation and its different from global - we print it ;
        // or we print it if cosigner _has_ some derivation set and we did not print global
      }
      if (this.constructor.isXpubString(this._cosigners[index])) {
        ret += this._cosignersFingerprints[index] + ': ' + this._cosigners[index] + '\n';
      } else {
        if (coordinationSetup) {
          const xpub = this.convertXpubToMultisignatureXpub(
            MultisigHDWallet.seedToXpub(
              this._cosigners[index],
              this._cosignersCustomPaths[index] || this._derivationPath,
              this._cosignersPassphrases[index],
            ),
          );
          const fingerprint = MultisigHDWallet.mnemonicToFingerprint(this._cosigners[index], this._cosignersPassphrases[index]);
          ret += fingerprint + ': ' + xpub + '\n';
        } else {
          ret += 'seed: ' + this._cosigners[index];
          if (this._cosignersPassphrases[index]) ret += ' - ' + this._cosignersPassphrases[index];
          ret += '\n# warning! sensitive information, do not disclose ^^^ \n';
        }
      }

      ret += '\n';
    }

    return ret;
  }

  setSecret(secret) {
    if (secret.toUpperCase().startsWith('UR:BYTES')) {
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

    // is it electrum json?
    if (json && json.wallet_type && json.wallet_type !== 'standard') {
      const mofn = json.wallet_type.split('of');
      this.setM(parseInt(mofn[0].trim()));
      const n = parseInt(mofn[1].trim());
      for (let c = 1; c <= n; c++) {
        const cosignerData = json['x' + c + '/'];
        if (cosignerData) {
          const fingerprint =
            (cosignerData.ckcc_xfp
              ? MultisigHDWallet.ckccXfp2fingerprint(cosignerData.ckcc_xfp)
              : cosignerData.root_fingerprint?.toUpperCase()) || '00000000';
          if (cosignerData.seed) {
            this.addCosigner(ELECTRUM_SEED_PREFIX + cosignerData.seed, fingerprint, cosignerData.derivation, cosignerData.passphrase);
          } else if (cosignerData.xprv && MultisigHDWallet.isXprvValid(cosignerData.xprv)) {
            this.addCosigner(cosignerData.xprv, fingerprint, cosignerData.derivation);
          } else {
            this.addCosigner(cosignerData.xpub, fingerprint, cosignerData.derivation);
          }
        }

        if (cosignerData?.xpub?.startsWith('Zpub')) this.setNativeSegwit();
        if (cosignerData?.xpub?.startsWith('Ypub')) this.setWrappedSegwit();
        if (cosignerData?.xpub?.startsWith('xpub')) this.setLegacy();
      }
    }

    // coldcard & cobo txt format:
    let customPathForCurrentCosigner = false;
    for (const line of secret.split('\n')) {
      const [key, value] = line.split(':');

      switch (key) {
        case 'Name':
          this.setLabel(value.trim());
          break;

        case 'Policy':
          this.setM(parseInt(value.trim().split('of')[0].trim()));
          break;

        case 'Derivation':
          this.setDerivationPath(value.trim());
          break;

        case 'Format':
          switch (value.trim()) {
            case MultisigHDWallet.FORMAT_P2WSH.toUpperCase():
              this.setNativeSegwit();
              break;
            case MultisigHDWallet.FORMAT_P2SH_P2WSH.toUpperCase():
            case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT.toUpperCase():
              this.setWrappedSegwit();
              break;
            case MultisigHDWallet.FORMAT_P2SH:
              this.setLegacy();
              break;
          }
          break;

        default:
          if (key && value && MultisigHDWallet.isXpubString(value.trim())) {
            this.addCosigner(value.trim(), key, customPathForCurrentCosigner);
          } else if (key.replace('#', '').trim() === 'derivation') {
            customPathForCurrentCosigner = value.trim();
          } else if (key === 'seed') {
            const [seed, passphrase] = value.split(' - ');
            this.addCosigner(seed.trim(), false, customPathForCurrentCosigner, passphrase);
          }
          break;
      }
    }

    // is it wallet descriptor?
    // @see https://github.com/bitcoin/bitcoin/blob/master/doc/descriptors.md
    // @see https://github.com/Fonta1n3/FullyNoded/blob/master/Docs/Wallets/Wallet-Export-Spec.md
    if (!json && secret.indexOf('sortedmulti(')) {
      // provided secret was NOT json but plain wallet descriptor text. lets mock json
      json = { descriptor: secret, label: 'Multisig vault' };
    }
    if (secret.indexOf('sortedmulti(') !== -1 && json.descriptor) {
      if (json.label) this.setLabel(json.label);
      if (json.descriptor.startsWith('wsh(')) {
        this.setNativeSegwit();
      } else if (json.descriptor.startsWith('sh(wsh(')) {
        this.setWrappedSegwit();
      } else if (json.descriptor.startsWith('sh(')) {
        this.setLegacy();
      }

      const s2 = json.descriptor.substr(json.descriptor.indexOf('sortedmulti(') + 12);
      const s3 = s2.split(',');
      const m = parseInt(s3[0]);
      if (m) this.setM(m);

      for (let c = 1; c < s3.length; c++) {
        const re = /\[([^\]]+)\](.*)/;
        const m = s3[c].match(re);
        if (m && m.length === 3) {
          let hexFingerprint = m[1].split('/')[0];
          if (hexFingerprint.length === 8) {
            hexFingerprint = Buffer.from(hexFingerprint, 'hex').toString('hex');
          }

          const path = 'm/' + m[1].split('/').slice(1).join('/').replace(/[h]/g, "'");
          let xpub = m[2];
          if (xpub.indexOf('/') !== -1) {
            xpub = xpub.substr(0, xpub.indexOf('/'));
          }
          if (xpub.indexOf(')') !== -1) {
            xpub = xpub.substr(0, xpub.indexOf(')'));
          }

          this.addCosigner(xpub, hexFingerprint.toUpperCase(), path);
        }
      }
    }

    // is it caravan?
    if (json && json.network === 'mainnet' && json.quorum) {
      this.setM(+json.quorum.requiredSigners);
      if (json.name) this.setLabel(json.name);

      switch (json.addressType.toLowerCase()) {
        case MultisigHDWallet.FORMAT_P2SH:
          this.setLegacy();
          break;
        case MultisigHDWallet.FORMAT_P2SH_P2WSH:
        case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
          this.setWrappedSegwit();
          break;
        case MultisigHDWallet.FORMAT_P2WSH:
        default:
          this.setNativeSegwit();
          break;
      }

      for (const pk of json.extendedPublicKeys) {
        const path = this.constructor.isPathValid(json.bip32Path) ? json.bip32Path : "m/1'";
        // wtf, where caravan stores fingerprints..?
        this.addCosigner(pk.xpub, '00000000', path);
      }
    }

    if (!this.getLabel()) this.setLabel('Multisig vault');
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

  _getWifForAddress(address) {
    return false;
  }

  _getPubkeyByAddress(address) {
    throw new Error('Not applicable in multisig');
  }

  _getDerivationPathByAddress(address) {
    throw new Error('Not applicable in multisig');
  }

  _addPsbtInput(psbt, input, sequence, masterFingerprintBuffer) {
    const bip32Derivation = []; // array per each pubkey thats gona be used
    const pubkeys = [];
    for (const [cosignerIndex, cosigner] of this._cosigners.entries()) {
      const path = this._getDerivationPathByAddressWithCustomPath(
        input.address,
        this._cosignersCustomPaths[cosignerIndex] || this._derivationPath,
      );
      // ^^ path resembles _custom path_, if provided by user during setup, otherwise default path for wallet type gona be used
      const masterFingerprint = Buffer.from(this._cosignersFingerprints[cosignerIndex], 'hex');

      const xpub = this._getXpubFromCosigner(cosigner);
      const hdNode0 = HDNode.fromBase58(xpub);
      const splt = path.split('/');
      const internal = +splt[splt.length - 2];
      const index = +splt[splt.length - 1];
      const _node0 = hdNode0.derive(internal);
      const pubkey = _node0.derive(index).publicKey;
      pubkeys.push(pubkey);

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

      if (!input.txhex) throw new Error('Electrum server didnt provide txhex to properly create PSBT transaction');

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
    for (const [cosignerIndex, cosigner] of this._cosigners.entries()) {
      const path = this._getDerivationPathByAddressWithCustomPath(
        outputData.address,
        this._cosignersCustomPaths[cosignerIndex] || this._derivationPath,
      );
      // ^^ path resembles _custom path_, if provided by user during setup, otherwise default path for wallet type gona be used
      const masterFingerprint = Buffer.from(this._cosignersFingerprints[cosignerIndex], 'hex');

      const xpub = this._getXpubFromCosigner(cosigner);
      const hdNode0 = HDNode.fromBase58(xpub);
      const splt = path.split('/');
      const internal = +splt[splt.length - 2];
      const index = +splt[splt.length - 1];
      const _node0 = hdNode0.derive(internal);
      const pubkey = _node0.derive(index).publicKey;
      pubkeys.push(pubkey);

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
      const p2shP2wsh = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh({
          redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
        }),
      });
      outputData.witnessScript = p2shP2wsh.redeem.redeem.output;
      outputData.redeemScript = p2shP2wsh.redeem.output;
    } else if (this.isNativeSegwit()) {
      // not needed by coldcard, apparently..?
      const p2wsh = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({ m: this._m, pubkeys: MultisigHDWallet.sortBuffers(pubkeys) }),
      });
      outputData.witnessScript = p2wsh.redeem.output;
    } else {
      throw new Error('dont know how to add change output');
    }

    return outputData;
  }

  howManySignaturesCanWeMake() {
    let howManyPrivKeysWeGot = 0;
    for (const cosigner of this._cosigners) {
      if (!MultisigHDWallet.isXpubString(cosigner) && !MultisigHDWallet.isXprvString(cosigner)) howManyPrivKeysWeGot++;
    }

    return howManyPrivKeysWeGot;
  }

  /**
   * @inheritDoc
   */
  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false, masterFingerprint) {
    if (targets.length === 0) throw new Error('No destination provided');
    if (this.howManySignaturesCanWeMake() === 0) skipSigning = true;

    // overriding script length for proper vbytes calculation
    for (const u of utxos) {
      u.script = u.script || {};
      if (this.isNativeSegwit()) {
        u.script.length = u.script.length || Math.ceil((8 + this.getM() * 74 + this.getN() * 34) / 4);
      } else if (this.isWrappedSegwit()) {
        u.script.length = u.script.length || 35 + Math.ceil((8 + this.getM() * 74 + this.getN() * 34) / 4);
      } else {
        u.script.length = u.script.length || 9 + this.getM() * 74 + this.getN() * 34;
      }
    }

    const { inputs, outputs, fee } = this.coinselect(utxos, targets, feeRate, changeAddress);
    sequence = sequence || AbstractHDElectrumWallet.defaultRBFSequence;

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
        let signaturesMade = 0;
        for (const [cosignerIndex, cosigner] of this._cosigners.entries()) {
          if (MultisigHDWallet.isXpubString(cosigner)) continue;
          // ok this is a mnemonic, lets try to sign
          if (signaturesMade >= this.getM()) {
            // dont sign more than we need, otherwise there will be "Too many signatures" error
            continue;
          }
          const passphrase = this._cosignersPassphrases[cosignerIndex];
          let seed = bip39.mnemonicToSeedSync(cosigner, passphrase);
          if (cosigner.startsWith(ELECTRUM_SEED_PREFIX)) {
            seed = MultisigHDWallet.convertElectrumMnemonicToSeed(cosigner, passphrase);
          }

          const hdRoot = HDNode.fromSeed(seed);
          psbt.signInputHD(cc, hdRoot);
          signaturesMade++;
        }
      }
    }

    let tx;
    if (!skipSigning && this.howManySignaturesCanWeMake() >= this.getM()) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }
    return { tx, inputs, outputs, fee, psbt };
  }

  static convertElectrumMnemonicToSeed(cosigner, passphrase) {
    let seed;
    try {
      seed = mn.mnemonicToSeedSync(cosigner.replace(ELECTRUM_SEED_PREFIX, ''), electrumSegwit(passphrase));
    } catch (_) {
      try {
        seed = mn.mnemonicToSeedSync(cosigner.replace(ELECTRUM_SEED_PREFIX, ''), electrumStandart(passphrase));
      } catch (__) {
        throw new Error('Not a valid electrum mnemonic');
      }
    }
    return seed;
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

  prepareForSerialization() {
    // deleting structures that cant be serialized
    delete this._nodes;
  }

  static isPathValid(path) {
    const root = HDNode.fromSeed(Buffer.alloc(32));
    try {
      root.derivePath(path);
      return true;
    } catch (_) {}
    return false;
  }

  allowSend() {
    return true;
  }

  allowSignVerifyMessage() {
    return false;
  }

  async fetchUtxo() {
    await super.fetchUtxo();
    // now we need to fetch txhash for each input as required by PSBT
    const txhexes = await BlueElectrum.multiGetTransactionByTxid(
      this.getUtxo(true).map(x => x.txid),
      50,
      false,
    );

    const newUtxos = [];
    for (const u of this.getUtxo(true)) {
      if (txhexes[u.txid]) u.txhex = txhexes[u.txid];
      newUtxos.push(u);
    }

    this._utxo = newUtxos;
  }

  getID() {
    const string2hash = [...this._cosigners].sort().join(',') + ';' + [...this._cosignersFingerprints].sort().join(',');
    return createHash('sha256').update(string2hash).digest().toString('hex');
  }

  calculateFeeFromPsbt(psbt) {
    let goesIn = 0;
    const cacheUtxoAmounts = {};
    for (const inp of psbt.data.inputs) {
      if (inp.witnessUtxo && inp.witnessUtxo.value) {
        // segwit input
        goesIn += inp.witnessUtxo.value;
      } else if (inp.nonWitnessUtxo) {
        // non-segwit input
        // lets parse this transaction and cache how much each input was worth
        const inputTx = bitcoin.Transaction.fromHex(inp.nonWitnessUtxo);
        let index = 0;
        for (const out of inputTx.outs) {
          cacheUtxoAmounts[inputTx.getId() + ':' + index] = out.value;
          index++;
        }
      }
    }

    if (goesIn === 0) {
      // means we failed to get amounts that go in previously, so lets use utxo amounts cache we've build
      // from non-segwit inputs
      for (const inp of psbt.txInputs) {
        const cacheKey = reverse(inp.hash).toString('hex') + ':' + inp.index;
        if (cacheUtxoAmounts[cacheKey]) goesIn += cacheUtxoAmounts[cacheKey];
      }
    }

    let goesOut = 0;
    for (const output of psbt.txOutputs) {
      goesOut += output.value;
    }

    return goesIn - goesOut;
  }

  calculateHowManySignaturesWeHaveFromPsbt(psbt) {
    let sigsHave = 0;
    for (const inp of psbt.data.inputs) {
      sigsHave = Math.max(sigsHave, inp.partialSig?.length || 0);
      if (inp.finalScriptSig || inp.finalScriptWitness) sigsHave = this.getM(); // hacky, but it means we have enough
      // He who knows that enough is enough will always have enough. Lao Tzu
    }

    return sigsHave;
  }

  /**
   * Tries to signs passed psbt object (by reference). If there are enough signatures - tries to finalize psbt
   * and returns Transaction (ready to extract hex)
   *
   * @param psbt {Psbt}
   * @returns {{ tx: Transaction }}
   */
  cosignPsbt(psbt) {
    for (let cc = 0; cc < psbt.inputCount; cc++) {
      for (const [cosignerIndex, cosigner] of this._cosigners.entries()) {
        if (MultisigHDWallet.isXpubString(cosigner)) continue;

        let hdRoot;
        if (MultisigHDWallet.isXprvString(cosigner)) {
          const xprv = MultisigHDWallet.convertMultisigXprvToRegularXprv(cosigner);
          hdRoot = HDNode.fromBase58(xprv);
        } else {
          const passphrase = this._cosignersPassphrases[cosignerIndex];
          const seed = cosigner.startsWith(ELECTRUM_SEED_PREFIX)
            ? MultisigHDWallet.convertElectrumMnemonicToSeed(cosigner, passphrase)
            : bip39.mnemonicToSeedSync(cosigner, passphrase);
          hdRoot = HDNode.fromSeed(seed);
        }

        try {
          psbt.signInputHD(cc, hdRoot);
        } catch (_) {} // protects agains duplicate cosignings

        if (!psbt.inputHasHDKey(cc, hdRoot)) {
          // failed signing as HD. probably bitcoinjs-lib could not match provided hdRoot's
          // fingerprint (or path?) to the ones in psbt, which is the case of stupid Electrum desktop which can
          // put bullshit paths and fingerprints in created psbt.
          // lets try to find correct priv key and sign manually.
          for (const derivation of psbt.data.inputs[cc].bip32Derivation || []) {
            // okay, here we assume that fingerprint is irrelevant, but ending of the path is somewhat correct and
            // correctly points to `/internal/index`, so we extract pubkey from our stored mnemonics+path and
            // match it to the one provided in PSBT's input, and if we have a match - we are in luck! we can sign
            // with this private key.
            const splt = derivation.path.split('/');
            const internal = +splt[splt.length - 2];
            const index = +splt[splt.length - 1];

            const path =
              hdRoot.depth === 0
                ? this.getCustomDerivationPathForCosigner(cosignerIndex + 1) + `/${internal ? 1 : 0}/${index}`
                : `${internal ? 1 : 0}/${index}`;
            // ^^^ we assume that counterparty has Zpub for specified derivation path
            // if hdRoot.depth !== 0 than this hdnode was recovered from xprv and it already has been set to root path
            const child = hdRoot.derivePath(path);
            if (psbt.inputHasPubkey(cc, child.publicKey)) {
              const keyPair = ECPair.fromPrivateKey(child.privateKey);
              try {
                psbt.signInput(cc, keyPair);
              } catch (_) {}
            }
          }
        }
      }
    }

    let tx = false;
    if (this.calculateHowManySignaturesWeHaveFromPsbt(psbt) >= this.getM()) {
      tx = psbt.finalizeAllInputs().extractTransaction();
    }

    return { tx };
  }

  /**
   * Looks up cosigner by Fingerprint, and repalces all its data with new data
   *
   * @param oldFp {string} Looks up cosigner by this fp
   * @param newCosigner {string}
   * @param newFp {string}
   * @param newPath {string}
   */
  replaceCosigner(oldFp, newCosigner, newFp, newPath) {
    const index = this._cosignersFingerprints.indexOf(oldFp);
    if (index === -1) return;
    if (!MultisigHDWallet.isXpubValid(newCosigner)) {
      // its not an xpub, so lets derive fingerprint ourselves
      newFp = MultisigHDWallet.mnemonicToFingerprint(newCosigner);
      if (oldFp !== newFp) {
        throw new Error('Fingerprint of new seed doesnt match');
      }
    }

    this._cosignersFingerprints[index] = newFp;
    this._cosigners[index] = newCosigner;

    if (newPath && this.getDerivationPath() !== newPath) {
      this._cosignersCustomPaths[index] = newPath;
    }
  }

  deleteCosigner(fp) {
    const foundIndex = this._cosignersFingerprints.indexOf(fp);
    if (foundIndex === -1) throw new Error('Cant find cosigner by fingerprint');

    this._cosignersFingerprints = this._cosignersFingerprints.filter((el, index) => {
      return index !== foundIndex;
    });

    this._cosigners = this._cosigners.filter((el, index) => {
      return index !== foundIndex;
    });

    this._cosignersCustomPaths = this._cosignersCustomPaths.filter((el, index) => {
      return index !== foundIndex;
    });

    this._cosignersPassphrases = this._cosignersPassphrases.filter((el, index) => {
      return index !== foundIndex;
    });

    /* const newCosigners = [];
    for (let c = 0; c < this._cosignersFingerprints.length; c++) {
      if (c !== index)  newCosigners.push(this._cosignersFingerprints[c]);
    } */

    // this._cosignersFingerprints = newCosigners;
  }

  getFormat() {
    if (this.isNativeSegwit()) return this.constructor.FORMAT_P2WSH;
    if (this.isWrappedSegwit()) return this.constructor.FORMAT_P2SH_P2WSH;
    if (this.isLegacy()) return this.constructor.FORMAT_P2SH;

    throw new Error('This should never happen');
  }

  /**
   * @param fp {string} Exactly 8 chars of hex
   * @return {boolean}
   */
  static isFpValid(fp) {
    if (fp.length !== 8) return false;
    return /^[0-9A-F]{8}$/i.test(fp);
  }

  /**
   * Returns TRUE only for _multisignature_ xpubs as per SLIP-0132
   * (capital Z, capital Y, or just xpub)
   * @see https://github.com/satoshilabs/slips/blob/master/slip-0132.md
   *
   * @param xpub
   * @return {boolean}
   */
  static isXpubForMultisig(xpub) {
    return ['xpub', 'Ypub', 'Zpub'].includes(xpub.substring(0, 4));
  }

  isSegwit() {
    return this.isNativeSegwit() || this.isWrappedSegwit();
  }
}
