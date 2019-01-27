import { LegacyWallet } from './legacy-wallet';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from './hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { WatchOnlyWallet } from './watch-only-wallet';

export default class WalletGradient {
  static defaultGradients = ['#65ceef', '#68bbe1'];
  static watchOnlyWallet = ['#7d7d7d', '#4a4a4a'];
  static legacyWallet = ['#40fad1', '#15be98'];
  static hdLegacyP2PKHWallet = ['#e36dfa', '#bd10e0'];
  static hdLegacyBreadWallet = ['#fe6381', '#f99c42'];
  static hdSegwitP2SHWallet = ['#c65afb', '#9053fe'];
  static lightningCustodianWallet = ['#f1be07', '#f79056'];
  static createWallet = ['#eef0f4', '#eef0f4'];

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
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case 'CreateWallet':
        gradient = WalletGradient.createWallet;
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
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case 'CreateWallet':
        gradient = WalletGradient.createWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient[0];
  }
}
