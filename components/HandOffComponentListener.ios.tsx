import React, { useEffect, useContext } from 'react';
import * as NavigationService from '../NavigationService';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { NativeEventEmitter, NativeModules } from 'react-native';
import HandOffComponent from './HandOffComponent.ios';

interface UserActivityData {
  activityType: keyof typeof HandOffComponent.activityTypes;
  userInfo: {
    address?: string;
    xpub?: string;
  };
}

const { EventEmitter } = NativeModules;
const eventEmitter = new NativeEventEmitter(EventEmitter);

const HandOffComponentListener: React.FC = () => {
  const { walletsInitialized } = useContext(BlueStorageContext); // Assuming 'walletsInitialized' is stored in context

  useEffect(() => {
    if (!walletsInitialized) {
      return;
    }

    const onUserActivityOpen = (data: UserActivityData) => {
      switch (data.activityType) {
        case HandOffComponent.activityTypes.ReceiveOnchain:
          NavigationService.navigate('ReceiveDetailsRoot', {
            // @ts-ignore: fix later
            screen: 'ReceiveDetails',
            params: {
              address: data.userInfo.address,
            },
          });
          break;
        case HandOffComponent.activityTypes.Xpub:
          NavigationService.navigate('WalletXpubRoot', {
            // @ts-ignore: fix later
            screen: 'WalletXpub',
            params: {
              xpub: data.userInfo.xpub,
            },
          });
          break;
        default:
          console.log(`Unhandled activity type: ${data.activityType}`);
          break;
      }
    };

    const addListeners = () => {
      const activitySubscription = eventEmitter.addListener('onUserActivityOpen', onUserActivityOpen);

      // Attempt to fetch the most recent user activity
      EventEmitter.getMostRecentUserActivity?.()
        .then(onUserActivityOpen)
        .catch(() => console.log('No userActivity object sent'));

      return { activitySubscription };
    };

    const subscriptions = addListeners();

    return () => {
      subscriptions.activitySubscription?.remove();
    };
  }, [walletsInitialized]);

  return null;
};

export default HandOffComponentListener;
