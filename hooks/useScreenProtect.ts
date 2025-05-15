import { CaptureProtection, useCaptureProtection } from 'react-native-capture-protection';
import { isDesktop } from '../blue_modules/environment';

export const useScreenProtect = () => {
  const { protectionStatus, status } = useCaptureProtection();

  const enableScreenProtect = () => {
    if (isDesktop) return;
    CaptureProtection.prevent();
  };

  const disableScreenProtect = async () => {
    if (isDesktop) return;
    await CaptureProtection.allow();
  };

  const isScreenBeingRecorded = async () => {
    if (isDesktop) return false;
    return await CaptureProtection.isScreenRecording();
  };

  return {
    enableScreenProtect,
    disableScreenProtect,
    isScreenBeingRecorded,
    protectionStatus,
    status,
  };
};