import AsyncStorage from '@react-native-community/async-storage';
const BlueApp = require('../BlueApp');

export default class OnAppLaunch {
  static STORAGE_KEY = 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY';

  static async isViewAllWalletsEnabled() {
    try {
      const selectedDefaultWallet = JSON.parse(await AsyncStorage.getItem(OnAppLaunch.STORAGE_KEY)) || '';
      if (selectedDefaultWallet === '') {
        return true;
      } else {
        return false;
      }
    } catch (_e) {
      return true;
    }
  }

  static async setViewAllWalletsEnabled(value) {
    if (!value) {
      const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
      if (!selectedDefaultWallet) {
        const firstWallet = BlueApp.getWallets()[0].getID();
        await OnAppLaunch.setSelectedDefaultWallet(firstWallet);
      }
    } else {
      await AsyncStorage.setItem(OnAppLaunch.STORAGE_KEY, '');
    }
  }

  static async getSelectedDefaultWallet() {
    let selectedWallet = false;
    try {
      const selectedWalletID = JSON.parse(await AsyncStorage.getItem(OnAppLaunch.STORAGE_KEY));
      selectedWallet = BlueApp.getWallets().find(wallet => wallet.getID() === selectedWalletID);
      if (!selectedWallet) {
        await AsyncStorage.setItem(OnAppLaunch.STORAGE_KEY, '');
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
