import { useEffect, useCallback } from 'react';
import {  Platform } from 'react-native';
import QuickActions from 'react-native-quick-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatBalance } from '../loc';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';

const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

export async function setEnabled(enabled: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(DeviceQuickActionsStorageKey, JSON.stringify(enabled));
  } catch (error) {
    console.error('Failed to set QuickActions enabled state:', error);
  }
}

export async function getEnabled(): Promise<boolean> {
  try {
    const isEnabled = await AsyncStorage.getItem(DeviceQuickActionsStorageKey);
    if (isEnabled === null) {
      await setEnabled(true);
      return true;
    }
    return !!JSON.parse(isEnabled);
  } catch (error) {
    console.error('Failed to get QuickActions enabled state:', error);
    return true;
  }
}

const useDeviceQuickActions = () => {
  const { wallets, walletsInitialized, isStorageEncrypted } = useStorage();
  const { preferredFiatCurrency, isQuickActionsEnabled } = useSettings();




  const removeShortcuts = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'android') {
        QuickActions.clearShortcutItems();
      } else {
        QuickActions.setShortcutItems([{ type: 'EmptyWallets', title: '' }]);
      }
    } catch (error) {
      console.error('Failed to remove shortcuts:', error);
    }
  }, []);

  const setQuickActions = useCallback(async (): Promise<void> => {
    try {
      if (await getEnabled()) {
        QuickActions.isSupported((error: null, _supported: any) => {
          if (error === null) {
            const shortcutItems = wallets.slice(0, 4).map((wallet, index) => ({
              type: 'Wallets',
              title: wallet.getLabel(),
              subtitle:
                wallet.hideBalance || wallet.getBalance() <= 0
                  ? ''
                  : formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
              userInfo: {
                url: `bluewallet://wallet/${wallet.getID()}`,
              },
              icon: Platform.select({ android: 'quickactions', ios: index === 0 ? 'Favorite' : 'Bookmark' }) || 'defaultIcon',
            }));
            QuickActions.setShortcutItems(shortcutItems);
          } else {
            console.error('QuickActions not supported:', error);
          }
        });
      } else {
        removeShortcuts();
      }
    } catch (error) {
      console.error('Failed to set QuickActions:', error);
    }
  }, [wallets, removeShortcuts]);

  useEffect(() => {
    const handleEncryptionStatus = async () => {
      try {
        const encrypted = await isStorageEncrypted();
        if (encrypted) {
          await removeShortcuts();
        } else {
          await setQuickActions();
        }
      } catch (error) {
        console.error('Error handling storage encryption:', error);
        await removeShortcuts();
      }
    };

    if (walletsInitialized) {
      handleEncryptionStatus();
    }
  }, [walletsInitialized, isStorageEncrypted, setQuickActions, removeShortcuts]);

  useEffect(() => {
    const manageQuickActions = async () => {
      if (isQuickActionsEnabled && walletsInitialized) {
        await setQuickActions();
      } else if (walletsInitialized) {
        await removeShortcuts();
      }
    };

    manageQuickActions();
  }, [isQuickActionsEnabled, walletsInitialized, setQuickActions, removeShortcuts, preferredFiatCurrency]);
};

export default useDeviceQuickActions;
