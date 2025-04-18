import { useEffect, useCallback, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { navigationRef } from '../NavigationService';

type MenuActionHandler = () => void;

const { MenuElementsEmitter } = NativeModules;
let eventEmitter: NativeEventEmitter | null = null;
const handlerRegistry = new Map<string, MenuActionHandler>();

try {
  if (Platform.OS === 'ios' && MenuElementsEmitter) {
    eventEmitter = new NativeEventEmitter(MenuElementsEmitter);
    if (typeof MenuElementsEmitter.sharedInstance === 'function') {
      MenuElementsEmitter.sharedInstance();
    }
  }
} catch (error) {
  console.warn('Failed to initialize menu emitter:', error);
  eventEmitter = null;
}

interface MenuElementsHook {
  registerTransactionsHandler: (handler: MenuActionHandler, screenKey?: string) => boolean;
  unregisterTransactionsHandler: (screenKey: string) => void;
  isMenuElementsSupported: boolean;
}

const useMenuElements = (): MenuElementsHook => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && eventEmitter) {
      initialized.current = true;

      eventEmitter.addListener('openSettings', () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Settings');
        }
      });

      eventEmitter.addListener('addWalletMenuAction', () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AddWalletRoot');
        }
      });

      eventEmitter.addListener('importWalletMenuAction', () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AddWalletRoot', { screen: 'ImportWallet' });
        }
      });

      eventEmitter.addListener('reloadTransactionsMenuAction', () => {
        if (!navigationRef.isReady()) return;

        const currentRoute = navigationRef.getCurrentRoute();
        if (!currentRoute) return;

        const screenName = currentRoute.name;
        const params = (currentRoute.params as { walletID?: string }) || {};
        const walletID = params.walletID;
        const specificKey = walletID ? `${screenName}-${walletID}` : null;

        const handler = (specificKey ? handlerRegistry.get(specificKey) : undefined) || handlerRegistry.get(screenName);

        if (typeof handler === 'function') {
          handler();
        }
      });
    }
  }, []);

  const registerTransactionsHandler = useCallback((handler: MenuActionHandler, screenKey?: string): boolean => {
    if (typeof handler !== 'function') return false;
    const key = screenKey || navigationRef.current?.getCurrentRoute()?.name;
    if (!key) return false;
    handlerRegistry.set(key, handler);
    return true;
  }, []);

  const unregisterTransactionsHandler = useCallback((screenKey: string): void => {
    if (screenKey) handlerRegistry.delete(screenKey);
  }, []);

  return {
    registerTransactionsHandler,
    unregisterTransactionsHandler,
    isMenuElementsSupported: !!eventEmitter,
  };
};

export default useMenuElements;
