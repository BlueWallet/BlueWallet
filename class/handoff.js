import { Platform } from 'react-native';

const BlueApp = require('../BlueApp');

export default class HandoffSettings {
  static STORAGEKEY = 'HandOff';

  static async isHandoffUseEnabled() {
    if (Platform.OS !== 'ios') {
      return false;
    }
    try {
      const enabledHandoff = await BlueApp.getItem(HandoffSettings.STORAGEKEY);
      return !!enabledHandoff;
    } catch (_e) {
      await BlueApp.setItem(HandoffSettings.STORAGEKEY, '');
      return false;
    }
  }

  static async setHandoffUseEnabled(value) {
    await BlueApp.setItem(HandoffSettings.STORAGEKEY, value === true && Platform.OS === 'ios' ? '1' : '');
  }
}
