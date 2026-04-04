import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import QuickActions, { ShortcutItem } from 'react-native-quick-actions';
import { formatBalance } from '../loc';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';

const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

export async function setEnabled(enabled: boolean = true): Promise<void> {
  await AsyncStorage.setItem(DeviceQuickActionsStorageKey, JSON.stringify(enabled));
}

export async function getEnabled(): Promise<boolean> {
  try {
    const isEnabled = await AsyncStorage.getItem(DeviceQuickActionsStorageKey);
    if (isEnabled === null) {
      await setEnabled(true);
      return true;
    }
    return !!JSON.parse(isEnabled);
  } catch {
    return true;
  }
}

const useDeviceQuickActions = () => {
  const { wallets, walletsInitialized, isStorageEncrypted } = useStorage();
  const { preferredFiatCurrency, isQuickActionsEnabled } = useSettings();

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
  }, [wallets, walletsInitialized, preferredFiatCurrency, isStorageEncrypted]);

  useEffect(() => {
    if (walletsInitialized) {
      if (isQuickActionsEnabled) {
        setQuickActions();
      } else {
        removeShortcuts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuickActionsEnabled, walletsInitialized]);

  const removeShortcuts = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      QuickActions.clearShortcutItems();
    } else {
      // @ts-ignore: Fix later
      QuickActions.setShortcutItems([{ type: 'EmptyWallets', title: '' }]);
    }
  };

  const setQuickActions = async (): Promise<void> => {
    if (await getEnabled()) {
      QuickActions.isSupported((error: null, _supported: any) => {
        if (error === null) {
          const shortcutItems: ShortcutItem[] = wallets.slice(0, 4).map((wallet, index) => ({
            type: 'Wallets',
            title: wallet.getLabel(),
            subtitle:
              wallet.hideBalance || wallet.getBalance() <= 0
                ? ''
                : formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
            userInfo: {
              url: `bluewallet://wallet/${wallet.getID()}`,
            },
            icon:
              Platform.select({
                android: 'quickactions',
                ios: index === 0 ? 'Favorite' : 'Bookmark',
              }) || 'quickactions',
          }));
          QuickActions.setShortcutItems(shortcutItems);
        }
      });
    } else {
      removeShortcuts();
    }
  };

  return undefined;
};

export default useDeviceQuickActions;
