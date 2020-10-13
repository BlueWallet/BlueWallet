/* eslint-disable react/prop-types */
import React, { createContext, useEffect, useState } from 'react';
const BlueApp = require('../BlueApp');

export const BlueStorageContext = createContext();
export const BlueStorageProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');

  const saveToDisk = async () => {
    await BlueApp.saveToDisk();
    setWallets([...BlueApp.getWallets()]);
  };

  useEffect(() => {
    setWallets(BlueApp.getWallets());
  }, []);

  const getTransactions = BlueApp.getTransactions;
  const deleteWallet = BlueApp.deleteWallet;

  return (
    <BlueStorageContext.Provider value={{ wallets, saveToDisk, getTransactions, selectedWallet, setSelectedWallet, deleteWallet }}>
      {children}
    </BlueStorageContext.Provider>
  );
};
