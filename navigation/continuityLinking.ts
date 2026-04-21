import { LinkingOptions } from '@react-navigation/native';
import { NativeEventEmitter, Linking, Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import NativeEventEmitterModule from '../codegen/NativeEventEmitter';
import { ContinuityActivityType } from '../components/types';
import presentAlert from '../components/Alert';
import { navigationRef, navigate } from '../NavigationService';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import loc from '../loc';
import { setLNDHub } from '../helpers/lndHub';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import { BlueApp } from '../class';

const CONTINUITY_PREFIX = 'bluewallet://';
const BLUEWALLET_SCHEME_PREFIX = 'bluewallet:';
const LEGACY_ELECTRUM_SETTINGS_PREFIX = 'bluewallet:setelectrumserver';
const LEGACY_LIGHTNING_SETTINGS_PREFIX = 'bluewallet:setlndhuburl';

const eventEmitter = NativeEventEmitterModule ? new NativeEventEmitter(NativeEventEmitterModule) : null;

export function isHandledByContinuityLinking(url: string): boolean {
  const normalizedUrl = url.toLowerCase();
  return (
    normalizedUrl.startsWith(CONTINUITY_PREFIX) ||
    normalizedUrl.startsWith(LEGACY_ELECTRUM_SETTINGS_PREFIX) ||
    normalizedUrl.startsWith(LEGACY_LIGHTNING_SETTINGS_PREFIX)
  );
}

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

function encodePathSegment(value: string | number): string {
  return encodeURIComponent(String(value));
}

function getElectrumServerParam(userInfo: Record<string, any>): string | null {
  if (typeof userInfo.server === 'string' && userInfo.server.length > 0) {
    return userInfo.server;
  }

  const host = typeof userInfo.host === 'string' ? userInfo.host : '';
  const tcp = Number(userInfo.tcp ?? 0);
  const ssl = Number(userInfo.ssl ?? 0);

  if (!host) return null;
  if (ssl > 0) return `${host}:${ssl}:s`;
  if (tcp > 0) return `${host}:${tcp}:t`;

  return null;
}

function parseElectrumServerParam(value?: string): { host: string; tcp?: number; ssl?: number } | undefined {
  if (!value) return undefined;

  const [host, portString, type] = decodeURIComponent(value).split(':');
  const port = Number(portString);
  if (!host || !port) return undefined;

  return type === 's' ? { host, ssl: port } : { host, tcp: port };
}

function activityToURL(data: UserActivityData): string | null {
  if (!data?.activityType) return null;
  const { activityType, userInfo = {} } = data;

  switch (activityType) {
    case ContinuityActivityType.ReceiveOnchain:
      if (!userInfo.address) return null;
      return `${CONTINUITY_PREFIX}receiveonchain/${encodePathSegment(userInfo.address)}`;

    case ContinuityActivityType.Xpub:
      if (!userInfo.xpub || !userInfo.walletID) return null;
      return `${CONTINUITY_PREFIX}xpub/${encodePathSegment(userInfo.walletID)}/${encodePathSegment(userInfo.xpub)}`;

    case ContinuityActivityType.IsItMyAddress:
      if (!userInfo.address) return null;
      return `${CONTINUITY_PREFIX}isitmyaddress/${encodePathSegment(userInfo.address)}`;

    case ContinuityActivityType.SignVerify:
      if (!userInfo.walletID || !userInfo.address) return null;
      return `${CONTINUITY_PREFIX}signverify/${encodePathSegment(userInfo.walletID)}/${encodePathSegment(userInfo.address)}`;

    case ContinuityActivityType.SendOnchain:
      if (!userInfo.walletID) return null;
      return `${CONTINUITY_PREFIX}sendonchain/${encodePathSegment(userInfo.walletID)}${buildQuery({
        address: userInfo.address,
        amount: userInfo.amount,
        amountSats: userInfo.amountSats,
        transactionMemo: userInfo.memo,
      })}`;

    case ContinuityActivityType.LightningSettings:
      if (!userInfo.url) return null;
      return `${CONTINUITY_PREFIX}lightningsettings${buildQuery({ url: userInfo.url })}`;

    case ContinuityActivityType.ElectrumSettings: {
      const server = getElectrumServerParam(userInfo);
      if (!server) return null;
      return `${CONTINUITY_PREFIX}electrumsettings${buildQuery({ server })}`;
    }

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

async function clearMostRecentContinuityActivity(): Promise<void> {
  try {
    if (typeof NativeEventEmitterModule?.clearMostRecentUserActivity === 'function') {
      NativeEventEmitterModule.clearMostRecentUserActivity();
      return;
    }

    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set('onUserActivityOpen', '');
  } catch {
    // Best-effort cleanup to avoid repeatedly replaying stale activity.
  }
}

function clearMostRecentContinuityActivitySilently(): void {
  clearMostRecentContinuityActivity().catch(() => {});
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
      } as any);
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

async function getInitialContinuityURL(): Promise<string | null> {
  if (!NativeEventEmitterModule?.getMostRecentUserActivity) return null;

  const enabled = await isEnabled();
  if (!enabled) return null;

  const data = (await NativeEventEmitterModule.getMostRecentUserActivity()) as UserActivityData | null | undefined;
  if (!data?.activityType) return null;

  if (data.activityType === ContinuityActivityType.ViewInBlockExplorer) {
    openExternalURL(data.webpageURL);
    clearMostRecentContinuityActivitySilently();
    return null;
  }

  if (
    data.activityType === ContinuityActivityType.LightningSettings ||
    data.activityType === ContinuityActivityType.ReceiveOnchain ||
    data.activityType === ContinuityActivityType.Xpub
  ) {
    return null;
  }

  const url = activityToURL(data);
  if (url) {
    clearMostRecentContinuityActivitySilently();
    return url;
  }

  console.debug('[Continuity] Could not convert activity to URL:', data.activityType);
  return null;
}

let _listener: ((url: string) => void) | null = null;

export function processInitialContinuityActivity(): void {
  if (!_listener || !NativeEventEmitterModule?.getMostRecentUserActivity) return;
  const listener = _listener;

  isEnabled()
    .then(enabled => {
      if (!enabled) return;
      return NativeEventEmitterModule.getMostRecentUserActivity();
    })
    .then((data: unknown) => {
      const activity = data as UserActivityData | null | undefined;
      if (!activity?.activityType) return;

      if (activity.activityType === ContinuityActivityType.ViewInBlockExplorer) {
        openExternalURL(activity.webpageURL);
        clearMostRecentContinuityActivitySilently();
        return;
      }

      if (activity.activityType === ContinuityActivityType.LightningSettings) {
        handleLightningSettingsReceived(activity);
        clearMostRecentContinuityActivitySilently();
        return;
      }

      if (activity.activityType === ContinuityActivityType.ReceiveOnchain || activity.activityType === ContinuityActivityType.Xpub) {
        handleReceiveOrXpubReceived(activity, listener);
        clearMostRecentContinuityActivitySilently();
        return;
      }

      const url = activityToURL(activity);
      if (url) {
        listener(url);
        clearMostRecentContinuityActivitySilently();
      }
    })
    .catch(() => console.debug('[Continuity] No initial activity'));
}

const continuityLinking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: [CONTINUITY_PREFIX, BLUEWALLET_SCHEME_PREFIX],

  filter: (url: string) => isHandledByContinuityLinking(url),

  config: {
    screens: {
      DrawerRoot: {
        screens: {
          DetailViewStackScreensStack: {
            screens: {
              ReceiveDetails: {
                path: 'receiveonchain/:address?',
                parse: {
                  address: (value: string) => decodeURIComponent(value),
                },
                stringify: {
                  address: (value: string) => value,
                },
              },
              IsItMyAddress: {
                path: 'isitmyaddress/:address?',
                parse: {
                  address: (value: string) => decodeURIComponent(value),
                },
                stringify: {
                  address: (value: string) => value,
                },
              },
            },
          },
        },
      },
      WalletXpub: {
        path: 'xpub/:walletID?/:xpub?',
        parse: {
          walletID: (value: string) => decodeURIComponent(value),
          xpub: (value: string) => decodeURIComponent(value),
        },
        stringify: {
          walletID: (value: string) => value,
          xpub: (value: string) => value,
        },
      },
      ElectrumSettings: {
        path: 'electrumsettings',
        alias: ['setelectrumserver'],
        parse: {
          server: parseElectrumServerParam,
        },
        stringify: {
          server: (value: string | Record<string, any>) => (typeof value === 'string' ? value : (getElectrumServerParam(value) ?? '')),
        },
      },
      LightningSettings: {
        path: 'lightningsettings',
        alias: ['setlndhuburl'],
        parse: {
          url: (value: string) => decodeURIComponent(value),
        },
        stringify: {
          url: (value: string) => value,
        },
      },
      SendDetailsRoot: {
        screens: {
          SendDetails: {
            path: 'sendonchain/:walletID?',
            parse: {
              walletID: (value: string) => decodeURIComponent(value),
              address: (value: string) => decodeURIComponent(value),
              amount: Number,
              amountSats: Number,
              transactionMemo: (value: string) => decodeURIComponent(value),
            },
            stringify: {
              walletID: (value: string) => value,
              address: (value: string) => value,
              amount: (value: number) => String(value),
              amountSats: (value: number) => String(value),
              transactionMemo: (value: string) => value,
            },
          },
        },
      },
      SignVerifyRoot: {
        screens: {
          SignVerify: {
            path: 'signverify/:walletID?/:address?',
            parse: {
              walletID: (value: string) => decodeURIComponent(value),
              address: (value: string) => decodeURIComponent(value),
            },
            stringify: {
              walletID: (value: string) => value,
              address: (value: string) => value,
            },
          },
        },
      },
    },
  } as LinkingOptions<DetailViewStackParamList>['config'],

  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    if (url) {
      return url;
    }

    return getInitialContinuityURL();
  },

  subscribe: (listener: (url: string) => void) => {
    _listener = listener;

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (isHandledByContinuityLinking(url)) {
        listener(url);
      }
    });

    const subscription = eventEmitter?.addListener('onUserActivityOpen', async (data: UserActivityData) => {
      if (!data?.activityType) return;

      const enabled = await isEnabled();
      if (!enabled) return;

      if (data.activityType === ContinuityActivityType.ViewInBlockExplorer) {
        openExternalURL(data.webpageURL);
        clearMostRecentContinuityActivitySilently();
        return;
      }

      if (data.activityType === ContinuityActivityType.LightningSettings) {
        handleLightningSettingsReceived(data);
        clearMostRecentContinuityActivitySilently();
        return;
      }

      if (data.activityType === ContinuityActivityType.ReceiveOnchain || data.activityType === ContinuityActivityType.Xpub) {
        handleReceiveOrXpubReceived(data, listener);
        clearMostRecentContinuityActivitySilently();
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
        clearMostRecentContinuityActivitySilently();
      } else {
        console.debug('[Continuity] Could not convert activity to URL:', data.activityType);
      }
    });

    return () => {
      _listener = null;
      linkingSubscription.remove();
      subscription?.remove();
    };
  },
};

export default continuityLinking;
