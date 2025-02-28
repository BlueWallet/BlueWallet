import { useCallback, useEffect, useMemo, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import * as NavigationService from '../NavigationService';
import { useStorage } from './context/useStorage';

/*
Hook for managing iPadOS and macOS menu actions with keyboard shortcuts.
Uses MenuElementsEmitter for event handling.
*/

type MenuEventHandler = () => void;

const { MenuElementsEmitter } = NativeModules;
let eventEmitter: NativeEventEmitter | null = null;

let globalReloadTransactionsFunction: MenuEventHandler | null = null;

// Only create the emitter if the module exists and we're on iOS/macOS
try {
  if ((Platform.OS === 'ios' || Platform.OS === 'macos') && MenuElementsEmitter) {
    eventEmitter = new NativeEventEmitter(MenuElementsEmitter);
  }
} catch (error) {
  eventEmitter = null;
}

// Empty function that does nothing - used as default
const noop = () => {};

const useMenuElements = () => {
  const { walletsInitialized } = useStorage();
  const reloadTransactionsMenuActionRef = useRef<MenuEventHandler>(noop);
  // Track if listeners have been set up
  const listenersInitialized = useRef<boolean>(false);
  const listenersRef = useRef<any[]>([]);

  const setReloadTransactionsMenuActionFunction = useCallback((handler: MenuEventHandler) => {
    if (typeof handler !== 'function') {
      return;
    }

    reloadTransactionsMenuActionRef.current = handler;
    globalReloadTransactionsFunction = handler;
  }, []);

  const clearReloadTransactionsMenuAction = useCallback(() => {
    reloadTransactionsMenuActionRef.current = noop;
  }, []);

  const dispatchNavigate = useCallback((routeName: string, screen?: string) => {
    try {
      NavigationService.dispatch(CommonActions.navigate({ name: routeName, params: screen ? { screen } : undefined }));
    } catch (error) {
      // Navigation failed silently
    }
  }, []);

  const eventActions = useMemo(
    () => ({
      openSettings: () => {
        dispatchNavigate('Settings');
      },
      addWallet: () => {
        dispatchNavigate('AddWalletRoot');
      },
      importWallet: () => {
        dispatchNavigate('AddWalletRoot', 'ImportWallet');
      },
      reloadTransactions: () => {
        try {
          const handler = reloadTransactionsMenuActionRef.current || globalReloadTransactionsFunction || noop;
          handler();
        } catch (error) {
          // Execution failed silently
        }
      },
    }),
    [dispatchNavigate],
  );

  useEffect(() => {
    // Skip if emitter doesn't exist or wallets aren't initialized yet
    if (!eventEmitter || !walletsInitialized) {
      return;
    }

    if (listenersInitialized.current) {
      return;
    }

    try {
      if (listenersRef.current.length > 0) {
        listenersRef.current.forEach(listener => listener?.remove?.());
        listenersRef.current = [];
      }

      eventEmitter.removeAllListeners('openSettings');
      eventEmitter.removeAllListeners('addWalletMenuAction');
      eventEmitter.removeAllListeners('importWalletMenuAction');
      eventEmitter.removeAllListeners('reloadTransactionsMenuAction');
    } catch (error) {
      // Error cleanup silently ignored
    }

    try {
      const listeners = [
        eventEmitter.addListener('openSettings', eventActions.openSettings),
        eventEmitter.addListener('addWalletMenuAction', eventActions.addWallet),
        eventEmitter.addListener('importWalletMenuAction', eventActions.importWallet),
        eventEmitter.addListener('reloadTransactionsMenuAction', eventActions.reloadTransactions),
      ];

      listenersRef.current = listeners;
      listenersInitialized.current = true;
    } catch (error) {
      // Listener setup failed silently
    }

    return () => {
      try {
        listenersRef.current.forEach(listener => {
          if (listener && typeof listener.remove === 'function') {
            listener.remove();
          }
        });
        listenersRef.current = [];
        listenersInitialized.current = false;
      } catch (error) {
        // Cleanup error silently ignored
      }
    };
  }, [walletsInitialized, eventActions]);

  return {
    setReloadTransactionsMenuActionFunction,
    clearReloadTransactionsMenuAction,
    isMenuElementsSupported: !!eventEmitter,
  };
};

export default useMenuElements;
