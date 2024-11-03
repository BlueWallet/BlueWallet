import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import * as NavigationService from '../NavigationService';
import { useStorage } from '../hooks/context/useStorage';

const eventEmitter = new NativeEventEmitter(NativeModules.EventEmitter);

/* 
Hook for iPadOS and macOS menu items with keyboard shortcuts. 
EventEmitter on the native side should receive a payload and rebuild menus.
*/

const useMenuElements = () => {
  const { walletsInitialized, reloadTransactionsMenuActionFunction } = useStorage();

  const dispatchNavigate = useCallback((routeName: string, params?: object) => {
    NavigationService.dispatch(
      CommonActions.navigate({
        name: routeName,
        params,
      }),
    );
  }, []);

  // BlueWallet -> Settings
  const openSettings = useCallback(() => {
    dispatchNavigate('Settings');
  }, [dispatchNavigate]);

    // File -> Add Wallet
  const addWalletMenuAction = useCallback(() => {
    dispatchNavigate('AddWalletRoot');
  }, [dispatchNavigate]);

  // File -> Import Wallet
  const importWalletMenuAction = useCallback(() => {
    dispatchNavigate('AddWalletRoot', { screen: 'ImportWallet' });
  }, [dispatchNavigate]);



  // File -> Reload Transactions
  const reloadTransactionsMenuElementsFunction = useCallback(() => {
    if (reloadTransactionsMenuActionFunction) {
      reloadTransactionsMenuActionFunction();
    }
  }, [reloadTransactionsMenuActionFunction]);

  useEffect(() => {
    if (walletsInitialized) {
      const openSettingsSub = eventEmitter.addListener('openSettings', openSettings);
      const addWalletSub = eventEmitter.addListener('addWalletMenuAction', addWalletMenuAction);
      const importWalletSub = eventEmitter.addListener('importWalletMenuAction', importWalletMenuAction);
      const reloadTransactionsSub = eventEmitter.addListener('reloadTransactionsMenuAction', reloadTransactionsMenuElementsFunction);

      return () => {
        openSettingsSub.remove();
        addWalletSub.remove();
        importWalletSub.remove();
        reloadTransactionsSub.remove();
      };
    }
  }, [walletsInitialized, openSettings, addWalletMenuAction, importWalletMenuAction, reloadTransactionsMenuElementsFunction]);
};

export default useMenuElements;
