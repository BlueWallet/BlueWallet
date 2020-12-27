import Obscure from 'react-native-obscure';
import { Platform } from 'react-native';
import { enabled } from 'react-native-privacy-snapshot';
export default class Privacy {
  static enableBlur() {
    Platform.OS === 'android' ? Obscure.activateObscure() : enabled(true);
  }

  static disableBlur() {
    Platform.OS === 'android' ? Obscure.deactivateObscure() : enabled(false);
  }
}
