import DefaultPreference from 'react-native-default-preference';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
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

let currencyFormatter: Intl.NumberFormat | null = null;
let btcFormatter: Intl.NumberFormat | null = null;

// Initialize DefaultPreference with the correct group name
DefaultPreference.setName(GROUP_IO_BLUEWALLET);

/**
 * Migration Function:
 * Transfers data from AsyncStorage to DefaultPreference if present.
 * After migration, removes the data from AsyncStorage.
 */
async function migrateAsyncStorageToDefaultPreference(): Promise<void> {
  try {
    // Migrate Preferred Currency
    const asyncPreferredCurrency = await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY);
    if (asyncPreferredCurrency) {
      try {
        const parsedCurrency = JSON.parse(asyncPreferredCurrency);
        if (FiatUnit[parsedCurrency.endPointKey]) {
          await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, parsedCurrency.endPointKey);
          await DefaultPreference.set(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY, parsedCurrency.locale.replace('-', '_'));
          preferredFiatCurrency = FiatUnit[parsedCurrency.endPointKey];
        }
      } catch (error) {
        console.error('Failed to parse preferred currency from AsyncStorage:', error);
      } finally {
        // Remove from AsyncStorage regardless of success to prevent repeated attempts
        await AsyncStorage.removeItem(PREFERRED_CURRENCY_STORAGE_KEY);
        await AsyncStorage.removeItem(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY);
      }
    }

    // Migrate Exchange Rates
    const asyncExchangeRates = await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    if (asyncExchangeRates) {
      try {
        const parsedRates = JSON.parse(asyncExchangeRates);
        await DefaultPreference.set(EXCHANGE_RATES_STORAGE_KEY, asyncExchangeRates);
        exchangeRates = parsedRates;
      } catch (error) {
        console.error('Failed to parse exchange rates from AsyncStorage:', error);
      } finally {
        // Remove from AsyncStorage regardless of success
        await AsyncStorage.removeItem(EXCHANGE_RATES_STORAGE_KEY);
      }
    }

    // Optionally, handle other keys if necessary
    // ...

    console.log('Migration from AsyncStorage to DefaultPreference completed.');
  } catch (migrationError) {
    console.error('Migration failed:', migrationError);
    // Decide whether to proceed or halt based on the severity
  }
}

function getCurrencyFormatter(): Intl.NumberFormat {
  if (
    !currencyFormatter ||
    currencyFormatter.resolvedOptions().locale !== preferredFiatCurrency.locale ||
    currencyFormatter.resolvedOptions().currency !== preferredFiatCurrency.endPointKey
  ) {
    currencyFormatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
    console.debug('Created new currency formatter');
  } else {
    console.debug('Using cached currency formatter');
  }
  return currencyFormatter;
}

function getBTCFormatter(): Intl.NumberFormat {
  if (!btcFormatter || btcFormatter.resolvedOptions().locale !== preferredFiatCurrency.locale) {
    btcFormatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    });
    console.debug('Created new BTC formatter');
  } else {
    console.debug('Using cached BTC formatter');
  }
  return btcFormatter;
}

async function setPreferredCurrency(item: FiatUnitType): Promise<void> {
  try {
    await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, item.endPointKey);
    await DefaultPreference.set(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY, item.locale.replace('-', '_'));
    preferredFiatCurrency = item;
    currencyFormatter = null;
    btcFormatter = null;
  } catch (error) {
    console.error('Failed to set preferred currency:', error);
    throw error;
  }
}

