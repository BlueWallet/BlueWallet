import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes as RNBiometryTypes } from 'react-native-biometrics';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import loc from '../loc';
import * as NavigationService from '../NavigationService';
import presentAlert from '../components/Alert';
import { useStorage } from './context/useStorage';
import { BlueApp } from '../class/blue-app';
import { isMissingKeyError } from '../class/storage-errors';
import { appAlert } from '../components/AppDialog';

const STORAGEKEY = 'Biometrics';
const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

const FaceID = 'Face ID';
const TouchID = 'Touch ID';
const Biometrics = 'Biometrics';

/**
 * "Start fresh": empties the wallet store in the secure store, in its Realm
 * backup and in memory (`BlueApp.resetStorage`). Clearing only the secure
 * store let a later failed read restore the old wallets from the backup (H07).
 */
const clearKeychain = async (): Promise<boolean> => {
  try {
    console.debug('Resetting the wallet storage');
    // Throws unless the empty store reached the disk; the caller must not
    // open the app over the old store then (H04).
    const { cleanupPending } = await BlueApp.getInstance().resetStorage();
    if (cleanupPending) presentAlert({ message: loc.settings.storage_reset_cleanup_pending });
  } catch (error: any) {
    console.warn('resetting the wallet storage failed:', error?.message);
    presentAlert({ message: loc.settings.storage_reset_failed });
    return false;
  }
  try {
    await RNSecureKeyStore.set(STORAGEKEY, '', { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch (error: any) {
    // The wallets are already gone; a stale biometrics switch only asks for biometrics once more.
    console.warn('clearing the biometrics setting failed:', error?.message);
  }
  NavigationService.reset();
  return true;
};

const unlockWithBiometrics = async () => {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return false;
    }

    return new Promise<boolean>(resolve => {
      rnBiometrics
        .simplePrompt({ promptMessage: loc.settings.biom_conf_identity })
        .then((result: { success: any }) => {
          if (result.success) {
            resolve(true);
          } else {
            console.debug('Biometrics authentication failed');
            resolve(false);
          }
        })
        .catch((error: Error) => {
          console.debug('Biometrics authentication error');
          presentAlert({ message: error.message });
          resolve(false);
        });
    });
  } catch (e: Error | any) {
    console.debug('Biometrics authentication error', e);
    presentAlert({ message: e.message });
    return false;
  }
};

/**
 * The biometric-unlock setting as stored, or `unknown` when it cannot be read.
 * It lives in the secure store, the very store a recovery works around, so an
 * unreadable setting must not count as "off" (second review). Only a missing
 * key means the user never turned it on.
 */
export async function readBiometricPreference(): Promise<'enabled' | 'disabled' | 'unknown'> {
  try {
    return (await BlueApp.getInstance().getItem(STORAGEKEY)) ? 'enabled' : 'disabled';
  } catch (error) {
    return isMissingKeyError(error) ? 'disabled' : 'unknown';
  }
}

/**
 * What opening a store without an app password requires, for the ordinary
 * unlock and for restoring a backup alike: the biometric prompt when the
 * setting is on or unreadable. Resolves false when the user cancels or the
 * device has no way to authenticate, which keeps the app locked.
 */
export async function authorizeUnlock(): Promise<boolean> {
  if ((await readBiometricPreference()) === 'disabled') return true;
  return unlockWithBiometrics();
}

const showKeychainWipeAlert = () => {
  if (Platform.OS === 'ios') {
    appAlert(
      loc.settings.encrypt_tstorage,
      loc.settings.biom_10times,
      [
        {
          text: loc._.cancel,
          onPress: () => {
            console.debug('Cancel Pressed');
          },
          style: 'cancel',
        },
        {
          text: loc._.ok,
          onPress: async () => {
            const { available } = await rnBiometrics.isSensorAvailable();
            if (!available) {
              presentAlert({ message: loc.settings.biom_no_passcode });
              return;
            }
            const isAuthenticated = await unlockWithBiometrics();
            if (isAuthenticated) {
              appAlert(
                loc.settings.encrypt_tstorage,
                loc.settings.biom_remove_decrypt,
                [
                  { text: loc._.cancel, style: 'cancel' },
                  {
                    text: loc._.ok,
                    style: 'destructive',
                    onPress: async () => await clearKeychain(),
                  },
                ],
                { cancelable: false },
              );
            }
          },
          style: 'default',
        },
      ],
      { cancelable: false },
    );
  }
};

const useBiometrics = () => {
  const { setItem } = useStorage();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [deviceBiometricType, setDeviceBiometricType] = useState<'TouchID' | 'FaceID' | 'Biometrics' | undefined>(undefined);

  useEffect(() => {
    const fetchBiometricEnabledStatus = async () => {
      const enabled = await isBiometricUseEnabled();
      setBiometricEnabled(enabled);

      const biometricType = await type();
      setDeviceBiometricType(biometricType);
    };

    fetchBiometricEnabledStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A probe only reports: a sensor that fails to answer is unavailable now, and
  // the user's setting stays as it is. Turning it off here let the next start
  // (or this one) open without biometrics (third review). Only the user changes
  // the setting, through setBiometricUseEnabled.
  const isDeviceBiometricCapable = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      return available;
    } catch (e) {
      console.debug('Biometrics isDeviceBiometricCapable failed');
      console.debug(e);
    }
    return false;
  }, []);

  const type = useCallback(async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        return undefined;
      }

      return biometryType;
    } catch (e) {
      console.debug('Biometrics biometricType failed');
      console.debug(e);
      return undefined;
    }
  }, []);

  // Unreadable counts as on: see readBiometricPreference.
  const isBiometricUseEnabled = useCallback(async () => (await readBiometricPreference()) !== 'disabled', []);

  const isBiometricUseCapableAndEnabled = useCallback(async () => {
    const isEnabled = await isBiometricUseEnabled();
    const isCapable = await isDeviceBiometricCapable();
    return isEnabled && isCapable;
  }, [isBiometricUseEnabled, isDeviceBiometricCapable]);

  const setBiometricUseEnabled = useCallback(
    async (value: boolean) => {
      await setItem(STORAGEKEY, value === true ? '1' : '');
      setBiometricEnabled(value);
    },
    [setItem],
  );

  return {
    isDeviceBiometricCapable,
    deviceBiometricType,
    isBiometricUseEnabled,
    isBiometricUseCapableAndEnabled,
    setBiometricUseEnabled,
    clearKeychain,
    biometricEnabled,
  };
};

export { FaceID, TouchID, Biometrics, RNBiometryTypes as BiometricType, useBiometrics, showKeychainWipeAlert, unlockWithBiometrics };
