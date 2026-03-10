import { useEffect } from 'react';
import { useStorage } from './context/useStorage';
import { processInitialContinuityActivity } from '../navigation/continuityLinking';

const useContinuityListener = () => {
  const { walletsInitialized } = useStorage();

  useEffect(() => {
    if (!walletsInitialized) return;
    processInitialContinuityActivity();
  }, [walletsInitialized]);
};

export default useContinuityListener;
