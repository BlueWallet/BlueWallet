import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import * as RNLocalize from 'react-native-localize';
import BigNumber from 'bignumber.js';
import { FiatUnit, getFiatRate } from '../models/fiatUnit';
import WidgetCommunication from './WidgetCommunication';

const PREFERRED_CURRENCY_STORAGE_KEY = 'preferredCurrency';
const EXCHANGE_RATES_STORAGE_KEY = 'currency';

let preferredFiatCurrency = FiatUnit.USD;
let exchangeRates = { LAST_UPDATED_ERROR: false };
let lastTimeUpdateExchangeRateWasCalled = 0;
let skipUpdateExchangeRate = false;

const LAST_UPDATED = 'LAST_UPDATED';

/**
 * Saves to storage preferred currency, whole object
 * from `./models/fiatUnit`
 *
 * @param item {Object} one of the values in `./models/fiatUnit`
 * @returns {Promise<void>}
 */
async function setPrefferedCurrency(item) {
  await AsyncStorage.setItem(PREFERRED_CURRENCY_STORAGE_KEY, JSON.stringify(item));
  await DefaultPreference.setName('group.io.bluewallet.bluewallet');
  await DefaultPreference.set('preferredCurrency', item.endPointKey);
  await DefaultPreference.set('preferredCurrencyLocale', item.locale.replace('-', '_'));
  WidgetCommunication.reloadAllTimelines();
}

async function getPreferredCurrency() {
  const preferredCurrency = await JSON.parse(await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY));
  await DefaultPreference.setName('group.io.bluewallet.bluewallet');
  await DefaultPreference.set('preferredCurrency', preferredCurrency.endPointKey);
  await DefaultPreference.set('preferredCurrencyLocale', preferredCurrency.locale.replace('-', '_'));
  return preferredCurrency;
}

async function _restoreSavedExchangeRatesFromStorage() {
  try {
    exchangeRates = JSON.parse(await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY));
    if (!exchangeRates) exchangeRates = { LAST_UPDATED_ERROR: false };
  } catch (_) {
    exchangeRates = { LAST_UPDATED_ERROR: false };
  }
}

async function _restoreSavedPreferredFiatCurrencyFromStorage() {
  try {
    preferredFiatCurrency = JSON.parse(await AsyncStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY));
    if (preferredFiatCurrency === null) {
      throw Error('No Preferred Fiat selected');
    }
  } catch (_) {
    const deviceCurrencies = RNLocalize.getCurrencies();
    if (Object.keys(FiatUnit).some(unit => unit === deviceCurrencies[0])) {
      preferredFiatCurrency = FiatUnit[deviceCurrencies[0]];
    } else {
      preferredFiatCurrency = FiatUnit.USD;
    }
  }
}

/**
 * actual function to reach api and get fresh currency exchange rate. checks LAST_UPDATED time and skips entirely
 * if called too soon (30min); saves exchange rate (with LAST_UPDATED info) to storage.
 * should be called when app thinks its a good time to refresh exchange rate
 *
 * @return {Promise<void>}
 */
async function updateExchangeRate() {
  if (skipUpdateExchangeRate) return;
  if (+new Date() - lastTimeUpdateExchangeRateWasCalled <= 10 * 1000) {
    // simple debounce so theres no race conditions
    return;
  }
  lastTimeUpdateExchangeRateWasCalled = +new Date();

  if (+new Date() - exchangeRates[LAST_UPDATED] <= 30 * 60 * 1000) {
    // not updating too often
    return;
  }
  console.log('updating exchange rate...');

  let rate;
  try {
    rate = await getFiatRate(preferredFiatCurrency.endPointKey);
    exchangeRates[LAST_UPDATED] = +new Date();
    exchangeRates['BTC_' + preferredFiatCurrency.endPointKey] = rate;
    exchangeRates.LAST_UPDATED_ERROR = false;
    await AsyncStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(exchangeRates));
  } catch (Err) {
    console.log('Error encountered when attempting to update exchange rate...');
    console.warn(Err.message);
    const rate = JSON.parse(await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY));
    rate.LAST_UPDATED_ERROR = true;
    exchangeRates.LAST_UPDATED_ERROR = true;
    await AsyncStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(rate));
    throw Err;
  }
}

async function isRateOutdated() {
  try {
    const rate = JSON.parse(await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY));
    return rate.LAST_UPDATED_ERROR || +new Date() - rate.LAST_UPDATED >= 31 * 60 * 1000;
  } catch {
    return true;
  }
}

