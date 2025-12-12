import BIP32Factory, { BIP32Interface } from 'bip32';
import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import ecc from '../../blue_modules/noble_ecc';
import * as bitcoin from 'bitcoinjs-lib';
import { Psbt } from 'bitcoinjs-lib';
import { CoinSelectReturnInput } from 'coinselect';

const bip32 = BIP32Factory(ecc);

/**
 * @see https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki
 */
export class HDTaprootWallet extends AbstractHDElectrumWallet {
  static readonly type = 'HDtaproot';
  static readonly typeReadable = 'HD Taproot (BIP86)';
  // @ts-ignore: override
  public readonly type = HDTaprootWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = HDTaprootWallet.typeReadable;
  public readonly segwitType = 'p2tr';
  static readonly derivationPath = "m/86'/0'/0'";

  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const seed = this._getSeed();
    const root = bip32.fromSeed(seed);

    const path = this.getDerivationPath();
    if (!path) {
      throw new Error('Internal error: no path');
    }
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();
    this._xpub = xpub;

    // returning regular xpub since industry standard is to use regular xpubs for Taproot wallets without any
    // kind of prefix change (like ypub or zpub)
    return xpub;
  }

  _hdNodeToAddress(hdNode: BIP32Interface): string {
    return this._nodeToTaprootAddress(hdNode);
  }

  _nodeToTaprootAddress(hdNode: BIP32Interface): string {
    const xOnlyPubkey = hdNode.publicKey.subarray(1, 33);

    const { address } = bitcoin.payments.p2tr({
      internalPubkey: xOnlyPubkey,
    });

    if (!address) {
      throw new Error('Could not create address in _nodeToTaprootAddress');
    }

    return address;
  }

  _getNodePubkeyByIndex(node: number, index: number) {
    index = index * 1; // cast to int

    if (node === 0 && !this._node0) {
      let xpub = this.getXpub();
      if (xpub.startsWith('zpub')) {
        // bip32.fromBase58() wont work with zpub prefix, need to swap it for the traditional one
        xpub = this._zpubToXpub(xpub);
      }
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      let xpub = this.getXpub();
      if (xpub.startsWith('zpub')) {
        // bip32.fromBase58() wont work with zpub prefix, need to swap it for the traditional one
        xpub = this._zpubToXpub(xpub);
      }
      const hdNode = bip32.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    if (node === 0 && this._node0) {
      return this._node0.derive(index).publicKey.subarray(1, 33);
    }

    if (node === 1 && this._node1) {
      return this._node1.derive(index).publicKey.subarray(1, 33);
    }

    throw new Error('Internal error: this._node0 or this._node1 is undefined');
  }

  _addPsbtInput(psbt: Psbt, input: CoinSelectReturnInput, sequence: number, masterFingerprintBuffer: Buffer) {
    if (!input.address) {
      throw new Error('Internal error: no address on Utxo during _addPsbtInput()');
    }
    const pubkey = this._getPubkeyByAddress(input.address);
    const path = this._getDerivationPathByAddress(input.address);
    if (!pubkey || !path) {
      throw new Error('Internal error: pubkey or path are invalid');
    }

    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: pubkey,
    });
    if (!p2tr.output) throw new Error('Could not build p2tr.output');

    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence,
      witnessUtxo: {
        script: p2tr.output!,
        value: BigInt(input.value),
      },
      tapBip32Derivation: [
        {
          pubkey: new Uint8Array(pubkey),
          masterFingerprint: new Uint8Array(masterFingerprintBuffer),
          path,
          leafHashes: [],
        },
      ],

      // tell PSBT it’s a key-path Taproot spend
      tapInternalKey: pubkey,
    });

    return psbt;
  }

  allowSend() {
    return true;
  }

  allowCosignPsbt() {
    return true;
  }

  // is it even used anywhere..?
  isSegwit() {
    return true;
  }

  allowSignVerifyMessage() {
    return false;
  }

  allowMasterFingerprint() {
    return true;
  }

  allowXpub() {
    return true;
  }

  allowBIP47() {
    return true;
  }

  allowSilentPaymentSend(): boolean {
    return true;
  }
}
