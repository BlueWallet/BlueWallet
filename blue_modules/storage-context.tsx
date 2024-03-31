import React, { createContext, useEffect, useState } from 'react';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';

import BlueApp, { TTXMetadata, startAndDecrypt } from '../BlueApp';
import Notifications from '../blue_modules/notifications';
import { LegacyWallet, WatchOnlyWallet } from '../class';
import type { TWallet } from '../class/wallets/types';
import presentAlert from '../components/Alert';
import loc, { STORAGE_KEY as LOC_STORAGE_KEY } from '../loc';
import { FiatUnit, TFiatUnit } from '../models/fiatUnit';
import { PREFERRED_CURRENCY_STORAGE_KEY } from './currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from './hapticFeedback';
import A from '../blue_modules/analytics';

const BlueElectrum = require('./BlueElectrum');

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
  setPreferredFiatCurrency: () => void;
  preferredFiatCurrency: TFiatUnit;
  setLanguage: () => void;
  language: string | undefined;
  isHandOffUseEnabled: boolean;
  setIsHandOffUseEnabledAsyncStorage: (value: boolean) => Promise<void>;
  walletTransactionUpdateStatus: WalletTransactionsStatus | string;
  setWalletTransactionUpdateStatus: (status: WalletTransactionsStatus | string) => void;
  isElectrumDisabled: boolean;
  setIsElectrumDisabled: (value: boolean) => void;
  isPrivacyBlurEnabled: boolean;
  setIsPrivacyBlurEnabled: (value: boolean) => void;
  reloadTransactionsMenuActionFunction: () => void;
  setReloadTransactionsMenuActionFunction: (func: () => void) => void;

  getTransactions: typeof BlueApp.getTransactions;
  isAdvancedModeEnabled: typeof BlueApp.isAdvancedModeEnabled;
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
  setIsAdvancedModeEnabled: typeof BlueApp.setIsAdvancedModeEnabled;
  setDoNotTrack: typeof BlueApp.setDoNotTrack;
  isDoNotTrackEnabled: typeof BlueApp.isDoNotTrackEnabled;
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
  const [preferredFiatCurrency, _setPreferredFiatCurrency] = useState<TFiatUnit>(FiatUnit.USD);
  const [language, _setLanguage] = useState<string | undefined>();
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState<boolean>(false);
  const [isElectrumDisabled, setIsElectrumDisabled] = useState<boolean>(true);
  const [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled] = useState<boolean>(true);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');
  const getPreferredCurrencyAsyncStorage = useAsyncStorage(PREFERRED_CURRENCY_STORAGE_KEY).getItem;
  const getLanguageAsyncStorage = useAsyncStorage(LOC_STORAGE_KEY).getItem;
  const [reloadTransactionsMenuActionFunction, setReloadTransactionsMenuActionFunction] = useState<() => void>(() => {});

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
  }, []);

  useEffect(() => {
    if (walletsInitialized) {
      BlueElectrum.connectMain();
    }
  }, [walletsInitialized]);

  useEffect(() => {
    console.log(`Privacy blur: ${isPrivacyBlurEnabled}`);
    if (!isPrivacyBlurEnabled) {
      presentAlert({ message: 'Privacy blur has been disabled.' });
    }
  }, [isPrivacyBlurEnabled]);

  const setIsHandOffUseEnabledAsyncStorage = (value: boolean) => {
    setIsHandOffUseEnabled(value);
    return BlueApp.setIsHandoffEnabled(value);
  };

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

  useEffect(() => {
    (async () => {
      try {
        const enabledHandoff = await BlueApp.isHandoffEnabled();
        setIsHandOffUseEnabled(!!enabledHandoff);
      } catch (_e) {
        setIsHandOffUseEnabledAsyncStorage(false);
        setIsHandOffUseEnabled(false);
      }
    })();
  }, []);

  const getPreferredCurrency = async () => {
    // @ts-ignore TODO: fix this
    const item = JSON.parse(await getPreferredCurrencyAsyncStorage()) ?? FiatUnit.USD;
    _setPreferredFiatCurrency(item);
    return item;
  };

  const setPreferredFiatCurrency = () => {
    getPreferredCurrency();
  };

  const getLanguage = async () => {
    const item = await getLanguageAsyncStorage();
    if (item === null) {
      return;
    }
    _setLanguage(item);
  };

  const setLanguage = () => {
    getLanguage();
  };

  useEffect(() => {
    getPreferredCurrency();
    getLanguageAsyncStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetWallets = () => {
    setWallets(BlueApp.getWallets());
  };

  const setWalletsWithNewOrder = (wlts: TWallet[]) => {
    BlueApp.wallets = wlts;
    saveToDisk();
  };

  const refreshAllWalletTransactions = async (lastSnappedTo?: number, showUpdateStatusIndicator: boolean = true) => {
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
  const isAdvancedModeEnabled = BlueApp.isAdvancedModeEnabled;
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
  const setIsAdvancedModeEnabled = BlueApp.setIsAdvancedModeEnabled;
  const setDoNotTrack = BlueApp.setDoNotTrack;
  const isDoNotTrackEnabled = BlueApp.isDoNotTrackEnabled;
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
    isAdvancedModeEnabled,
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
    setIsAdvancedModeEnabled,
    setPreferredFiatCurrency,
    preferredFiatCurrency,
    setLanguage,
    language,
    isHandOffUseEnabled,
    setIsHandOffUseEnabledAsyncStorage,
    walletTransactionUpdateStatus,
    setWalletTransactionUpdateStatus,
    setDoNotTrack,
    isDoNotTrackEnabled,
    isElectrumDisabled,
    setIsElectrumDisabled,
    isPrivacyBlurEnabled,
    setIsPrivacyBlurEnabled,
    reloadTransactionsMenuActionFunction,
    setReloadTransactionsMenuActionFunction,
  };

  return <BlueStorageContext.Provider value={value}>{children}</BlueStorageContext.Provider>;
};
