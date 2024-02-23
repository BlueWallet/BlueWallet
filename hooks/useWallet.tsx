import { useContext, useMemo } from 'react';

import { BlueStorageContext } from '../blue_modules/storage-context';
import { TWallet } from '../class/wallets/types';
import presentAlert from '../components/Alert';

export const useWallet = <T = TWallet,>(id: string): T => {
  const { wallets } = useContext(BlueStorageContext);

  const wallet = useMemo(() => wallets.find(w => w.getID() === id), [id, wallets]);

  if (!wallet) {
    presentAlert({ message: 'Internal error: cant find wallet' });
    throw new Error(`Wallet with id ${id} not found`);
  }

  return wallet as T;
};

export default useWallet;
