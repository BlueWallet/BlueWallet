/* global alert */
import Biometrics from 'react-native-biometrics';
import { Platform, Alert } from 'react-native';
import PasscodeAuth from 'react-native-passcode-auth';
import * as NavigationService from '../NavigationService';
import { StackActions, CommonActions } from '@react-navigation/native';
import RNSecureKeyStore from 'react-native-secure-key-store';
import loc from '../loc';
const BlueApp = require('../BlueApp');

export default class Biometric {
  static STORAGEKEY = 'Biometrics';
  static FaceID = Biometrics.FaceID;
  static TouchID = Biometrics.TouchID;
  static Biometrics = Biometrics.Biometrics;

  static async isDeviceBiometricCapable() {
    const isDeviceBiometricCapable = await Biometrics.isSensorAvailable();
    if (isDeviceBiometricCapable.available) {
      return true;
    }
    Biometric.setBiometricUseEnabled(false);
    return false;
  }

  static async biometricType() {
    try {
      const isSensorAvailable = await Biometrics.isSensorAvailable();
      return isSensorAvailable.biometryType;
    } catch (e) {
      console.log(e);
    }
    return false;
  }

  static async isBiometricUseEnabled() {
    try {
      const enabledBiometrics = await BlueApp.getItem(Biometric.STORAGEKEY);
      return !!enabledBiometrics;
    } catch (_e) {
      await BlueApp.setItem(Biometric.STORAGEKEY, '');
      return false;
    }
  }

  static async isBiometricUseCapableAndEnabled() {
    const isBiometricUseEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    return isBiometricUseEnabled && isDeviceBiometricCapable;
  }

  static async setBiometricUseEnabled(value) {
    await BlueApp.setItem(Biometric.STORAGEKEY, value === true ? '1' : '');
  }

  static async unlockWithBiometrics() {
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    if (isDeviceBiometricCapable) {
      try {
        const isConfirmed = await Biometrics.simplePrompt({ promptMessage: 'Please confirm your identity.' });
        return isConfirmed.success;
      } catch (_e) {
        return false;
      }
    }
    return false;
  }

  static async clearKeychain() {
    await RNSecureKeyStore.remove('data');
    await RNSecureKeyStore.remove('data_encrypted');
    await RNSecureKeyStore.remove(Biometric.STORAGEKEY);
    await BlueApp.setResetOnAppUninstallTo(true);
    NavigationService.dispatch(StackActions.replace('WalletsRoot'));
  }

  static async requestDevicePasscode() {
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
  }

  static showKeychainWipeAlert() {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Storage',
        `You have attempted to enter your password 10 times. Would you like to reset your storage? This will remove all wallets and decrypt your storage.`,
        [
          { text: loc._.cancel, onPress: () => {
            NavigationService.dispatch(CommonActions.setParams({index: 0, routes: [
              { name: 'UnlockWithScreenRoot' }, { params: { unlockOnComponentMount: false }}]}));
          }, style: 'cancel' },
          {
            text: loc._.ok,
            onPress: () => Biometric.requestDevicePasscode(),
            style: 'default',
          },
        ],
        { cancelable: false },
      );
    }
  }
}
