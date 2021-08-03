import { useContext, useEffect } from 'react';
import { BlueStorageContext } from './storage-context';
import DefaultPreference from 'react-native-default-preference';
import RNWidgetCenter from 'react-native-widget-center';
import AsyncStorage from '@react-native-async-storage/async-storage';

function WidgetCommunication() {
  WidgetCommunication.WidgetCommunicationAllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance';
  WidgetCommunication.WidgetCommunicationAllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime';
  WidgetCommunication.WidgetCommunicationDisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed';
  WidgetCommunication.LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed';
  const { wallets, walletsInitialized, isStorageEncrypted } = useContext(BlueStorageContext);

  WidgetCommunication.isBalanceDisplayAllowed = async () => {
    try {
      const displayBalance = JSON.parse(await AsyncStorage.getItem(WidgetCommunication.WidgetCommunicationDisplayBalanceAllowed));
      if (displayBalance !== null) {
        return displayBalance;
      } else {
        return true;
      }
    } catch (e) {
      return true;
    }
  };

  WidgetCommunication.setBalanceDisplayAllowed = async value => {
    await AsyncStorage.setItem(WidgetCommunication.WidgetCommunicationDisplayBalanceAllowed, JSON.stringify(value));
    setValues();
  };

  WidgetCommunication.reloadAllTimelines = () => {
    RNWidgetCenter.reloadAllTimelines();
  };

  const allWalletsBalanceAndTransactionTime = async () => {
    if ((await isStorageEncrypted()) || !(await WidgetCommunication.isBalanceDisplayAllowed())) {
      return { allWalletsBalance: 0, latestTransactionTime: 0 };
    } else {
      let balance = 0;
      let latestTransactionTime = 0;
      for (const wallet of wallets) {
        if (wallet.hideBalance) {
          continue;
        }
        balance += wallet.getBalance();
        if (wallet.getLatestTransactionTimeEpoch() > latestTransactionTime) {
          if (wallet.getTransactions()[0].confirmations === 0) {
            latestTransactionTime = WidgetCommunication.LatestTransactionIsUnconfirmed;
          } else {
            latestTransactionTime = wallet.getLatestTransactionTimeEpoch();
          }
        }
      }
      return { allWalletsBalance: balance, latestTransactionTime };
    }
  };
  const setValues = async () => {
    await DefaultPreference.setName('group.io.bluewallet.bluewallet');
    const { allWalletsBalance, latestTransactionTime } = await allWalletsBalanceAndTransactionTime();
    await DefaultPreference.set(WidgetCommunication.WidgetCommunicationAllWalletsSatoshiBalance, JSON.stringify(allWalletsBalance));
    await DefaultPreference.set(
      WidgetCommunication.WidgetCommunicationAllWalletsLatestTransactionTime,
      JSON.stringify(latestTransactionTime),
    );
    RNWidgetCenter.reloadAllTimelines();
  };

  useEffect(() => {
    if (walletsInitialized) {
      setValues();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, walletsInitialized]);
  return null;
}

export default WidgetCommunication;
