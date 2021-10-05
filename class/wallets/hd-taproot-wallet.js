import * as bitcoin from 'bitcoinjs-lib';
import * as HDNode from 'bip32';
import b58 from 'bs58check';

import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import network from '../network';

/**
 * HD Wallet (BIP39).
 * In particular, BIP86 (Bech32 Native Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 */
export class HDTaprootWallet extends AbstractHDElectrumWallet {
  static type = 'HDsegwitBech32';
  static typeReadable = 'HD SegWit (BIP86 Taproot P2TR)';
  // static segwitType = 'p2wpkh';
  static derivationPath = "m/86'/0'/0'";

  allowSend() {
    return true;
  }

  allowHodlHodlTrading() {
    return false;
  }

  allowRBF() {
    return true;
  }

  allowPayJoin() {
    return true;
  }

  allowCosignPsbt() {
    return true;
  }

  isSegwit() {
    return false;
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
    const seed = this._getSeed();
    const root = HDNode.fromSeed(seed, network);

    const path = this.getDerivationPath();
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support zpub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('04b24746', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  getXpub2() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const seed = this._getSeed();
    const root = HDNode.fromSeed(seed);

    const path = this.getDerivationPath();
    const child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();

    return this._xpub;
  }

  _addPsbtInput(psbt, input, sequence, masterFingerprintBuffer) {
    const pubkey = this._getPubkeyByAddress(input.address);
    const path = this._getDerivationPathByAddress(input.address);
    const p2tr = bitcoin.payments.p2tr({ pubkey, network });

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
        script: p2tr.output,
        value: input.amount || input.value,
      },
    });

    return psbt;
  }

}
