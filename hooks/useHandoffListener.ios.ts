import { useEffect, useCallback } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { HandOffActivityType } from '../components/types';
import { useSettings } from './context/useSettings';

interface UserActivityData {
  activityType: HandOffActivityType;
  userInfo: {
    address?: string;
    xpub?: string;
  };
}

const EventEmitter = NativeModules.EventEmitter;
const eventEmitter = EventEmitter ? new NativeEventEmitter(EventEmitter) : null;

const useHandoffListener = () => {
  const { walletsInitialized } = useStorage();
  const { isHandOffUseEnabled } = useSettings();
  const { navigate } = useExtendedNavigation();

  const handleUserActivity = useCallback(
    (data: UserActivityData) => {
      const { activityType, userInfo } = data;
      try {
        if (activityType === HandOffActivityType.ReceiveOnchain) {
          navigate('ReceiveDetailsRoot', {
            screen: 'ReceiveDetails',
            params: { address: userInfo.address },
          });
        } else if (activityType === HandOffActivityType.Xpub) {
          navigate('WalletXpubRoot', {
            screen: 'WalletXpub',
            params: { xpub: userInfo.xpub },
          });
        } else {
          console.debug(`Unhandled activity type: ${activityType}`);
        }
      } catch (error) {
        console.error('Error handling user activity:', error);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!walletsInitialized || !isHandOffUseEnabled) return;

    const activitySubscription = eventEmitter?.addListener('onUserActivityOpen', handleUserActivity);

    EventEmitter.getMostRecentUserActivity?.()
      .then(handleUserActivity)
      .catch(() => console.debug('No userActivity object sent'));

    return () => {
      activitySubscription?.remove();
    };
  }, [walletsInitialized, isHandOffUseEnabled, handleUserActivity]);
};

export default useHandoffListener;
