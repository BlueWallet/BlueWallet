import URL from 'url';
import { NavigationState, PartialState } from '@react-navigation/native';
import Azteco from '../../class/azteco';
import { isBitcoinAddress, isPossiblyPSBTFile } from '../../class/bitcoin-uri';
import Lnurl from '../../class/lnurl';
import { WatchOnlyWallet } from '../../class';
import { readFileOutsideSandbox } from '../../blue_modules/fs';
import type { TWallet } from '../../class/wallets/types';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import RNQRGenerator from 'rn-qr-generator';

import type { TCompletionHandlerParams, TDeepLinkContext, TNotificationPayload } from './types';
import { defaultContext, INTERNAL_ROUTE_PREFIX } from './types';
import { linkingDebugLog, linkingDebugWarn } from './debug';
import {
  buildInternalUrl,
  compactParams,
  getServerFromSetElectrumServerAction,
  getUrlFromSetLndhubUrlAction,
  getWidgetActionUrl,
  hasNeededJsonKeysForMultiSigSharing,
  isBothBitcoinAndLightning,
  isBothBitcoinAndLightningOnWalletSelect,
  isImageFilePath,
  isLightningInvoice,
  isLnUrl,
  isPossiblyCosignerFile,
  isWidgetAction,
  normalizeUrl,
  parseInternalPath,
} from './url';

// ── Route config ─────────────────────────────────────────────────────────────

const parseStringParam = (value: string): string => value;
const stringifyStringParam = (value: unknown): string => String(value);
const parseBooleanParam = (value: string): boolean => value === 'true';
const stringifyBooleanParam = (value: boolean): string => (value ? 'true' : 'false');

const createLinkingParamConfig = (stringKeys: string[] = [], booleanKeys: string[] = []) => ({
  parse: Object.fromEntries([...stringKeys.map(key => [key, parseStringParam]), ...booleanKeys.map(key => [key, parseBooleanParam])]),
  stringify: Object.fromEntries([
    ...stringKeys.map(key => [key, stringifyStringParam]),
    ...booleanKeys.map(key => [key, stringifyBooleanParam]),
  ]),
});

export const linkingConfig = {
  screens: {
    DrawerRoot: {
      screens: {
        DetailViewStackScreensStack: {
          initialRouteName: 'WalletsList',
          screens: {
            WalletsList: '',
            WalletTransactions: {
              path: 'route/wallet/transactions',
              ...createLinkingParamConfig(['walletID', 'walletType']),
            },
            ReceiveDetails: {
              path: 'route/wallet/receive',
              ...createLinkingParamConfig(['walletID', 'address']),
            },
            ElectrumSettings: {
              path: 'route/settings/electrum',
              ...createLinkingParamConfig(['server']),
            },
            LightningSettings: {
              path: 'route/settings/lightning',
              ...createLinkingParamConfig(['url']),
            },
          },
        },
      },
    },
    SendDetailsRoot: {
      screens: {
        SendDetails: {
          path: 'route/send',
          ...createLinkingParamConfig(['uri', 'walletID']),
        },
        PsbtWithHardwareWallet: {
          path: 'route/send/psbt',
          ...createLinkingParamConfig(['deepLinkPSBTFilePath', 'deepLinkPSBT', 'walletID']),
        },
        SelectWallet: {
          path: 'route/send/select-wallet',
          ...createLinkingParamConfig(['bitcoin', 'lndInvoice']),
        },
      },
    },
    ScanLNDInvoiceRoot: {
      screens: {
        ScanLNDInvoice: {
          path: 'route/lightning/scan',
          ...createLinkingParamConfig(['uri', 'walletID']),
        },
      },
    },
    LNDCreateInvoiceRoot: {
      screens: {
        LNDCreateInvoice: {
          path: 'route/lightning/create-invoice',
          ...createLinkingParamConfig(['uri', 'walletID']),
        },
      },
    },
    AztecoRedeemRoot: {
      screens: {
        AztecoRedeem: {
          path: 'route/azteco/redeem',
          ...createLinkingParamConfig(['c1', 'c2', 'c3', 'c4']),
        },
      },
    },
    AddWalletRoot: {
      screens: {
        ImportWallet: {
          path: 'route/wallet/import',
          ...createLinkingParamConfig(['label'], ['triggerImport']),
        },
      },
    },
  },
};

