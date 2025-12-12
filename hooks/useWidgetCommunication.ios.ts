import { useEffect, useRef } from 'react';
import DefaultPreference from 'react-native-default-preference';
import { Transaction, TWallet } from '../class/wallets/types';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import debounce from '../blue_modules/debounce';

enum WidgetCommunicationKeys {
  AllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance',
  AllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime',
  DisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed',
  LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed',
}

const WIDGET_ENABLED = '1';
const WIDGET_DISABLED = '0';
const WIDGET_CLEARED_VALUE = '0';

const secondsToMilliseconds = (seconds: number): number => seconds * 1000;

DefaultPreference.setName(GROUP_IO_BLUEWALLET);

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  try {
    const displayBalance = await DefaultPreference.get(WidgetCommunicationKeys.DisplayBalanceAllowed);
    if (displayBalance === WIDGET_ENABLED) {
      return true;
    } else if (displayBalance === WIDGET_DISABLED) {
      return false;
    } else {
      // Preference not set, initialize to enabled by default
      await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, WIDGET_ENABLED);
      return true;
    }
  } catch (error) {
    console.error('Failed to get DisplayBalanceAllowed:', error);
    return true;
  }
};

export const setBalanceDisplayAllowed = async (allowed: boolean): Promise<void> => {
  try {
    if (allowed) {
      await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, WIDGET_ENABLED);
    } else {
      await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, WIDGET_DISABLED);
      // Clear widget data immediately when disabling
      await Promise.all([
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, WIDGET_CLEARED_VALUE),
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, WIDGET_CLEARED_VALUE),
      ]);
    }
    console.debug('setBalanceDisplayAllowed:', allowed);
  } catch (error) {
    console.error('Failed to set DisplayBalanceAllowed:', error);
  }
};

export const calculateBalanceAndTransactionTime = async (
  wallets: TWallet[],
  walletsInitialized: boolean,
): Promise<{
  allWalletsBalance: number;
  latestTransactionTime: number | string;
}> => {
  if (!walletsInitialized || !(await isBalanceDisplayAllowed())) {
    return { allWalletsBalance: 0, latestTransactionTime: 0 };
  }

  const results = await Promise.allSettled(
    wallets.map(async wallet => {
      if (wallet.hideBalance) return { balance: 0, latestTransactionTime: 0 };

      const balance = await wallet.getBalance();
      const transactions: Transaction[] = await wallet.getTransactions();
      const confirmedTransactions = transactions.filter(t => t.confirmations > 0);
      const latestTransactionTime =
        confirmedTransactions.length > 0
          ? secondsToMilliseconds(Math.max(...confirmedTransactions.map(t => t.timestamp || t.time || 0)))
          : WidgetCommunicationKeys.LatestTransactionIsUnconfirmed;

      return { balance, latestTransactionTime };
    }),
  );

  const allWalletsBalance = results.reduce((acc, result) => acc + (result.status === 'fulfilled' ? result.value.balance : 0), 0);
  const latestTransactionTime = results.reduce(
    (max, result) =>
      result.status === 'fulfilled' && typeof result.value.latestTransactionTime === 'number' && result.value.latestTransactionTime > max
        ? result.value.latestTransactionTime
        : max,
    0,
  );

  return { allWalletsBalance, latestTransactionTime };
};

export const syncWidgetBalanceWithWallets = async (
  wallets: TWallet[],
  walletsInitialized: boolean,
  cachedBalance: { current: number },
  cachedLatestTransactionTime: { current: number | string },
): Promise<void> => {
  try {
    const { allWalletsBalance, latestTransactionTime } = await calculateBalanceAndTransactionTime(wallets, walletsInitialized);

    if (cachedBalance.current !== allWalletsBalance || cachedLatestTransactionTime.current !== latestTransactionTime) {
      await Promise.all([
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, String(allWalletsBalance)),
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, String(latestTransactionTime)),
      ]);

      cachedBalance.current = allWalletsBalance;
      cachedLatestTransactionTime.current = latestTransactionTime;
    }
  } catch (error) {
    console.error('Failed to sync widget balance with wallets:', error);
  }
};

const debouncedSyncWidgetBalanceWithWallets = debounce(
  async (
    wallets: TWallet[],
    walletsInitialized: boolean,
    cachedBalance: { current: number },
    cachedLatestTransactionTime: { current: number | string },
  ) => {
    await syncWidgetBalanceWithWallets(wallets, walletsInitialized, cachedBalance, cachedLatestTransactionTime);
  },
  500,
);

const useWidgetCommunication = (): void => {
  const { wallets, walletsInitialized } = useStorage();
  const { isWidgetBalanceDisplayAllowed } = useSettings();
  const cachedBalance = useRef<number>(0);
  const cachedLatestTransactionTime = useRef<number | string>(0);

  // Handle widget data clearing when the setting is disabled
  useEffect(() => {
    const clearWidgetData = async () => {
      if (walletsInitialized && !isWidgetBalanceDisplayAllowed) {
        try {
          await Promise.all([
            DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, WIDGET_CLEARED_VALUE),
            DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, WIDGET_CLEARED_VALUE),
          ]);
          cachedBalance.current = 0;
          cachedLatestTransactionTime.current = 0;
          console.debug('Widget data cleared due to setting being disabled');
        } catch (error) {
          console.error('Failed to clear widget data:', error);
        }
      }
    };

    clearWidgetData();
  }, [isWidgetBalanceDisplayAllowed, walletsInitialized]);

  // Sync widget data when wallets change or setting is enabled
  useEffect(() => {
    if (walletsInitialized) {
      debouncedSyncWidgetBalanceWithWallets(wallets, walletsInitialized, cachedBalance, cachedLatestTransactionTime);
    }
  }, [wallets, walletsInitialized, isWidgetBalanceDisplayAllowed]);

  useEffect(() => {
    return () => {
      debouncedSyncWidgetBalanceWithWallets.cancel();
    };
  }, []);
};

export default useWidgetCommunication;
