import { Alert, Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes as RNBiometryTypes } from 'react-native-biometrics';
import PasscodeAuth from 'react-native-passcode-auth';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import loc from '../loc';
import * as NavigationService from '../NavigationService';
import presentAlert from '../components/Alert';
import { BlueApp } from './blue-app';

const STORAGEKEY = 'Biometrics';
const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

const FaceID = 'Face ID';
const TouchID = 'Touch ID';
const Biometrics = 'Biometrics';

const isDeviceBiometricCapable = async () => {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    return available;
  } catch (e) {
    console.log('Biometrics isDeviceBiometricCapable failed');
    console.log(e);
    setBiometricUseEnabled(false);
  }
  return false;
};

const biometricType = async () => {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return undefined;
    }

    return biometryType;
  } catch (e) {
    console.log('Biometrics biometricType failed');
    console.log(e);
    return undefined;
  }
};

const isBiometricUseEnabled = async () => {
  try {
    const enabledBiometrics = await BlueApp.getInstance().getItem(STORAGEKEY);
    return !!enabledBiometrics;
  } catch (_) {}

  return false;
};

const isBiometricUseCapableAndEnabled = async () => {
  const isEnabled = await isBiometricUseEnabled();
  const isCapable = await isDeviceBiometricCapable();
  return isEnabled && isCapable;
};

const setBiometricUseEnabled = async (value: boolean) => {
  await BlueApp.getInstance().setItem(STORAGEKEY, value === true ? '1' : '');
};

const unlockWithBiometrics = async () => {
  const isCapable = await isDeviceBiometricCapable();
  if (isCapable) {
    return new Promise(resolve => {
      rnBiometrics
        .simplePrompt({ promptMessage: loc.settings.biom_conf_identity })
        .then((result: { success: any }) => {
          if (result.success) {
            resolve(true);
          } else {
            console.log('Biometrics authentication failed');
            resolve(false);
          }
        })
        .catch((error: Error) => {
          console.log('Biometrics authentication error');
          presentAlert({ message: error.message });
          resolve(false);
        });
    });
  }
  return false;
};

const clearKeychain = async () => {
  try {
    console.log('Wiping keychain');
    console.log('Wiping key: data');
    await RNSecureKeyStore.set('data', JSON.stringify({ data: { wallets: [] } }), {
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    console.log('Wiped key: data');
    console.log('Wiping key: data_encrypted');
    await RNSecureKeyStore.set('data_encrypted', '', { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    console.log('Wiped key: data_encrypted');
    console.log('Wiping key: STORAGEKEY');
    await RNSecureKeyStore.set(STORAGEKEY, '', { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    console.log('Wiped key: STORAGEKEY');
    NavigationService.reset();
  } catch (error: any) {
    console.warn(error);
    presentAlert({ message: error.message });
  }
};

const requestDevicePasscode = async () => {
  let isDevicePasscodeSupported: boolean | undefined = false;
  try {
    isDevicePasscodeSupported = await PasscodeAuth.isSupported();
    if (isDevicePasscodeSupported) {
      const isAuthenticated = await PasscodeAuth.authenticate();
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
    }
  } catch {
    isDevicePasscodeSupported = undefined;
  }
  if (isDevicePasscodeSupported === false) {
    presentAlert({ message: loc.settings.biom_no_passcode });
  }
};

export const showKeychainWipeAlert = () => {
  if (Platform.OS === 'ios') {
    Alert.alert(
      loc.settings.encrypt_tstorage,
      loc.settings.biom_10times,
      [
        {
          text: loc._.cancel,
          onPress: () => {
            console.log('Cancel Pressed');
          },
          style: 'cancel',
        },
        {
          text: loc._.ok,
          onPress: () => requestDevicePasscode(),
          style: 'default',
        },
      ],
      { cancelable: false },
    );
  }
};

export {
  FaceID,
  TouchID,
  Biometrics,
  isDeviceBiometricCapable,
  biometricType,
  isBiometricUseEnabled,
  isBiometricUseCapableAndEnabled,
  setBiometricUseEnabled,
  unlockWithBiometrics,
};

export { RNBiometryTypes as BiometricType };
