import { useCallback, useEffect, useMemo, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import * as NavigationService from '../NavigationService';

/*
Hook for managing iPadOS and macOS menu actions with keyboard shortcuts.
Optimized for performance with debouncing and static event handlers.
*/

type MenuEventHandler = () => void;

// Module setup - done only once at import time
const { MenuElementsEmitter } = NativeModules;
let eventEmitter: NativeEventEmitter | null = null;

// Create a global variables outside React's purview
const globalState = {
  reloadFunction: null as MenuEventHandler | null,
  lastEventTime: {} as Record<string, number>,
  isListening: false,
  listeners: [] as Array<{ remove: () => void }>,
};

// Debounce time in milliseconds
const DEBOUNCE_TIME = 300;

// Try to create the emitter only once during module initialization
if ((Platform.OS === 'ios' || Platform.OS === 'macos') && MenuElementsEmitter) {
  try {
    eventEmitter = new NativeEventEmitter(MenuElementsEmitter);
  } catch (error) {
    console.log('[MenuElements] Failed to create event emitter', error);
    eventEmitter = null;
  }
}

function cleanupListeners() {
  try {
    globalState.listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });

    if (eventEmitter) {
      eventEmitter.removeAllListeners('openSettings');
      eventEmitter.removeAllListeners('addWalletMenuAction');
      eventEmitter.removeAllListeners('importWalletMenuAction');
      eventEmitter.removeAllListeners('reloadTransactionsMenuAction');
    }

    globalState.listeners = [];
    globalState.isListening = false;
  } catch (error) {
    console.log('[MenuElements] Error during cleanup', error);
  }
}


// Debounce function to prevent excessive calls
function debounce(fn: Function, key: string) {
  const now = Date.now();
  if (globalState.lastEventTime[key] && now - globalState.lastEventTime[key] < DEBOUNCE_TIME) {
    return;
  }
  globalState.lastEventTime[key] = now;
  fn();
}

// Set up static event handlers that don't depend on React
function setupStaticEventHandlers() {
  if (!eventEmitter || globalState.isListening) return;

  try {
    // Clean up any existing listeners
    cleanupListeners();

    // Navigation handler that doesn't depend on React state
    const dispatchNavigate = (routeName: string, screen?: string) => {
      debounce(() => {
        try {
          NavigationService.dispatch(CommonActions.navigate({ name: routeName, params: screen ? { screen } : undefined }));
        } catch (error) {
          console.log('[MenuElements] Navigation failed', error);
        }
      }, `navigate_${routeName}`);
    };

    // Event handlers with debounce
    const eventHandlers = {
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
        debounce(() => {
          try {
            if (globalState.reloadFunction) {
              globalState.reloadFunction();
            }
          } catch (error) {
            console.log('[MenuElements] Error executing reload function', error);
          }
        }, 'reload_transactions');
      },
    };

    // Add listeners with minimal overhead
    globalState.listeners = [
      eventEmitter.addListener('openSettings', eventHandlers.openSettings),
      eventEmitter.addListener('addWalletMenuAction', eventHandlers.addWallet),
      eventEmitter.addListener('importWalletMenuAction', eventHandlers.importWallet),
      eventEmitter.addListener('reloadTransactionsMenuAction', eventHandlers.reloadTransactions),
    ];

    globalState.isListening = true;
    console.log('[MenuElements] Static event handlers initialized');
  } catch (error) {
    console.log('[MenuElements] Failed to initialize static handlers', error);
    cleanupListeners();
  }
}


// Initialize listeners immediately at import time
setupStaticEventHandlers();

/**
 * Hook to access menu elements functionality with minimal performance impact
 */
const useMenuElements = () => {
  const setFunctionCalled = useRef(false);

  // Set the reload function with reference stability
  const setReloadTransactionsMenuActionFunction = useCallback((handler: MenuEventHandler) => {
    if (typeof handler === 'function') {
      globalState.reloadFunction = handler;
      setFunctionCalled.current = true;
    }
  }, []);

  const clearReloadTransactionsMenuAction = useCallback(() => {
    globalState.reloadFunction = null;
    setFunctionCalled.current = false;
  }, []);

  // Run setup once on mount if not already done
  useEffect(() => {
    if (!globalState.isListening) {
      setupStaticEventHandlers();
    }
    // No dependencies - run once only
  }, []);

  // Clean up handler reference when component unmounts
  useEffect(() => {
    return () => {
      // Only clean up if this instance set the handler
      if (setFunctionCalled.current) {
        globalState.reloadFunction = null;
      }
    };
  }, []);

  // Memoize API to prevent unnecessary rerenders
  return useMemo(
    () => ({
      setReloadTransactionsMenuActionFunction,
      clearReloadTransactionsMenuAction,
      isMenuElementsSupported: !!eventEmitter,
    }),
    [setReloadTransactionsMenuActionFunction, clearReloadTransactionsMenuAction],
  );
};

export default useMenuElements;
