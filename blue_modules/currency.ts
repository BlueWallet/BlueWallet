import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import * as RNLocalize from 'react-native-localize';
import BigNumber from 'bignumber.js';
import { FiatUnit, FiatUnitType, getFiatRate } from '../models/fiatUnit';
import WidgetCommunication from './WidgetCommunication';

const PREFERRED_CURRENCY_STORAGE_KEY = 'preferredCurrency';
const PREFERRED_CURRENCY_LOCALE_STORAGE_KEY = 'preferredCurrencyLocale';
const EXCHANGE_RATES_STORAGE_KEY = 'exchangeRates';
const LAST_UPDATED = 'LAST_UPDATED';
const GROUP_IO_BLUEWALLET = 'group.io.bluewallet.bluewallet';
const BTC_PREFIX = 'BTC_';

export interface CurrencyRate {
  LastUpdated: Date | null;
  Rate: number | string | null;
}

interface ExchangeRates {
  [key: string]: number | boolean | undefined;
  LAST_UPDATED_ERROR: boolean;
}

let preferredFiatCurrency: FiatUnitType = FiatUnit.USD;
let exchangeRates: ExchangeRates = { LAST_UPDATED_ERROR: false };
let lastTimeUpdateExchangeRateWasCalled: number = 0;
let skipUpdateExchangeRate: boolean = false;

async function setPreferredCurrency(item: FiatUnitType): Promise<void> {
  await AsyncStorage.setItem(PREFERRED_CURRENCY_STORAGE_KEY, JSON.stringify(item));
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, item.endPointKey);
  await DefaultPreference.set(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY, item.locale.replace('-', '_'));
  // @ts-ignore: Convert to TSX later
  WidgetCommunication.reloadAllTimelines();
}

async function getPreferredCurrency(): Promise<FiatUnitType> {
  const preferredCurrency = JSON.parse((await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY)) || '{}');
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, preferredCurrency.endPointKey);
  await DefaultPreference.set(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY, preferredCurrency.locale.replace('-', '_'));
  return preferredCurrency;
}

async function _restoreSavedExchangeRatesFromStorage(): Promise<void> {
  try {
    const rates = await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    exchangeRates = rates ? JSON.parse(rates) : { LAST_UPDATED_ERROR: false };
  } catch (_) {
    exchangeRates = { LAST_UPDATED_ERROR: false };
  }
}

async function _restoreSavedPreferredFiatCurrencyFromStorage(): Promise<void> {
  try {
    const storedCurrency = await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY);
    if (!storedCurrency) throw new Error('No Preferred Fiat selected');
    preferredFiatCurrency = JSON.parse(storedCurrency);
    if (!FiatUnit[preferredFiatCurrency.endPointKey]) {
      throw new Error('Invalid Fiat Unit');
    }
  } catch (_) {
    const deviceCurrencies = RNLocalize.getCurrencies();
    preferredFiatCurrency = deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]] ? FiatUnit[deviceCurrencies[0]] : FiatUnit.USD;
  }
}

async function updateExchangeRate(): Promise<void> {
  if (skipUpdateExchangeRate) return;
  if (Date.now() - lastTimeUpdateExchangeRateWasCalled <= 10000) {
    // simple debounce so there's no race conditions
    return;
  }
  lastTimeUpdateExchangeRateWasCalled = Date.now();

  const lastUpdated = exchangeRates[LAST_UPDATED] as number | undefined;
  if (lastUpdated && Date.now() - lastUpdated <= 30 * 60 * 1000) {
    // not updating too often
    return;
  }
  console.log('updating exchange rate...');

  try {
    const rate = await getFiatRate(preferredFiatCurrency.endPointKey);
    exchangeRates[LAST_UPDATED] = Date.now();
    exchangeRates[BTC_PREFIX + preferredFiatCurrency.endPointKey] = rate;
    exchangeRates.LAST_UPDATED_ERROR = false;
    await AsyncStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(exchangeRates));
  } catch (error) {
    console.error('Error encountered when attempting to update exchange rate...', error);
    const rate = JSON.parse((await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY)) || '{}');
    rate.LAST_UPDATED_ERROR = true;
    exchangeRates.LAST_UPDATED_ERROR = true;
    await AsyncStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(rate));
  }
}

