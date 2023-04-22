import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import BIP32Factory from 'bip32';
import ecc from '../../blue_modules/noble_ecc';
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

  allowBIP47() {
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

  _hdNodeToAddress(hdNode) {
    return this._nodeToLegacyAddress(hdNode);
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
