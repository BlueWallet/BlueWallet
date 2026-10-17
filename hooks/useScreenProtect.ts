import { CaptureProtection } from 'react-native-capture-protection';
import { isMacCatalyst } from '../blue_modules/environment';
import { useCallback } from 'react';

export const useScreenProtect = () => {
  const enableScreenProtect = useCallback(async () => {
    if (isMacCatalyst) return;
    await CaptureProtection.prevent();
  }, []);

  const disableScreenProtect = useCallback(async () => {
    if (isMacCatalyst) return;
    await CaptureProtection.allow();
  }, []);

  const isScreenBeingRecorded = useCallback(async () => {
    if (isMacCatalyst) return false;
    return await CaptureProtection.isScreenRecording();
  }, []);

  return {
    enableScreenProtect,
    disableScreenProtect,
    isScreenBeingRecorded,
  };
};
