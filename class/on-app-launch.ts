import AsyncStorage from '@react-native-async-storage/async-storage';
import { TWallet } from './wallets/types';
import BlueApp from '../BlueApp';

export default class OnAppLaunch {
  static STORAGE_KEY = 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY';

  static async isViewAllWalletsEnabled(): Promise<boolean> {
    try {
      const selectedDefaultWallet = await AsyncStorage.getItem(OnAppLaunch.STORAGE_KEY);
      return selectedDefaultWallet === '' || selectedDefaultWallet === null;
    } catch (_e) {
      return true;
    }
  }

  static async setViewAllWalletsEnabled(value: boolean) {
    if (!value) {
      const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
      if (!selectedDefaultWallet) {
        const firstWallet = BlueApp.getWallets()[0];
        await OnAppLaunch.setSelectedDefaultWallet(firstWallet.getID());
      }
    } else {
      await AsyncStorage.setItem(OnAppLaunch.STORAGE_KEY, '');
    }
  }

  static async getSelectedDefaultWallet(): Promise<TWallet | undefined> {
    let selectedWallet: TWallet | undefined;
    try {
      const selectedWalletID = JSON.parse((await AsyncStorage.getItem(OnAppLaunch.STORAGE_KEY)) || 'null');
      if (selectedWalletID) {
        selectedWallet = BlueApp.getWallets().find(wallet => wallet.getID() === selectedWalletID);
        if (!selectedWallet) {
          await AsyncStorage.setItem(OnAppLaunch.STORAGE_KEY, '');
        }
      }
    } catch (_e) {
      return;
    }
    return selectedWallet;
  }

  static async setSelectedDefaultWallet(value: string) {
    await AsyncStorage.setItem(OnAppLaunch.STORAGE_KEY, JSON.stringify(value));
  }
}
