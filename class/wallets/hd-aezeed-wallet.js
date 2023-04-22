import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import b58 from 'bs58check';
import BIP32Factory from 'bip32';
import ecc from '../../blue_modules/noble_ecc';

const bitcoin = require('bitcoinjs-lib');
const { CipherSeed } = require('aezeed');
const bip32 = BIP32Factory(ecc);

/**
 * AEZEED mnemonics support, which is used in LND
 * Support only BIP84 (native segwit) derivations
 *
 * @see https://github.com/lightningnetwork/lnd/tree/master/aezeed
 * @see https://github.com/bitcoinjs/aezeed
 * @see https://github.com/lightningnetwork/lnd/issues/4960
 * @see https://github.com/guggero/chantools/blob/master/doc/chantools_genimportscript.md
 * @see https://github.com/lightningnetwork/lnd/blob/master/keychain/derivation.go
 */
export class HDAezeedWallet extends AbstractHDElectrumWallet {
  static type = 'HDAezeedWallet';
  static typeReadable = 'HD Aezeed';
  static segwitType = 'p2wpkh';
  static derivationPath = "m/84'/0'/0'";

  setSecret(newSecret) {
    this.secret = newSecret.trim();
    this.secret = this.secret.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ');
    return this;
  }

  _getEntropyCached() {
    if (this._entropyHex) {
      // cache hit
      return Buffer.from(this._entropyHex, 'hex');
    } else {
      throw new Error('Entropy cache is not filled');
    }
  }

  getXpub() {
    // first, getting xpub
    const root = bip32.fromSeed(this._getEntropyCached());

    const path = "m/84'/0'/0'";
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  validateMnemonic() {
    throw new Error('Use validateMnemonicAsync()');
  }

  async validateMnemonicAsync() {
    const passphrase = this.getPassphrase() || 'aezeed';
    try {
      const cipherSeed1 = await CipherSeed.fromMnemonic(this.secret, passphrase);
      this._entropyHex = cipherSeed1.entropy.toString('hex'); // save cache
      return !!cipherSeed1.entropy;
    } catch (_) {
      return false;
    }
  }

  async mnemonicInvalidPassword() {
    const passphrase = this.getPassphrase() || 'aezeed';
    try {
      const cipherSeed1 = await CipherSeed.fromMnemonic(this.secret, passphrase);
      this._entropyHex = cipherSeed1.entropy.toString('hex'); // save cache
    } catch (error) {
      return error.message === 'Invalid Password';
    }
    return false;
  }

  async generate() {
    throw new Error('Not implemented');
  }

  _getNode0() {
    const root = bip32.fromSeed(this._getEntropyCached());
    const node = root.derivePath("m/84'/0'/0'");
    return node.derive(0);
  }

  _getNode1() {
    const root = bip32.fromSeed(this._getEntropyCached());
    const node = root.derivePath("m/84'/0'/0'");
    return node.derive(1);
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    this._node1 = this._node1 || this._getNode1(); // cache

    const address = bitcoin.payments.p2wpkh({
      pubkey: this._node1.derive(index).publicKey,
    }).address;

    return (this.internal_addresses_cache[index] = address);
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    this._node0 = this._node0 || this._getNode0(); // cache

    const address = bitcoin.payments.p2wpkh({
      pubkey: this._node0.derive(index).publicKey,
    }).address;

    return (this.external_addresses_cache[index] = address);
  }

  _getWIFByIndex(internal, index) {
    if (!this.secret) return false;
    const root = bip32.fromSeed(this._getEntropyCached());
    const path = `m/84'/0'/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodePubkeyByIndex(node, index) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      this._node0 = this._getNode0();
    }

    if (node === 1 && !this._node1) {
      this._node1 = this._getNode1();
    }

    if (node === 0) {
      return this._node0.derive(index).publicKey;
    }

    if (node === 1) {
      return this._node1.derive(index).publicKey;
    }
  }

  getIdentityPubkey() {
    const root = bip32.fromSeed(this._getEntropyCached());
    const node = root.derivePath("m/1017'/0'/6'/0/0");

    return node.publicKey.toString('hex');
  }

  // since its basically a bip84 wallet, we allow all other standard BIP84 features:

  allowSend() {
    return true;
  }

  allowHodlHodlTrading() {
    return true;
  }

  allowRBF() {
    return true;
  }

  allowPayJoin() {
    return true;
  }

  isSegwit() {
    return true;
  }

  allowSignVerifyMessage() {
    return true;
  }

  allowXpub() {
    return true;
  }
}
