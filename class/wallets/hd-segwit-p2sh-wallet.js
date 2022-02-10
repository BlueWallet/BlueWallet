import b58 from 'bs58check';
import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory(ecc);
const bitcoin = require('bitcoinjs-lib');

/**
 * HD Wallet (BIP39).
 * In particular, BIP49 (P2SH Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
 */
export class HDSegwitP2SHWallet extends AbstractHDElectrumWallet {
  static type = 'HDsegwitP2SH';
  static typeReadable = 'HD SegWit (BIP49 P2SH)';
  static segwitType = 'p2sh(p2wpkh)';
  static derivationPath = "m/49'/0'/0'";

  allowSend() {
    return true;
  }

  allowCosignPsbt() {
    return true;
  }

  allowSignVerifyMessage() {
    return true;
  }

  allowHodlHodlTrading() {
    return true;
  }

  allowMasterFingerprint() {
    return true;
  }

  allowXpub() {
    return true;
  }

  _getNodeAddressByIndex(node, index) {
    index = index * 1; // cast to int
    if (node === 0) {
      if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    }

    if (node === 0 && !this._node0) {
      const xpub = this.constructor._ypubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(0);
    }

    if (node === 1 && !this._node1) {
      const xpub = this.constructor._ypubToXpub(this.getXpub());
      const hdNode = bip32.fromBase58(xpub);
      this._node1 = hdNode.derive(1);
    }

    let address;
    if (node === 0) {
      address = this.constructor._nodeToP2shSegwitAddress(this._node0.derive(index));
    }

    if (node === 1) {
      address = this.constructor._nodeToP2shSegwitAddress(this._node1.derive(index));
    }

    if (node === 0) {
      return (this.external_addresses_cache[index] = address);
    }

    if (node === 1) {
      return (this.internal_addresses_cache[index] = address);
    }
  }

  /**
   * Returning ypub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} ypub
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const seed = this._getSeed();
    const root = bip32.fromSeed(seed);

    const path = this.getDerivationPath();
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support ypub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('049d7cb2', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  _addPsbtInput(psbt, input, sequence, masterFingerprintBuffer) {
    const pubkey = this._getPubkeyByAddress(input.address);
    const path = this._getDerivationPathByAddress(input.address);
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
    const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh });

    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence,
      bip32Derivation: [
        {
          masterFingerprint: masterFingerprintBuffer,
          path,
          pubkey,
        },
      ],
      witnessUtxo: {
        script: p2sh.output,
        value: input.amount || input.value,
      },
      redeemScript: p2wpkh.output,
    });

    return psbt;
  }

  /**
   * Creates Segwit P2SH Bitcoin address
   * @param hdNode
   * @returns {String}
   */
  static _nodeToP2shSegwitAddress(hdNode) {
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: hdNode.publicKey }),
    });
    return address;
  }

  isSegwit() {
    return true;
  }
}
