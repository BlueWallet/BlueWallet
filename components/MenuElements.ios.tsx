import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as NavigationService from '../NavigationService';
import { useStorage } from '../hooks/context/useStorage';

/* 
Component for iPadOS and macOS menu items with keyboard shortcuts. 
EventEmitter on the native side should receive a payload and rebuild menus.
*/

const eventEmitter = Platform.OS === 'ios' || Platform.OS === 'macos' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;
const MenuElements = () => {
  const { walletsInitialized, reloadTransactionsMenuActionFunction } = useStorage();

  // BlueWallet -> Settings
  const openSettings = useCallback(() => {
    dispatchNavigate('Settings');
  }, []);

  // File -> Add Wallet
  const addWalletMenuAction = useCallback(() => {
    dispatchNavigate('AddWalletRoot');
  }, []);

  // File -> Add Wallet
  const importWalletMenuAction = useCallback(() => {
    dispatchNavigate('AddWalletRoot', 'ImportWallet');
  }, []);

  const dispatchNavigate = (routeName: string, screen?: string) => {
    const action = screen
      ? CommonActions.navigate({
          name: routeName,
          params: { screen },
        })
      : CommonActions.navigate({
          name: routeName,
        });

    NavigationService.dispatch(action);
  };

  const reloadTransactionsMenuElementsFunction = useCallback(() => {
    if (reloadTransactionsMenuActionFunction && typeof reloadTransactionsMenuActionFunction === 'function') {
      reloadTransactionsMenuActionFunction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('MenuElements: useEffect');
    if (walletsInitialized) {
      eventEmitter?.addListener('openSettings', openSettings);
      eventEmitter?.addListener('addWalletMenuAction', addWalletMenuAction);
      eventEmitter?.addListener('importWalletMenuAction', importWalletMenuAction);
      eventEmitter?.addListener('reloadTransactionsMenuAction', reloadTransactionsMenuElementsFunction);
    }
    return () => {
      eventEmitter?.removeAllListeners('openSettings');
      eventEmitter?.removeAllListeners('addWalletMenuAction');
      eventEmitter?.removeAllListeners('importWalletMenuAction');
      eventEmitter?.removeAllListeners('reloadTransactionsMenuAction');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized]);

  return null;
};

export default MenuElements;
