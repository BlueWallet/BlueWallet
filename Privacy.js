import Obscure from 'react-native-obscure';
import { Platform } from 'react-native';
const PrivacySnapshot = require('react-native-privacy-snapshot');

export default class Privacy {
  static enableBlur() {
    Platform.OS === 'android' ? Obscure.activateObscure() : PrivacySnapshot.enabled(true);
  }

  static disableBlur() {
    Platform.OS === 'android' ? Obscure.deactivateObscure() : PrivacySnapshot.enabled(false);
  }
}
