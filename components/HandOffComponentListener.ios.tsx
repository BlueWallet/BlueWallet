import React, { useEffect, useCallback } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { HandOffActivityType } from './types';

interface UserActivityData {
  activityType: HandOffActivityType;
  userInfo: {
    address?: string;
    xpub?: string;
  };
}

const { EventEmitter } = NativeModules;
const eventEmitter = new NativeEventEmitter(EventEmitter);

const HandOffComponentListener: React.FC = React.memo(() => {
  const { walletsInitialized } = useStorage();
  const { navigate } = useExtendedNavigation();

  const onUserActivityOpen = useCallback((data: UserActivityData) => {
    switch (data.activityType) {
      case HandOffActivityType.ReceiveOnchain:
        navigate('ReceiveDetailsRoot', {
          screen: 'ReceiveDetails',
          params: {
            address: data.userInfo.address,
          },
        });
        break;
      case HandOffActivityType.Xpub:
        navigate('WalletXpubRoot', {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!walletsInitialized) {
      return;
    }

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
  }, [walletsInitialized, onUserActivityOpen]);

  return null;
});

export default HandOffComponentListener;
