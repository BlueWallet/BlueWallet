import { CONST, Wallet } from 'app/consts';

import BlueApp from '../../BlueApp';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isAllWallets = (wallet: Wallet): boolean => wallet.label === CONST.allWallets;

export const noop = () => null;

export const isWalletLableInUse = (value: string): boolean => {
  const walletLabels = BlueApp.getWallets().map((wallet: Wallet) => wallet.label) || [];
  return walletLabels.includes(value);
};
