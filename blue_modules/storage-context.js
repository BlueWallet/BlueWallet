/* eslint-disable react/prop-types */
import React, { createContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { FiatUnit } from '../models/fiatUnit';
import Notifications from '../blue_modules/notifications';
import loc, { STORAGE_KEY as LOC_STORAGE_KEY } from '../loc';
import { LegacyWallet } from '../class';
import { isTorDaemonDisabled, setIsTorDaemonDisabled } from './environment';
import alert from '../components/Alert';
const BlueApp = require('../BlueApp');
const BlueElectrum = require('./BlueElectrum');
const currency = require('../blue_modules/currency');
const A = require('../blue_modules/analytics');

const _lastTimeTriedToRefetchWallet = {}; // hashmap of timestamps we _started_ refetching some wallet

export const WalletTransactionsStatus = { NONE: false, ALL: true };
export const BlueStorageContext = createContext();
export const BlueStorageProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState(WalletTransactionsStatus.NONE);
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const [preferredFiatCurrency, _setPreferredFiatCurrency] = useState(FiatUnit.USD);
  const [language, _setLanguage] = useState();
  const getPreferredCurrencyAsyncStorage = useAsyncStorage(currency.PREFERRED_CURRENCY).getItem;
  const getLanguageAsyncStorage = useAsyncStorage(LOC_STORAGE_KEY).getItem;
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const [isElectrumDisabled, setIsElectrumDisabled] = useState(true);
  const [isTorDisabled, setIsTorDisabled] = useState(false);
  const [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled] = useState(true);

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
    isTorDaemonDisabled().then(setIsTorDisabled);
  }, []);

  useEffect(() => {
    console.log(`Privacy blur: ${isPrivacyBlurEnabled}`);
    if (!isPrivacyBlurEnabled) {
      alert('Privacy blur has been disabled.');
    }
  }, [isPrivacyBlurEnabled]);

  useEffect(() => {
    setIsTorDaemonDisabled(isTorDisabled);
  }, [isTorDisabled]);

  const setIsHandOffUseEnabledAsyncStorage = value => {
    setIsHandOffUseEnabled(value);
    return BlueApp.setIsHandoffEnabled(value);
  };

  const saveToDisk = async (force = false) => {
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
    const item = await getPreferredCurrencyAsyncStorage();
    _setPreferredFiatCurrency(item);
  };

  const setPreferredFiatCurrency = () => {
    getPreferredCurrency();
  };

  const getLanguage = async () => {
    const item = await getLanguageAsyncStorage();
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

  const setWalletsWithNewOrder = wallets => {
    BlueApp.wallets = wallets;
    saveToDisk();
  };

  const refreshAllWalletTransactions = async (lastSnappedTo, showUpdateStatusIndicator = true) => {
    let noErr = true;
    try {
      if (showUpdateStatusIndicator) {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.ALL);
      }
      await BlueElectrum.waitTillConnected();
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

  const fetchAndSaveWalletTransactions = async walletID => {
    const index = wallets.findIndex(wallet => wallet.getID() === walletID);
    let noErr = true;
    try {
      // 5sec debounce:
      setWalletTransactionUpdateStatus(walletID);
      if (+new Date() - _lastTimeTriedToRefetchWallet[walletID] < 5000) {
        console.log('re-fetch wallet happens too fast; NOP');
        return;
      }
      _lastTimeTriedToRefetchWallet[walletID] = +new Date();

      await BlueElectrum.waitTillConnected();
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

  const addWallet = wallet => {
    BlueApp.wallets.push(wallet);
    setWallets([...BlueApp.getWallets()]);
  };

  const deleteWallet = wallet => {
    BlueApp.deleteWallet(wallet);
    setWallets([...BlueApp.getWallets()]);
  };

  const addAndSaveWallet = async w => {
    if (wallets.some(i => i.getID() === w.getID())) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      Alert.alert('', 'This wallet has been previously imported.');
      return;
    }
    const emptyWalletLabel = new LegacyWallet().getLabel();
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
    w.setUserHasSavedExport(true);
    addWallet(w);
    await saveToDisk();
    A(A.ENUM.CREATED_WALLET);
    Alert.alert('', loc.wallets.import_success);
    Notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
    // start balance fetching at the background
    await w.fetchBalance();
    setWallets([...BlueApp.getWallets()]);
  };

  let txMetadata = BlueApp.tx_metadata || {};
  const getTransactions = BlueApp.getTransactions;
  const isAdancedModeEnabled = BlueApp.isAdancedModeEnabled;

  const fetchWalletBalances = BlueApp.fetchWalletBalances;
  const fetchWalletTransactions = BlueApp.fetchWalletTransactions;
  const getBalance = BlueApp.getBalance;
  const isStorageEncrypted = BlueApp.storageIsEncrypted;
  const startAndDecrypt = BlueApp.startAndDecrypt;
  const encryptStorage = BlueApp.encryptStorage;
  const sleep = BlueApp.sleep;
  const setHodlHodlApiKey = BlueApp.setHodlHodlApiKey;
  const getHodlHodlApiKey = BlueApp.getHodlHodlApiKey;
  const createFakeStorage = BlueApp.createFakeStorage;
  const decryptStorage = BlueApp.decryptStorage;
  const isPasswordInUse = BlueApp.isPasswordInUse;
  const cachedPassword = BlueApp.cachedPassword;
  const setIsAdancedModeEnabled = BlueApp.setIsAdancedModeEnabled;
  const getHodlHodlSignatureKey = BlueApp.getHodlHodlSignatureKey;
  const addHodlHodlContract = BlueApp.addHodlHodlContract;
  const getHodlHodlContracts = BlueApp.getHodlHodlContracts;
  const setDoNotTrack = BlueApp.setDoNotTrack;
  const isDoNotTrackEnabled = BlueApp.isDoNotTrackEnabled;
  const getItem = BlueApp.getItem;
  const setItem = BlueApp.setItem;

  return (
    <BlueStorageContext.Provider
      value={{
        wallets,
        setWalletsWithNewOrder,
        txMetadata,
        saveToDisk,
        getTransactions,
        selectedWallet,
        setSelectedWallet,
        addWallet,
        deleteWallet,
        addAndSaveWallet,
        setItem,
        getItem,
        getHodlHodlContracts,
        isAdancedModeEnabled,
        fetchWalletBalances,
        fetchWalletTransactions,
        fetchAndSaveWalletTransactions,
        isStorageEncrypted,
        getHodlHodlSignatureKey,
        encryptStorage,
        startAndDecrypt,
        cachedPassword,
        addHodlHodlContract,
        getBalance,
        walletsInitialized,
        setWalletsInitialized,
        refreshAllWalletTransactions,
        sleep,
        setHodlHodlApiKey,
        createFakeStorage,
        resetWallets,
        getHodlHodlApiKey,
        decryptStorage,
        isPasswordInUse,
        setIsAdancedModeEnabled,
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
        isTorDisabled,
        setIsTorDisabled,
        isPrivacyBlurEnabled,
        setIsPrivacyBlurEnabled,
      }}
    >
      {children}
    </BlueStorageContext.Provider>
  );
};
