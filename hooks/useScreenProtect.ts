import { CaptureProtection } from 'react-native-capture-protection';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { isDesktop } from '../blue_modules/environment';
import { useCallback, useRef } from 'react';

const activeScreenProtectionOwners = new Set<object>();
const lockedScreenProtectionOwners = new Set<object>();
let screenProtectionRequest: Promise<void> = Promise.resolve();
let isScreenProtectionEnabled = false;

const synchronizeScreenProtection = () => {
  screenProtectionRequest = screenProtectionRequest.catch(() => {}).then(async () => {
    const shouldEnable = activeScreenProtectionOwners.size > 0 || lockedScreenProtectionOwners.size > 0;

    if (isDesktop || shouldEnable === isScreenProtectionEnabled) return;

    if (shouldEnable) {
      await CaptureProtection.prevent();
    } else {
      await CaptureProtection.allow();
    }

    isScreenProtectionEnabled = shouldEnable;
  });
  return screenProtectionRequest;
};

export const useScreenProtect = () => {
  const { name: routeName } = useRoute();
  const owner = useRef<object>({});
  const isFocused = useRef(false);
  const protectionRequested = useRef(false);

  const updateScreenProtectionOwner = useCallback(async () => {
    if (isDesktop) return;

    if (isFocused.current && protectionRequested.current) {
      activeScreenProtectionOwners.add(owner.current);
    } else {
      activeScreenProtectionOwners.delete(owner.current);
    }

    await synchronizeScreenProtection();
  }, []);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      void updateScreenProtectionOwner().catch(error => console.warn('Failed to update screen protection:', error));

      return () => {
        isFocused.current = false;
        void updateScreenProtectionOwner().catch(error => console.warn('Failed to update screen protection:', error));
      };
    }, [updateScreenProtectionOwner]),
  );

  const enableScreenProtect = useCallback(async () => {
    if (isDesktop) return;
    protectionRequested.current = true;
    await updateScreenProtectionOwner();
  }, [updateScreenProtectionOwner]);

  const disableScreenProtect = useCallback(async () => {
    if (isDesktop) return;
    protectionRequested.current = false;
    await updateScreenProtectionOwner();
  }, [updateScreenProtectionOwner]);

  const lockScreenProtect = useCallback(async () => {
    if (isDesktop || (routeName !== 'PleaseBackup' && routeName !== 'WalletExport')) return;
    lockedScreenProtectionOwners.add(owner.current);
    await synchronizeScreenProtection();
  }, [routeName]);

  const unlockScreenProtect = useCallback(async () => {
    if (isDesktop || (routeName !== 'PleaseBackup' && routeName !== 'WalletExport')) return;
    lockedScreenProtectionOwners.delete(owner.current);
    await synchronizeScreenProtection();
  }, [routeName]);

  const isScreenBeingRecorded = useCallback(async () => {
    if (isDesktop) return false;
    return await CaptureProtection.isScreenRecording();
  }, []);

  return {
    enableScreenProtect,
    disableScreenProtect,
    lockScreenProtect,
    unlockScreenProtect,
    isScreenBeingRecorded,
  };
};
