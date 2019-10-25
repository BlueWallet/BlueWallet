const PrivacySnapshot = require('react-native-privacy-snapshot');

export default class Privacy {
  static enableBlur() {
    PrivacySnapshot.enabled(true);
  }

  static disableBlur() {
    PrivacySnapshot.enabled(false);
  }
}
