import JailMonkey from 'jail-monkey';
import { Alert } from 'react-native';
import { isPinOrFingerprintSet } from 'react-native-device-info';

import { isAndroid, isIos } from 'app/styles';

const i18n = require('../../loc');

export const checkDeviceSecurity = () => {
  isPinOrFingerprintSet().then(isPinOrFingerprintSet => {
    if (!isPinOrFingerprintSet) {
      Alert.alert(i18n.security.title, i18n.security.noPinOrFingerprintSet);
    }
  });
  if (JailMonkey.isJailBroken()) {
    if (isIos()) Alert.alert(i18n.security.title, i18n.security.jailBrokenPhone);
    else if (isAndroid()) Alert.alert(i18n.security.title, i18n.security.rootedPhone);
  }
};
