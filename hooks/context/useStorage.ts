import { useContext, useRef } from 'react';
import { WalletStorageContext } from '../../components/Context/WalletStorageProvider';

export const useStorage = () => useContext(WalletStorageContext);

/** Selects wallet configuration directly from storage context. Transaction state belongs in Realm hooks. */
export const useWallet = (walletID: string) => {
  const { wallets } = useStorage();
  const wallet = wallets.find(candidate => candidate.getID() === walletID);
  const mountedWallet = useRef(wallet);
  if (wallet) mountedWallet.current = wallet;
  if (!mountedWallet.current) throw new Error(`Wallet with ID ${walletID} not found`);

  // Keep the mounted screen usable while a deleted wallet's navigation route
  // is being removed. React Navigation can render that route once more after
  // storage publishes the deletion.
  return mountedWallet.current;
};
