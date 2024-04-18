import React, { useContext, useEffect } from 'react';
import DefaultPreference from 'react-native-default-preference';
// @ts-ignore: no type definitions
import RNWidgetCenter from 'react-native-widget-center';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { TWallet } from '../class/wallets/types';
import { useSettings } from './Context/SettingsContext';

enum WidgetCommunicationKeys {
  AllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance',
  AllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime',
  DisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed',
  LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed',
}

export const reloadAllTimelines = (): void => {
  RNWidgetCenter.reloadAllTimelines();
};

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName('group.io.bluewallet.bluewallet');
    const displayBalance = await DefaultPreference.get(WidgetCommunicationKeys.DisplayBalanceAllowed);
    return displayBalance === '1';
  } catch {
    return false;
  }
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {
  await DefaultPreference.setName('group.io.bluewallet.bluewallet');
  if (value) {
    await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, '1');
  } else {
    await DefaultPreference.clear(WidgetCommunicationKeys.DisplayBalanceAllowed);
  }
  reloadAllTimelines();
};

export const syncWidgetBalanceWithWallets = async (wallets: TWallet[], walletsInitialized: boolean): Promise<void> => {
  await DefaultPreference.setName('group.io.bluewallet.bluewallet');
  const { allWalletsBalance, latestTransactionTime } = await allWalletsBalanceAndTransactionTime(wallets, walletsInitialized);
  await DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, String(allWalletsBalance));
  await DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, String(latestTransactionTime));
  reloadAllTimelines();
};

const allWalletsBalanceAndTransactionTime = async (
  wallets: TWallet[],
  walletsInitialized: boolean,
): Promise<{ allWalletsBalance: number; latestTransactionTime: number | string }> => {
  if (!walletsInitialized || !(await isBalanceDisplayAllowed())) {
    return { allWalletsBalance: 0, latestTransactionTime: 0 };
  }
  let balance = 0;
  let latestTransactionTime: number | string = 0;
  wallets.forEach((wallet: TWallet) => {
    if (wallet.hideBalance) return;
    balance += wallet.getBalance();
    const walletLatestTime = wallet.getLatestTransactionTimeEpoch();
    if (typeof latestTransactionTime === 'number' && walletLatestTime > latestTransactionTime) {
      latestTransactionTime =
        wallet.getTransactions()[0]?.confirmations === 0 ? WidgetCommunicationKeys.LatestTransactionIsUnconfirmed : walletLatestTime;
    }
  });

  return { allWalletsBalance: balance, latestTransactionTime };
};

const WidgetCommunication: React.FC = () => {
  const { wallets, walletsInitialized } = useContext(BlueStorageContext);
  const { isWidgetBalanceDisplayAllowed } = useSettings();

  useEffect(() => {
    if (walletsInitialized) {
      syncWidgetBalanceWithWallets(wallets, walletsInitialized);
    }
  }, [wallets, walletsInitialized, isWidgetBalanceDisplayAllowed]);

  return null;
};

export default WidgetCommunication;
