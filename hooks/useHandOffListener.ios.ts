import { useEffect, useCallback } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { HandOffActivityType } from '../components/types';

interface UserActivityData {
  activityType: HandOffActivityType;
  userInfo: {
    address?: string;
    xpub?: string;
  };
}

const { EventEmitter } = NativeModules;
const eventEmitter = new NativeEventEmitter(EventEmitter);

const useHandOffListener = () => {
  const { walletsInitialized } = useStorage();
  const { navigate } = useExtendedNavigation();

  const onUserActivityOpen = useCallback(
    (data: UserActivityData) => {
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
    },
    [navigate],
  );

  useEffect(() => {
    if (!walletsInitialized) return;

    const activitySubscription = eventEmitter.addListener('onUserActivityOpen', onUserActivityOpen);

    EventEmitter.getMostRecentUserActivity?.()
      .then(onUserActivityOpen)
      .catch(() => console.log('No userActivity object sent'));

    return () => {
      activitySubscription.remove();
    };
  }, [walletsInitialized, onUserActivityOpen]);
};

export default useHandOffListener;
