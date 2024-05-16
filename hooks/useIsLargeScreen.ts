import { useContext } from 'react';
import { LargeScreenContext } from '../components/Context/LargeScreenProvider';

export const useIsLargeScreen = (): boolean => {
  const context = useContext(LargeScreenContext);
  if (context === undefined) {
    throw new Error('useIsLargeScreen must be used within a LargeScreenProvider');
  }
  return context.isLargeScreen;
};
