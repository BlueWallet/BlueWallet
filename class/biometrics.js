/* global alert */
import FingerprintScanner from 'react-native-fingerprint-scanner';
import { Platform, Alert } from 'react-native';
import PasscodeAuth from 'react-native-passcode-auth';
import * as NavigationService from '../NavigationService';
import { StackActions, CommonActions } from '@react-navigation/native';
import RNSecureKeyStore from 'react-native-secure-key-store';
import loc from '../loc';
import { useContext } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';

function Biometric() {
  const { getItem, setItem, setResetOnAppUninstallTo } = useContext(BlueStorageContext);
  Biometric.STORAGEKEY = 'Biometrics';
  Biometric.FaceID = 'Face ID';
  Biometric.TouchID = 'Touch ID';
  Biometric.Biometrics = 'Biometrics';

  Biometric.isDeviceBiometricCapable = async () => {
    try {
      const isDeviceBiometricCapable = await FingerprintScanner.isSensorAvailable();
      if (isDeviceBiometricCapable) {
        return true;
      }
    } catch {
      Biometric.setBiometricUseEnabled(false);
      return false;
    }
  };

  Biometric.biometricType = async () => {
    try {
      const isSensorAvailable = await FingerprintScanner.isSensorAvailable();
      return isSensorAvailable;
    } catch (e) {
      console.log(e);
    }
    return false;
  };

  Biometric.isBiometricUseEnabled = async () => {
    try {
      const enabledBiometrics = await getItem(Biometric.STORAGEKEY);
      return !!enabledBiometrics;
    } catch (_e) {
      await setItem(Biometric.STORAGEKEY, '');
      return false;
    }
  };

  Biometric.isBiometricUseCapableAndEnabled = async () => {
    const isBiometricUseEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    return isBiometricUseEnabled && isDeviceBiometricCapable;
  };

  Biometric.setBiometricUseEnabled = async value => {
    await setItem(Biometric.STORAGEKEY, value === true ? '1' : '');
  };

  Biometric.unlockWithBiometrics = async () => {
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    if (isDeviceBiometricCapable) {
      return new Promise(resolve => {
        FingerprintScanner.authenticate({ description: 'Please confirm your identity.', fallbackEnabled: true })
          .then(() => resolve(true))
          .catch(() => resolve(false))
          .finally(() => FingerprintScanner.release());
      });
    }
    return false;
  };

  Biometric.clearKeychain = async () => {
    await RNSecureKeyStore.remove('data');
    await RNSecureKeyStore.remove('data_encrypted');
    await RNSecureKeyStore.remove(Biometric.STORAGEKEY);
    await setResetOnAppUninstallTo(true);
    NavigationService.dispatch(StackActions.replace('WalletsRoot'));
  };

  Biometric.requestDevicePasscode = async () => {
    let isDevicePasscodeSupported = false;
    try {
      isDevicePasscodeSupported = await PasscodeAuth.isSupported();
      if (isDevicePasscodeSupported) {
        const isAuthenticated = await PasscodeAuth.authenticate();
        if (isAuthenticated) {
          Alert.alert(
            'Storage',
            `All your wallets will be removed and your storage will be decrypted. Are you sure you want to proceed?`,
            [
              { text: loc._.cancel, style: 'cancel' },
              {
                text: loc._.ok,
                onPress: () => Biometric.clearKeychain(),
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
      alert('Your device does not have a passcode. In order to proceed, please configure a passcode in the Settings app.');
    }
  };

  Biometric.showKeychainWipeAlert = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Storage',
        `You have attempted to enter your password 10 times. Would you like to reset your storage? This will remove all wallets and decrypt your storage.`,
        [
          {
            text: loc._.cancel,
            onPress: () => {
              NavigationService.dispatch(
                CommonActions.setParams({
                  index: 0,
                  routes: [{ name: 'UnlockWithScreenRoot' }, { params: { unlockOnComponentMount: false } }],
                }),
              );
            },
            style: 'cancel',
          },
          {
            text: loc._.ok,
            onPress: () => Biometric.requestDevicePasscode(),
            style: 'default',
          },
        ],
        { cancelable: false },
      );
    }
  };
  return null;
}

export default Biometric;
