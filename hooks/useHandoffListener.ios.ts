import { useEffect, useCallback } from 'react';
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { HandOffActivityType } from '../components/types';
import { useSettings } from './context/useSettings';

interface UserActivityData {
  activityType: HandOffActivityType;
  userInfo: {
    address?: string;
    xpub?: string;
    walletID?: string;
    memo?: string;
    amount?: number | string;
    amountSats?: number | string;
    feeRate?: string;
    recipients?: Array<{ address: string; amount?: number | string; amountSats?: number | string }>;
  };
  webpageURL?: string;
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
      const { activityType, userInfo, webpageURL } = data;
      const modifiedUserInfo = { ...(userInfo || {}), type: activityType };
      try {
        if (activityType === HandOffActivityType.ReceiveOnchain && modifiedUserInfo.address) {
          navigate( 'ReceiveDetails', { address: modifiedUserInfo.address, type: activityType },
          );
        } else if (activityType === HandOffActivityType.Xpub && modifiedUserInfo.xpub && modifiedUserInfo.walletID) {
          navigate('WalletXpub', { walletID: modifiedUserInfo.walletID, xpub: modifiedUserInfo.xpub });
        } else if (activityType === HandOffActivityType.SendOnchain && modifiedUserInfo.walletID) {
          navigate('SendDetailsRoot', {
            screen: 'SendDetails',
            params: {
              walletID: modifiedUserInfo.walletID,
              address: modifiedUserInfo.address,
              amount: modifiedUserInfo.amount ? Number(modifiedUserInfo.amount) : undefined,
              amountSats: modifiedUserInfo.amountSats ? Number(modifiedUserInfo.amountSats) : undefined,
              transactionMemo: modifiedUserInfo.memo,
            },
          });
        } else if (activityType === HandOffActivityType.ViewInBlockExplorer && webpageURL) {
          Linking.openURL(webpageURL).catch(err => console.error('useHandoffListener: could not open URL', err));
        } else if (activityType === HandOffActivityType.SignVerify && modifiedUserInfo.walletID && modifiedUserInfo.address) {
          navigate('SignVerifyRoot', { screen: 'SignVerify', params: { walletID: modifiedUserInfo.walletID, address: modifiedUserInfo.address } });
        } else if (activityType === HandOffActivityType.IsItMyAddress) {
          navigate('IsItMyAddress', {});
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
