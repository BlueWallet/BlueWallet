import BIP32Factory from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as mn from 'electrum-mnemonic';

import ecc from '../../blue_modules/noble_ecc';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';

const bip32 = BIP32Factory(ecc);
const PREFIX = mn.PREFIXES.standard;

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
export class HDLegacyElectrumSeedP2PKHWallet extends HDLegacyP2PKHWallet {
  static readonly type = 'HDlegacyElectrumSeedP2PKH';
  static readonly typeReadable = 'HD Legacy Electrum (BIP32 P2PKH)';
  // @ts-ignore: override
  public readonly type = HDLegacyElectrumSeedP2PKHWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = HDLegacyElectrumSeedP2PKHWallet.typeReadable;
  static readonly derivationPath = 'm';

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
    this._xpub = root.neutered().toBase58();
    return this._xpub;
  }

  _getInternalAddressByIndex(index: number) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    const node = bip32.fromBase58(this.getXpub());
    const address = bitcoin.payments.p2pkh({
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

    const node = bip32.fromBase58(this.getXpub());
    const address = bitcoin.payments.p2pkh({
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
    const path = `m/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.toWIF();
  }

  _getNodePubkeyByIndex(node: number, index: number) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      const xpub = this.getXpub();
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this.getXpub();
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
}
