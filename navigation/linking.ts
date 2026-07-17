import {
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
  LinkingOptions,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import { InteractionManager, Linking } from 'react-native';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { BlueApp as BlueAppClass } from '../class/blue-app';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { navigationRef } from '../NavigationService';

const BlueApp = BlueAppClass.getInstance();

const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

const normalizeBluewalletBitcoinPrefix = (value: string) => value.replace(/^bluewallet:/i, '');

const normalizeBitcoinUri = (uri: string) => {
  let normalized = uri.trim();

  if (/^bitcoin:\/\//i.test(normalized)) {
    normalized = normalized.replace(/^bitcoin:\/\//i, 'bitcoin:');
  }

  if (!/^bitcoin:/i.test(normalized)) {
    normalized = `bitcoin:${stripLeadingSlashes(normalized)}`;
  }

  return normalized;
};

const toValidAmount = (value?: string | null): number | undefined => {
  if (value === null || value === undefined || String(value).trim().length === 0) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const isBitcoinAddressValid = (address: string): boolean => {
  try {
    bitcoin.address.toOutputScript(address);
    return true;
  } catch {
    return false;
  }
};

export type ParsedBitcoinRecipient = {
  address: string;
  amount?: number;
};

export type ParsedBitcoinUri = {
  recipients: ParsedBitcoinRecipient[];
  memo: string;
  payjoinUrl: string;
};

export const parseBitcoinUriRecipients = (uri: string): ParsedBitcoinUri => {
  const normalized = normalizeBitcoinUri(uri);
  const { address, amount, memo, payjoinUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(normalized);
  const recipients: ParsedBitcoinRecipient[] = [];

  if (address && isBitcoinAddressValid(address)) {
    recipients.push({ address, amount: toValidAmount(String(amount)) });
  }

  const query = normalized.split('?')[1] ?? '';
  const params = new URLSearchParams(query);

  const extraAddresses = params
    .getAll('address')
    .map(value => value.trim())
    .filter(Boolean)
    .filter(value => isBitcoinAddressValid(value));
  const extraAmounts = params.getAll('amount');
  const amountOffset = recipients.length > 0 ? 1 : 0;

  extraAddresses.forEach((value, index) => {
    recipients.push({
      address: value,
      amount: toValidAmount(extraAmounts[index + amountOffset]),
    });
  });

  const indexedRecipients = new Map<number, Partial<ParsedBitcoinRecipient>>();
  for (const [key, rawValue] of params.entries()) {
    const value = rawValue.trim();
    const addressMatch = key.match(/^address[._](\d+)$/i);
    if (addressMatch) {
      const idx = Number(addressMatch[1]);
      if (!Number.isInteger(idx) || idx < 0 || !isBitcoinAddressValid(value)) continue;
      indexedRecipients.set(idx, { ...indexedRecipients.get(idx), address: value });
      continue;
    }

    const amountMatch = key.match(/^amount[._](\d+)$/i);
    if (amountMatch) {
      const idx = Number(amountMatch[1]);
      if (!Number.isInteger(idx) || idx < 0) continue;
      indexedRecipients.set(idx, { ...indexedRecipients.get(idx), amount: toValidAmount(value) });
    }
  }

  Array.from(indexedRecipients.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([idx, recipient]) => {
      if (!recipient.address) return;
      if (idx === 0 && recipients.length > 0) {
        recipients[0] = { ...recipients[0], ...recipient };
      } else {
        recipients.push(recipient as ParsedBitcoinRecipient);
      }
    });

  const uniqueRecipients = recipients.filter((recipient, idx, array) => {
    const recipientAmount = recipient.amount ?? null;
    return array.findIndex(item => item.address === recipient.address && (item.amount ?? null) === recipientAmount) === idx;
  });

  return {
    recipients: uniqueRecipients,
    memo: memo || params.get('message') || '',
    payjoinUrl,
  };
};

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

const normalizeWidgetActionUrl = (url: string): string => {
  if (url.toLowerCase().startsWith('bluewallet://')) return url.slice('bluewallet://'.length);
  if (url.toLowerCase().startsWith('bluewallet:')) return url.slice('bluewallet:'.length);
  return url;
};

const isOpenReceiveWidgetActionUrl = (url?: string | null): boolean => {
  if (typeof url !== 'string') return false;

  const normalized = normalizeWidgetActionUrl(url.trim());
  const action = normalized.match(/^widget\?action=([^&]+)/i)?.[1]?.toLowerCase();
  return action === 'openreceive';
};

const shouldHandleIncomingUrl = (url?: string | null): boolean => {
  if (typeof url !== 'string') return false;
  if (url.includes('+expo-auth-session')) return false;
  return isBitcoinDeepLinkUrl(url) || isOpenReceiveWidgetActionUrl(url);
};

export const isUrlHandledByLinking = (url: string): boolean => shouldHandleIncomingUrl(url);

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

const createWidgetOpenReceiveState = (): PartialState<NavigationState> => {
  const defaultWalletId = BlueApp.getWallets()?.[0]?.getID();

  return {
    routes: [
      {
        name: 'DrawerRoot',
        params: {
          screen: 'DetailViewStackScreensStack',
          params: {
            screen: 'ReceiveDetails',
            params: {
              ...(defaultWalletId ? { walletID: defaultWalletId } : {}),
              address: '',
            },
          },
        },
      },
    ],
  };
};

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
    if (typeof initialUrl !== 'string') return null;
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
    if (isOpenReceiveWidgetActionUrl(path)) {
      return createWidgetOpenReceiveState();
    }

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
