import { useContext } from 'react';
import { StorageContext } from '../../components/Context/StorageProvider';

export const useStorage = () => useContext(StorageContext);

/** Selects wallet configuration directly from storage context. Transaction state belongs in Realm hooks. */
export const useWallet = (walletID: string) => {
  const { wallets } = useStorage();
  const wallet = wallets.find(candidate => candidate.getID() === walletID);
  if (!wallet) throw new Error(`Wallet with ID ${walletID} not found`);
  return wallet;
};
