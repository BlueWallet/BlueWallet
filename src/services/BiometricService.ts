import ReactNativeBiometrics from 'react-native-biometrics';

type BiometryType =
  | undefined
  | ReactNativeBiometrics.FaceID
  | ReactNativeBiometrics.TouchID
  | ReactNativeBiometrics.Biometrics;

export default class BiometricService {
  static FaceID = ReactNativeBiometrics.FaceID;
  static TouchID = ReactNativeBiometrics.TouchID;
  static Biometrics = ReactNativeBiometrics.Biometrics;

  constructor() {
    this.setBiometricsAvailability();
  }

  biometryType: BiometryType;

  setBiometricsAvailability = async () => {
    const biometricsResult = await ReactNativeBiometrics.isSensorAvailable();
    const { available, biometryType } = biometricsResult;
    if (!available) {
      return;
    } else {
      this.biometryType = biometryType;
    }
  };

  unlockWithBiometrics = async () => {
    try {
      const checkResult = await ReactNativeBiometrics.simplePrompt({
        promptMessage: 'Touch ID for "Gold Wallet"',
        cancelButtonText: 'Enter PIN',
      });
      const { success } = checkResult;

      if (success) {
        return success;
      } else {
        console.log('cancelled by user');
      }
    } catch {
      console.log('biometrics failed'); // for crashlytics to catch
    }
  };
}
