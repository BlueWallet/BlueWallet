import { useEffect, useMemo } from 'react';
import { Alert, NativeEventEmitter, NativeModules } from 'react-native';
import { useStorage } from './context/useStorage';
import { useExtendedNavigation } from './useExtendedNavigation';
import { HandOffActivityType } from '../components/types';
import { useSettings } from './context/useSettings';
import { navigationRef } from '../NavigationService';
import loc from '../loc';

interface UserActivityUserInfo {
  address?: string;
  xpub?: string;
  walletID?: string;
  memo?: string;
  amount?: number | string;
  amountSats?: number | string;
  feeRate?: string;
  recipients?: Array<{ address: string; amount?: number | string; amountSats?: number | string }>;
}

interface UserActivityData {
  activityType: HandOffActivityType;
  userInfo: UserActivityUserInfo;
}

type NavigateFn = ReturnType<typeof useExtendedNavigation>['navigate'];
type ActivityHandler = (userInfo: UserActivityUserInfo, navigate: NavigateFn) => void;

const EventEmitter = NativeModules.EventEmitter;
const eventEmitter = EventEmitter ? new NativeEventEmitter(EventEmitter) : null;

// ── Individual activity handlers ──────────────────────────

const handleReceiveOnchain: ActivityHandler = (userInfo, navigate) => {
  if (!userInfo.address) return;
  navigate('ReceiveDetails', { address: userInfo.address });
};

const handleXpub: ActivityHandler = (userInfo, navigate) => {
  if (!userInfo.xpub) return;
  navigate('WalletXpub', { xpub: userInfo.xpub });
};

const handleSendOnchain: ActivityHandler = (userInfo, navigate) => {
  const navigateToSendDetails = () => {
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        address: userInfo.address,
        amount: userInfo.amount ? Number(userInfo.amount) : undefined,
        amountSats: userInfo.amountSats ? Number(userInfo.amountSats) : undefined,
        transactionMemo: userInfo.memo,
      },
    });
  };

  const currentRoute = navigationRef.current?.getCurrentRoute();

  if (currentRoute?.name !== 'SendDetails') {
    navigateToSendDetails();
    return;
  }

  Alert.alert(loc.send.handoff_draft_conflict_title, loc.send.handoff_draft_conflict_message, [
    { text: loc._.cancel, style: 'cancel' },
    {
      text: loc.send.handoff_draft_replace,
      style: 'destructive',
      onPress: navigateToSendDetails,
    },
    {
      text: loc.send.handoff_draft_add_recipient,
      onPress: () => {
        navigate('SendDetailsRoot', {
          screen: 'SendDetails',
          params: {
            addRecipientParams: {
              address: userInfo.address ?? '',
              amount: userInfo.amount ? Number(userInfo.amount) : undefined,
              nonce: Date.now(),
            },
          },
        });
      },
    },
  ]);
};

// ── Handler registry ──────────────────────────────────────

const activityHandlers: Partial<Record<HandOffActivityType, ActivityHandler>> = {
  [HandOffActivityType.ReceiveOnchain]: handleReceiveOnchain,
  [HandOffActivityType.Xpub]: handleXpub,
  [HandOffActivityType.SendOnchain]: handleSendOnchain,
};

// ── Hook ──────────────────────────────────────────────────

const useHandoffListener = () => {
  const { walletsInitialized } = useStorage();
  const { isHandOffUseEnabled } = useSettings();
  const { navigate } = useExtendedNavigation();

  const handleUserActivity = useMemo(() => {
    return (data: UserActivityData) => {
      if (!data?.activityType) {
        console.debug('useHandoffListener: invalid data', data);
        return;
      }

      const handler = activityHandlers[data.activityType];
      if (handler) {
        try {
          handler(data.userInfo ?? {}, navigate);
        } catch (error) {
          console.error('useHandoffListener: handler error', error);
        }
      } else {
        console.debug('useHandoffListener: unhandled activity', data.activityType);
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!walletsInitialized || !isHandOffUseEnabled) return;

    const subscription = eventEmitter?.addListener('onUserActivityOpen', handleUserActivity);

    EventEmitter?.getMostRecentUserActivity?.()
      .then(handleUserActivity)
      .catch(() => console.debug('useHandoffListener: no recent activity'));

    return () => {
      subscription?.remove();
    };
  }, [walletsInitialized, isHandOffUseEnabled, handleUserActivity]);
};

export default useHandoffListener;
