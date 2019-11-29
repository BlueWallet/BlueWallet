import Biometrics from 'react-native-biometrics';
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
}
