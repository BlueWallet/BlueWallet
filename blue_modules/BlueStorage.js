/* eslint-disable react/prop-types */
import React, { createContext, useEffect, useState } from 'react';
const BlueApp = require('../BlueApp');
const BlueElectrum = require('./BlueElectrum');

export const BlueStorageContext = createContext();
export const BlueStorageProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [txMetadata, _setTxMetadata] = useState({});
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const saveToDisk = async () => {
    await BlueApp.saveToDisk();
    setWallets([...BlueApp.getWallets()]);
    _setTxMetadata({ ...BlueApp.tx_metadata });
  };

  useEffect(() => {
    setWallets(BlueApp.getWallets());
    _setTxMetadata(BlueApp.tx_metadata);
  }, []);

  const setTxMetadata = metadata => {
    BlueApp.tx_metadata = metadata;
    saveToDisk();
  };

  const setWalletsWithNewOrder = wallets => {
    BlueApp.wallets = wallets;
    saveToDisk();
  };

  const refreshAllWalletTransactions = async lastSnappedTo => {
    let noErr = true;
    try {
      // await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const balanceStart = +new Date();
      await fetchWalletBalances(lastSnappedTo || 0);
      const balanceEnd = +new Date();
      console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
      const start = +new Date();
      await fetchWalletTransactions(lastSnappedTo || 0);
      const end = +new Date();
      console.log('fetch tx took', (end - start) / 1000, 'sec');
    } catch (err) {
      noErr = false;
      console.warn(err);
    }
    if (noErr) await saveToDisk(); // caching
  };

  const addWallet = wallet => {
    BlueApp.wallets.push(wallet);
  };

  const getTransactions = BlueApp.getTransactions;
  const deleteWallet = BlueApp.deleteWallet;
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
  const isDeleteWalletAfterUninstallEnabled = BlueApp.isDeleteWalletAfterUninstallEnabled;
  const setResetOnAppUninstallTo = BlueApp.setResetOnAppUninstallTo;
  const isPasswordInUse = BlueApp.isPasswordInUse;
  const cachedPassword = BlueApp.cachedPassword;
  const setIsAdancedModeEnabled = BlueApp.setIsAdancedModeEnabled;
  return (
    <BlueStorageContext.Provider
      value={{
        wallets,
        setWalletsWithNewOrder,
        txMetadata,
        setTxMetadata,
        saveToDisk,
        getTransactions,
        selectedWallet,
        setSelectedWallet,
        addWallet,
        deleteWallet,
        isAdancedModeEnabled,
        fetchWalletBalances,
        fetchWalletTransactions,
        isStorageEncrypted,
        encryptStorage,
        startAndDecrypt,
        cachedPassword,
        getBalance,
        walletsInitialized,
        setWalletsInitialized,
        refreshAllWalletTransactions,
        sleep,
        setHodlHodlApiKey,
        createFakeStorage,
        getHodlHodlApiKey,
        isDeleteWalletAfterUninstallEnabled,
        decryptStorage,
        setResetOnAppUninstallTo,
        isPasswordInUse,
        setIsAdancedModeEnabled,
      }}
    >
      {children}
    </BlueStorageContext.Provider>
  );
};
