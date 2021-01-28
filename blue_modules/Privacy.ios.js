import { enabled } from 'react-native-privacy-snapshot';
export default class Privacy {
  static enableBlur() {
    enabled(true);
  }

  static disableBlur() {
    enabled(false);
  }
}
