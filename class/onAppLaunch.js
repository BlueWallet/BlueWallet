import AsyncStorage from '@react-native-community/async-storage';
const BlueApp = require('../BlueApp');

export default class OnAppLaunch {
  static StorageKey = 'OnAppLaunchKey';
  static EnabledKey = 'OnAppLaunchEnabledKey';

  static async isViewAllWalletsEnabled() {
    let isEnabled = '1';
    try {
      const enabled = await AsyncStorage.getItem(OnAppLaunch.EnabledKey);
      isEnabled = enabled;
      if (!isEnabled) {
        const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
        if (!selectedDefaultWallet) {
          isEnabled = '1';
          await AsyncStorage.setItem(OnAppLaunch.EnabledKey, isEnabled);
        }
      }
    } catch (_e) {
      isEnabled = '1';
      await AsyncStorage.setItem(OnAppLaunch.EnabledKey, isEnabled);
    }
    return !!isEnabled;
  }

  static async setViewAllWalletsEnabled(value) {
    if (!value) {
      const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
      if (!selectedDefaultWallet) {
        const firstWallet = BlueApp.getWallets()[0];
        await OnAppLaunch.setSelectedDefaultWallet(firstWallet.getID());
      }
    }
    await AsyncStorage.setItem(OnAppLaunch.EnabledKey, value === false ? '' : '1');
  }

  static async getSelectedDefaultWallet() {
    let selectedWallet = false;
    try {
      const selectedWalletID = JSON.parse(await AsyncStorage.getItem(OnAppLaunch.StorageKey));
      selectedWallet = BlueApp.getWallets().find(wallet => wallet.getID() === selectedWalletID);
      if (!selectedWallet) {
        await AsyncStorage.setItem(OnAppLaunch.EnabledKey, '');
        await AsyncStorage.removeItem(OnAppLaunch.StorageKey);
      }
    } catch (_e) {
      return false;
    }
    return selectedWallet;
  }

  static async setSelectedDefaultWallet(value) {
    await AsyncStorage.setItem(OnAppLaunch.StorageKey, JSON.stringify(value));
  }
}
