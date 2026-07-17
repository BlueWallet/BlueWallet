import {
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
  LinkingOptions,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import { InteractionManager, Linking } from 'react-native';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { navigationRef } from '../NavigationService';

const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

const normalizeBluewalletBitcoinPrefix = (value: string) => value.replace(/^bluewallet:/i, '');

let isBitcoinDeepLinkDispatchReady = false;
let pendingBitcoinDeepLinkUrl: string | null = null;
let deepLinkListener: ((url: string) => void) | null = null;
let pendingReadyTask: { cancel: () => void } | null = null;

const flushPendingBitcoinDeepLink = () => {
  if (!isBitcoinDeepLinkDispatchReady) return;
  if (!pendingBitcoinDeepLinkUrl) return;
  if (!deepLinkListener) return;

  const nextUrl = pendingBitcoinDeepLinkUrl;
  pendingBitcoinDeepLinkUrl = null;
  deepLinkListener(nextUrl);
};

const queueBitcoinDeepLinkUntilReady = (url: string) => {
  pendingBitcoinDeepLinkUrl = url;
};

const setDeepLinkDispatchReadyInternal = (ready: boolean) => {
  isBitcoinDeepLinkDispatchReady = ready;
  if (ready) {
    flushPendingBitcoinDeepLink();
  }
};

export const syncBitcoinDeepLinkDispatchFromNavigation = () => {
  const currentRoute = navigationRef.current?.getCurrentRoute();

  if (currentRoute?.name === 'WalletsList') {
    pendingReadyTask?.cancel();
    pendingReadyTask = InteractionManager.runAfterInteractions(() => {
      setDeepLinkDispatchReadyInternal(true);
      pendingReadyTask = null;
    });
    return;
  }

  pendingReadyTask?.cancel();
  pendingReadyTask = null;
  setDeepLinkDispatchReadyInternal(false);
};

/**
 * Returns a normalized `bitcoin:` URI if the input is a valid bitcoin deeplink, otherwise null.
 */
export const normalizeBitcoinDeepLinkUrl = (url?: string | null): string | null => {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const withoutBluewalletPrefix = normalizeBluewalletBitcoinPrefix(trimmed);

  let normalized = withoutBluewalletPrefix;
  if (/^bitcoin:\/\//i.test(normalized)) {
    normalized = normalized.replace(/^bitcoin:\/\//i, 'bitcoin:');
  } else if (!/^bitcoin:/i.test(normalized)) {
    normalized = `bitcoin:${stripLeadingSlashes(normalized)}`;
  }

  if (!DeeplinkSchemaMatch.isBitcoinAddress(normalized)) return null;

  return normalized;
};

const isBitcoinDeepLinkUrl = (url?: string | null): boolean => normalizeBitcoinDeepLinkUrl(url) !== null;

const shouldHandleIncomingUrl = (url?: string | null): boolean => {
  if (typeof url !== 'string') return false;
  if (url.includes('+expo-auth-session')) return false;
  return isBitcoinDeepLinkUrl(url);
};

const extractSendDetailsUriFromState = (state: NavigationState | PartialState<NavigationState>): string | null => {
  if (!state.routes || state.routes.length === 0) return null;

  const firstRoute = state.routes[0] as {
    name?: string;
    params?: {
      screen?: string;
      params?: {
        uri?: string;
      };
    };
  };

  if (firstRoute.name !== 'SendDetailsRoot') return null;
  if (firstRoute.params?.screen !== 'SendDetails') return null;

  const uri = firstRoute.params?.params?.uri;
  return normalizeBitcoinDeepLinkUrl(uri);
};

const createSendDetailsState = (uri: string): PartialState<NavigationState> => ({
  routes: [
    {
      name: 'SendDetailsRoot',
      params: {
        screen: 'SendDetails',
        params: {
          uri,
        },
      } as DetailViewStackParamList['SendDetailsRoot'],
    },
  ],
});

export const linking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: [
    'bitcoin:',
    'BITCOIN:',
    'bitcoin://',
    'BITCOIN://',
    'bluewallet:bitcoin:',
    'bluewallet:BITCOIN:',
    'bluewallet:bitcoin://',
    'bluewallet:BITCOIN://',
  ],
  config: {
    screens: {
      SendDetailsRoot: {
        screens: {
          SendDetails: 'bitcoin/:uri?',
        },
      },
    },
  },
  filter: url => shouldHandleIncomingUrl(url),
  async getInitialURL() {
    const initialUrl = await Linking.getInitialURL();
    if (!shouldHandleIncomingUrl(initialUrl)) return null;

    if (!isBitcoinDeepLinkDispatchReady) {
      queueBitcoinDeepLinkUntilReady(initialUrl);
      return null;
    }

    return initialUrl;
  },
  subscribe(listener) {
    deepLinkListener = listener;
    flushPendingBitcoinDeepLink();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!shouldHandleIncomingUrl(url)) return;

      if (!isBitcoinDeepLinkDispatchReady) {
        queueBitcoinDeepLinkUntilReady(url);
        return;
      }

      listener(url);
    });

    return () => {
      if (deepLinkListener === listener) {
        deepLinkListener = null;
      }
      subscription.remove();
    };
  },
  getStateFromPath(path, options) {
    const normalizedUri = normalizeBitcoinDeepLinkUrl(path);
    if (normalizedUri) {
      return createSendDetailsState(normalizedUri);
    }

    return defaultGetStateFromPath(path, options);
  },
  getPathFromState(state, options) {
    const sendDetailsUri = extractSendDetailsUriFromState(state);
    if (sendDetailsUri) return sendDetailsUri;

    return defaultGetPathFromState(state, options);
  },
};
