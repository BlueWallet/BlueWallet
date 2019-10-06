import AsyncStorage from '@react-native-community/async-storage';
const BlueApp = require('../BlueApp');

export default class OnAppLaunch {
  static STORAGE_KEY = 'OnAppLaunchKey';
  static ENABLED_KEY = 'OnAppLaunchEnabledKey';

  static async isViewAllWalletsEnabled() {
    let isEnabled;
    try {
      isEnabled = await AsyncStorage.getItem(OnAppLaunch.ENABLED_KEY);
      if (!isEnabled) {
        const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
        if (!selectedDefaultWallet) {
          isEnabled = '1';
          await AsyncStorage.setItem(OnAppLaunch.ENABLED_KEY, isEnabled);
        }
      }
    } catch (_e) {
      isEnabled = '1';
      await AsyncStorage.setItem(OnAppLaunch.ENABLED_KEY, isEnabled);
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
    await AsyncStorage.setItem(OnAppLaunch.ENABLED_KEY, value === false ? '' : '1');
  }

  static async getSelectedDefaultWallet() {
    let selectedWallet = false;
    try {
      const selectedWalletID = JSON.parse(await AsyncStorage.getItem(OnAppLaunch.STORAGE_KEY));
      selectedWallet = BlueApp.getWallets().find(wallet => wallet.getID() === selectedWalletID);
      if (!selectedWallet) {
        await AsyncStorage.setItem(OnAppLaunch.ENABLED_KEY, '');
        await AsyncStorage.removeItem(OnAppLaunch.STORAGE_KEY);
      }
    } catch (_e) {
      return false;
    }
    return selectedWallet;
  }

  static async setSelectedDefaultWallet(value) {
    await AsyncStorage.setItem(OnAppLaunch.STORAGE_KEY, JSON.stringify(value));
  }
}
