import { getActionFromState, LinkingOptions, NavigationState, ParamListBase, PartialState } from '@react-navigation/native';
import URL from 'url';
import { AppState, AppStateStatus, DeviceEventEmitter, Linking } from 'react-native';
import { consumePendingOpenedNotification, NOTIFICATION_OPENED_EVENT } from '../blue_modules/notifications';
import QuickActions from 'react-native-quick-actions';
import { readFileOutsideSandbox } from '../blue_modules/fs';
import { WatchOnlyWallet } from '../class';
import Azteco from '../class/azteco';
import { isBitcoinAddress, isPossiblyPSBTFile } from '../class/bitcoin-uri';
import Lnurl from '../class/lnurl';
import type { TWallet } from '../class/wallets/types';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import RNQRGenerator from 'rn-qr-generator';

export { isBitcoinAddress };

type TCompletionHandlerParams = [string, Record<string, any>];
type TBothBitcoinAndLightning = { bitcoin: string; lndInvoice: string } | undefined;

export type TDeepLinkContext = {
  wallets: TWallet[];
  saveToDisk: () => void;
  addWallet: (wallet: TWallet) => void;
  setSharedCosigner: (cosigner: string) => void;
};

const defaultContext: TDeepLinkContext = {
  wallets: [],
  saveToDisk: () => {},
  addWallet: () => {},
  setSharedCosigner: () => {},
};

type TNotificationPayload = {
  type?: number | string;
  address?: string;
  txid?: string;
  hash?: string;
  walletID?: string;
  walletType?: string;
  chain?: Chain;
  [key: string]: any;
};

