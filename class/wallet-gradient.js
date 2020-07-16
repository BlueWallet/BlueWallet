import { LegacyWallet } from './wallets/legacy-wallet';
import { HDSegwitP2SHWallet } from './wallets/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from './wallets/lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from './wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from './wallets/hd-legacy-p2pkh-wallet';
import { WatchOnlyWallet } from './wallets/watch-only-wallet';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { PlaceholderWallet } from './wallets/placeholder-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { BlueCurrentTheme } from '../components/themes';

export default class WalletGradient {
  static hdSegwitP2SHWallet = ['#65ceef', '#68bbe1'];
  static hdSegwitBech32Wallet = ['#68bbe1', '#3b73d4'];
  static segwitBech32Wallet = ['#f8bbe1', '#945a90'];
  static watchOnlyWallet = ['#7d7d7d', '#4a4a4a'];
  static legacyWallet = ['#40fad1', '#15be98'];
  static hdLegacyP2PKHWallet = ['#e36dfa', '#bd10e0'];
  static hdLegacyBreadWallet = ['#fe6381', '#f99c42'];
  static defaultGradients = ['#c65afb', '#9053fe'];
  static lightningCustodianWallet = ['#f1be07', '#f79056'];
  static createWallet = BlueCurrentTheme.colors.lightButton;

  static gradientsFor(type) {
    let gradient;
    switch (type) {
      case WatchOnlyWallet.type:
        gradient = WalletGradient.watchOnlyWallet;
        break;
      case LegacyWallet.type:
        gradient = WalletGradient.legacyWallet;
        break;
      case HDLegacyP2PKHWallet.type:
      case HDLegacyElectrumSeedP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case PlaceholderWallet.type:
        gradient = WalletGradient.watchOnlyWallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient;
  }

  static headerColorFor(type) {
    let gradient;
    switch (type) {
      case WatchOnlyWallet.type:
        gradient = WalletGradient.watchOnlyWallet;
        break;
      case LegacyWallet.type:
        gradient = WalletGradient.legacyWallet;
        break;
      case HDLegacyP2PKHWallet.type:
      case HDLegacyElectrumSeedP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient[0];
  }
}
