import BIP32Factory, { BIP32Interface } from 'bip32';
import { Psbt } from 'bitcoinjs-lib';
import { CoinSelectReturnInput } from 'coinselect';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import ecc from '../../blue_modules/noble_ecc';
import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';

const bip32 = BIP32Factory(ecc);

/**
 * HD Wallet (BIP39).
 * In particular, BIP44 (P2PKH legacy addressess)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 */
export class HDLegacyP2PKHWallet extends AbstractHDElectrumWallet {
  static readonly type = 'HDlegacyP2PKH';
  static readonly typeReadable = 'HD Legacy (BIP44 P2PKH)';
  // @ts-ignore: override
  public readonly type = HDLegacyP2PKHWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = HDLegacyP2PKHWallet.typeReadable;
  static readonly derivationPath = "m/44'/0'/0'";

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
    if (!path) {
      throw new Error('Internal error: no path');
    }
    const child = root.derivePath(path).neutered();
    this._xpub = child.toBase58();

    return this._xpub;
  }

  _hdNodeToAddress(hdNode: BIP32Interface): string {
    return this._nodeToLegacyAddress(hdNode);
  }

  async fetchUtxo(): Promise<void> {
    await super.fetchUtxo();
    // now we need to fetch txhash for each input as required by PSBT
    const txhexes = await BlueElectrum.multiGetTransactionByTxid(
      this.getUtxo().map(x => x.txid),
      false,
    );

    for (const u of this.getUtxo()) {
      if (txhexes[u.txid]) u.txhex = txhexes[u.txid];
    }
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

  allowSilentPaymentSend(): boolean {
    return true;
  }
}