// ── Route resolution ─────────────────────────────────────────────────────────

export const isDrawerManagedRoute = (routeName: string): boolean => {
  return (
    routeName === 'WalletTransactions' ||
    routeName === 'ReceiveDetails' ||
    routeName === 'ElectrumSettings' ||
    routeName === 'LightningSettings'
  );
};

const buildDetailViewStackState = (routeName: string, routeParams?: Record<string, any>): PartialState<NavigationState> => {
  if (routeName === 'WalletTransactions') {
    return {
      routes: [
        { name: 'WalletsList', params: undefined },
        { name: routeName, params: routeParams },
      ],
      index: 1,
    };
  }

  return {
    routes: [{ name: routeName, params: routeParams }],
    index: 0,
  };
};

export const routeToState = ([routeName, routeParams]: TCompletionHandlerParams): PartialState<NavigationState> => {
  linkingDebugLog('[linking] routeToState input:', routeName, routeParams);

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

export const getInternalRouteFromPath = (path: string): TCompletionHandlerParams | undefined => {
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

const routeFromUrl = (url: string, context: TDeepLinkContext = defaultContext): TCompletionHandlerParams | undefined => {
  const normalizedUrl = normalizeUrl(url);

  if (isWidgetAction(normalizedUrl)) {
    const action = normalizedUrl.split('widget?action=')[1];
    const widgetUrl = getWidgetActionUrl(action, context);

    if (widgetUrl) {
      return getInternalRouteFromPath(widgetUrl.replace(/^bluewallet:\/\//, ''));
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

  const normalizedLnurl = normalizedUrl.replace(/^lightning:\/\//i, 'lightning:');
  if (isLnUrl(normalizedLnurl)) {
    return [
      'LNDCreateInvoiceRoot',
      {
        screen: 'LNDCreateInvoice',
        params: { uri: normalizedLnurl.replace(/^lightning:/i, '') },
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

// ── Internal URL construction from routes ────────────────────────────────────

const sanitizeInternalUrlParams = <T extends Record<string, unknown> | undefined>(params: T): T => {
  if (params == null || typeof params !== 'object' || !('deepLinkPSBT' in params)) {
    return params;
  }

  const safeParams = { ...params };
  delete safeParams.deepLinkPSBT;
  return safeParams as T;
};

export const buildInternalUrlFromRoute = (route: TCompletionHandlerParams, sourceUrl: string): string | null => {
  const [routeName, routeParams] = route;

  switch (routeName) {
    case 'SendDetailsRoot':
      if (routeParams?.screen === 'PsbtWithHardwareWallet') {
        return buildInternalUrl('send/psbt', sanitizeInternalUrlParams(routeParams.params) ?? {});
      }
      if (routeParams?.screen === 'SelectWallet') {
        const both = isBothBitcoinAndLightning(sourceUrl);
        return both ? buildInternalUrl('send/select-wallet', both) : null;
      }
      return buildInternalUrl('send', sanitizeInternalUrlParams(routeParams?.params) ?? {});
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

// ── Image QR scanning ────────────────────────────────────────────────────────

const getDeepLinkFromImage = async (url: string): Promise<string> => {
  const attempts = [url, url.replace(/^file:\/\//, '')].filter((value, index, self) => value.length > 0 && self.indexOf(value) === index);

  for (const uri of attempts) {
    try {
      const qrResult = await RNQRGenerator.detect({ uri });
      if (qrResult?.values?.length) {
        return qrResult.values[0];
      }
    } catch (error) {
      linkingDebugWarn('QR detection failed while resolving deeplink image:', error);
    }
  }

  throw new Error(loc.send.qr_error_no_qrcode);
};

// ── Deep link resolution ─────────────────────────────────────────────────────

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
      linkingDebugWarn('[linking] failed to decode PSBT deep link path:', error);
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
      linkingDebugWarn('[linking] failed to read cosigner deep link file:', error);
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

// ── Notification → deep link ─────────────────────────────────────────────────

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
      return payload.hash ? context.wallets.find(wallet => wallet.weOwnTransaction(payload.hash!)) : undefined;
    }
    case 4: {
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