async function updateExchangeRate(): Promise<void> {
  if (skipUpdateExchangeRate) return;
  if (Date.now() - lastTimeUpdateExchangeRateWasCalled <= 10000) {
    // Simple debounce to prevent race conditions
    return;
  }
  lastTimeUpdateExchangeRateWasCalled = Date.now();

  const lastUpdated = exchangeRates[LAST_UPDATED] as number | undefined;
  if (lastUpdated && Date.now() - lastUpdated <= 30 * 60 * 1000) {
    // Not updating too often
    return;
  }
  console.log('Updating exchange rate...');

  try {
    const rate = await getFiatRate(preferredFiatCurrency.endPointKey);
    exchangeRates[LAST_UPDATED] = Date.now();
    exchangeRates[BTC_PREFIX + preferredFiatCurrency.endPointKey] = rate;
    exchangeRates.LAST_UPDATED_ERROR = false;

    try {
      const exchangeRatesString = JSON.stringify(exchangeRates);
      await DefaultPreference.set(EXCHANGE_RATES_STORAGE_KEY, exchangeRatesString);
    } catch (error) {
      console.error('Failed to set exchange rates in DefaultPreference:', error);
      await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
      exchangeRates = { LAST_UPDATED_ERROR: false };
    }
  } catch (error) {
    console.error('Failed to fetch fiat rate:', error);
    try {
      const ratesString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
      let rate;
      if (ratesString) {
        try {
          rate = JSON.parse(ratesString);
        } catch (parseError) {
          console.error('Failed to parse exchange rates:', parseError);
          await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
          rate = {};
        }
      } else {
        rate = {};
      }
      rate.LAST_UPDATED_ERROR = true;
      exchangeRates.LAST_UPDATED_ERROR = true;
      await DefaultPreference.set(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(rate));
    } catch (storageError) {
      console.error('Failed to handle exchange rate error:', storageError);
      exchangeRates = { LAST_UPDATED_ERROR: true };
      throw storageError;
    }
  }
}

async function getPreferredCurrency(): Promise<FiatUnitType> {
  try {
    const preferredCurrencyString = await DefaultPreference.get(PREFERRED_CURRENCY_STORAGE_KEY);
    if (preferredCurrencyString) {
      try {
        if (!FiatUnit[preferredCurrencyString]) {
          throw new Error('Invalid Fiat Unit');
        }
        preferredFiatCurrency = FiatUnit[preferredCurrencyString];
      } catch (error) {
        console.error('Failed to parse preferred currency:', error);
        await DefaultPreference.clear(PREFERRED_CURRENCY_STORAGE_KEY);
        await DefaultPreference.clear(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY);

        const deviceCurrencies = RNLocalize.getCurrencies();
        if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
          preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
        } else {
          preferredFiatCurrency = FiatUnit.USD;
        }
        // Update DefaultPreference with the fallback currency
        await setPreferredCurrency(preferredFiatCurrency);
      }

      return preferredFiatCurrency;
    }

    // If no preferred currency is set, determine based on device settings
    const deviceCurrencies = RNLocalize.getCurrencies();
    if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
      preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
    } else {
      preferredFiatCurrency = FiatUnit.USD;
    }

    // Set the determined currency in DefaultPreference
    await setPreferredCurrency(preferredFiatCurrency);
    return preferredFiatCurrency;
  } catch (error) {
    console.error('Failed to get preferred currency:', error);
    // Fallback to USD in case of error
    preferredFiatCurrency = FiatUnit.USD;
    await setPreferredCurrency(preferredFiatCurrency);
    return preferredFiatCurrency;
  }
}

async function _restoreSavedExchangeRatesFromStorage(): Promise<void> {
  try {
    const ratesString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    if (ratesString) {
      try {
        exchangeRates = JSON.parse(ratesString);
      } catch (error) {
        console.error('Failed to parse exchange rates:', error);
        await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
        exchangeRates = { LAST_UPDATED_ERROR: false };
        await updateExchangeRate();
      }
    } else {
      exchangeRates = { LAST_UPDATED_ERROR: false };
    }
  } catch (error) {
    console.error('Failed to restore exchange rates:', error);
    exchangeRates = { LAST_UPDATED_ERROR: false };
    await updateExchangeRate();
  }
}

