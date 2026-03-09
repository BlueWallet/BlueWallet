import { LinkingOptions } from '@react-navigation/native';
import { NativeModules, NativeEventEmitter, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContinuityActivityType } from '../components/types';
import { navigationRef, navigate } from '../NavigationService';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import loc from '../loc';

const CONTINUITY_PREFIX = 'continuity://';
const CONTINUITY_STORAGE_KEY = 'HandOff';

const EventEmitter = NativeModules.EventEmitter;
const eventEmitter = EventEmitter ? new NativeEventEmitter(EventEmitter) : null;

interface UserActivityData {
  activityType: ContinuityActivityType;
  userInfo: Record<string, any>;
  webpageURL?: string;
  title?: string;
}

// ── URL construction ────────────────────────────────────────

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function activityToURL(data: UserActivityData): string | null {
  if (!data?.activityType) return null;
  const { activityType, userInfo = {} } = data;

  switch (activityType) {
    case ContinuityActivityType.ReceiveOnchain:
      if (!userInfo.address) return null;
      return `${CONTINUITY_PREFIX}receiveonchain${buildQuery({ address: userInfo.address })}`;

    case ContinuityActivityType.Xpub:
      if (!userInfo.xpub || !userInfo.walletID) return null;
      return `${CONTINUITY_PREFIX}xpub${buildQuery({ walletID: userInfo.walletID, xpub: userInfo.xpub })}`;

    case ContinuityActivityType.IsItMyAddress:
      return `${CONTINUITY_PREFIX}isitmyaddress${buildQuery({ address: userInfo.address })}`;

    case ContinuityActivityType.SignVerify:
      if (!userInfo.walletID || !userInfo.address) return null;
      return `${CONTINUITY_PREFIX}signverify${buildQuery({ walletID: userInfo.walletID, address: userInfo.address })}`;

    case ContinuityActivityType.SendOnchain:
      if (!userInfo.walletID) return null;
      return `${CONTINUITY_PREFIX}sendonchain${buildQuery({
        walletID: userInfo.walletID,
        address: userInfo.address,
        amount: userInfo.amount,
        amountSats: userInfo.amountSats,
        transactionMemo: userInfo.memo,
      })}`;

    default:
      return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────

async function isEnabled(): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(CONTINUITY_STORAGE_KEY));
  } catch {
    return false;
  }
}

function openExternalURL(webpageURL?: string): void {
  if (webpageURL) {
    Linking.openURL(webpageURL).catch(err => console.error('[Continuity] Could not open URL:', err));
  }
}

function handleSendOnchainConflict(data: UserActivityData, listener: (url: string) => void): void {
  const currentRoute = navigationRef.current?.getCurrentRoute();
  const currentWalletID = (currentRoute?.params as { walletID?: string } | undefined)?.walletID ?? '';
  const { userInfo = {} } = data;

  const navigateReplace = () => {
    const url = activityToURL(data);
    if (url) listener(url);
  };

  Alert.alert(loc.send.continuity_draft_conflict_title, loc.send.continuity_draft_conflict_message, [
    { text: loc._.cancel, style: 'cancel' },
    { text: loc.send.continuity_draft_replace, style: 'destructive', onPress: navigateReplace },
    {
      text: loc.send.continuity_draft_add_recipient,
      onPress: () => {
        navigate('SendDetailsRoot', {
          screen: 'SendDetails',
          params: {
            walletID: currentWalletID,
            addRecipientParams: {
              address: userInfo.address ?? '',
              amount: userInfo.amount ? Number(userInfo.amount) : undefined,
              nonce: Date.now(),
            },
          },
        } as any);
      },
    },
  ]);
}

// ── Subscriber reference for deferred initial-activity check ─

let _listener: ((url: string) => void) | null = null;

/**
 * Process the most recent continuity activity stored in native defaults.
 * Called by useContinuityListener after wallets finish initialising so that
 * cold-start activities are handled only once the target screens exist.
 */
export function processInitialContinuityActivity(): void {
  if (!_listener || !EventEmitter?.getMostRecentUserActivity) return;
  const listener = _listener;

  isEnabled()
    .then(enabled => {
      if (!enabled) return;
      return EventEmitter.getMostRecentUserActivity();
    })
    .then((data: UserActivityData | null | undefined) => {
      if (!data?.activityType) return;

      if (data.activityType === ContinuityActivityType.ViewInBlockExplorer) {
        openExternalURL(data.webpageURL);
        return;
      }

      const url = activityToURL(data);
      if (url) listener(url);
    })
    .catch(() => console.debug('[Continuity] No initial activity'));
}

// ── Linking configuration ───────────────────────────────────

const continuityLinking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: [CONTINUITY_PREFIX],

  // The nested-screen paths require NavigatorScreenParams in the param-list
  // types to satisfy the generic, but changing those types is out of scope.
  config: {
    screens: {
      DrawerRoot: {
        screens: {
          DetailViewStackScreensStack: {
            screens: {
              ReceiveDetails: 'receiveonchain',
              IsItMyAddress: 'isitmyaddress',
            },
          },
        },
      },
      WalletXpub: 'xpub',
      SendDetailsRoot: {
        screens: {
          SendDetails: {
            path: 'sendonchain',
            parse: {
              amount: Number,
              amountSats: Number,
            },
          },
        },
      },
      SignVerifyRoot: {
        screens: {
          SignVerify: 'signverify',
        },
      },
    },
  } as LinkingOptions<DetailViewStackParamList>['config'],

  // Cold-start activities are handled after wallet init via
  // processInitialContinuityActivity(), so return null here.
  getInitialURL: async () => null,

  subscribe: (listener: (url: string) => void) => {
    _listener = listener;

    const subscription = eventEmitter?.addListener('onUserActivityOpen', async (data: UserActivityData) => {
      if (!data?.activityType) return;

      const enabled = await isEnabled();
      if (!enabled) return;

      // External URL — open directly, no in-app navigation
      if (data.activityType === ContinuityActivityType.ViewInBlockExplorer) {
        openExternalURL(data.webpageURL);
        return;
      }

      // SendOnchain: show conflict alert when already on SendDetails
      if (data.activityType === ContinuityActivityType.SendOnchain) {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        if (currentRoute?.name === 'SendDetails') {
          handleSendOnchainConflict(data, listener);
          return;
        }
      }

      // Default: convert to continuity:// URL and let React Navigation resolve it
      const url = activityToURL(data);
      if (url) {
        listener(url);
      } else {
        console.debug('[Continuity] Could not convert activity to URL:', data.activityType);
      }
    });

    return () => {
      _listener = null;
      subscription?.remove();
    };
  },
};

export default continuityLinking;
