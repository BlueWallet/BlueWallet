import { useContext } from 'react';
import { StorageContext } from '../../components/Context/StorageProvider';

export const useStorage = () => {
  const context = useContext(StorageContext);
  
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }

  // Destructure to remove selectedWalletID and setSelectedWalletID 
  // from the returned value
  const {
    selectedWalletID,
    setSelectedWalletID,
    ...rest
  } = context;

  return rest;
};
