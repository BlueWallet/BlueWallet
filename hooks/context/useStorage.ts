import { useContext } from 'react';
import { StorageContext } from '../../components/Context/StorageProvider';

export const useStorage = () => {
  const context = useContext(StorageContext);
  
  const fetchAndSaveWalletTransactions = async (walletID: string) => {
    // ...existing implementation to fetch and save transactions...
  };

  const getTransactions = (walletID: string): Transaction[] => {
    const wallet = wallets.find(w => w.getID() === walletID);
    return wallet ? wallet.getTransactions() : [];
  };

  return {
    ...context,
    fetchAndSaveWalletTransactions,
    getTransactions,
  };
};
