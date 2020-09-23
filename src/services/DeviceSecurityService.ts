import { Alert } from 'react-native';
import { isPinOrFingerprintSet } from 'react-native-device-info';

const i18n = require('../../loc');

export const checkDeviceSecurity = () => {
  isPinOrFingerprintSet().then(isPinOrFingerprintSet => {
    if (!isPinOrFingerprintSet) {
      Alert.alert(i18n.security.title, i18n.security.noPinOrFingerprintSet);
    }
  });
};
