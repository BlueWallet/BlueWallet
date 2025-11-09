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
      if (!data || !data.activityType) {
        console.debug(`Invalid handoff data received: ${data ? JSON.stringify(data) : 'No data provided'}`);
        return;
      }
      const { activityType, userInfo } = data;
      const modifiedUserInfo = { ...(userInfo || {}), type: activityType };
      try {
        if (activityType === HandOffActivityType.ReceiveOnchain && modifiedUserInfo.address) {
          navigate( 'ReceiveDetails', { address: modifiedUserInfo.address, type: activityType },
          );
        } else if (activityType === HandOffActivityType.Xpub && modifiedUserInfo.xpub) {
          navigate('WalletXpub', { xpub: modifiedUserInfo.xpub, type: activityType });
        } else {
          console.debug(`Unhandled or incomplete activity type/data: ${activityType}`, modifiedUserInfo);
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

    if (EventEmitter && EventEmitter.getMostRecentUserActivity) {
      EventEmitter.getMostRecentUserActivity()
        .then(handleUserActivity)
        .catch(() => console.debug('No valid user activity object received'));
    } else {
      console.debug('EventEmitter native module is not available.');
    }

    return () => {
      activitySubscription?.remove();
    };
  }, [walletsInitialized, isHandOffUseEnabled, handleUserActivity]);
};

export default useHandoffListener;
