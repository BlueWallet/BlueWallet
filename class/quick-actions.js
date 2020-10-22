import QuickActions from 'react-native-quick-actions';
import { Platform } from 'react-native';
import { formatBalance } from '../loc';
import AsyncStorage from '@react-native-community/async-storage';

export default class DeviceQuickActions {
  static shared = new DeviceQuickActions();
  static STORAGE_KEY = 'DeviceQuickActionsEnabled';
  wallets;

  static setEnabled(enabled = true) {
    return AsyncStorage.setItem(DeviceQuickActions.STORAGE_KEY, JSON.stringify(enabled)).then(() => {
      if (!enabled) {
        DeviceQuickActions.clearShortcutItems();
      } else {
        const BlueApp = require('../BlueApp');
        DeviceQuickActions.shared.wallets = BlueApp.getWallets();
        DeviceQuickActions.setQuickActions();
      }
    });
  }

  static async getEnabled() {
    try {
      const isEnabled = await AsyncStorage.getItem(DeviceQuickActions.STORAGE_KEY);
      if (isEnabled === null) {
        await DeviceQuickActions.setEnabled(JSON.stringify(true));
        return true;
      }
      return !!JSON.parse(isEnabled);
    } catch {
      return true;
    }
  }

  static setWallets(wallets) {
    DeviceQuickActions.shared.wallets = wallets.slice(0, 4);
  }

  static removeAllWallets() {
    DeviceQuickActions.shared.wallets = undefined;
  }

  static async setQuickActions() {
    if (DeviceQuickActions.shared.wallets === undefined) {
      return;
    }

    if (await DeviceQuickActions.getEnabled()) {
      QuickActions.isSupported((error, _supported) => {
        if (error === null) {
          const shortcutItems = [];
          for (const wallet of DeviceQuickActions.shared.wallets) {
            shortcutItems.push({
              type: 'Wallets', // Required
              title: wallet.getLabel(), // Optional, if empty, `type` will be used instead
              subtitle:
                wallet.hideBalance || wallet.getBalance() <= 0
                  ? ''
                  : formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
              userInfo: {
                url: `bluewallet://wallet/${wallet.getID()}`, // Provide any custom data like deep linking URL
              },
              icon: Platform.select({ android: 'quickactions', ios: 'bookmark' }),
            });
          }
          QuickActions.setShortcutItems(shortcutItems);
        }
      });
    } else {
      DeviceQuickActions.clearShortcutItems();
    }
  }

  static clearShortcutItems() {
    QuickActions.clearShortcutItems();
  }
}
