import Biometrics from 'react-native-biometrics';
const BlueApp = require('../BlueApp');

export default class Biometric {
  static STORAGEKEY = 'Biometrics';
  static FaceID = Biometrics.FaceID;
  static TouchID = Biometrics.TouchID;

  static async isDeviceBiometricCapable() {
    const isDeviceBiometricCapable = await Biometric.biometricType();
    if (typeof isDeviceBiometricCapable === 'string') {
      return isDeviceBiometricCapable;
    }
    Biometric.setBiometricUseEnabled(false);
    return false;
  }

  static async biometricType() {
    try {
      const isSensorAvailable = await Biometrics.isSensorAvailable();
      return isSensorAvailable;
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
        await Biometrics.simplePrompt('Please confirm your identity.');
        return true;
      } catch (_e) {
        return false;
      }
    }
    return false;
  }
}
