import type { TWallet } from '../../class/wallets/types';
import { Chain } from '../../models/bitcoinUnits';

export type TCompletionHandlerParams = [string, Record<string, any>];
export type TBothBitcoinAndLightning = { bitcoin: string; lndInvoice: string } | undefined;

export type TDeepLinkContext = {
  wallets: TWallet[];
  saveToDisk: () => void;
  addWallet: (wallet: TWallet) => void;
  setSharedCosigner: (cosigner: string) => void;
};

export const defaultContext: TDeepLinkContext = {
  wallets: [],
  saveToDisk: () => {},
  addWallet: () => {},
  setSharedCosigner: () => {},
};

export type TNotificationPayload = {
  type?: number | string;
  address?: string;
  txid?: string;
  hash?: string;
  walletID?: string;
  walletType?: string;
  chain?: Chain;
  [key: string]: any;
};

export const INTERNAL_ROUTE_PREFIX = 'bluewallet://route/';
export const RECENT_DEEP_LINK_WINDOW_MS = 3_000;
