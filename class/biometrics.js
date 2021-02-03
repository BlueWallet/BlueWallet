import FingerprintScanner from 'react-native-fingerprint-scanner';
import loc from '../loc';
import { useContext } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';

function Biometric() {
  const { getItem, setItem } = useContext(BlueStorageContext);
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
        FingerprintScanner.authenticate({ description: loc.settings.biom_conf_identity, fallbackEnabled: true })
          .then(() => resolve(true))
          .catch(() => resolve(false))
          .finally(() => FingerprintScanner.release());
      });
    }
    return false;
  };

  return null;
}

export default Biometric;
