import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import A from '../../blue_modules/analytics';
import Notifications from '../../blue_modules/notifications';
import { BlueApp as BlueAppClass, LegacyWallet, TCounterpartyMetadata, TTXMetadata, WatchOnlyWallet } from '../../class';
import type { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import loc from '../../loc';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';

const BlueApp = BlueAppClass.getInstance();

// hashmap of timestamps we _started_ refetching some wallet
const _lastTimeTriedToRefetchWallet: { [walletID: string]: number } = {};

interface StorageContextType {
  wallets: TWallet[];
  setWalletsWithNewOrder: (wallets: TWallet[]) => void;
  txMetadata: TTXMetadata;
  counterpartyMetadata: TCounterpartyMetadata;
  saveToDisk: (force?: boolean) => Promise<void>;
  selectedWalletID: string | undefined;
  setSelectedWalletID: (walletID: string | undefined) => void;
  addWallet: (wallet: TWallet) => void;
  deleteWallet: (wallet: TWallet) => void;
  currentSharedCosigner: string;
  setSharedCosigner: (cosigner: string) => void;
  addAndSaveWallet: (wallet: TWallet) => Promise<void>;
  fetchAndSaveWalletTransactions: (walletID: string) => Promise<void>;
  walletsInitialized: boolean;
  setWalletsInitialized: (initialized: boolean) => void;
  refreshAllWalletTransactions: (lastSnappedTo?: number, showUpdateStatusIndicator?: boolean) => Promise<void>;
  resetWallets: () => void;
  walletTransactionUpdateStatus: WalletTransactionsStatus | string;
  setWalletTransactionUpdateStatus: (status: WalletTransactionsStatus | string) => void;
  isElectrumDisabled: boolean;
  setIsElectrumDisabled: (value: boolean) => void;
  reloadTransactionsMenuActionFunction: () => void;
  setReloadTransactionsMenuActionFunction: (func: () => void) => void;
  getTransactions: typeof BlueApp.getTransactions;
  fetchWalletBalances: typeof BlueApp.fetchWalletBalances;
  fetchWalletTransactions: typeof BlueApp.fetchWalletTransactions;
  getBalance: typeof BlueApp.getBalance;
  isStorageEncrypted: typeof BlueApp.storageIsEncrypted;
  startAndDecrypt: typeof startAndDecrypt;
  encryptStorage: typeof BlueApp.encryptStorage;
  sleep: typeof BlueApp.sleep;
  createFakeStorage: typeof BlueApp.createFakeStorage;
  decryptStorage: typeof BlueApp.decryptStorage;
  isPasswordInUse: typeof BlueApp.isPasswordInUse;
  cachedPassword: typeof BlueApp.cachedPassword;
  getItem: typeof BlueApp.getItem;
  setItem: typeof BlueApp.setItem;
}

export enum WalletTransactionsStatus {
  NONE = 'NONE',
  ALL = 'ALL',
}
// @ts-ignore defaut value does not match the type
export const StorageContext = createContext<StorageContextType>(undefined);
export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const txMetadata = useRef<TTXMetadata>(BlueApp.tx_metadata);
  const counterpartyMetadata = useRef<TCounterpartyMetadata>(BlueApp.counterparty_metadata || {}); // init
  const getTransactions = BlueApp.getTransactions;
  const fetchWalletBalances = BlueApp.fetchWalletBalances;
  const fetchWalletTransactions = BlueApp.fetchWalletTransactions;
  const getBalance = BlueApp.getBalance;
  const isStorageEncrypted = BlueApp.storageIsEncrypted;
  const encryptStorage = BlueApp.encryptStorage;
  const sleep = BlueApp.sleep;
  const createFakeStorage = BlueApp.createFakeStorage;
  const decryptStorage = BlueApp.decryptStorage;
  const isPasswordInUse = BlueApp.isPasswordInUse;
  const cachedPassword = BlueApp.cachedPassword;

  const getItem = BlueApp.getItem;
  const setItem = BlueApp.setItem;

  const [wallets, setWallets] = useState<TWallet[]>([]);
  const [selectedWalletID, setSelectedWalletID] = useState<undefined | string>();
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState<WalletTransactionsStatus | string>(
    WalletTransactionsStatus.NONE,
  );
  const [walletsInitialized, setWalletsInitialized] = useState<boolean>(false);
  const [isElectrumDisabled, setIsElectrumDisabled] = useState<boolean>(true);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');
  const [reloadTransactionsMenuActionFunction, setReloadTransactionsMenuActionFunction] = useState<() => void>(() => {});

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
    if (walletsInitialized) {
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      setWallets(BlueApp.getWallets());
      BlueElectrum.connectMain();
    }
  }, [walletsInitialized]);

  const saveToDisk = useCallback(async (force: boolean = false) => {
    InteractionManager.runAfterInteractions(async () => {
      if (BlueApp.getWallets().length === 0 && !force) {
        console.log('not saving empty wallets array');
        return;
      }
      BlueApp.tx_metadata = txMetadata.current;
      BlueApp.counterparty_metadata = counterpartyMetadata.current;
      await BlueApp.saveToDisk();
      setWallets([...BlueApp.getWallets()]);
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
    });
  }, []);

  const resetWallets = () => {
    setWallets(BlueApp.getWallets());
  };

  const setWalletsWithNewOrder = useCallback(
    (wlts: TWallet[]) => {
      BlueApp.wallets = wlts;
      saveToDisk();
    },
    [saveToDisk],
  );

  const refreshAllWalletTransactions = useCallback(
    async (lastSnappedTo?: number, showUpdateStatusIndicator: boolean = true) => {
      InteractionManager.runAfterInteractions(async () => {
        let noErr = true;
        try {
          await BlueElectrum.waitTillConnected();
          if (showUpdateStatusIndicator) {
            setWalletTransactionUpdateStatus(WalletTransactionsStatus.ALL);
          }
          const paymentCodesStart = Date.now();
          await BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
          const paymentCodesEnd = Date.now();
          console.log('fetch payment codes took', (paymentCodesEnd - paymentCodesStart) / 1000, 'sec');
          const balanceStart = +new Date();
          await fetchWalletBalances(lastSnappedTo);
          const balanceEnd = +new Date();
          console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          const start = +new Date();
          await fetchWalletTransactions(lastSnappedTo);
          const end = +new Date();
          console.log('fetch tx took', (end - start) / 1000, 'sec');
        } catch (err) {
          noErr = false;
          console.warn(err);
        } finally {
          setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
        }
        if (noErr) await saveToDisk(); // caching
      });
    },
    [fetchWalletBalances, fetchWalletTransactions, saveToDisk],
  );

  const fetchAndSaveWalletTransactions = useCallback(
    async (walletID: string) => {
      InteractionManager.runAfterInteractions(async () => {
        const index = wallets.findIndex(wallet => wallet.getID() === walletID);
        let noErr = true;
        try {
          // 5sec debounce:
          if (+new Date() - _lastTimeTriedToRefetchWallet[walletID] < 5000) {
            console.log('re-fetch wallet happens too fast; NOP');
            return;
          }
          _lastTimeTriedToRefetchWallet[walletID] = +new Date();

          await BlueElectrum.waitTillConnected();
          setWalletTransactionUpdateStatus(walletID);
          const balanceStart = +new Date();
          await fetchWalletBalances(index);
          const balanceEnd = +new Date();
          console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          const start = +new Date();
          await fetchWalletTransactions(index);
          const end = +new Date();
          console.log('fetch tx took', (end - start) / 1000, 'sec');
        } catch (err) {
          noErr = false;
          console.warn(err);
        } finally {
          setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
        }
        if (noErr) await saveToDisk(); // caching
      });
    },
    [fetchWalletBalances, fetchWalletTransactions, saveToDisk, wallets],
  );

  const addWallet = useCallback((wallet: TWallet) => {
    BlueApp.wallets.push(wallet);
    setWallets([...BlueApp.getWallets()]);
  }, []);

  const deleteWallet = useCallback((wallet: TWallet) => {
    BlueApp.deleteWallet(wallet);
    setWallets([...BlueApp.getWallets()]);
  }, []);

  const addAndSaveWallet = useCallback(
    async (w: TWallet) => {
      if (wallets.some(i => i.getID() === w.getID())) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: 'This wallet has been previously imported.' });
        return;
      }
      const emptyWalletLabel = new LegacyWallet().getLabel();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
      w.setUserHasSavedExport(true);
      addWallet(w);
      await saveToDisk();
      A(A.ENUM.CREATED_WALLET);
      presentAlert({
        hapticFeedback: HapticFeedbackTypes.ImpactHeavy,
        message: w.type === WatchOnlyWallet.type ? loc.wallets.import_success_watchonly : loc.wallets.import_success,
      });
      // @ts-ignore need to type notifications first
      Notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
      // start balance fetching at the background
      await w.fetchBalance();
      setWallets([...BlueApp.getWallets()]);
    },
    [addWallet, saveToDisk, wallets],
  );

  const value: StorageContextType = useMemo(
    () => ({
      wallets,
      setWalletsWithNewOrder,
      txMetadata: txMetadata.current,
      counterpartyMetadata: counterpartyMetadata.current,
      saveToDisk,
      getTransactions,
      selectedWalletID,
      setSelectedWalletID,
      addWallet,
      deleteWallet,
      currentSharedCosigner,
      setSharedCosigner: setCurrentSharedCosigner,
      addAndSaveWallet,
      setItem,
      getItem,
      fetchWalletBalances,
      fetchWalletTransactions,
      fetchAndSaveWalletTransactions,
      isStorageEncrypted,
      encryptStorage,
      startAndDecrypt,
      cachedPassword,
      getBalance,
      walletsInitialized,
      setWalletsInitialized,
      refreshAllWalletTransactions,
      sleep,
      createFakeStorage,
      resetWallets,
      decryptStorage,
      isPasswordInUse,
      walletTransactionUpdateStatus,
      setWalletTransactionUpdateStatus,
      isElectrumDisabled,
      setIsElectrumDisabled,
      reloadTransactionsMenuActionFunction,
      setReloadTransactionsMenuActionFunction,
    }),
    [
      wallets,
      setWalletsWithNewOrder,
      saveToDisk,
      getTransactions,
      selectedWalletID,
      addWallet,
      deleteWallet,
      currentSharedCosigner,
      addAndSaveWallet,
      setItem,
      getItem,
      fetchWalletBalances,
      fetchWalletTransactions,
      fetchAndSaveWalletTransactions,
      isStorageEncrypted,
      encryptStorage,
      cachedPassword,
      getBalance,
      walletsInitialized,
      refreshAllWalletTransactions,
      sleep,
      createFakeStorage,
      decryptStorage,
      isPasswordInUse,
      walletTransactionUpdateStatus,
      isElectrumDisabled,
      reloadTransactionsMenuActionFunction,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
