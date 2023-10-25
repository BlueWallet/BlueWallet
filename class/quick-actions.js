import QuickActions from 'react-native-quick-actions';
import { Platform } from 'react-native';
import { formatBalance } from '../loc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';

function DeviceQuickActions() {
  DeviceQuickActions.STORAGE_KEY = 'DeviceQuickActionsEnabled';
  const { wallets, walletsInitialized, isStorageEncrypted, preferredFiatCurrency } = useContext(BlueStorageContext);

  useEffect(() => {
    if (walletsInitialized) {
      isStorageEncrypted()
        .then(value => {
          if (value) {
            removeShortcuts();
          } else {
            setQuickActions();
          }
        })
        .catch(() => removeShortcuts());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, walletsInitialized, preferredFiatCurrency]);

  DeviceQuickActions.setEnabled = (enabled = true) => {
    return AsyncStorage.setItem(DeviceQuickActions.STORAGE_KEY, JSON.stringify(enabled)).then(() => {
      if (!enabled) {
        removeShortcuts();
      } else {
        setQuickActions();
      }
    });
  };

  DeviceQuickActions.popInitialAction = async () => {
    const data = await QuickActions.popInitialAction();
    return data;
  };

  DeviceQuickActions.getEnabled = async () => {
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
  };

  const removeShortcuts = async () => {
    if (Platform.OS === 'android') {
      QuickActions.clearShortcutItems();
    } else {
      /* iOS has a bug where if you nil the array or send an empty one it will restore the previous array on device reboot. */
      QuickActions.setShortcutItems([
        {
          type: 'EmptyWallets', // Required
          title: '',
        },
      ]);
    }
  };

  const setQuickActions = async () => {
    if (await DeviceQuickActions.getEnabled()) {
      QuickActions.isSupported((error, _supported) => {
        if (error === null) {
          const shortcutItems = [];
          for (const wallet of wallets.slice(0, 4)) {
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
      removeShortcuts();
    }
  };

  return null;
}

export default DeviceQuickActions;
