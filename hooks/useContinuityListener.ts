import { useEffect } from 'react';
import { useStorage } from './context/useStorage';
import { useSettings } from './context/useSettings';
import { processInitialContinuityActivity } from '../navigation/continuityLinking';

/**
 * Handles the initial continuity activity on cold-start.
 * Runtime events are handled declaratively by the linking configuration
 * on NavigationContainer (see navigation/continuityLinking.ts).
 */
const useContinuityListener = () => {
  const { walletsInitialized } = useStorage();
  const { isContinuityEnabled } = useSettings();

  useEffect(() => {
    if (!walletsInitialized || !isContinuityEnabled) return;
    processInitialContinuityActivity();
  }, [walletsInitialized, isContinuityEnabled]);
};

export default useContinuityListener;
