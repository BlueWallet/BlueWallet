import { useCallback, useEffect, useMemo, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import * as NavigationService from '../NavigationService';
import { useStorage } from './context/useStorage';
import { ActionHandler, MenuActionType } from './useMenuElements.common';

/*
Hook for managing iPadOS and macOS menu actions with keyboard shortcuts.
Uses MenuElementsEmitter for event handling.
*/

const { MenuElementsEmitter } = NativeModules;
let eventEmitter: NativeEventEmitter | null = null;

const actionHandlers = new Map<MenuActionType, ActionHandler>();

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
  const listenersInitialized = useRef<boolean>(false);
  const listenersRef = useRef<any[]>([]);

  const setActionHandler = useCallback((actionType: MenuActionType, handler: ActionHandler) => {
    if (typeof handler !== 'function') {
      return;
    }
    
    actionHandlers.set(actionType, handler);
  }, []);

  const clearActionHandler = useCallback((actionType: MenuActionType) => {
    actionHandlers.delete(actionType);
  }, []);

  const dispatchNavigate = useCallback((routeName: string, screen?: string) => {
    try {
      NavigationService.dispatch(CommonActions.navigate({ name: routeName, params: screen ? { screen } : undefined }));
    } catch (error) {
      console.debug('[useMenuElements] Error dispatching navigation:', error);
    }
  }, []);

  const eventActions = useMemo(
    () => ({
      [MenuActionType.OPEN_SETTINGS]: () => {
        dispatchNavigate('Settings');
      },
      [MenuActionType.ADD_WALLET]: () => {
        dispatchNavigate('AddWalletRoot');
      },
      [MenuActionType.IMPORT_WALLET]: () => {
        dispatchNavigate('AddWalletRoot', 'ImportWallet');
      },
      [MenuActionType.RELOAD_TRANSACTIONS]: () => {
        try {
          const handler = actionHandlers.get(MenuActionType.RELOAD_TRANSACTIONS) || noop;
          handler();
        } catch (error) {
          console.debug('[useMenuElements] Error executing action handler:', error);
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

      // Remove all existing listeners
      Object.values(MenuActionType).forEach(actionType => {
        eventEmitter?.removeAllListeners(actionType);
      });
    } catch (error) {
      console.debug('[useMenuElements] Error removing existing listeners:', error);
    }

    try {
      const listeners = Object.entries(eventActions).map(([actionType, handler]) => {
        return eventEmitter?.addListener(actionType, handler);
      }).filter(Boolean);

      listenersRef.current = listeners;
      listenersInitialized.current = true;
    } catch (error) {
      console.debug('[useMenuElements] Error adding listeners:', error);
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
        console.debug('[useMenuElements] Error removing listeners:', error);``
      }
    };
  }, [walletsInitialized, eventActions]);

  return {
    setActionHandler,
    clearActionHandler,
    MenuActionType,
    isMenuElementsSupported: !!eventEmitter,
  };
};

export default useMenuElements;
