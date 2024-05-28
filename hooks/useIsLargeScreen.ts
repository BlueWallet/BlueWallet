import { useContext } from 'react';
import { LargeScreenContext } from '../components/Context/LargeScreenContext';
export const useIsLargeScreen = () => {
  const context = useContext(LargeScreenContext);
  if (!context) {
    throw new Error('useIsLargeScreen must be used within a LargeScreenProvider');
  }
  return context;
};
