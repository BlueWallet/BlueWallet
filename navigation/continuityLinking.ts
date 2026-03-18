import { LinkingOptions } from '@react-navigation/native';
import { NativeModules, NativeEventEmitter, Linking, Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import { ContinuityActivityType } from '../components/types';
import presentAlert from '../components/Alert';
import { navigationRef, navigate } from '../NavigationService';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import loc from '../loc';
import { setLNDHub } from '../helpers/lndHub';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import { BlueApp } from '../class';

const CONTINUITY_PREFIX = 'bluewallet://';

const EventEmitter = NativeModules.EventEmitter;
const eventEmitter = EventEmitter ? new NativeEventEmitter(EventEmitter) : null;

interface UserActivityData {
  activityType: ContinuityActivityType;
  userInfo: Record<string, any>;
  webpageURL?: string;
  title?: string;
}

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
      if (!userInfo.address) return null;
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

    case ContinuityActivityType.LightningSettings:
      if (!userInfo.url) return null;
      return `${CONTINUITY_PREFIX}lightningsettings${buildQuery({ url: userInfo.url })}`;

    default:
      return null;
  }
}

async function isEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const value = await DefaultPreference.get(BlueApp.CONTINUITY_STORAGE_KEY);
    return value === 'true';
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

  presentAlert({
    title: loc.send.continuity_draft_conflict_title,
    message: loc.send.continuity_draft_conflict_message,
    buttons: [
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
    ],
  });
}

function handleReceiveOrXpubReceived(data: UserActivityData, listener: (url: string) => void): void {
  const { activityType, userInfo = {} } = data;
  const isXpub = activityType === ContinuityActivityType.Xpub;
  const message = isXpub ? loc.send.continuity_received_xpub_message : loc.send.continuity_received_address_message;

  const viewAsQR = () => {
    const url = activityToURL(data);
    if (url) listener(url);
  };

  const importData = () => {
    const value = isXpub ? userInfo.xpub : userInfo.address;
    if (value) {
      navigate('AddWalletRoot', {
        screen: 'ImportWallet',
        params: { label: value, triggerImport: true },
      });
    }
  };

  presentAlert({
    title: loc.send.continuity_received_title,
    message,
    buttons: [
      { text: loc._.cancel, style: 'cancel' },
      { text: loc.send.continuity_received_import, onPress: importData },
      { text: loc.send.continuity_received_qr, onPress: viewAsQR },
    ],
  });
}

function handleLightningSettingsReceived(data: UserActivityData): void {
  const { userInfo = {} } = data;
  const url = userInfo.url;
  if (!url) return;

  presentAlert({
    title: loc.settings.continuity_lndhub_title,
    message: loc.formatString(loc.settings.continuity_lndhub_message, { url }) as string,
    buttons: [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc.settings.continuity_lndhub_apply,
        onPress: () => {
          setLNDHub(url)
            .then(() => {
              navigate('LightningSettings', { url });
            })
            .catch(err => console.error('[Continuity] Failed to set LNDHub:', err));
        },
      },
    ],
  });
}

let _listener: ((url: string) => void) | null = null;

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

      if (data.activityType === ContinuityActivityType.LightningSettings) {
        handleLightningSettingsReceived(data);
        return;
      }

      if (data.activityType === ContinuityActivityType.ReceiveOnchain || data.activityType === ContinuityActivityType.Xpub) {
        handleReceiveOrXpubReceived(data, listener);
        return;
      }

      const url = activityToURL(data);
      if (url) listener(url);
    })
    .catch(() => console.debug('[Continuity] No initial activity'));
}

const continuityLinking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: [CONTINUITY_PREFIX],

  filter: (url: string) => url.startsWith(CONTINUITY_PREFIX),

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
      LightningSettings: 'lightningsettings',
      SendDetailsRoot: {
        screens: {
          SendDetails: {
            path: 'sendonchain',
            parse: {
              amount: Number,
              amountSats: Number,
            },
            stringify: {
              amount: (value: number) => String(value),
              amountSats: (value: number) => String(value),
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

  getInitialURL: async () => null,

  subscribe: (listener: (url: string) => void) => {
    _listener = listener;

    const subscription = eventEmitter?.addListener('onUserActivityOpen', async (data: UserActivityData) => {
      if (!data?.activityType) return;

      const enabled = await isEnabled();
      if (!enabled) return;

      if (data.activityType === ContinuityActivityType.ViewInBlockExplorer) {
        openExternalURL(data.webpageURL);
        return;
      }

      if (data.activityType === ContinuityActivityType.LightningSettings) {
        handleLightningSettingsReceived(data);
        return;
      }

      if (data.activityType === ContinuityActivityType.ReceiveOnchain || data.activityType === ContinuityActivityType.Xpub) {
        handleReceiveOrXpubReceived(data, listener);
        return;
      }

      if (data.activityType === ContinuityActivityType.SendOnchain) {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        if (currentRoute?.name === 'SendDetails') {
          handleSendOnchainConflict(data, listener);
          return;
        }
      }

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