async function _restoreSavedPreferredFiatCurrencyFromStorage(): Promise<void> {
  try {
    const storedCurrencyString = await DefaultPreference.get(PREFERRED_CURRENCY_STORAGE_KEY);
    if (!storedCurrencyString) throw new Error('No Preferred Fiat selected');

    try {
      preferredFiatCurrency = FiatUnit[storedCurrencyString];
    } catch (error) {
      console.error('Failed to parse stored currency:', error);
      await DefaultPreference.clear(PREFERRED_CURRENCY_STORAGE_KEY);
      await DefaultPreference.clear(PREFERRED_CURRENCY_LOCALE_STORAGE_KEY);

      const deviceCurrencies = RNLocalize.getCurrencies();
      if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
        preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
      } else {
        preferredFiatCurrency = FiatUnit.USD;
      }
      // Update DefaultPreference with the fallback currency
      await setPreferredCurrency(preferredFiatCurrency);
    }
  } catch (error) {
    console.error('Failed to restore preferred fiat currency:', error);
    const deviceCurrencies = RNLocalize.getCurrencies();
    if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
      preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
    } else {
      preferredFiatCurrency = FiatUnit.USD;
    }
    // Set the fallback currency in DefaultPreference
    await setPreferredCurrency(preferredFiatCurrency);
  }
}

async function isRateOutdated(): Promise<boolean> {
  try {
    const rateString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    let rate;
    if (rateString) {
      try {
        rate = JSON.parse(rateString);
      } catch (parseError) {
        console.error('Failed to parse exchange rates:', parseError);
        await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
        rate = {};
        await updateExchangeRate();
      }
    } else {
      rate = {};
    }
    return rate.LAST_UPDATED_ERROR || Date.now() - (rate[LAST_UPDATED] || 0) >= 31 * 60 * 1000;
  } catch (error) {
    console.error('Failed to determine if rate is outdated:', error);
    return true;
  }
}

async function restoreSavedPreferredFiatCurrencyAndExchangeFromStorage(): Promise<void> {
  await _restoreSavedExchangeRatesFromStorage();
  await _restoreSavedPreferredFiatCurrencyFromStorage();
}

async function initCurrencyDaemon(clearLastUpdatedTime: boolean = false): Promise<void> {
  await restoreSavedPreferredFiatCurrencyAndExchangeFromStorage();

  if (clearLastUpdatedTime) {
    exchangeRates[LAST_UPDATED] = 0;
    lastTimeUpdateExchangeRateWasCalled = 0;
    await DefaultPreference.set(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(exchangeRates));
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

  if (!format) return formattedAmount;

  try {
    return getCurrencyFormatter().format(Number(formattedAmount));
  } catch (error) {
    console.error('Failed to format currency:', error);
    return formattedAmount;
  }
}

function BTCToLocalCurrency(bitcoin: BigNumber.Value): string {
  const sat = new BigNumber(bitcoin).multipliedBy(100000000).toNumber();
  return satoshiToLocalCurrency(sat);
}

async function mostRecentFetchedRate(): Promise<CurrencyRate> {
  try {
    const currencyInformationString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    let currencyInformation;
    if (currencyInformationString) {
      try {
        currencyInformation = JSON.parse(currencyInformationString);
      } catch (parseError) {
        console.error('Failed to parse exchange rates:', parseError);
        await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
        currencyInformation = {};
        await updateExchangeRate();
      }
    } else {
      currencyInformation = {};
    }

    const rate = currencyInformation[BTC_PREFIX + preferredFiatCurrency.endPointKey];
    return {
      LastUpdated: currencyInformation[LAST_UPDATED] ? new Date(currencyInformation[LAST_UPDATED]) : null,
      Rate: rate ? getCurrencyFormatter().format(rate) : '...',
    };
  } catch (error) {
    console.error('Failed to fetch most recent rate:', error);
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

function formatBTC(btc: BigNumber.Value): string {
  try {
    return getBTCFormatter().format(Number(btc));
  } catch (error) {
    console.error('Failed to format BTC:', error);
    return new BigNumber(btc).toFixed(8);
  }
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
  formatBTC,
  migrateAsyncStorageToDefaultPreference, // Exported for initial migration
};