/**
 * this function reads storage and restores current preferred fiat currency & last saved exchange rate, then calls
 * updateExchangeRate() to update rates.
 * should be called when the app starts and when user changes preferred fiat (with TRUE argument so underlying
 * `updateExchangeRate()` would actually update rates via api).
 *
 * @param clearLastUpdatedTime {boolean} set to TRUE for the underlying
 *
 * @return {Promise<void>}
 */
async function init(clearLastUpdatedTime = false) {
  await _restoreSavedExchangeRatesFromStorage();
  await _restoreSavedPreferredFiatCurrencyFromStorage();

  if (clearLastUpdatedTime) {
    exchangeRates[LAST_UPDATED] = 0;
    lastTimeUpdateExchangeRateWasCalled = 0;
  }

  return updateExchangeRate();
}

function satoshiToLocalCurrency(satoshi, format = true) {
  if (!exchangeRates['BTC_' + preferredFiatCurrency.endPointKey]) {
    updateExchangeRate();
    return '...';
  }

  let b = new BigNumber(satoshi).dividedBy(100000000).multipliedBy(exchangeRates['BTC_' + preferredFiatCurrency.endPointKey]);

  if (b.isGreaterThanOrEqualTo(0.005) || b.isLessThanOrEqualTo(-0.005)) {
    b = b.toFixed(2);
  } else {
    b = b.toPrecision(2);
  }

  if (format === false) return b;

  let formatter;
  try {
    formatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  } catch (error) {
    console.warn(error);
    console.log(error);
    formatter = new Intl.NumberFormat(FiatUnit.USD.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }

  return formatter.format(b);
}

function BTCToLocalCurrency(bitcoin) {
  let sat = new BigNumber(bitcoin);
  sat = sat.multipliedBy(100000000).toNumber();

  return satoshiToLocalCurrency(sat);
}

async function mostRecentFetchedRate() {
  const currencyInformation = JSON.parse(await AsyncStorage.getItem(EXCHANGE_RATES_STORAGE_KEY));

  const formatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
    style: 'currency',
    currency: preferredFiatCurrency.endPointKey,
  });
  return {
    LastUpdated: currencyInformation[LAST_UPDATED],
    Rate: formatter.format(currencyInformation[`BTC_${preferredFiatCurrency.endPointKey}`]),
  };
}

function satoshiToBTC(satoshi) {
  let b = new BigNumber(satoshi);
  b = b.dividedBy(100000000);
  return b.toString(10);
}

function btcToSatoshi(btc) {
  return new BigNumber(btc).multipliedBy(100000000).toNumber();
}

function fiatToBTC(fiatFloat) {
  let b = new BigNumber(fiatFloat);
  b = b.dividedBy(exchangeRates['BTC_' + preferredFiatCurrency.endPointKey]).toFixed(8);
  return b;
}

function getCurrencySymbol() {
  return preferredFiatCurrency.symbol;
}

/**
 * Used to mock data in tests
 *
 * @param {object} currency, one of FiatUnit.*
 */
function _setPreferredFiatCurrency(currency) {
  preferredFiatCurrency = currency;
}

/**
 * Used to mock data in tests
 *
 * @param {string} pair as expected by rest of this module, e.g 'BTC_JPY' or 'BTC_USD'
 * @param {number} rate exchange rate
 */
function _setExchangeRate(pair, rate) {
  exchangeRates[pair] = rate;
}

/**
 * Used in unit tests, so the `currency` module wont launch actual http request
 */
function _setSkipUpdateExchangeRate() {
  skipUpdateExchangeRate = true;
}

module.exports.updateExchangeRate = updateExchangeRate;
module.exports.init = init;
module.exports.satoshiToLocalCurrency = satoshiToLocalCurrency;
module.exports.fiatToBTC = fiatToBTC;
module.exports.satoshiToBTC = satoshiToBTC;
module.exports.BTCToLocalCurrency = BTCToLocalCurrency;
module.exports.setPrefferedCurrency = setPrefferedCurrency;
module.exports.getPreferredCurrency = getPreferredCurrency;
module.exports.btcToSatoshi = btcToSatoshi;
module.exports.getCurrencySymbol = getCurrencySymbol;
module.exports._setPreferredFiatCurrency = _setPreferredFiatCurrency; // export it to mock data in tests
module.exports._setExchangeRate = _setExchangeRate; // export it to mock data in tests
module.exports._setSkipUpdateExchangeRate = _setSkipUpdateExchangeRate; // export it to mock data in tests
module.exports.PREFERRED_CURRENCY = PREFERRED_CURRENCY_STORAGE_KEY;
module.exports.EXCHANGE_RATES = EXCHANGE_RATES_STORAGE_KEY;
module.exports.LAST_UPDATED = LAST_UPDATED;
module.exports.mostRecentFetchedRate = mostRecentFetchedRate;
module.exports.isRateOutdated = isRateOutdated;
