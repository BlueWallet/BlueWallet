import { useTheme } from '../components/themes';
import { TWallet, WalletType } from './wallets/types';

export default class WalletGradient {
  static gradients: Record<WalletType, string[]> = {
    [WalletType.HDSegwitP2SH]: ['#007AFF', '#0040FF'],
    [WalletType.HDSegwitBech32]: ['#6CD9FC', '#44BEE5'],
    [WalletType.SegwitBech32]: ['#6CD9FC', '#44BEE5'],
    [WalletType.WatchOnly]: ['#474646', '#282828'],
    [WalletType.Legacy]: ['#37E8C0', '#15BE98'],
    [WalletType.HDLegacyP2PKH]: ['#FD7478', '#E73B40'],
    [WalletType.HDLegacyBreadwallet]: ['#fe6381', '#f99c42'],
    [WalletType.MultisigHD]: ['#1ce6eb', '#296fc5', '#3500A2'],
    [WalletType.LightningCustodian]: ['#F1AA07', '#FD7E37'],
    [WalletType.HDAezeed]: ['#8584FF', '#5351FB'],
    [WalletType.LightningLdk]: ['#8584FF', '#5351FB'],
    [WalletType.HDLegacyElectrumSeedP2PKH]: ['#FD7478', '#E73B40'],
    [WalletType.HDSegwitElectrumSeedP2WPKH]: ['#6CD9FC', '#44BEE5'],
    [WalletType.SLIP39LegacyP2PKH]: ['#FD7478', '#E73B40'],
    [WalletType.SLIP39SegwitBech32]: ['#6CD9FC', '#44BEE5'],
    [WalletType.SLIP39SegwitP2SH]: ['#007AFF', '#0040FF'],
    [WalletType.SegwitP2SH]: ['#6CD9FC', '#44BEE5'],
    [WalletType.AbstractWallet]: ['#B770F6', '#9013FE'],
  };

  static defaultGradients = ['#B770F6', '#9013FE'];

  static createWallet = () => {
    const { colors } = useTheme();
    return colors.lightButton;
  };

  static gradientsFor(walletType: WalletType): string[] {
    const gradient = WalletGradient.gradients[walletType] || WalletGradient.defaultGradients;
    return gradient;
  }

  static linearGradientProps(wallet: TWallet) {
    let props: any;
    if (wallet.type === WalletType.MultisigHD) {
      /* Example
      props = { start: { x: 0, y: 0 } };
      https://github.com/react-native-linear-gradient/react-native-linear-gradient
      */
    }
    return props;
  }

  static headerColorFor(walletType: WalletType): string {
    const gradient = WalletGradient.gradients[walletType] || WalletGradient.defaultGradients;
    return gradient[0];
  }
}