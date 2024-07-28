import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes as RNBiometryTypes } from 'react-native-biometrics';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import loc from '../loc';
import * as NavigationService from '../NavigationService';
import presentAlert from '../components/Alert';
import { useStorage } from './context/useStorage';

const STORAGEKEY = 'Biometrics';
const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

const FaceID = 'Face ID';
const TouchID = 'Touch ID';
const Biometrics = 'Biometrics';

const clearKeychain = async () => {
  try {
    console.debug('Wiping keychain');
    console.debug('Wiping key: data');
    await RNSecureKeyStore.set('data', JSON.stringify({ data: { wallets: [] } }), {
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    console.debug('Wiped key: data');
    console.debug('Wiping key: data_encrypted');
    await RNSecureKeyStore.set('data_encrypted', '', { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    console.debug('Wiped key: data_encrypted');
    console.debug('Wiping key: STORAGEKEY');
    await RNSecureKeyStore.set(STORAGEKEY, '', { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    console.debug('Wiped key: STORAGEKEY');
    NavigationService.reset();
  } catch (error: any) {
    console.warn(error);
    presentAlert({ message: error.message });
  }
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

const showKeychainWipeAlert = () => {
  if (Platform.OS === 'ios') {
    Alert.alert(
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
              Alert.alert(
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
  const { getItem, setItem } = useStorage();
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

  const isDeviceBiometricCapable = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      return available;
    } catch (e) {
      console.debug('Biometrics isDeviceBiometricCapable failed');
      console.debug(e);
      setBiometricUseEnabled(false);
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isBiometricUseEnabled = useCallback(async () => {
    try {
      const enabledBiometrics = await getItem(STORAGEKEY);
      return !!enabledBiometrics;
    } catch (_) {}

    return false;
  }, [getItem]);

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
