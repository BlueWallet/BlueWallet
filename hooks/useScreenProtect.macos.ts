import { isDesktop } from '../blue_modules/environment';
import { useCallback } from 'react';

export const useScreenProtect = () => {
  const enableScreenProtect = useCallback(async () => {
    

  }, []);

  const disableScreenProtect = useCallback(async () => {
    
  }, []);

  const isScreenBeingRecorded = useCallback(async () => {
    if (isDesktop) return false;
  }, []);

  return {
    enableScreenProtect,
    disableScreenProtect,
    isScreenBeingRecorded,
  };
};
