import { BitcoinUnit } from '../models/bitcoinUnits';

export const conversionCache: Record<string, string> = {};

const getCacheKey = (amount: string): string => amount + BitcoinUnit.LOCAL_CURRENCY;

export const getCachedSatoshis = (amount: string): string | undefined => conversionCache[getCacheKey(amount)];

export const setCachedSatoshis = (amount: string, satoshis: string): void => {
  conversionCache[getCacheKey(amount)] = satoshis;
};

export const clearCachedSatoshis = (): void => {
  for (const key of Object.keys(conversionCache)) delete conversionCache[key];
};
