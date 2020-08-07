import { CONST, Wallet, TxType } from 'app/consts';

import BlueApp from '../../BlueApp';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isAllWallets = (wallet: Wallet): boolean => wallet.label === CONST.allWallets;

export const noop = () => null;

export const isWalletLableInUse = (value: string): boolean => {
  const walletLabels = BlueApp.getWallets().map((wallet: Wallet) => wallet.label) || [];
  return walletLabels.includes(value);
};

export const getWalletTypeByLabel = (label: string): string => {
  const wallets = BlueApp.getWallets();
  return (
    wallets?.find(item => {
      return item.label === label;
    }).typeReadable || ''
  );
};

export const getConfirmationsText = (txType: TxType, confirmations: number): string => {
  const maxConfirmations = [TxType.ALERT_PENDING, TxType.ALERT_CONFIRMED].includes(txType)
    ? CONST.alertBlocks
    : CONST.confirmationsBlocks;
  const confs = confirmations > maxConfirmations ? maxConfirmations : confirmations;
  return `${confs}/${maxConfirmations}`;
};
