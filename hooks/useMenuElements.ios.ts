import { useEffect, useCallback } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { navigationRef } from '../NavigationService';
import { CommonActions } from '@react-navigation/native';

/*
Hook for managing iPadOS and macOS menu actions with keyboard shortcuts.
Uses MenuElementsEmitter for event handling and navigation state.
*/

type MenuActionHandler = () => void;

// Singleton setup - initialize once at module level
const { MenuElementsEmitter } = NativeModules;
let eventEmitter: NativeEventEmitter | null = null;
let listenersInitialized = false;

// Registry for transaction handlers by screen ID
const handlerRegistry = new Map<string, MenuActionHandler>();

// Store subscription references for proper cleanup
let subscriptions: { remove: () => void }[] = [];

// For debugging purposes - track active screen
let activeScreen: string | null = null;

// Create a more robust emitter with error handling
try {
  if (Platform.OS === 'ios' && MenuElementsEmitter) {
    eventEmitter = new NativeEventEmitter(MenuElementsEmitter);
  }
} catch (error) {
  console.warn('[MenuElements] Failed to initialize event emitter: ', error);
  eventEmitter = null;
}

/**
 * Safely navigate using multiple fallback approaches
 */
function safeNavigate(routeName: string, params?: Record<string, any>): void {
  try {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate(routeName as never, params as never);
      return;
    }

    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.navigate({
          name: routeName,
          params
        })
      );
    }
  } catch (error) {
    console.error(`[MenuElements] Navigation error:`, error);
  }
}

// Cleanup event listeners to prevent memory leaks
function cleanupListeners(): void {
  if (subscriptions.length > 0) {
    subscriptions.forEach(subscription => {
      try {
        subscription.remove();
      } catch (e) {
        console.warn("[MenuElements] Error removing subscription:", e);
      }
    });
    subscriptions = [];
    listenersInitialized = false;
  }
}

function initializeListeners(): void {
  if (!eventEmitter || listenersInitialized) return;

  cleanupListeners();

  // Navigation actions
  const globalActions = {
    navigateToSettings: (): void => {
      safeNavigate('Settings');
    },
    
    navigateToAddWallet: (): void => {
      safeNavigate('AddWalletRoot');
    },
    
    navigateToImportWallet: (): void => {
      safeNavigate('AddWalletRoot', { screen: 'ImportWallet' });
    },
    
    executeReloadTransactions: (): void => {
      const currentRoute = navigationRef.current?.getCurrentRoute();
      if (!currentRoute) return;

      activeScreen = currentRoute.name;

      const screenName = currentRoute.name;
      const params = (currentRoute.params as { walletID?: string }) || {};
      const walletID = params.walletID;
      
      const specificKey = walletID ? `${screenName}-${walletID}` : null;
      
      const specificHandler = specificKey ? handlerRegistry.get(specificKey) : undefined;
      const genericHandler = handlerRegistry.get(screenName);
      const handler = specificHandler || genericHandler;
        
      if (typeof handler === 'function') {
        handler();
      }
    }
  };

  if (eventEmitter) {
    try {
      subscriptions.push(eventEmitter.addListener('openSettings', globalActions.navigateToSettings));
      subscriptions.push(eventEmitter.addListener('addWalletMenuAction', globalActions.navigateToAddWallet));
      subscriptions.push(eventEmitter.addListener('importWalletMenuAction', globalActions.navigateToImportWallet));
      subscriptions.push(eventEmitter.addListener('reloadTransactionsMenuAction', globalActions.executeReloadTransactions));
    } catch (error) {
      console.error("[MenuElements] Error setting up event listeners:", error);
    }
  }
  
  listenersInitialized = true;
}

interface MenuElementsHook {
  registerTransactionsHandler: (handler: MenuActionHandler, screenKey?: string) => boolean;
  unregisterTransactionsHandler: (screenKey: string) => void;
  isMenuElementsSupported: boolean;
}

const mountedComponents = new Set<string>();

const useMenuElements = (): MenuElementsHook => {
  useEffect(() => {
    initializeListeners();
    
    const unsubscribe = navigationRef.addListener('state', () => {
      const currentRoute = navigationRef.current?.getCurrentRoute();
      if (currentRoute) {
        activeScreen = currentRoute.name;
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  const registerTransactionsHandler = useCallback((handler: MenuActionHandler, screenKey?: string): boolean => {
    if (typeof handler !== 'function') return false;
    
    const key = screenKey || navigationRef.current?.getCurrentRoute()?.name;
    if (!key) return false;
    
    mountedComponents.add(key);
    
    handlerRegistry.set(key, handler);
    
    return true;
  }, []);
  
  const unregisterTransactionsHandler = useCallback((screenKey: string): void => {
    if (!screenKey) return;

    handlerRegistry.delete(screenKey);
    mountedComponents.delete(screenKey);
  }, []);
  
  return {
    registerTransactionsHandler,
    unregisterTransactionsHandler,
    isMenuElementsSupported: !!eventEmitter,
  };
};

export default useMenuElements;
