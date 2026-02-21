import { CaptureProtection } from 'react-native-capture-protection';
import { isDesktop } from '../blue_modules/environment';
import { useCallback } from 'react';

export const useScreenProtect = () => {
  const enableScreenProtect = useCallback(async () => {
    if (isDesktop) return;
    await CaptureProtection.prevent();
  }, []);

  const disableScreenProtect = useCallback(async () => {
    if (isDesktop) return;
    await CaptureProtection.allow();
  }, []);

  const isScreenBeingRecorded = useCallback(async () => {
    if (isDesktop) return false;
    return await CaptureProtection.isScreenRecording();
  }, []);

  return {
    enableScreenProtect,
    disableScreenProtect,
    isScreenBeingRecorded,
  };
};
