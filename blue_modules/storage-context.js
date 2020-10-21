/* eslint-disable react/prop-types */
import React, { createContext, useEffect, useState } from 'react';
const BlueApp = require('../BlueApp');
const BlueElectrum = require('./BlueElectrum');

export const BlueStorageContext = createContext();
export const BlueStorageProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [pendingWallets, setPendingWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const [newWalletAdded, setNewWalletAdded] = useState(false);
  const saveToDisk = async () => {
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

  const fetchAndSaveWalletTransactions = async walletID => {
    const index = wallets.findIndex(wallet => wallet.getID() === walletID);
    let noErr = true;
    try {
      // await BlueElectrum.ping();
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
  const isDeleteWalletAfterUninstallEnabled = BlueApp.isDeleteWalletAfterUninstallEnabled;
  const setResetOnAppUninstallTo = BlueApp.setResetOnAppUninstallTo;
  const isPasswordInUse = BlueApp.isPasswordInUse;
  const cachedPassword = BlueApp.cachedPassword;
  const setIsAdancedModeEnabled = BlueApp.setIsAdancedModeEnabled;
  const getHodlHodlSignatureKey = BlueApp.getHodlHodlSignatureKey;
  const addHodlHodlContract = BlueApp.addHodlHodlContract;
  const getHodlHodlContracts = BlueApp.getHodlHodlContracts;
  const getItem = BlueApp.getItem;
  const setItem = BlueApp.setItem;

  return (
    <BlueStorageContext.Provider
      value={{
        wallets,
        setWalletsWithNewOrder,
        pendingWallets,
        setPendingWallets,
        txMetadata,
        saveToDisk,
        getTransactions,
        selectedWallet,
        setSelectedWallet,
        addWallet,
        deleteWallet,
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
        newWalletAdded,
        setNewWalletAdded,
        resetWallets,
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
