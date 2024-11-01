import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
import DefaultPreference from 'react-native-default-preference';
import * as RNLocalize from 'react-native-localize';

import { FiatUnit, FiatUnitType, getFiatRate } from '../models/fiatUnit';

const PREFERRED_CURRENCY_STORAGE_KEY = 'preferredCurrency';
const PREFERRED_CURRENCY_LOCALE_STORAGE_KEY = 'preferredCurrencyLocale';
const EXCHANGE_RATES_STORAGE_KEY = 'exchangeRates';
const LAST_UPDATED = 'LAST_UPDATED';
export const GROUP_IO_BLUEWALLET = 'group.io.bluewallet.bluewallet';
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

    try {
      const exchangeRatesString = JSON.stringify(exchangeRates);
      await AsyncStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, exchangeRatesString);
    } catch (error) {
      await AsyncStorage.removeItem(EXCHANGE_RATES_STORAGE_KEY);
      exchangeRates = { LAST_UPDATED_ERROR: false };
    }
  } catch (error) {
    try {
      const ratesString = await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
      let rate;
      if (ratesString) {
        try {
          rate = JSON.parse(ratesString);
        } catch (parseError) {
          await AsyncStorage.removeItem(EXCHANGE_RATES_STORAGE_KEY);
          rate = {};
        }
      } else {
        rate = {};
      }
      rate.LAST_UPDATED_ERROR = true;
      exchangeRates.LAST_UPDATED_ERROR = true;
      await AsyncStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(rate));
    } catch (storageError) {}
  }
}

async function getPreferredCurrency(): Promise<FiatUnitType> {
  const preferredCurrency = await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY);

  if (preferredCurrency) {
    let parsedPreferredCurrency;
    try {
      parsedPreferredCurrency = JSON.parse(preferredCurrency);
      if (!FiatUnit[parsedPreferredCurrency.endPointKey]) {
        throw new Error('Invalid Fiat Unit');
      }
      preferredFiatCurrency = FiatUnit[parsedPreferredCurrency.endPointKey];
    } catch (error) {
      await AsyncStorage.removeItem(PREFERRED_CURRENCY_STORAGE_KEY);

      const deviceCurrencies = RNLocalize.getCurrencies();
      if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
        preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
      } else {
        preferredFiatCurrency = FiatUnit.USD;
      }
    }

    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, preferredFiatCurrency.endPointKey);
    await DefaultPreference.set(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY, preferredFiatCurrency.locale.replace('-', '_'));
    return preferredFiatCurrency;
  }

  const deviceCurrencies = RNLocalize.getCurrencies();
  if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
    preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
  } else {
    preferredFiatCurrency = FiatUnit.USD;
  }

  return preferredFiatCurrency;
}

async function _restoreSavedExchangeRatesFromStorage(): Promise<void> {
  try {
    const rates = await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    if (rates) {
      try {
        exchangeRates = JSON.parse(rates);
      } catch (error) {
        await AsyncStorage.removeItem(EXCHANGE_RATES_STORAGE_KEY);
        exchangeRates = { LAST_UPDATED_ERROR: false };
        await updateExchangeRate();
      }
    } else {
      exchangeRates = { LAST_UPDATED_ERROR: false };
    }
  } catch (error) {
    exchangeRates = { LAST_UPDATED_ERROR: false };
    await updateExchangeRate();
  }
}

async function _restoreSavedPreferredFiatCurrencyFromStorage(): Promise<void> {
  try {
    const storedCurrency = await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY);
    if (!storedCurrency) throw new Error('No Preferred Fiat selected');

    let parsedCurrency;
    try {
      parsedCurrency = JSON.parse(storedCurrency);
      if (!FiatUnit[parsedCurrency.endPointKey]) {
        throw new Error('Invalid Fiat Unit');
      }
      preferredFiatCurrency = FiatUnit[parsedCurrency.endPointKey];
    } catch (error) {
      await AsyncStorage.removeItem(PREFERRED_CURRENCY_STORAGE_KEY);

      const deviceCurrencies = RNLocalize.getCurrencies();
      if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
        preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
      } else {
        preferredFiatCurrency = FiatUnit.USD;
      }
    }
  } catch (error) {
    const deviceCurrencies = RNLocalize.getCurrencies();
    if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
      preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
    } else {
      preferredFiatCurrency = FiatUnit.USD;
    }
  }
}

async function isRateOutdated(): Promise<boolean> {
  try {
    const rateString = await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    let rate;
    if (rateString) {
      try {
        rate = JSON.parse(rateString);
      } catch (parseError) {
        await AsyncStorage.removeItem(EXCHANGE_RATES_STORAGE_KEY);
        rate = {};
        await updateExchangeRate();
      }
    } else {
      rate = {};
    }
    return rate.LAST_UPDATED_ERROR || Date.now() - (rate[LAST_UPDATED] || 0) >= 31 * 60 * 1000;
  } catch {
    return true;
  }
}

async function restoreSavedPreferredFiatCurrencyAndExchangeFromStorage(): Promise<void> {
  await _restoreSavedExchangeRatesFromStorage();
  await _restoreSavedPreferredFiatCurrencyFromStorage();
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
  try {
    const currencyInformationString = await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    let currencyInformation;
    if (currencyInformationString) {
      try {
        currencyInformation = JSON.parse(currencyInformationString);
      } catch (parseError) {
        await AsyncStorage.removeItem(EXCHANGE_RATES_STORAGE_KEY);
        currencyInformation = {};
        await updateExchangeRate();
      }
    } else {
      currencyInformation = {};
    }

    const formatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
    });

    const rate = currencyInformation[BTC_PREFIX + preferredFiatCurrency.endPointKey];
    return {
      LastUpdated: currencyInformation[LAST_UPDATED],
      Rate: rate ? formatter.format(rate) : '...',
    };
  } catch {
    return {
      LastUpdated: null,
      Rate: null,
    };
  }
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
  _setExchangeRate,
  _setPreferredFiatCurrency,
  _setSkipUpdateExchangeRate,
  BTCToLocalCurrency,
  btcToSatoshi,
  EXCHANGE_RATES_STORAGE_KEY,
  fiatToBTC,
  getCurrencySymbol,
  getPreferredCurrency,
  initCurrencyDaemon,
  isRateOutdated,
  LAST_UPDATED,
  mostRecentFetchedRate,
  PREFERRED_CURRENCY_STORAGE_KEY,
  restoreSavedPreferredFiatCurrencyAndExchangeFromStorage,
  satoshiToBTC,
  satoshiToLocalCurrency,
  setPreferredCurrency,
  updateExchangeRate,
};
