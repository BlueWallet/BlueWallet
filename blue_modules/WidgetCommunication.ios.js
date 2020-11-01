import { useContext, useEffect } from 'react';
import { BlueStorageContext } from './storage-context';
import DefaultPreference from 'react-native-default-preference';
import RNWidgetCenter from 'react-native-widget-center';

const WidgetCommunicationAllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance';
const WidgetCommunicationAllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime';

function WidgetCommunication() {
  const { wallets, walletsInitialized, isStorageEncrypted } = useContext(BlueStorageContext);

  const allWalletsBalanceAndTransactionTime = async () => {
    if (await isStorageEncrypted()) {
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
          latestTransactionTime = wallet.getLatestTransactionTimeEpoch();
        }
      }
      return { allWalletsBalance: balance, latestTransactionTime };
    }
  };
  const setValues = async () => {
    await DefaultPreference.setName('group.io.bluewallet.bluewallet');
    const { allWalletsBalance, latestTransactionTime } = await allWalletsBalanceAndTransactionTime();
    await DefaultPreference.set(WidgetCommunicationAllWalletsSatoshiBalance, JSON.stringify(allWalletsBalance));
    await DefaultPreference.set(WidgetCommunicationAllWalletsLatestTransactionTime, JSON.stringify(latestTransactionTime));
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
