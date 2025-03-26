import BigNumber from 'bignumber.js';
import DefaultPreference from 'react-native-default-preference';
import * as RNLocalize from 'react-native-localize';

import { FiatUnit, FiatUnitType, getFiatRate } from '../models/fiatUnit';
import { BitcoinUnit } from '../models/bitcoinUnits';

const PREFERRED_CURRENCY_STORAGE_KEY = 'preferredCurrency';
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

function getCurrencySymbol(): string {
  // Always use the preferred currency's symbol directly
  return preferredFiatCurrency?.symbol || '$'; // Fallback to $ if symbol is undefined
}

function getCurrencyFormatter(): Intl.NumberFormat {
  if (!currencyFormatter) {
    // Always use fresh device locale and number format settings
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

    console.log(`Creating currency formatter with locale: ${deviceLocale}, decimal: ${decimalSeparator}, group: ${groupingSeparator}`);

    // Create a custom formatter function that will use the exact separators from RNLocalize
    currencyFormatter = {
      format: (value: number): string => {
        try {
          // Format the number to fixed 2 decimal places first (standard for currency)
          const valueAsString = value.toFixed(2);
          const parts = valueAsString.split('.');

          // Format integer part with proper grouping
          const integerPart = parts[0];
          let formattedInteger = '';
          for (let i = 0; i < integerPart.length; i++) {
            if (i > 0 && (integerPart.length - i) % 3 === 0) {
              formattedInteger += groupingSeparator;
            }
            formattedInteger += integerPart[i];
          }

          // Add decimal part with the correct separator
          const decimalPart = parts.length > 1 ? parts[1] : '00';
          const formattedValue = `${formattedInteger}${decimalSeparator}${decimalPart}`;

          // Add currency symbol based on position convention
          // For most currencies, symbol goes before the number
          return `${preferredFiatCurrency.symbol}${formattedValue}`;
        } catch (error) {
          console.error('Error in custom currency formatter:', error);
          // Fallback to simple formatting
          return `${preferredFiatCurrency.symbol}${value.toFixed(2)}`;
        }
      },
    } as Intl.NumberFormat;

    // Log a test format to verify
    const testValue = 1234.56;
    console.debug('Currency formatter created:', {
      deviceLocale,
      decimalSeparator,
      groupingSeparator,
      currency: preferredFiatCurrency.endPointKey,
      symbol: getCurrencySymbol(),
      test: currencyFormatter.format(testValue),
    });
  }
  return currencyFormatter;
}

// For input fields, use this function to get formatting without currency symbol
export function getNumberFormatter(): Intl.NumberFormat {
  // Always use fresh device locale settings
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

  // Create a custom formatter function that will use the exact separators from RNLocalize
  const formatter = {
    format: (value: number): string => {
      try {
        // Format the number to fixed 2 decimal places
        const valueAsString = value.toFixed(2);
        const parts = valueAsString.split('.');

        // Format integer part with proper grouping
        const integerPart = parts[0];
        let formattedInteger = '';
        for (let i = 0; i < integerPart.length; i++) {
          if (i > 0 && (integerPart.length - i) % 3 === 0) {
            formattedInteger += groupingSeparator;
          }
          formattedInteger += integerPart[i];
        }

        // Add decimal part with the correct separator
        const decimalPart = parts.length > 1 ? parts[1] : '00';
        const formattedValue = `${formattedInteger}${decimalSeparator}${decimalPart}`;

        return formattedValue;
      } catch (error) {
        console.error('Error in custom number formatter:', error);
        // Fallback to simple formatting
        return value.toFixed(2).replace('.', decimalSeparator);
      }
    },
  } as Intl.NumberFormat;

  return formatter;
}

