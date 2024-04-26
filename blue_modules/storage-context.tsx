import React, { createContext, useContext, useEffect, useState } from 'react';
import { startAndDecrypt } from './start-and-decrypt';
import Notifications from '../blue_modules/notifications';
import { LegacyWallet, TTXMetadata, WatchOnlyWallet, BlueApp as BlueAppClass } from '../class';
import type { TWallet } from '../class/wallets/types';
import presentAlert from '../components/Alert';
import loc from '../loc';
import * as BlueElectrum from './BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from './hapticFeedback';
import A from '../blue_modules/analytics';
import { InteractionManager } from 'react-native';

const BlueApp = BlueAppClass.getInstance();

// hashmap of timestamps we _started_ refetching some wallet
const _lastTimeTriedToRefetchWallet: { [walletID: string]: number } = {};

interface BlueStorageContextType {
  wallets: TWallet[];
  setWalletsWithNewOrder: (wallets: TWallet[]) => void;
  txMetadata: TTXMetadata;
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
export const BlueStorageContext = createContext<BlueStorageContextType>(undefined);
export const BlueStorageProvider = ({ children }: { children: React.ReactNode }) => {
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
  }, []);

  useEffect(() => {
    if (walletsInitialized) {
      BlueElectrum.connectMain();
    }
  }, [walletsInitialized]);

  const saveToDisk = async (force: boolean = false) => {
    if (BlueApp.getWallets().length === 0 && !force) {
      console.log('not saving empty wallets array');
      return;
    }
    BlueApp.tx_metadata = txMetadata;
    await BlueApp.saveToDisk();
    setWallets([...BlueApp.getWallets()]);
    txMetadata = BlueApp.tx_metadata;
  };

  useEffect(() => {
    setWallets(BlueApp.getWallets());
  }, []);

  const resetWallets = () => {
    setWallets(BlueApp.getWallets());
  };

  const setWalletsWithNewOrder = (wlts: TWallet[]) => {
    BlueApp.wallets = wlts;
    saveToDisk();
  };

  const refreshAllWalletTransactions = async (lastSnappedTo?: number, showUpdateStatusIndicator: boolean = true): Promise<void> => {
    await InteractionManager.runAfterInteractions(async () => {
      try {
        await BlueElectrum.waitTillConnected();

        const tasks: Promise<any>[] = [
          BlueApp.fetchSenderPaymentCodes(lastSnappedTo),
          fetchWalletBalances(lastSnappedTo),
          fetchWalletTransactions(lastSnappedTo),
        ];
        const results = await Promise.all(tasks);

        const noErr = results.every(result => result !== undefined);

        if (noErr) await saveToDisk();
      } catch (err) {
        console.warn('Error refreshing wallet transactions:', err);
      } finally {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
      }
    });
  };

  const fetchAndSaveWalletTransactions = async (walletID: string) => {
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
  };

  const addWallet = (wallet: TWallet) => {
    BlueApp.wallets.push(wallet);
    setWallets([...BlueApp.getWallets()]);
  };

  const deleteWallet = (wallet: TWallet) => {
    BlueApp.deleteWallet(wallet);
    setWallets([...BlueApp.getWallets()]);
  };

  const addAndSaveWallet = async (w: TWallet) => {
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
    presentAlert({ message: w.type === WatchOnlyWallet.type ? loc.wallets.import_success_watchonly : loc.wallets.import_success });
    // @ts-ignore need to type notifications first
    Notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
    // start balance fetching at the background
    await w.fetchBalance();
    setWallets([...BlueApp.getWallets()]);
  };

  let txMetadata = BlueApp.tx_metadata;
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

  const value: BlueStorageContextType = {
    wallets,
    setWalletsWithNewOrder,
    txMetadata,
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
  };

  return <BlueStorageContext.Provider value={value}>{children}</BlueStorageContext.Provider>;
};

export const useStorage = () => useContext(BlueStorageContext);
