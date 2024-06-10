import React, { createContext, useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { ToastAndroid, Platform, View, Text, StyleSheet, InteractionManager } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import BlueApp from '../../blue_modules/start-and-decrypt';

export interface ElectrumContextProps {
  isElectrumDisabled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  waitTillConnected: () => Promise<boolean>;
  testServerConnection: (host: string, tcpPort?: number, sslPort?: number) => Promise<boolean>;
  refreshAllWalletTransactions: (lastSnappedTo?: number, showUpdateStatusIndicator?: boolean) => Promise<void>;
  getTransactions: typeof BlueApp.getTransactions;
  fetchWalletBalances: typeof BlueApp.fetchWalletBalances;
  fetchWalletTransactions: typeof BlueApp.fetchWalletTransactions;
  fetchAndSaveWalletTransactions: (walletID: string) => Promise<void>;
  getBalance: typeof BlueApp.getBalance;
  estimateFees: typeof BlueElectrum.estimateFees;
}

export const ElectrumContext = createContext<ElectrumContextProps | undefined>(undefined);

const ElectrumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isElectrumDisabled, setIsElectrumDisabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const txMetadata = useRef(BlueApp.tx_metadata);
  const counterpartyMetadata = useRef(BlueApp.counterparty_metadata || {});
  const wallets = useRef(BlueApp.getWallets());

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const connect = useCallback(async () => {
    try {
      await BlueElectrum.connectMain();
      showToast('Connected to Electrum server');
    } catch (error) {
      showToast('Failed to connect to Electrum server');
    }
  }, []);

  const disconnect = useCallback(() => {
    BlueElectrum.forceDisconnect();
    showToast('Disconnected from Electrum server');
  }, []);

  const waitTillConnected = useCallback(async (): Promise<boolean> => {
    try {
      return await BlueElectrum.waitTillConnected();
    } catch (error) {
      showToast('Failed to wait till Electrum server is connected');
      return false;
    }
  }, []);

  const setElectrumDisabled = useCallback(
    async (disabled: boolean) => {
      await BlueElectrum.setDisabled(disabled);
      if (disabled) {
        showToast('Electrum connection disabled');
        disconnect();
      } else {
        showToast('Electrum connection enabled');
        connect();
      }
    },
    [disconnect, connect],
  );

  const testServerConnection = useCallback(async (host: string, tcpPort?: number, sslPort?: number) => {
    const result = await BlueElectrum.testConnection(host, tcpPort, sslPort);
    if (result) {
      showToast('Server connection successful');
    } else {
      showToast('Server connection failed');
    }
    return result;
  }, []);

  const saveToDisk = useCallback(async (force: boolean = false) => {
    InteractionManager.runAfterInteractions(async () => {
      if (wallets.current.length === 0 && !force) {
        console.log('not saving empty wallets array');
        return;
      }
      BlueApp.tx_metadata = txMetadata.current;
      BlueApp.counterparty_metadata = counterpartyMetadata.current;
      await BlueApp.saveToDisk();
      wallets.current = BlueApp.getWallets();
    });
  }, []);

  const refreshAllWalletTransactions = useCallback(
    async (lastSnappedTo?: number, showUpdateStatusIndicator: boolean = true) => {
      InteractionManager.runAfterInteractions(async () => {
        let noErr = true;
        try {
          await waitTillConnected();
          if (showUpdateStatusIndicator) {
            // Set some status indicator if needed
          }
          const paymentCodesStart = Date.now();
          await BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
          const paymentCodesEnd = Date.now();
          console.log('fetch payment codes took', (paymentCodesEnd - paymentCodesStart) / 1000, 'sec');
          const balanceStart = +new Date();
          await BlueApp.fetchWalletBalances(lastSnappedTo);
          const balanceEnd = +new Date();
          console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          const start = +new Date();
          await BlueApp.fetchWalletTransactions(lastSnappedTo);
          const end = +new Date();
          console.log('fetch tx took', (end - start) / 1000, 'sec');
        } catch (err) {
          noErr = false;
          console.warn(err);
        } finally {
          // Reset status indicator if needed
        }
        if (noErr) await saveToDisk(); // caching
      });
    },
    [saveToDisk, waitTillConnected],
  );

  const fetchAndSaveWalletTransactions = useCallback(
    async (walletID: string) => {
      InteractionManager.runAfterInteractions(async () => {
        const index = wallets.current.findIndex(wallet => wallet.getID() === walletID);
        let noErr = true;
        try {
          await waitTillConnected();
          // Set some status indicator if needed
          const balanceStart = +new Date();
          await BlueApp.fetchWalletBalances(index);
          const balanceEnd = +new Date();
          console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          const start = +new Date();
          await BlueApp.fetchWalletTransactions(index);
          const end = +new Date();
          console.log('fetch tx took', (end - start) / 1000, 'sec');
        } catch (err) {
          noErr = false;
          console.warn(err);
        } finally {
          // Reset status indicator if needed
        }
        if (noErr) await saveToDisk(); // caching
      });
    },
    [saveToDisk, waitTillConnected],
  );

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
  }, []);

  const value = useMemo(
    () => ({
      isElectrumDisabled,
      connect,
      disconnect,
      estimateFees: BlueElectrum.estimateFees,
      waitTillConnected,
      testServerConnection,
      refreshAllWalletTransactions,
      getTransactions: BlueApp.getTransactions,
      fetchWalletBalances: BlueApp.fetchWalletBalances,
      fetchWalletTransactions: BlueApp.fetchWalletTransactions,
      fetchAndSaveWalletTransactions,
      getBalance: BlueApp.getBalance,
    }),
    [
      isElectrumDisabled,
      connect,
      disconnect,
      waitTillConnected,
      testServerConnection,
      refreshAllWalletTransactions,
      fetchAndSaveWalletTransactions,
    ],
  );

  return (
    <ElectrumContext.Provider value={value}>
      {children}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </ElectrumContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 50,
    left: '50%',
    transform: [{ translateX: -100 }],
    width: 200,
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  toastText: {
    color: 'white',
  },
});

export { ElectrumProvider };
