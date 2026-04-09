import { isBitcoinAddress } from '../../class/bitcoin-uri';
import Lnurl from '../../class/lnurl';
import type { TWallet } from '../../class/wallets/types';
import { Chain } from '../../models/bitcoinUnits';
import type { TCompletionHandlerParams, TDeepLinkContext } from './types';
import { defaultContext, INTERNAL_ROUTE_PREFIX } from './types';

export { isBitcoinAddress };

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

export const isWidgetAction = (text: string): boolean => {
  return text.startsWith('widget?action=');
};

export const isPossiblyCosignerFile = (filePath: string): boolean => {
  return filePath.toLowerCase().endsWith('.bwcosigner');
};

export const isImageFilePath = (filePath: string): boolean => {
  const normalizedPath = filePath.split('?')[0]?.toLowerCase() ?? '';
  return normalizedPath.endsWith('.png') || normalizedPath.endsWith('.jpg') || normalizedPath.endsWith('.jpeg');
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

export const isBothBitcoinAndLightning = (url: string): { bitcoin: string; lndInvoice: string } | undefined => {
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
    } catch {
      // parsing error, skip
    }

    if (bitcoinUrl && lndInvoice) break;
  }

  return bitcoinUrl && lndInvoice ? { bitcoin: bitcoinUrl, lndInvoice } : undefined;
};

export const buildQueryString = (params: Record<string, unknown>): string => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
};

export const buildInternalUrl = (path: string, params: Record<string, unknown> = {}): string => {
  return `${INTERNAL_ROUTE_PREFIX}${path}${buildQueryString(params)}`;
};

export const compactParams = <T extends Record<string, any>>(params: T): T => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as T);
};

export const parseInternalPath = (path: string): { path: string; params: Record<string, string> } => {
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

export const getWalletQuickActionUrl = (wallet: Pick<TWallet, 'getID' | 'type'>): string => {
  return buildInternalUrl('wallet/transactions', compactParams({ walletID: wallet.getID(), walletType: wallet.type }));
};

export const getWidgetActionUrl = (
  action: 'openSend' | 'openReceive' | string,
  context: TDeepLinkContext = defaultContext,
): string | null => {
  const wallet = context.wallets[0];
  if (!wallet) {
    return null;
  }

  const walletID = wallet.getID();

  if (wallet.chain === Chain.ONCHAIN) {
    if (action === 'openSend') {
      return buildInternalUrl('send', { walletID });
    }

    if (action === 'openReceive') {
      return buildInternalUrl('wallet/receive', { walletID });
    }
  }

  if (wallet.chain === Chain.OFFCHAIN) {
    if (action === 'openSend') {
      return buildInternalUrl('lightning/scan', { walletID });
    }

    if (action === 'openReceive') {
      return buildInternalUrl('lightning/create-invoice', { walletID });
    }
  }

  return null;
};

export const isBothBitcoinAndLightningOnWalletSelect = (
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
