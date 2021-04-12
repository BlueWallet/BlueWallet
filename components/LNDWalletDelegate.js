import { useContext, useEffect } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { LightningLndWallet } from '../class';

const LNDWalletDelegate = () => {
  const { wallets, walletsInitialized } = useContext(BlueStorageContext);

  // useEffect(() => {
  //   if (walletsInitialized) {
  //     if (wallets.some(wallet => wallet.type === LightningLndWallet.type)) {
  //     }
  //   }
  // }, [wallets, walletsInitialized]);

  return null;
};
export default LNDWalletDelegate;
