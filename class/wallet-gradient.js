import { LegacyWallet } from './wallets/legacy-wallet';
import { HDSegwitP2SHWallet } from './wallets/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from './wallets/lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from './wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from './wallets/hd-legacy-p2pkh-wallet';
import { WatchOnlyWallet } from './wallets/watch-only-wallet';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { MultisigHDWallet } from './wallets/multisig-hd-wallet';
import { HDAezeedWallet } from './wallets/hd-aezeed-wallet';
import { LightningLdkWallet } from './wallets/lightning-ldk-wallet';
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitP2SHWallet, SLIP39SegwitBech32Wallet } from './wallets/slip39-wallets';
import { useTheme } from '@react-navigation/native';

export default class WalletGradient {
  static hdSegwitP2SHWallet = ['#007AFF', '#0040FF'];
  static hdSegwitBech32Wallet = ['#6CD9FC', '#44BEE5'];
  static segwitBech32Wallet = ['#6CD9FC', '#44BEE5'];
  static watchOnlyWallet = ['#474646', '#282828'];
  static legacyWallet = ['#37E8C0', '#15BE98'];
  static hdLegacyP2PKHWallet = ['#FD7478', '#E73B40'];
  static hdLegacyBreadWallet = ['#fe6381', '#f99c42'];
  static multisigHdWallet = ['#1ce6eb', '#296fc5', '#3500A2'];
  static defaultGradients = ['#B770F6', '#9013FE'];
  static lightningCustodianWallet = ['#F1AA07', '#FD7E37'];
  static aezeedWallet = ['#8584FF', '#5351FB'];
  static ldkWallet = ['#8584FF', '#5351FB'];

  static createWallet = () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { colors } = useTheme();
    return colors.lightButton;
  };

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
      case SLIP39LegacyP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
      case SLIP39SegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
      case SLIP39SegwitBech32Wallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      case MultisigHDWallet.type:
        gradient = WalletGradient.multisigHdWallet;
        break;
      case HDAezeedWallet.type:
        gradient = WalletGradient.aezeedWallet;
        break;
      case LightningLdkWallet.type:
        gradient = WalletGradient.ldkWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient;
  }

  static linearGradientProps(type) {
    let props;
    switch (type) {
      case MultisigHDWallet.type:
        /* Example
        props = { start: { x: 0, y: 0 } };
        https://github.com/react-native-linear-gradient/react-native-linear-gradient
        */
        break;
      default:
        break;
    }
    return props;
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
      case SLIP39LegacyP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
      case SLIP39SegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
      case SLIP39SegwitBech32Wallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      case MultisigHDWallet.type:
        gradient = WalletGradient.multisigHdWallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case HDAezeedWallet.type:
        gradient = WalletGradient.aezeedWallet;
        break;
      case LightningLdkWallet.type:
        gradient = WalletGradient.ldkWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient[0];
  }
}
