import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';

/**
 * HD Wallet (BIP39).
 * In particular, BIP84 (Bech32 Native Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 */
export class HDSegwitBech32Wallet extends AbstractHDElectrumWallet {
  static readonly type = 'HDsegwitBech32';
  static readonly typeReadable = 'HD SegWit (BIP84 Bech32 Native)';
  // @ts-ignore: override
  public readonly type = HDSegwitBech32Wallet.type;
  // @ts-ignore: override
  public readonly typeReadable = HDSegwitBech32Wallet.typeReadable;
  public readonly segwitType = 'p2wpkh';
  static readonly derivationPath = "m/84'/0'/0'";

  allowSend() {
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

  allowBIP47() {
    return true;
  }

  allowSilentPaymentSend(): boolean {
    return true;
  }
}