async function setPreferredCurrency(item: FiatUnitType): Promise<void> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  try {
    await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, item.endPointKey);
    // Don't store the locale from the FiatUnit anymore
    preferredFiatCurrency = FiatUnit[item.endPointKey];
    currencyFormatter = null; // Remove cached formatter
    console.debug('Preferred currency set to:', item.endPointKey);
  } catch (error) {
    console.error('Failed to set preferred currency:', error);
    throw error;
  }
  currencyFormatter = null;
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
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      await DefaultPreference.set(EXCHANGE_RATES_STORAGE_KEY, exchangeRatesString);
    } catch (error) {
      await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
      exchangeRates = { LAST_UPDATED_ERROR: false };
    }
  } catch (error) {
    try {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      const ratesValue = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
      let ratesString: string | null = null;

      if (typeof ratesValue === 'string') {
        ratesString = ratesValue;
      }

      let rate;
      if (ratesString) {
        try {
          rate = JSON.parse(ratesString);
        } catch (parseError) {
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
      exchangeRates = { LAST_UPDATED_ERROR: true };
      throw storageError;
    }
  }
}

async function getPreferredCurrency(): Promise<FiatUnitType> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const preferredCurrencyValue = await DefaultPreference.get(PREFERRED_CURRENCY_STORAGE_KEY);
  let preferredCurrency: string | null = null;

  if (typeof preferredCurrencyValue === 'string') {
    preferredCurrency = preferredCurrencyValue;
  }

  if (preferredCurrency) {
    try {
      if (!FiatUnit[preferredCurrency]) {
        throw new Error('Invalid Fiat Unit');
      }
      preferredFiatCurrency = FiatUnit[preferredCurrency];
    } catch (error) {
      await DefaultPreference.clear(PREFERRED_CURRENCY_STORAGE_KEY);
    }
  }

  if (!preferredFiatCurrency) {
    const deviceCurrencies = RNLocalize.getCurrencies();
    if (deviceCurrencies[0] && FiatUnit[deviceCurrencies[0]]) {
      preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
    } else {
      preferredFiatCurrency = FiatUnit.USD;
    }
  }

  // Don't set PREFERRED_CURRENCY_LOCALE_STORAGE_KEY anymore
  return preferredFiatCurrency;
}

