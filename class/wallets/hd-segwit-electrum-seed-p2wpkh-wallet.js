import b58 from 'bs58check';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';

const bitcoin = require('bitcoinjs-lib');
const mn = require('electrum-mnemonic');
const HDNode = require('bip32');

const PREFIX = mn.PREFIXES.segwit;

/**
 * ElectrumSeed means that instead of BIP39 seed format it works with the format invented by Electrum wallet. Otherwise
 * its a regular HD wallet that has all the properties of parent class.
 *
 * @see https://electrum.readthedocs.io/en/latest/seedphrase.html
 */
export class HDSegwitElectrumSeedP2WPKHWallet extends HDSegwitBech32Wallet {
  static type = 'HDSegwitElectrumSeedP2WPKHWallet';
  static typeReadable = 'HD Electrum (BIP32 P2WPKH)';
  static derivationPath = "m/0'";

  validateMnemonic() {
    return mn.validateMnemonic(this.secret, PREFIX);
  }

  async generate() {
    throw new Error('Not implemented');
  }

  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const args = { prefix: PREFIX };
    if (this.passphrase) args.passphrase = this.passphrase;
    const root = bitcoin.bip32.fromSeed(mn.mnemonicToSeedSync(this.secret, args));
    const xpub = root.derivePath("m/0'").neutered().toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    const xpub = this.constructor._zpubToXpub(this.getXpub());
    const node = bitcoin.bip32.fromBase58(xpub);
    const address = bitcoin.payments.p2wpkh({
      pubkey: node.derive(1).derive(index).publicKey,
    }).address;

    return (this.internal_addresses_cache[index] = address);
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    const xpub = this.constructor._zpubToXpub(this.getXpub());
    const node = bitcoin.bip32.fromBase58(xpub);
    const address = bitcoin.payments.p2wpkh({
      pubkey: node.derive(0).derive(index).publicKey,
    }).address;

    return (this.external_addresses_cache[index] = address);
  }

  _getWIFByIndex(internal, index) {
    if (!this.secret) return false;
    const args = { prefix: PREFIX };
    if (this.passphrase) args.passphrase = this.passphrase;
    const root = bitcoin.bip32.fromSeed(mn.mnemonicToSeedSync(this.secret, args));
    const path = `m/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodePubkeyByIndex(node, index) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this.constructor._zpubToXpub(this.getXpub());
      const hdNode = HDNode.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    if (node === 0) {
      return this._node0.derive(index).publicKey;
    }

    if (node === 1) {
      return this._node1.derive(index).publicKey;
    }
  }
}
