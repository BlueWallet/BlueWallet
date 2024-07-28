import BIP32Factory from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import b58 from 'bs58check';
import * as mn from 'electrum-mnemonic';

import ecc from '../../blue_modules/noble_ecc';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';

const bip32 = BIP32Factory(ecc);
const PREFIX = mn.PREFIXES.segwit;

type SeedOpts = {
  prefix?: string;
  passphrase?: string;
};

/**
 * ElectrumSeed means that instead of BIP39 seed format it works with the format invented by Electrum wallet. Otherwise
 * its a regular HD wallet that has all the properties of parent class.
 *
 * @see https://electrum.readthedocs.io/en/latest/seedphrase.html
 */
export class HDSegwitElectrumSeedP2WPKHWallet extends HDSegwitBech32Wallet {
  static readonly type = 'HDSegwitElectrumSeedP2WPKHWallet';
  static readonly typeReadable = 'HD Electrum (BIP32 P2WPKH)';
  // @ts-ignore: override
  public readonly type = HDSegwitElectrumSeedP2WPKHWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = HDSegwitElectrumSeedP2WPKHWallet.typeReadable;
  static readonly derivationPath = "m/0'";

  validateMnemonic() {
    return mn.validateMnemonic(this.secret, PREFIX);
  }

  allowBIP47() {
    return false;
  }

  async generate() {
    throw new Error('Not implemented');
  }

  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const args: SeedOpts = { prefix: PREFIX };
    if (this.passphrase) args.passphrase = this.passphrase;
    const root = bip32.fromSeed(mn.mnemonicToSeedSync(this.secret, args));
    const xpub = root.derivePath("m/0'").neutered().toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  _getInternalAddressByIndex(index: number) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    const xpub = this._zpubToXpub(this.getXpub());
    const node = bip32.fromBase58(xpub);
    const address = bitcoin.payments.p2wpkh({
      pubkey: node.derive(1).derive(index).publicKey,
    }).address;
    if (!address) {
      throw new Error('Internal error: no address in _getInternalAddressByIndex');
    }

    return (this.internal_addresses_cache[index] = address);
  }

  _getExternalAddressByIndex(index: number) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    const xpub = this._zpubToXpub(this.getXpub());
    const node = bip32.fromBase58(xpub);
    const address = bitcoin.payments.p2wpkh({
      pubkey: node.derive(0).derive(index).publicKey,
    }).address;
    if (!address) {
      throw new Error('Internal error: no address in _getExternalAddressByIndex');
    }

    return (this.external_addresses_cache[index] = address);
  }

  _getWIFByIndex(internal: boolean, index: number): string | false {
    if (!this.secret) return false;
    const args: SeedOpts = { prefix: PREFIX };
    if (this.passphrase) args.passphrase = this.passphrase;
    const root = bip32.fromSeed(mn.mnemonicToSeedSync(this.secret, args));
    const path = `m/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodePubkeyByIndex(node: number, index: number) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      const xpub = this._zpubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this._zpubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    if (node === 0 && this._node0) {
      return this._node0.derive(index).publicKey;
    }

    if (node === 1 && this._node1) {
      return this._node1.derive(index).publicKey;
    }

    throw new Error('Internal error: this._node0 or this._node1 is undefined');
  }

  isSegwit() {
    return true;
  }
}