const waitForNavigationReady = async (timeoutMs: number = 3_000): Promise<boolean> => {
  if (navigationRef.isReady()) {
    return true;
  }

  const startedAt = Date.now();
  while (!navigationRef.isReady() && Date.now() - startedAt < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return navigationRef.isReady();
};

const getWalletFromNotificationPayload = (
  payload: TNotificationPayload,
  context: TDeepLinkContext = defaultContext,
): TWallet | undefined => {
  const payloadType = Number(payload.type);

  switch (payloadType) {
    case 2:
    case 3:
      return context.wallets.find(wallet => !!payload.address && wallet.weOwnAddress(payload.address));
    case 1: {
      // type 1: LN invoice paid — identified by preimage hash
      return payload.hash ? context.wallets.find(wallet => wallet.weOwnTransaction(payload.hash!)) : undefined;
    }
    case 4: {
      // type 4: txid confirmed — identified by txid
      return payload.txid ? context.wallets.find(wallet => wallet.weOwnTransaction(payload.txid!)) : undefined;
    }
    default:
      return undefined;
  }
};

export const getDeepLinkUrlFromNotification = (
  payload: TNotificationPayload,
  context: TDeepLinkContext = defaultContext,
): string | null => {
  const wallet = getWalletFromNotificationPayload(payload, context);
  const walletID = wallet?.getID() ?? payload.walletID;

  if (!walletID) {
    return null;
  }

  const payloadType = Number(payload.type);
  const walletType = wallet?.type ?? payload.walletType;
  const walletChain = wallet?.chain ?? payload.chain;
  const shouldOpenReceive = payloadType === 3 && walletChain !== Chain.OFFCHAIN;

  return shouldOpenReceive
    ? buildInternalUrl('wallet/receive', { walletID, address: payload.address })
    : buildInternalUrl('wallet/transactions', { walletID, walletType });
};

const getQuickActionUrl = (data: { userInfo?: { url?: string } } | null | undefined): string | null => {
  return typeof data?.userInfo?.url === 'string' ? data.userInfo.url : null;
};

const INTERNAL_ROUTE_PREFIX = 'bluewallet://route/';
const RECENT_DEEP_LINK_WINDOW_MS = 3_000;

let lastDeepLinkAt = 0;
let lastResolvedUrl: string | null = null;
let lastInitialUrl: string | null = null;
let appState: AppStateStatus = AppState.currentState;

/**
 * Fallback for cold-boot push notifications.
 *
 * Race condition: when the app cold-boots from a notification tap the following
 * state machine can occur:
 *
 *   1. Navigator mounts → subscribe() called with wallets=[] (wallets not yet in
 *      React state; StorageProvider's useEffect hasn't run yet).
 *   2. configureNotifications() fires NOTIFICATION_OPENED_EVENT.
 *   3. The active listener has wallets=[] → getDeepLinkUrlFromNotification returns
 *      null → navigation is lost.
 *   4. StorageProvider's useEffect runs → setWallets([…]) triggers a re-render.
 *   5. subscribe() is re-called with wallets=[populated].
 *
 * The fix: if the notification listener can't resolve a URL (step 3), store the
 * payload here.  The next subscribe() call (step 5) drains it with the now-
 * populated wallet context.
 */
let pendingColdBootPayload: TNotificationPayload | null = null;
let pendingDeferredResolvedUrl: string | null = null;

const getActiveRouteName = (state?: PartialState<NavigationState> | NavigationState): string | undefined => {
  if (!state?.routes?.length) {
    return undefined;
  }

  const activeRoute = state.routes[state.index ?? state.routes.length - 1] as any;
  if (activeRoute?.state) {
    return getActiveRouteName(activeRoute.state) ?? activeRoute.name;
  }

  return activeRoute?.params?.screen ?? activeRoute?.name;
};

const isUnlockScreenActive = (): boolean => {
  return getActiveRouteName(navigationRef.getRootState()) === 'UnlockWithScreen';
};

const recordDeepLinkActivity = (resolvedUrl?: string | null): void => {
  if (!resolvedUrl) {
    return;
  }

  lastDeepLinkAt = Date.now();
  lastResolvedUrl = resolvedUrl;
};

export const hasRecentDeepLinkActivity = (windowMs: number = RECENT_DEEP_LINK_WINDOW_MS): boolean => {
  return Date.now() - lastDeepLinkAt < windowMs;
};

const emitResolvedUrl = (listener: (url: string) => void, resolvedUrl: string | null): void => {
  if (!resolvedUrl) {
    return;
  }

  if (resolvedUrl === lastResolvedUrl && hasRecentDeepLinkActivity()) {
    return;
  }

  recordDeepLinkActivity(resolvedUrl);
  listener(resolvedUrl);
};

const emitResolvedUrlWhenNavigationSettles = (listener: (url: string) => void, resolvedUrl: string | null): void => {
  if (!resolvedUrl) {
    return;
  }

  if (!navigationRef.isReady() || isUnlockScreenActive()) {
    pendingDeferredResolvedUrl = resolvedUrl;
    console.log('[linking] deferring deep link until unlock/navigation settles:', resolvedUrl);

    (async () => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 5_000) {
        if (navigationRef.isReady() && !isUnlockScreenActive()) {
          const deferredUrl = pendingDeferredResolvedUrl;
          pendingDeferredResolvedUrl = null;
          emitResolvedUrl(listener, deferredUrl ?? resolvedUrl);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    })().catch(error => console.warn('[linking] deferred deep link error:', error));
    return;
  }

  emitResolvedUrl(listener, resolvedUrl);
};

export const hasSchema = (schemaString: string): boolean => {
  if (typeof schemaString !== 'string' || schemaString.length <= 0) return false;
  const lowercaseString = schemaString.trim().toLowerCase();

  return (
    lowercaseString.startsWith('bitcoin:') ||
    lowercaseString.startsWith('lightning:') ||
    lowercaseString.startsWith('blue:') ||
    lowercaseString.startsWith('bluewallet:') ||
    lowercaseString.startsWith('lapp:')
  );
};

export const normalizeUrl = (url: string): string => {
  let normalizedUrl = url;

  if (normalizedUrl.toLowerCase().startsWith('bluewallet:bitcoin:') || normalizedUrl.toLowerCase().startsWith('bluewallet:lightning:')) {
    normalizedUrl = normalizedUrl.substring(11);
  } else if (normalizedUrl.toLowerCase().startsWith('bluewallet://widget?action=')) {
    normalizedUrl = normalizedUrl.substring('bluewallet://'.length);
  }

  return normalizedUrl;
};

const isWidgetAction = (text: string): boolean => {
  return text.startsWith('widget?action=');
};

const isPossiblyCosignerFile = (filePath: string): boolean => {
  return filePath.toLowerCase().endsWith('.bwcosigner');
};

const isImageFilePath = (filePath: string): boolean => {
  const normalizedPath = filePath.split('?')[0]?.toLowerCase() ?? '';
  return normalizedPath.endsWith('.png') || normalizedPath.endsWith('.jpg') || normalizedPath.endsWith('.jpeg');
};

const getDeepLinkFromImage = async (url: string): Promise<string> => {
  const attempts = [url, url.replace(/^file:\/\//, '')].filter((value, index, self) => value.length > 0 && self.indexOf(value) === index);

  for (const uri of attempts) {
    try {
      const qrResult = await RNQRGenerator.detect({ uri });
      if (qrResult?.values?.length) {
        return qrResult.values[0];
      }
    } catch (error) {
      console.error('QR detection failed while resolving deeplink image:', error);
    }
  }

  throw new Error(loc.send.qr_error_no_qrcode);
};

export const isLightningInvoice = (invoice: string): boolean => {
  return (
    invoice.toLowerCase().startsWith('lightning:lnb') ||
    invoice.toLowerCase().startsWith('lightning://lnb') ||
    invoice.toLowerCase().startsWith('lnb')
  );
};

export const isLnUrl = (text: string): boolean => {
  return Lnurl.isLnurl(text);
};

export const hasNeededJsonKeysForMultiSigSharing = (str: string): boolean => {
  try {
    const obj = JSON.parse(str);
    return typeof obj.xfp === 'string' && typeof obj.xpub === 'string' && typeof obj.path === 'string';
  } catch (_) {
    return false;
  }
};

export const getServerFromSetElectrumServerAction = (url: string): string | false => {
  if (!url.startsWith('bluewallet:setelectrumserver') && !url.startsWith('setelectrumserver')) return false;
  const splitUrl = url.split('server=');
  if (splitUrl[1]) return decodeURIComponent(splitUrl[1]);
  return false;
};

export const getUrlFromSetLndhubUrlAction = (url: string): string | false => {
  if (!url.startsWith('bluewallet:setlndhuburl') && !url.startsWith('setlndhuburl')) return false;
  const splitUrl = url.split('url=');
  if (splitUrl[1]) return decodeURIComponent(splitUrl[1]);
  return false;
};

export const isBothBitcoinAndLightning = (url: string): TBothBitcoinAndLightning => {
  const lowercaseUrl = url.toLowerCase();
  if (!lowercaseUrl.includes('lightning') || !lowercaseUrl.includes('bitcoin')) {
    return undefined;
  }

  const txInfo = url.split(
    /(bitcoin:\/\/|BITCOIN:\/\/|bitcoin:|BITCOIN:|lightning:\/\/|LIGHTNING:\/\/|lightning:|LIGHTNING:|lightning=|LIGHTNING=|bitcoin=|BITCOIN=)+/,
  );
  let bitcoinUrl: string | false = false;
  let lndInvoice: string | false = false;

  for (const [index, value] of txInfo.entries()) {
    try {
      if (value.startsWith('bitcoin') || value.startsWith('BITCOIN')) {
        bitcoinUrl = `bitcoin:${txInfo[index + 1]}`;
        if (!isBitcoinAddress(bitcoinUrl)) {
          bitcoinUrl = false;
          break;
        }
      } else if (value.toLowerCase().startsWith('lightning')) {
        const lnPart = txInfo[index + 1].split('&').find(element => element.toLowerCase().startsWith('ln'));
        lndInvoice = `lightning:${lnPart}`;
        if (!isLightningInvoice(lndInvoice)) {
          lndInvoice = false;
          break;
        }
      }
    } catch (error) {
      console.log(error);
    }

    if (bitcoinUrl && lndInvoice) break;
  }

  return bitcoinUrl && lndInvoice ? { bitcoin: bitcoinUrl, lndInvoice } : undefined;
};

const isBothBitcoinAndLightningOnWalletSelect = (
  wallet: TWallet,
  uri: { bitcoin: string; lndInvoice: string },
): TCompletionHandlerParams => {
  if (wallet.chain === Chain.ONCHAIN) {
    return [
      'SendDetailsRoot',
      {
        screen: 'SendDetails',
        params: {
          uri: uri.bitcoin,
          walletID: wallet.getID(),
        },
      },
    ];
  }

  return [
    'ScanLNDInvoiceRoot',
    {
      screen: 'ScanLNDInvoice',
      params: {
        uri: uri.lndInvoice,
        walletID: wallet.getID(),
      },
    },
  ];
};

const routeFromUrl = (url: string, context: TDeepLinkContext = defaultContext): TCompletionHandlerParams | undefined => {
  const normalizedUrl = normalizeUrl(url);

  if (isWidgetAction(normalizedUrl) && context.wallets.length > 0) {
    const wallet = context.wallets[0];
    const action = normalizedUrl.split('widget?action=')[1];

    if (wallet.chain === Chain.ONCHAIN) {
      if (action === 'openSend') {
        return ['SendDetailsRoot', { screen: 'SendDetails', params: { walletID: wallet.getID() } }];
      }

      if (action === 'openReceive') {
        return ['ReceiveDetails', { walletID: wallet.getID() }];
      }
    } else if (wallet.chain === Chain.OFFCHAIN) {
      if (action === 'openSend') {
        return ['ScanLNDInvoiceRoot', { screen: 'ScanLNDInvoice', params: { walletID: wallet.getID() } }];
      }

      if (action === 'openReceive') {
        return ['LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { walletID: wallet.getID() } }];
      }
    }
  }

  const both = isBothBitcoinAndLightning(normalizedUrl);
  if (both) {
    return [
      'SelectWallet',
      {
        onWalletSelect: (wallet: TWallet, { navigation }: any) => {
          navigation.pop();
          navigation.navigate(...isBothBitcoinAndLightningOnWalletSelect(wallet, both));
        },
      },
    ];
  }

  if (isBitcoinAddress(normalizedUrl)) {
    return ['SendDetailsRoot', { screen: 'SendDetails', params: { uri: normalizedUrl.replace('://', ':') } }];
  }

  if (isLightningInvoice(normalizedUrl)) {
    return ['ScanLNDInvoiceRoot', { screen: 'ScanLNDInvoice', params: { uri: normalizedUrl.replace('://', ':') } }];
  }

  if (isLnUrl(normalizedUrl)) {
    return [
      'LNDCreateInvoiceRoot',
      {
        screen: 'LNDCreateInvoice',
        params: { uri: normalizedUrl.replace('lightning:', '').replace('LIGHTNING:', '') },
      },
    ];
  }

  if (Lnurl.isLightningAddress(normalizedUrl)) {
    return ['ScanLNDInvoiceRoot', { screen: 'ScanLNDInvoice', params: { uri: normalizedUrl } }];
  }

  if (Azteco.isRedeemUrl(normalizedUrl)) {
    return ['AztecoRedeemRoot', { screen: 'AztecoRedeem', params: Azteco.getParamsFromUrl(normalizedUrl) }];
  }

  if (new WatchOnlyWallet().setSecret(normalizedUrl).init().valid()) {
    return ['AddWalletRoot', { screen: 'ImportWallet', params: { triggerImport: true, label: normalizedUrl } }];
  }

  const urlObject = URL.parse(normalizedUrl, true); // eslint-disable-line n/no-deprecated-api
  if (urlObject.protocol === 'bluewallet:' || urlObject.protocol === 'lapp:' || urlObject.protocol === 'blue:') {
    switch (urlObject.host) {
      case 'setelectrumserver': {
        const server = getServerFromSetElectrumServerAction(normalizedUrl);
        return ['ElectrumSettings', { server: typeof server === 'string' ? server : undefined }];
      }
      case 'setlndhuburl': {
        const lndhubUrl = getUrlFromSetLndhubUrlAction(normalizedUrl);
        return ['LightningSettings', { url: typeof lndhubUrl === 'string' ? lndhubUrl : undefined }];
      }
    }
  }

  return undefined;
};

const buildQueryString = (params: Record<string, unknown>): string => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
};

export const buildInternalUrl = (path: string, params: Record<string, unknown> = {}): string => {
  return `${INTERNAL_ROUTE_PREFIX}${path}${buildQueryString(params)}`;
};

const compactParams = <T extends Record<string, any>>(params: T): T => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as T);
};

const parseInternalPath = (path: string): { path: string; params: Record<string, string> } => {
  const [rawPath, rawQuery = ''] = path.split('?');
  const normalizedPath = rawPath.replace(/^\/+/, '').replace(/^route\/?/, '');
  const params: Record<string, string> = {};

  for (const part of rawQuery.split('&')) {
    if (!part) continue;
    const [rawKey, rawValue = ''] = part.split('=');
    params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
  }

  return { path: normalizedPath, params };
};

const isDrawerManagedRoute = (routeName: string): boolean => {
  return (
    routeName === 'WalletTransactions' ||
    routeName === 'ReceiveDetails' ||
    routeName === 'ElectrumSettings' ||
    routeName === 'LightningSettings'
  );
};

const linkingConfig = {
  screens: {
    DrawerRoot: {
      screens: {
        DetailViewStackScreensStack: {
          screens: {
            WalletsList: '',
            WalletTransactions: 'route/wallet/transactions',
            ReceiveDetails: 'route/wallet/receive',
            ElectrumSettings: 'route/settings/electrum',
            LightningSettings: 'route/settings/lightning',
          },
        },
      },
    },
    SendDetailsRoot: {
      screens: {
        SendDetails: 'route/send',
        PsbtWithHardwareWallet: 'route/send/psbt',
        SelectWallet: 'route/send/select-wallet',
      },
    },
    ScanLNDInvoiceRoot: {
      screens: {
        ScanLNDInvoice: 'route/lightning/scan',
      },
    },
    LNDCreateInvoiceRoot: {
      screens: {
        LNDCreateInvoice: 'route/lightning/create-invoice',
      },
    },
    AztecoRedeemRoot: {
      screens: {
        AztecoRedeem: 'route/azteco/redeem',
      },
    },
    AddWalletRoot: {
      screens: {
        ImportWallet: 'route/wallet/import',
      },
    },
  },
};

const buildDetailViewStackState = (routeName: string, routeParams?: Record<string, any>): PartialState<NavigationState> => {
  if (routeName === 'WalletTransactions') {
    return {
      routes: [{ name: 'WalletsList', params: undefined }, { name: routeName, params: routeParams }],
      index: 1,
    };
  }

  return {
    routes: [{ name: routeName, params: routeParams }],
    index: 0,
  };
};

const routeToState = ([routeName, routeParams]: TCompletionHandlerParams): PartialState<NavigationState> => {
  console.log('[linking] routeToState input:', routeName, JSON.stringify(routeParams));
  if (routeName === 'DetailViewStackScreensStack' && routeParams?.screen) {
    return {
      routes: [
        {
          name: 'DrawerRoot',
          state: {
            routes: [
              {
                name: 'DetailViewStackScreensStack',
                state: buildDetailViewStackState(routeParams.screen, routeParams.params),
              },
            ],
            index: 0,
          },
        },
      ],
      index: 0,
    };
  }

  if (isDrawerManagedRoute(routeName)) {
    return {
      routes: [
        {
          name: 'DrawerRoot',
          state: {
            routes: [
              {
                name: 'DetailViewStackScreensStack',
                state: buildDetailViewStackState(routeName, routeParams),
              },
            ],
            index: 0,
          },
        },
      ],
      index: 0,
    };
  }

  if (routeParams?.screen) {
    return {
      routes: [
        { name: 'DrawerRoot' },
        { name: routeName, state: { routes: [{ name: routeParams.screen, params: routeParams.params }], index: 0 } },
      ],
      index: 1,
    };
  }

  return {
    routes: [{ name: 'DrawerRoot' }, { name: routeName, params: routeParams }],
    index: 1,
  };
};

const createOnWalletSelect = (bitcoin?: string, lndInvoice?: string) => {
  if (!bitcoin || !lndInvoice) {
    return undefined;
  }

  return (wallet: TWallet, { navigation }: any) => {
    navigation.pop();
    navigation.navigate(...isBothBitcoinAndLightningOnWalletSelect(wallet, { bitcoin, lndInvoice }));
  };
};

const getInternalRouteFromPath = (path: string): TCompletionHandlerParams | undefined => {
  const { path: internalPath, params } = parseInternalPath(path);

  switch (internalPath) {
    case 'send':
      return ['SendDetailsRoot', { screen: 'SendDetails', params: compactParams({ uri: params.uri, walletID: params.walletID }) }];
    case 'send/psbt':
      return [
        'SendDetailsRoot',
        {
          screen: 'PsbtWithHardwareWallet',
          params: compactParams({
            deepLinkPSBTFilePath: params.deepLinkPSBTFilePath ?? params.deepLinkPSBT,
            walletID: params.walletID,
          }),
        },
      ];
    case 'send/select-wallet': {
      const onWalletSelect = createOnWalletSelect(params.bitcoin, params.lndInvoice);
      if (onWalletSelect === undefined) {
        return undefined;
      }

      return ['SendDetailsRoot', { screen: 'SelectWallet', params: compactParams({ onWalletSelect }) }];
    }
    case 'lightning/scan':
      return ['ScanLNDInvoiceRoot', { screen: 'ScanLNDInvoice', params: compactParams({ uri: params.uri, walletID: params.walletID }) }];
    case 'lightning/create-invoice':
      return [
        'LNDCreateInvoiceRoot',
        { screen: 'LNDCreateInvoice', params: compactParams({ uri: params.uri, walletID: params.walletID }) },
      ];
    case 'azteco/redeem':
      return [
        'AztecoRedeemRoot',
        {
          screen: 'AztecoRedeem',
          params: { aztecoVoucher: compactParams({ c1: params.c1, c2: params.c2, c3: params.c3, c4: params.c4 }) },
        },
      ];
    case 'wallet/import':
      return [
        'AddWalletRoot',
        { screen: 'ImportWallet', params: compactParams({ label: params.label, triggerImport: params.triggerImport === 'true' }) },
      ];
    case 'wallet/transactions':
      return ['WalletTransactions', compactParams({ walletID: params.walletID, walletType: params.walletType })];
    case 'wallet/receive':
      return ['ReceiveDetails', compactParams({ walletID: params.walletID, address: params.address })];
    case 'wallet/xpub':
      return ['WalletXpub', compactParams({ walletID: params.walletID, xpub: params.xpub })];
    case 'settings/electrum':
      return ['ElectrumSettings', compactParams({ server: params.server })];
    case 'settings/lightning':
      return ['LightningSettings', compactParams({ url: params.url })];
    default:
      return undefined;
  }
};

const buildInternalUrlFromRoute = (route: TCompletionHandlerParams, sourceUrl: string): string | null => {
  const [routeName, routeParams] = route;

  switch (routeName) {
    case 'SendDetailsRoot':
      if (routeParams?.screen === 'PsbtWithHardwareWallet') {
        return buildInternalUrl('send/psbt', routeParams.params ?? {});
      }
      if (routeParams?.screen === 'SelectWallet') {
        const both = isBothBitcoinAndLightning(sourceUrl);
        return both ? buildInternalUrl('send/select-wallet', both) : null;
      }
      return buildInternalUrl('send', routeParams?.params ?? {});
    case 'ScanLNDInvoiceRoot':
      return buildInternalUrl('lightning/scan', routeParams?.params ?? {});
    case 'LNDCreateInvoiceRoot':
      return buildInternalUrl('lightning/create-invoice', routeParams?.params ?? {});
    case 'AztecoRedeemRoot':
      return buildInternalUrl('azteco/redeem', routeParams?.params?.aztecoVoucher ?? {});
    case 'AddWalletRoot':
      return buildInternalUrl('wallet/import', routeParams?.params ?? {});
    case 'DetailViewStackScreensStack':
      if (routeParams?.screen === 'WalletTransactions') {
        return buildInternalUrl('wallet/transactions', routeParams.params ?? {});
      }
      if (routeParams?.screen === 'ReceiveDetails') {
        return buildInternalUrl('wallet/receive', routeParams.params ?? {});
      }
      return null;
    case 'WalletTransactions':
      return buildInternalUrl('wallet/transactions', routeParams ?? {});
    case 'ReceiveDetails':
      return buildInternalUrl('wallet/receive', routeParams ?? {});
    case 'WalletXpub':
      return buildInternalUrl('wallet/xpub', routeParams ?? {});
    case 'SelectWallet': {
      const both = isBothBitcoinAndLightning(sourceUrl);
      return both ? buildInternalUrl('send/select-wallet', both) : null;
    }
    case 'ElectrumSettings':
      return buildInternalUrl('settings/electrum', routeParams ?? {});
    case 'LightningSettings':
      return buildInternalUrl('settings/lightning', routeParams ?? {});
    default:
      return null;
  }
};

export const resolveDeepLinkRoute = async (
  url: string,
  context: TDeepLinkContext = defaultContext,
): Promise<TCompletionHandlerParams | undefined> => {
  if (typeof url !== 'string' || url.length === 0) {
    return undefined;
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }

  if (isImageFilePath(decodedUrl)) {
    const imageDeepLink = await getDeepLinkFromImage(decodedUrl);
    return resolveDeepLinkRoute(imageDeepLink, context);
  }

  const walletShortcutMatch = decodedUrl.match(/^bluewallet:\/\/wallet\/([^/?#]+)/i);
  if (walletShortcutMatch) {
    const walletID = decodeURIComponent(walletShortcutMatch[1]);
    const wallet = context.wallets.find(item => item.getID() === walletID);

    return [
      'WalletTransactions',
      compactParams({
        walletID,
        walletType: wallet?.type,
      }),
    ];
  }

  const normalizedUrl = normalizeUrl(decodedUrl);

  if (isPossiblyPSBTFile(normalizedUrl)) {
    try {
      const deepLinkPSBTFilePath = decodeURI(normalizedUrl);
      return deepLinkPSBTFilePath
        ? [
            'SendDetailsRoot',
            {
              screen: 'PsbtWithHardwareWallet',
              params: { deepLinkPSBTFilePath },
            },
          ]
        : undefined;
    } catch (error) {
      console.warn(error);
      return undefined;
    }
  }

  if (isPossiblyCosignerFile(normalizedUrl)) {
    try {
      const file = await readFileOutsideSandbox(decodeURI(normalizedUrl));
      if (file && hasNeededJsonKeysForMultiSigSharing(file)) {
        context.setSharedCosigner(file);
      }
    } catch (error) {
      console.warn(error);
    }
    return undefined;
  }

  return routeFromUrl(normalizedUrl, context);
};

export const resolveDeepLinkUrl = async (url: string, context: TDeepLinkContext = defaultContext): Promise<string | null> => {
  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }

  if (url.startsWith(INTERNAL_ROUTE_PREFIX)) {
    return url;
  }

  const normalizedUrl = normalizeUrl(url);
  const route = await resolveDeepLinkRoute(normalizedUrl, context);
  return route ? buildInternalUrlFromRoute(route, normalizedUrl) : null;
};

export const navigateFromDeepLink = async (url: string, context: TDeepLinkContext = defaultContext): Promise<boolean> => {
  console.log('[linking] navigateFromDeepLink called with:', url);
  const resolvedUrl = await resolveDeepLinkUrl(url, context);
  console.log('[linking] resolvedUrl:', resolvedUrl);
  if (!resolvedUrl) {
    console.warn('[linking] navigateFromDeepLink: could not resolve URL, aborting');
    return false;
  }

  const navigationReady = await waitForNavigationReady();
  if (!navigationReady) {
    console.warn('[linking] navigateFromDeepLink: navigation not ready, aborting');
    return false;
  }

  recordDeepLinkActivity(resolvedUrl);

  const route = getInternalRouteFromPath(resolvedUrl.replace(/^bluewallet:\/\//, ''));
  console.log('[linking] resolved route:', JSON.stringify(route));
  if (!route) {
    console.warn('[linking] navigateFromDeepLink: no route for resolved URL, aborting');
    return false;
  }

  const state = routeToState(route);
  console.log('[linking] routeToState result:', JSON.stringify(state));
  const action = getActionFromState(state);
  console.log('[linking] getActionFromState result:', JSON.stringify(action));

  if (action) {
    navigationRef.dispatch(action);
    return true;
  }

  console.warn('[linking] no action from state, falling back to navigate()');
  navigationRef.navigate(route[0], route[1]);
  return true;
};

export const createBlueWalletLinking = (context: TDeepLinkContext = defaultContext): LinkingOptions<ParamListBase> => {
  return {
    prefixes: [
      'bluewallet://',
      'bluewallet:',
      'blue:',
      'lapp:',
      'bitcoin:',
      'bitcoin://',
      'lightning:',
      'lightning://',
      'https://azte.co',
      'https://lnbits.com',
    ],
    async getInitialURL() {
      try {
        const url = await Linking.getInitialURL();
        console.log('[linking] getInitialURL raw:', url);
        if (url) {
          lastInitialUrl = url;
          const resolvedUrl = await resolveDeepLinkUrl(url, context);
          console.log('[linking] getInitialURL resolved to:', resolvedUrl);
          recordDeepLinkActivity(resolvedUrl);
          return resolvedUrl;
        }

        // Cold-boot push notifications are NOT handled here because wallets are not yet
        // loaded when getInitialURL fires. They are handled by configureNotifications() in
        // notifications.ts once walletsInitialized is true, via NOTIFICATION_OPENED_EVENT.

        const quickActionUrl = getQuickActionUrl(await QuickActions.popInitialAction());
        if (quickActionUrl) {
          const resolvedUrl = await resolveDeepLinkUrl(quickActionUrl, context);
          recordDeepLinkActivity(resolvedUrl);
          return resolvedUrl;
        }

        return null;
      } catch (error) {
        console.warn(error);
        return null;
      }
    },
    subscribe(listener) {
      const processIncomingUrl = (url: string | null | undefined) => {
        if (!url) {
          return;
        }
        console.log('[linking] subscribe: processIncomingUrl raw:', url);

        resolveDeepLinkUrl(url, context)
          .then(resolvedUrl => {
            console.log('[linking] subscribe: resolved to:', resolvedUrl);
            emitResolvedUrlWhenNavigationSettles(listener, resolvedUrl);
          })
          .catch(error => console.warn('[linking] subscribe: resolve error:', error));
      };

      const linkingSubscription = Linking.addEventListener('url', event => {
        processIncomingUrl(event.url);
      });

      const quickActionSubscription = DeviceEventEmitter.addListener('quickActionShortcut', event => {
        processIncomingUrl(getQuickActionUrl(event));
      });

      const handleNotificationPayload = (payload: TNotificationPayload) => {
        consumePendingOpenedNotification();

        const url = getDeepLinkUrlFromNotification(payload, context);
        if (url) {
          emitResolvedUrlWhenNavigationSettles(listener, url);
        } else if (payload.userInteraction) {
          // Cold-boot race: wallets may not be in React state yet when this fires.
          // Store for the next subscribe() call (which gets fresh wallet context).
          pendingColdBootPayload = payload;
        }
      };

      // Per React Navigation docs: subscribe to notification opens so React Navigation
      // handles navigation via getStateFromPath rather than imperative navigateFromDeepLink.
      // This listener is re-registered whenever `context` (wallets) changes, keeping it fresh.
      const notificationOpenedSubscription = DeviceEventEmitter.addListener(NOTIFICATION_OPENED_EVENT, handleNotificationPayload);

      const pendingOpenedPayload = consumePendingOpenedNotification();
      if (pendingOpenedPayload) {
        handleNotificationPayload(pendingOpenedPayload);
      }

      // Drain any cold-boot notification that was stored while wallets were empty.
      // subscribe() is re-called by useLinking whenever `linking` changes (i.e. whenever
      // `wallets` changes), so by the time we reach here the context has populated wallets.
      if (pendingColdBootPayload) {
        const pending = pendingColdBootPayload;
        pendingColdBootPayload = null;
        handleNotificationPayload(pending);
      }

      if (pendingDeferredResolvedUrl) {
        const deferredUrl = pendingDeferredResolvedUrl;
        pendingDeferredResolvedUrl = null;
        emitResolvedUrlWhenNavigationSettles(listener, deferredUrl);
      }

      const appStateSubscription = AppState.addEventListener('change', nextAppState => {
        const wasInactive = appState === 'background' || appState === 'inactive';
        appState = nextAppState;

        if (!wasInactive || nextAppState !== 'active') {
          return;
        }

        Linking.getInitialURL()
          .then(url => {
            if (!url || url === lastInitialUrl) {
              return null;
            }

            lastInitialUrl = url;
            return resolveDeepLinkUrl(url, context);
          })
          .then(resolvedUrl => emitResolvedUrlWhenNavigationSettles(listener, resolvedUrl))
          .catch(error => console.warn(error));
      });

      return () => {
        linkingSubscription.remove();
        quickActionSubscription.remove();
        notificationOpenedSubscription.remove();
        appStateSubscription.remove();
      };
    },
    config: linkingConfig as NonNullable<LinkingOptions<ParamListBase>['config']>,
    getStateFromPath(path, _options) {
      console.log('[linking] getStateFromPath called with path:', path);
      if (hasSchema(path)) {
        console.log('[linking] getStateFromPath: has schema, returning undefined (handled via resolveDeepLinkUrl)');
        return undefined;
      }

      const route = getInternalRouteFromPath(path);
      console.log('[linking] getStateFromPath route:', JSON.stringify(route));
      const state = route ? routeToState(route) : undefined;
      console.log('[linking] getStateFromPath state:', JSON.stringify(state));
      return state;
    },
  };
};
