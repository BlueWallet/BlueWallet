import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory(ecc);
const BlueElectrum = require('../../blue_modules/BlueElectrum');

/**
 * HD Wallet (BIP39).
 * In particular, BIP44 (P2PKH legacy addressess)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 */
export class HDLegacyP2PKHWallet extends AbstractHDElectrumWallet {
  static type = 'HDlegacyP2PKH';
  static typeReadable = 'HD Legacy (BIP44 P2PKH)';
  static derivationPath = "m/44'/0'/0'";

  allowSend() {
    return true;
  }

  allowCosignPsbt() {
    return true;
  }

  allowSignVerifyMessage() {
    return true;
  }

  allowMasterFingerprint() {
    return true;
  }

  allowXpub() {
    return true;
  }

  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    const seed = this._getSeed();
    const root = bip32.fromSeed(seed);

    const path = this.getDerivationPath();
    const child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();

    return this._xpub;
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
      const xpub = this.getXpub();
      const hdNode = bip32.fromBase58(xpub);
      this._node0 = hdNode.derive(node);
    }

    if (node === 1 && !this._node1) {
      const xpub = this.getXpub();
      const hdNode = bip32.fromBase58(xpub);
      this._node1 = hdNode.derive(node);
    }

    let address;
    if (node === 0) {
      address = this.constructor._nodeToLegacyAddress(this._node0.derive(index));
    }

    if (node === 1) {
      address = this.constructor._nodeToLegacyAddress(this._node1.derive(index));
    }

    if (node === 0) {
      return (this.external_addresses_cache[index] = address);
    }

    if (node === 1) {
      return (this.internal_addresses_cache[index] = address);
    }
  }

  async fetchUtxo() {
    await super.fetchUtxo();
    // now we need to fetch txhash for each input as required by PSBT
    const txhexes = await BlueElectrum.multiGetTransactionByTxid(
      this.getUtxo().map(x => x.txid),
      50,
      false,
    );

    const newUtxos = [];
    for (const u of this.getUtxo()) {
      if (txhexes[u.txid]) u.txhex = txhexes[u.txid];
      newUtxos.push(u);
    }

    return newUtxos;
  }

  _addPsbtInput(psbt, input, sequence, masterFingerprintBuffer) {
    const pubkey = this._getPubkeyByAddress(input.address);
    const path = this._getDerivationPathByAddress(input.address, 44);

    if (!input.txhex) throw new Error('UTXO is missing txhex of the input, which is required by PSBT for non-segwit input');

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
      // non-segwit inputs now require passing the whole previous tx as Buffer
      nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
    });

    return psbt;
  }
}
