import { useContext } from 'react';
import { WalletStorageContext } from '../../components/Context/WalletStorageProvider';

export const useStorage = () => useContext(WalletStorageContext);

/** Selects wallet configuration directly from storage context. Transaction state belongs in Realm hooks. */
export const useWallet = (walletID: string) => {
  const { wallets } = useStorage();
  const wallet = wallets.find(candidate => candidate.getID() === walletID);
  if (!wallet) throw new Error(`Wallet with ID ${walletID} not found`);
  return wallet;
};
