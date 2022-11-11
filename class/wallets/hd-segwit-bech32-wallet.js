import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';

/**
 * HD Wallet (BIP39).
 * In particular, BIP84 (Bech32 Native Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 */
export class HDSegwitBech32Wallet extends AbstractHDElectrumWallet {
  static type = 'HDsegwitBech32';
  static typeReadable = 'HD SegWit (BIP84 Bech32 Native)';
  static segwitType = 'p2wpkh';
  static derivationPath = "m/84'/0'/0'";

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

  allowCosignPsbt() {
    return true;
  }

  isSegwit() {
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
}
