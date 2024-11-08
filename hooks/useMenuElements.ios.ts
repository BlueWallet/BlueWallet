import { useCallback, useEffect, useMemo, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import * as NavigationService from '../NavigationService';
import { useStorage } from './context/useStorage';

/*
Hook for managing iPadOS and macOS menu actions with keyboard shortcuts.
Uses MenuElementsEmitter for event handling.
*/

const { MenuElementsEmitter } = NativeModules;
const eventEmitter = Platform.OS === 'ios' || Platform.OS === 'macos' ? new NativeEventEmitter(MenuElementsEmitter) : undefined;

const useMenuElements = () => {
  const { walletsInitialized } = useStorage();

  const reloadTransactionsMenuActionRef = useRef<() => void>(() => {});

  const setReloadTransactionsMenuActionFunction = (newFunction: () => void) => {
    console.debug('Setting reloadTransactionsMenuActionFunction.');
    reloadTransactionsMenuActionRef.current = newFunction;
  };

  const dispatchNavigate = useCallback((routeName: string, screen?: string) => {
    const action = CommonActions.navigate({
      name: routeName,
      params: screen ? { screen } : undefined,
    });
    NavigationService.dispatch(action);
  }, []);

  const eventActions = useMemo(
    () => ({
      openSettings: () => dispatchNavigate('Settings'),
      addWallet: () => dispatchNavigate('AddWalletRoot'),
      importWallet: () => dispatchNavigate('AddWalletRoot', 'ImportWallet'),
      reloadTransactions: () => {
        if (__DEV__) {
          console.debug('Calling reloadTransactionsMenuActionFunction');
        }
        if (reloadTransactionsMenuActionRef.current) {
          reloadTransactionsMenuActionRef.current();
        } else {
          console.warn('No reload function set for reloadTransactions menu action');
        }
      },
    }),
    [dispatchNavigate],
  );

  useEffect(() => {
    if (__DEV__) {
      console.debug('useEffect: walletsInitialized =', walletsInitialized);
    }
    
    if (walletsInitialized && eventEmitter) {
      if (__DEV__) {
        console.debug('Adding event listeners for menu actions');
      }
      
      try {
        const listeners = [
          eventEmitter.addListener('openSettings', eventActions.openSettings),
          eventEmitter.addListener('addWalletMenuAction', eventActions.addWallet),
          eventEmitter.addListener('importWalletMenuAction', eventActions.importWallet),
          eventEmitter.addListener('reloadTransactionsMenuAction', eventActions.reloadTransactions),
        ];

        return () => {
          if (__DEV__) {
            console.debug('Removing event listeners for menu actions');
          }
          listeners.forEach(listener => listener.remove());
        };
      } catch (error) {
        console.error('Failed to set up menu event listeners:', error);
      }
    }
  }, [walletsInitialized, eventActions]);

  return {
    setReloadTransactionsMenuActionFunction,
  };
};

export default useMenuElements;