async function isRateOutdated(): Promise<boolean> {
  try {
    const rate = JSON.parse((await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY)) || '{}');
    return rate.LAST_UPDATED_ERROR || Date.now() - (rate[LAST_UPDATED] || 0) >= 31 * 60 * 1000;
  } catch {
    return true;
  }
}

async function initCurrencyDaemon(clearLastUpdatedTime: boolean = false): Promise<void> {
  await _restoreSavedExchangeRatesFromStorage();
  await _restoreSavedPreferredFiatCurrencyFromStorage();

  if (clearLastUpdatedTime) {
    exchangeRates[LAST_UPDATED] = 0;
    lastTimeUpdateExchangeRateWasCalled = 0;
  }

  await updateExchangeRate();
}

function satoshiToLocalCurrency(satoshi: number, format: boolean = true): string {
  const exchangeRateKey = BTC_PREFIX + preferredFiatCurrency.endPointKey;
  const exchangeRate = exchangeRates[exchangeRateKey];

  if (typeof exchangeRate !== 'number') {
    updateExchangeRate();
    return '...';
  }

  const btcAmount = new BigNumber(satoshi).dividedBy(100000000);
  const convertedAmount = btcAmount.multipliedBy(exchangeRate);
  let formattedAmount: string;

  if (convertedAmount.isGreaterThanOrEqualTo(0.005) || convertedAmount.isLessThanOrEqualTo(-0.005)) {
    formattedAmount = convertedAmount.toFixed(2);
  } else {
    formattedAmount = convertedAmount.toPrecision(2);
  }

  if (format === false) return formattedAmount;

  try {
    const formatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
    return formatter.format(Number(formattedAmount));
  } catch (error) {
    console.warn(error);
    return formattedAmount;
  }
}

function BTCToLocalCurrency(bitcoin: BigNumber.Value): string {
  const sat = new BigNumber(bitcoin).multipliedBy(100000000).toNumber();
  return satoshiToLocalCurrency(sat);
}

async function mostRecentFetchedRate(): Promise<CurrencyRate> {
  const currencyInformation = JSON.parse((await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY)) || '{}');

  const formatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
    style: 'currency',
    currency: preferredFiatCurrency.endPointKey,
  });

  const rate = currencyInformation[BTC_PREFIX + preferredFiatCurrency.endPointKey];
  return {
    LastUpdated: currencyInformation[LAST_UPDATED],
    Rate: rate ? formatter.format(rate) : '...',
  };
}

function satoshiToBTC(satoshi: number): string {
  return new BigNumber(satoshi).dividedBy(100000000).toString(10);
}

function btcToSatoshi(btc: BigNumber.Value): number {
  return new BigNumber(btc).multipliedBy(100000000).toNumber();
}

function fiatToBTC(fiatFloat: number): string {
  const exchangeRateKey = BTC_PREFIX + preferredFiatCurrency.endPointKey;
  const exchangeRate = exchangeRates[exchangeRateKey];

  if (typeof exchangeRate !== 'number') {
    throw new Error('Exchange rate not available');
  }

  const btcAmount = new BigNumber(fiatFloat).dividedBy(exchangeRate);
  return btcAmount.toFixed(8);
}

function getCurrencySymbol(): string {
  return preferredFiatCurrency.symbol;
}

function _setPreferredFiatCurrency(currency: FiatUnitType): void {
  preferredFiatCurrency = currency;
}

function _setExchangeRate(pair: string, rate: number): void {
  exchangeRates[pair] = rate;
}

function _setSkipUpdateExchangeRate(): void {
  skipUpdateExchangeRate = true;
}

export {
  updateExchangeRate,
  initCurrencyDaemon,
  satoshiToLocalCurrency,
  fiatToBTC,
  satoshiToBTC,
  BTCToLocalCurrency,
  setPreferredCurrency,
  getPreferredCurrency,
  btcToSatoshi,
  getCurrencySymbol,
  _setPreferredFiatCurrency,
  _setExchangeRate,
  _setSkipUpdateExchangeRate,
  PREFERRED_CURRENCY_STORAGE_KEY,
  EXCHANGE_RATES_STORAGE_KEY,
  LAST_UPDATED,
  mostRecentFetchedRate,
  isRateOutdated,
};
