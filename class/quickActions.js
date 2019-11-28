import QuickActions from 'react-native-quick-actions';
import { Platform } from 'react-native';

export default class DeviceQuickActions {
  static shared = new DeviceQuickActions();
  wallets;

  static setWallets(wallets) {
    DeviceQuickActions.shared.wallets = wallets.slice(0, 4);
  }

  static removeAllWallets() {
    DeviceQuickActions.shared.wallets = undefined;
  }

  static setQuickActions() {
    if (DeviceQuickActions.shared.wallets === undefined) {
      return;
    }
    QuickActions.isSupported((error, supported) => {
      if (supported && error === null) {
        let shortcutItems = [];
        const loc = require('../loc/');
        for (const wallet of DeviceQuickActions.shared.wallets) {
          shortcutItems.push({
            type: 'Wallets', // Required
            title: wallet.getLabel(), // Optional, if empty, `type` will be used instead
            subtitle:
              wallet.hideBalance || wallet.getBalance() <= 0
                ? ''
                : loc.formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
            userInfo: {
              url: `bluewallet://wallet/${wallet.getID()}`, // Provide any custom data like deep linking URL
            },
            icon: Platform.select({ android: 'quickactions', ios: 'bookmark' }),
          });
        }
        QuickActions.setShortcutItems(shortcutItems);
      }
    });
  }

  static clearShortcutItems() {
    QuickActions.clearShortcutItems();
  }
}
