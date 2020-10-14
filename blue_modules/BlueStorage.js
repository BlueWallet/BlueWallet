/* eslint-disable react/prop-types */
import React, { createContext, useEffect, useState } from 'react';
const BlueApp = require('../BlueApp');
const BlueElectrum = require('./BlueElectrum');

export const BlueStorageContext = createContext();
export const BlueStorageProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const saveToDisk = async () => {
    await BlueApp.saveToDisk();
    setWallets([...BlueApp.getWallets()]);
  };

  useEffect(() => {
    setWallets(BlueApp.getWallets());
  }, []);

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
  const txMetadata = BlueApp.tx_metadata;
  const getTransactions = BlueApp.getTransactions;
  const deleteWallet = BlueApp.deleteWallet;
  const isAdancedModeEnabled = BlueApp.isAdancedModeEnabled;

  const fetchWalletBalances = BlueApp.fetchWalletBalances;
  const fetchWalletTransactions = BlueApp.fetchWalletTransactions;
  const getBalance = BlueApp.getBalance;
  const storageIsEncrypted = BlueApp.storageIsEncrypted;
  const startAndDecrypt = BlueApp.startAndDecrypt;
  const sleep = BlueApp.sleep;
  const setHodlHodlApiKey = BlueApp.setHodlHodlApiKey;
  const getHodlHodlApiKey = BlueApp.getHodlHodlApiKey;
  return (
    <BlueStorageContext.Provider
      value={{
        wallets,
        txMetadata,
        saveToDisk,
        getTransactions,
        selectedWallet,
        setSelectedWallet,
        addWallet,
        deleteWallet,
        isAdancedModeEnabled,
        fetchWalletBalances,
        fetchWalletTransactions,
        storageIsEncrypted,
        startAndDecrypt,
        getBalance,
        walletsInitialized,
        setWalletsInitialized,
        refreshAllWalletTransactions,
        sleep,
        setHodlHodlApiKey,
        getHodlHodlApiKey,
      }}
    >
      {children}
    </BlueStorageContext.Provider>
  );
};
