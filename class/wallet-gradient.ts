import { FC } from 'react';
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
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitP2SHWallet, SLIP39SegwitBech32Wallet } from './wallets/slip39-wallets';
import { useTheme } from '@react-navigation/native';

type GradientType = [string, string, string?];

type GradientMapType = {
  [key: string]: GradientType;
};

type WalletGradientProps = {
  type: string;
};

const WalletGradient: WalletGradientProps = (type: string) => {
  const { colors } = useTheme();

  const hdSegwitP2SHWallet: GradientType = ['#007AFF', '#0040FF'];
  const hdSegwitBech32Wallet: GradientType = ['#6CD9FC', '#44BEE5'];
  const segwitBech32Wallet: GradientType = ['#6CD9FC', '#44BEE5'];
  const watchOnlyWallet: GradientType = ['#474646', '#282828'];
  const legacyWallet: GradientType = ['#37E8C0', '#15BE98'];
  const hdLegacyP2PKHWallet: GradientType = ['#FD7478', '#E73B40'];
  const hdLegacyBreadWallet: GradientType = ['#fe6381', '#f99c42'];
  const multisigHdWallet: GradientType = ['#1ce6eb', '#296fc5', '#3500A2'];
  const defaultGradients: GradientType = ['#B770F6', '#9013FE'];
  const lightningCustodianWallet: GradientType = ['#F1AA07', '#FD7E37'];
  const aezeedWallet: GradientType = ['#8584FF', '#5351FB'];
  const ldkWallet: GradientType = ['#8584FF', '#5351FB'];
  // @ts-ignore: Ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createWallet: GradientType = colors.lightButton;

  const gradients: GradientMapType = {
    [WatchOnlyWallet.type]: watchOnlyWallet,
    [LegacyWallet.type]: legacyWallet,
    [HDLegacyP2PKHWallet.type]: hdLegacyP2PKHWallet,
    [HDLegacyElectrumSeedP2PKHWallet.type]: hdLegacyP2PKHWallet,
    [SLIP39LegacyP2PKHWallet.type]: hdLegacyP2PKHWallet,
    [HDLegacyBreadwalletWallet.type]: hdLegacyBreadWallet,
    [HDSegwitP2SHWallet.type]: hdSegwitP2SHWallet,
    [SLIP39SegwitP2SHWallet.type]: hdSegwitP2SHWallet,
    [HDSegwitBech32Wallet.type]: hdSegwitBech32Wallet,
    [HDSegwitElectrumSeedP2WPKHWallet.type]: hdSegwitBech32Wallet,
    [SLIP39SegwitBech32Wallet.type]: hdSegwitBech32Wallet,
    [SegwitBech32Wallet.type]: segwitBech32Wallet,
    [MultisigHDWallet.type]: multisigHdWallet,
    [LightningCustodianWallet.type]: lightningCustodianWallet,
    [HDAezeedWallet.type]: aezeedWallet,
    default: defaultGradients,
  };

  const gradient: GradientType = gradients[type] || gradients.default;

  return gradient;
};

export default WalletGradient;