async function _restoreSavedExchangeRatesFromStorage(): Promise<void> {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const ratesValue = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    let ratesString: string | null = null;

    if (typeof ratesValue === 'string') {
      ratesString = ratesValue;
    }

    if (ratesString) {
      try {
        const parsedRates = JSON.parse(ratesString);
        // Atomic update to prevent race conditions
        exchangeRates = parsedRates;
      } catch (error) {
        await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
        exchangeRates = { LAST_UPDATED_ERROR: false };
        // Add delay before update to prevent rapid consecutive calls
        await new Promise(resolve => setTimeout(resolve, 1000));
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
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const storedCurrencyValue = await DefaultPreference.get(PREFERRED_CURRENCY_STORAGE_KEY);
    let storedCurrency: string | null = null;

    if (typeof storedCurrencyValue === 'string') {
      storedCurrency = storedCurrencyValue;
    }

    if (!storedCurrency) throw new Error('No Preferred Fiat selected');

    try {
      if (!FiatUnit[storedCurrency]) {
        throw new Error('Invalid Fiat Unit');
      }
      preferredFiatCurrency = FiatUnit[storedCurrency];
    } catch (error) {
      await DefaultPreference.clear(PREFERRED_CURRENCY_STORAGE_KEY);

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
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const rateValue = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    let rateString: string | null = null;

    if (typeof rateValue === 'string') {
      rateString = rateValue;
    }

    let rate;
    if (rateString) {
      try {
        rate = JSON.parse(rateString);
      } catch (parseError) {
        await DefaultPreference.clear(EXCHANGE_RATES_STORAGE_KEY);
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

  try {
    // Always get fresh locale settings
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

    // Use BigNumber for all calculations to maintain precision
    const btcAmount = new BigNumber(satoshi).dividedBy(100000000);
    const convertedAmount = btcAmount.multipliedBy(exchangeRate);
    let formattedAmount: string;

    if (convertedAmount.isGreaterThanOrEqualTo(0.005) || convertedAmount.isLessThanOrEqualTo(-0.005)) {
      formattedAmount = convertedAmount.toFixed(2);
    } else {
      formattedAmount = convertedAmount.toPrecision(2);
    }

    // Safety check for invalid outputs
    if (formattedAmount === 'NaN' || isNaN(parseFloat(formattedAmount))) {
      console.warn('Invalid converted amount:', { satoshi, exchangeRate, formattedAmount });
      formattedAmount = '0';
    }

    if (format === false) return formattedAmount;

    try {
      // Safety check in case currency formatter can't be created
      if (!preferredFiatCurrency) {
        return '...';
      }

      // Format with our custom formatter that enforces the correct separators
      const formatted = getCurrencyFormatter().format(Number(formattedAmount));

      return formatted;
    } catch (error) {
      console.error('Error formatting currency:', error);

      // Manual formatting as fallback
      const numValue = parseFloat(formattedAmount);
      const parts = numValue.toFixed(2).split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '00';

      // Format integer part with grouping separators
      let formattedInteger = '';
      for (let i = 0; i < integerPart.length; i++) {
        if (i > 0 && (integerPart.length - i) % 3 === 0) {
          formattedInteger += groupingSeparator;
        }
        formattedInteger += integerPart[i];
      }

      return `${preferredFiatCurrency.symbol} ${formattedInteger}${decimalSeparator}${decimalPart}`;
    }
  } catch (error) {
    console.error('Error in satoshiToLocalCurrency:', error);
    return format ? getCurrencySymbol() + ' 0' : '0';
  }
}

function BTCToLocalCurrency(bitcoin: BigNumber.Value): string {
  const sat = new BigNumber(bitcoin).multipliedBy(100000000).toNumber();
  return satoshiToLocalCurrency(sat);
}

async function mostRecentFetchedRate(): Promise<CurrencyRate> {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const currencyInfoValue = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    let currencyInformationString: string | null = null;

    if (typeof currencyInfoValue === 'string') {
      currencyInformationString = currencyInfoValue;
    }

    let currencyInformation;
    if (currencyInformationString) {
      try {
        currencyInformation = JSON.parse(currencyInformationString);
      } catch (parseError) {
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

  try {
    // Cap extremely large values to prevent overflow or precision issues
    const maxSafeValue = 1000000000; // 1 billion
    const safeValue = Math.min(Math.abs(fiatFloat), maxSafeValue) * (fiatFloat < 0 ? -1 : 1);

    const btcAmount = new BigNumber(safeValue).dividedBy(exchangeRate);
    return btcAmount.toFixed(8);
  } catch (error) {
    console.error('Error in fiatToBTC conversion:', error);
    return '0';
  }
}

/**
 * Simple direct function to format BTC values consistently
 * Uses device locale for decimal separator
 */
function formatBTCInternal(btc: BigNumber.Value): string {
  try {
    // Get device's decimal separator
    const { decimalSeparator } = RNLocalize.getNumberFormatSettings();

    // Format with 8 decimal places
    const formatted = new BigNumber(btc).toFixed(8);

    // Remove trailing zeros, being careful to keep at least one decimal place if it had decimal part
    const cleanFormatted = formatted.replace(/\.?0+$/, '');

    // For display purposes, replace the dot with device's decimal separator if different
    if (decimalSeparator !== '.') {
      return cleanFormatted === '' ? '0' : cleanFormatted.replace('.', decimalSeparator);
    }

    return cleanFormatted === '' ? '0' : cleanFormatted;
  } catch (error) {
    console.error('Error formatting BTC:', error);
    return '0';
  }
}

/**
 * Simple direct function to format SATS values consistently
 * Uses device locale for grouping separators
 */
function formatSatsInternal(sats: number): string {
  try {
    // Get device locale for proper grouping
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    // Use device locale settings for formatting
    return new Intl.NumberFormat(deviceLocale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    }).format(Math.round(sats));
  } catch (error) {
    console.error('Error formatting SATS with locale:', error);
    // Fallback to simple grouping with commas
    return Math.round(sats)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// Remove the listener-based approach which is causing errors
export function getLocaleNumberSettings() {
  try {
    // Always fetch fresh device locale settings
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    // Create decimal formatter explicitly for numbers using the device locale
    const formatter = new Intl.NumberFormat(deviceLocale, {
      style: 'decimal',
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 10,
      numberingSystem: 'latn',
    });

    // Test format to verify locale settings
    const testNum = 1234.56789;
    const formattedTest = formatter.format(testNum);
    console.log(`LOCALE TEST: ${testNum} → ${formattedTest} (${deviceLocale})`);
    console.log(`SEPARATOR INFO: decimal="${decimalSeparator}" group="${groupingSeparator}"`);

    return {
      deviceLocale,
      decimalSeparator,
      groupSeparator: groupingSeparator,
      formatter,
    };
  } catch (error) {
    console.error('Error detecting locale settings:', error);
    return {
      deviceLocale: 'en-US',
      decimalSeparator: '.',
      groupSeparator: ',',
      formatter: new Intl.NumberFormat('en-US'),
    };
  }
}

// Add a custom interface extending the standard NumberFormatOptions
interface ExtendedNumberFormatOptions extends Intl.NumberFormatOptions {
  isBitcoin?: boolean;
  isBtcUnit?: boolean;
  isSatsUnit?: boolean;
}

// Mutable locale settings object that will be updated
export const localeSettings = getLocaleNumberSettings();

/**
 * Update the locale settings with fresh values from RNLocalize
 * This should be called when the app starts and when it returns to the foreground
 */
export function updateLocaleSettings(): void {
  try {
    // Get fresh settings directly from the device
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    // Update the shared localeSettings object
    localeSettings.deviceLocale = deviceLocale;
    localeSettings.decimalSeparator = decimalSeparator;
    localeSettings.groupSeparator = groupingSeparator;

    // Create a fresh formatter
    localeSettings.formatter = new Intl.NumberFormat(deviceLocale, {
      style: 'decimal',
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 10,
    });

    // Reset currency formatter to force recreation with new locale
    currencyFormatter = null;

    console.log('Updated locale settings from device:', {
      deviceLocale,
      decimalSeparator,
      groupingSeparator,
    });

    // Test format to ensure locale settings are working
    const testValue = 1234.56;
    const formatted = localeSettings.formatter.format(testValue);
    console.log(`TEST FORMAT: ${testValue} → "${formatted}"`);
  } catch (error) {
    console.error('Failed to update locale settings:', error);
  }
}

/**
 * Get fresh locale settings directly from the device
 * For internal use by other functions in this module
 * @private
 */
export function getCurrentLocaleSettings() {
  try {
    // Always fetch directly from RNLocalize
    return {
      deviceLocale: RNLocalize.getLocales()[0].languageTag,
      decimalSeparator: RNLocalize.getNumberFormatSettings().decimalSeparator,
      groupSeparator: RNLocalize.getNumberFormatSettings().groupingSeparator,
    };
  } catch (error) {
    console.error('Error getting current locale settings:', error);
    return {
      deviceLocale: 'en-US',
      decimalSeparator: '.',
      groupSeparator: ',',
    };
  }
}

/**
 * Creates a fresh Intl.NumberFormat instance using current device locale
 */
export function getFreshNumberFormatter(options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  // Always use device locale directly from RNLocalize
  const deviceLocale = RNLocalize.getLocales()[0].languageTag;

  return new Intl.NumberFormat(deviceLocale, {
    style: 'decimal',
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: 'latn',
    ...options,
  });
}

/**
 * Parses a number string according to locale-specific rules
 */
export function parseNumberStringToFloat(numStr: string): number {
  if (!numStr) return 0;

  // Always get fresh locale settings directly from the device
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
  const deviceLocale = RNLocalize.getLocales()[0].languageTag;

  console.log(
    `parseNumberStringToFloat INPUT: "${numStr}" | LOCALE: ${deviceLocale} | DECIMAL: ${decimalSeparator} | GROUP: ${groupingSeparator}`,
  );

  try {
    // First, handle special case of empty string
    if (numStr.trim() === '') return 0;

    // Special case: if the input is already a valid number with a dot decimal separator,
    // and doesn't contain any group separators, just parse it directly
    if (/^-?\d+(\.\d+)?$/.test(numStr)) {
      const result = parseFloat(numStr);
      console.log(`Direct parse result: "${numStr}" → ${result}`);
      return result;
    }

    // Normalize the input based on the device's actual locale settings
    let cleanedInput = numStr;

    // For safe regex, escape any special regex characters in separators
    const safeGroupingSeparator = groupingSeparator ? groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const safeDecimalSeparator = decimalSeparator ? decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // Step 1: Remove group separators if present
    if (groupingSeparator) {
      const groupSepRegex = new RegExp(safeGroupingSeparator, 'g');
      cleanedInput = cleanedInput.replace(groupSepRegex, '');
    }

    // Step 2: Replace decimal separator with period for JavaScript parsing
    if (decimalSeparator && decimalSeparator !== '.') {
      const decimalSepRegex = new RegExp(safeDecimalSeparator, 'g');
      cleanedInput = cleanedInput.replace(decimalSepRegex, '.');
    }

    // Step 3: Clean any remaining non-numeric characters except the decimal point and negative sign
    cleanedInput = cleanedInput.replace(/[^\d.-]/g, '');

    // Final parsing
    const result = parseFloat(cleanedInput);
    console.log(`PARSE RESULT: "${numStr}" → ${result} | CLEANED: "${cleanedInput}"`);
    return isNaN(result) ? 0 : result;
  } catch (e) {
    console.error('Error in parseNumberStringToFloat:', e);
    return 0;
  }
}

/**
 * Determines the appropriate number of decimal places to use for a given currency unit
 * @param unit The currency unit (BTC, SATS, LOCAL_CURRENCY)
 * @returns The number of decimal places to use
 */
export function getDecimalPlaces(unit: string): number {
  if (unit === BitcoinUnit.BTC) {
    return 8; // BTC allows 8 decimal places
  } else if (unit === BitcoinUnit.SATS) {
    return 0; // SATS are whole numbers
  } else if (unit === BitcoinUnit.LOCAL_CURRENCY) {
    // Check if preferredFiatCurrency is defined before accessing it
    if (!preferredFiatCurrency || !preferredFiatCurrency.endPointKey) {
      console.warn('preferredFiatCurrency not available, using default decimal places (2)');
      return 2; // Default to 2 if currency isn't available yet
    }

    // Get the current preferred currency's code
    const currencyCode = preferredFiatCurrency.endPointKey;

    // Currencies with 0 decimal places
    const noDecimalCurrencies = [
      FiatUnit.JPY?.endPointKey,
      FiatUnit.KRW?.endPointKey,
      FiatUnit.VND?.endPointKey,
      FiatUnit.HUF?.endPointKey,
      FiatUnit.ISK?.endPointKey,
      FiatUnit.TWD?.endPointKey,
      FiatUnit.CLP?.endPointKey,
    ].filter(Boolean); // Filter out any undefined values

    // Currencies with 3 decimal places
    const threeDecimalCurrencies = [
      FiatUnit.BHD?.endPointKey,
      FiatUnit.IQD?.endPointKey,
      FiatUnit.JOD?.endPointKey,
      FiatUnit.KWD?.endPointKey,
      FiatUnit.LYD?.endPointKey,
      FiatUnit.OMR?.endPointKey,
      FiatUnit.TND?.endPointKey,
    ].filter(Boolean); // Filter out any undefined values

    if (noDecimalCurrencies.includes(currencyCode)) {
      return 0; // No decimal places
    } else if (threeDecimalCurrencies.includes(currencyCode)) {
      return 3; // Three decimal places
    } else {
      return 2; // Most fiat currencies use 2 decimal places
    }
  }

  return 2; // Default fallback
}

/**
 * Formats a number according to the device's locale settings
 * with specific rules for Bitcoin, Sats, and local currency
 */
export function formatNumberLocale(amount: number | string, options: ExtendedNumberFormatOptions = {}): string {
  // Handle string or number input
  let num: number;

  console.log(`formatNumberLocale INPUT: "${amount}"`);

  if (typeof amount === 'string') {
    // If it's already a string, try to parse it using more flexible rules
    try {
      // Accept both dot and comma as decimal separators
      const cleaned = amount.replace(/[^\d.,\s-]/g, '');

      // Detect which separator might be the decimal separator
      let userDecimalSeparator = localeSettings.decimalSeparator;

      if (cleaned.includes('.') && cleaned.includes(',')) {
        const lastDotIndex = cleaned.lastIndexOf('.');
        const lastCommaIndex = cleaned.lastIndexOf(',');

        // The one that appears last is likely the decimal separator
        userDecimalSeparator = lastDotIndex > lastCommaIndex ? '.' : ',';
      } else if (cleaned.includes('.')) {
        userDecimalSeparator = '.';
      } else if (cleaned.includes(',')) {
        userDecimalSeparator = ',';
      }

      // Split based on the determined decimal separator
      const parts = cleaned.split(userDecimalSeparator);
      const integerPart = parts[0].replace(/[^\d-]/g, ''); // Remove any non-digit chars
      const decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, '') : '';

      // Reconstruct with dot as decimal separator for JS parsing
      const normalized = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;

      num = parseFloat(normalized);

      console.log(`PARSED: "${amount}" → ${num} | CLEANED: "${cleaned}"`);
    } catch (e) {
      console.error('Error parsing number:', e);
      num = 0;
    }
  } else {
    num = amount;
  }

  if (isNaN(num)) return '0';

  try {
    const formattingOptions: ExtendedNumberFormatOptions = {
      style: 'decimal',
      numberingSystem: 'latn',
      useGrouping: options.style === 'currency',
      minimumFractionDigits: 0, // Changed to 0 to allow whole numbers
      maximumFractionDigits: getDecimalPlaces(options.unit || BitcoinUnit.LOCAL_CURRENCY), // Use currency-specific rules
      ...options,
    };

    // For BTC, ensure we ONLY use dots as decimal separator, NEVER commas
    if (options.isBitcoin && options.isBtcUnit) {
      return formatBTCInternal(num);
    }

    // For SATS, ensure we ONLY use commas as separators, NEVER dots or decimals
    if (options.isBitcoin && options.isSatsUnit) {
      return formatSatsInternal(Math.round(num));
    }

    // For local currency, use proper decimal places based on currency
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;
    const decimals = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
    const result = new Intl.NumberFormat(deviceLocale, {
      ...formattingOptions,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);

    return result;
  } catch (error) {
    console.error('Error formatting with locale:', error);
    return num.toString();
  }
}

/**
 * Formats a number according to the device's locale settings
 * @param number The number to format
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
function formatNumberWithLocale(number: number, decimals: number = 2): string {
  try {
    // Handle NaN and Infinity
    if (!isFinite(number)) {
      console.warn(`Attempt to format non-finite number: ${number}`);
      return '0';
    }

    // Always get fresh locale settings directly from RNLocalize
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    // Safety check: ensure decimals is a positive number
    decimals = Math.max(0, Math.min(20, decimals || 0));

    // Format with appropriate decimal places
    let formatted;

    try {
      // Try using Intl.NumberFormat first (more accurate for locales)
      formatted = new Intl.NumberFormat(deviceLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
        useGrouping: true,
      }).format(number);
    } catch (intlError) {
      console.warn('Intl.NumberFormat error, using manual formatting:', intlError);

      // Manual formatting as fallback - with extra safety
      try {
        // First get the fixed string representation
        const fixedString = number.toFixed(decimals);

        // Split into integer and decimal parts
        const parts = fixedString.split('.');
        const integerPart = parts[0] || '0';
        const decimalPart = parts.length > 1 ? parts[1] : '';

        // Format integer part with grouping separators
        let formattedInteger = '';
        for (let i = 0; i < integerPart.length; i++) {
          if (i > 0 && (integerPart.length - i) % 3 === 0) {
            formattedInteger += groupingSeparator || ','; // Fallback to comma if null
          }
          formattedInteger += integerPart[i];
        }

        // Combine with decimal part if available
        if (decimalPart) {
          formatted = `${formattedInteger}${decimalSeparator || '.'}${decimalPart}`;
        } else {
          formatted = formattedInteger;
        }
      } catch (manualError) {
        console.error('Manual formatting failed:', manualError);
        // Ultimate fallback
        formatted = String(number);
      }
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting number for device locale:', error);
    // Simple fallback if all formatting fails
    return String(number);
  }
}

/**
 * Detects and parses pasted number formats correctly according to different locale standards
 * @param text The text that was pasted
 * @returns An object containing parsed number and formatting information
 */
function parsePastedNumber(text: string): {
  numericValue: number;
  integerPart: string;
  decimalPart: string;
  hasDecimal: boolean;
} {
  if (!text || text.trim() === '') {
    return { numericValue: 0, integerPart: '0', decimalPart: '', hasDecimal: false };
  }

  // Get device's separator settings
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
  console.log(`Parsing pasted number: "${text}" with device separators - decimal: ${decimalSeparator}, group: ${groupingSeparator}`);

  // Analyze separators in the text
  const hasPeriod = text.includes('.');
  const hasComma = text.includes(',');

  // Extract integer and decimal parts based on the format detection
  let integerPart = '';
  let decimalPart = '';

  // STEP 1: EXTRACT INTEGER AND DECIMAL PARTS
  if (hasPeriod && hasComma) {
    // Format has both separators - need to determine which is which
    const lastPeriod = text.lastIndexOf('.');
    const lastComma = text.lastIndexOf(',');

    if (lastPeriod > lastComma) {
      // US format: 1,234.56 (period is decimal)
      const parts = text.split('.');
      integerPart = parts[0].replace(/,/g, ''); // Remove thousands separators
      decimalPart = parts[1] || '';
      console.log(`Detected US format (1,234.56): integer=${integerPart}, decimal=${decimalPart}`);
    } else {
      // EU format: 1.234,56 (comma is decimal)
      const parts = text.split(',');
      integerPart = parts[0].replace(/\./g, ''); // Remove thousands separators
      decimalPart = parts[1] || '';
      console.log(`Detected EU format (1.234,56): integer=${integerPart}, decimal=${decimalPart}`);
    }
  } else if (hasPeriod) {
    // Only has periods - assume it's a decimal separator
    const parts = text.split('.');
    if (parts.length === 2) {
      // Single period - treat as decimal: 1234.56
      integerPart = parts[0];
      decimalPart = parts[1];
      console.log(`Detected decimal period format (1234.56): integer=${integerPart}, decimal=${decimalPart}`);
    } else {
      // Multiple periods - strip them all as grouping: 1.234.567
      integerPart = text.replace(/\./g, '');
      console.log(`Detected multiple periods - treating as grouping: integer=${integerPart}`);
    }
  } else if (hasComma) {
    // Only has commas
    const parts = text.split(',');
    if (parts.length === 2) {
      // Single comma - treat as decimal: 1234,56
      integerPart = parts[0];
      decimalPart = parts[1];
      console.log(`Detected decimal comma format (1234,56): integer=${integerPart}, decimal=${decimalPart}`);
    } else {
      // Multiple commas - strip them all as grouping: 1,234,567
      integerPart = text.replace(/,/g, '');
      console.log(`Detected multiple commas - treating as grouping: integer=${integerPart}`);
    }
  } else {
    // No separators - just digits
    integerPart = text;
    console.log(`No separators detected: integer=${integerPart}`);
  }

  // Clean up any leftover non-digits
  integerPart = integerPart.replace(/\D/g, '');
  decimalPart = decimalPart.replace(/\D/g, '');

  // Convert to standard numeric format for JavaScript
  const standardNumericString = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  const numericValue = parseFloat(standardNumericString);

  return {
    numericValue: isNaN(numericValue) ? 0 : numericValue,
    integerPart: integerPart || '0',
    decimalPart,
    hasDecimal: decimalPart.length > 0,
  };
}

/**
 * Formats a number according to device locale and unit settings
 * @param numericValue The number to format
 * @param unit The Bitcoin unit (BTC, SATS, LOCAL_CURRENCY)
 * @param maxDecimals Override for the maximum decimal places
 */
function formatNumberByUnit(numericValue: number, unit: string, maxDecimals?: number): string {
  if (isNaN(numericValue)) return '0';

  // Get device's separator settings
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

  // Determine decimals to use based on unit or override
  const decimals = typeof maxDecimals === 'number' ? maxDecimals : getDecimalPlaces(unit);

  // Format integer part with grouping separators
  const absValue = Math.abs(Math.round(unit === BitcoinUnit.SATS ? numericValue : numericValue));
  const intString = absValue.toString();
  let formattedInteger = '';

  for (let i = 0; i < intString.length; i++) {
    // Add grouping separator every 3 digits from right
    if (i > 0 && (intString.length - i) % 3 === 0) {
      formattedInteger += groupingSeparator;
    }
    formattedInteger += intString[i];
  }

  // Add negative sign if needed
  if (numericValue < 0) {
    formattedInteger = '-' + formattedInteger;
  }

  // For sats, return just the integer part
  if (unit === BitcoinUnit.SATS || decimals === 0) {
    return formattedInteger;
  }

  // For other units with decimals
  const valueStr = numericValue.toFixed(decimals);
  const decimalPart = valueStr.split('.')[1] || '';

  if (decimalPart) {
    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  } else {
    return formattedInteger;
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
  formatBTCInternal as formatBTC,
  formatSatsInternal as formatSats,
  preferredFiatCurrency,
  formatNumberWithLocale,
  parsePastedNumber,
  formatNumberByUnit,
};
