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
        console.debug('Calling reloadTransactionsMenuActionFunction:', reloadTransactionsMenuActionRef.current);
        reloadTransactionsMenuActionRef.current();
      },
    }),
    [dispatchNavigate],
  );

  useEffect(() => {
    console.debug('useEffect: walletsInitialized =', walletsInitialized);
    if (walletsInitialized && eventEmitter) {
      console.debug('Adding event listeners for menu actions');
      eventEmitter.addListener('openSettings', eventActions.openSettings);
      eventEmitter.addListener('addWalletMenuAction', eventActions.addWallet);
      eventEmitter.addListener('importWalletMenuAction', eventActions.importWallet);
      eventEmitter.addListener('reloadTransactionsMenuAction', eventActions.reloadTransactions);

      return () => {
        console.debug('Removing event listeners for menu actions');
        eventEmitter.removeAllListeners('openSettings');
        eventEmitter.removeAllListeners('addWalletMenuAction');
        eventEmitter.removeAllListeners('importWalletMenuAction');
        eventEmitter.removeAllListeners('reloadTransactionsMenuAction');
      };
    }
  }, [walletsInitialized, eventActions]);

  return {
    setReloadTransactionsMenuActionFunction,
  };
};

export default useMenuElements;