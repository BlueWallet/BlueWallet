import React, { useCallback, useContext, useEffect } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as NavigationService from '../NavigationService';
import { CommonActions } from '@react-navigation/native';
import { BlueStorageContext } from '../blue_modules/storage-context';

const eventEmitter = Platform.OS === 'ios' || Platform.OS === 'macos' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;

const MenuElements = () => {
  const { walletsInitialized } = useContext(BlueStorageContext);

  const openSettings = useCallback(() => {
    dispatchNavigate('Settings');
  }, []);

  const addWalletMenuAction = useCallback(() => {
    dispatchNavigate('AddWalletRoot');
  }, []);

  const dispatchNavigate = (routeName: string) => {
    NavigationService.dispatch(
      CommonActions.navigate({
        name: routeName,
      }),
    );
  };

  useEffect(() => {
    console.log('MenuElements: useEffect');
    if (walletsInitialized) {
      eventEmitter?.addListener('openSettings', openSettings);
      eventEmitter?.addListener('addWalletMenuAction', addWalletMenuAction);
    }
    return () => {
      eventEmitter?.removeAllListeners('openSettings');
      eventEmitter?.removeAllListeners('addWalletMenuAction');
    };
  }, [addWalletMenuAction, openSettings, walletsInitialized]);

  return <></>;
};

export default MenuElements;
