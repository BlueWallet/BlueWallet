import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import * as RNLocalize from 'react-native-localize';
import BigNumber from 'bignumber.js';
import { FiatUnit, getFiatRate } from '../models/fiatUnit';
import WidgetCommunication from './WidgetCommunication';

const PREFERRED_CURRENCY = 'preferredCurrency';
const EXCHANGE_RATES = 'currency';

let preferredFiatCurrency = FiatUnit.USD;
const exchangeRates = {};

const STRUCT = {
  LAST_UPDATED: 'LAST_UPDATED',
};

/**
 * Saves to storage preferred currency, whole object
 * from `./models/fiatUnit`
 *
 * @param item {Object} one of the values in `./models/fiatUnit`
 * @returns {Promise<void>}
 */
async function setPrefferedCurrency(item) {
  await AsyncStorage.setItem(PREFERRED_CURRENCY, JSON.stringify(item));
  await DefaultPreference.setName('group.io.bluewallet.bluewallet');
  await DefaultPreference.set('preferredCurrency', item.endPointKey);
  await DefaultPreference.set('preferredCurrencyLocale', item.locale.replace('-', '_'));
  WidgetCommunication.reloadAllTimeLines();
}

async function getPreferredCurrency() {
  const preferredCurrency = await JSON.parse(await AsyncStorage.getItem(PREFERRED_CURRENCY));
  await DefaultPreference.setName('group.io.bluewallet.bluewallet');
  await DefaultPreference.set('preferredCurrency', preferredCurrency.endPointKey);
  await DefaultPreference.set('preferredCurrencyLocale', preferredCurrency.locale.replace('-', '_'));
  return preferredCurrency;
}

async function updateExchangeRate() {
  if (+new Date() - exchangeRates[STRUCT.LAST_UPDATED] <= 30 * 60 * 1000) {
    // not updating too often
    return;
  }

  try {
    preferredFiatCurrency = JSON.parse(await AsyncStorage.getItem(PREFERRED_CURRENCY));
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

  let rate;
  try {
    rate = await getFiatRate(preferredFiatCurrency.endPointKey);
  } catch (Err) {
    const lastSavedExchangeRate = JSON.parse(await AsyncStorage.getItem(EXCHANGE_RATES));
    exchangeRates['BTC_' + preferredFiatCurrency.endPointKey] = lastSavedExchangeRate['BTC_' + preferredFiatCurrency.endPointKey] * 1;
    return;
  }

  exchangeRates[STRUCT.LAST_UPDATED] = +new Date();
  exchangeRates['BTC_' + preferredFiatCurrency.endPointKey] = rate;
  await AsyncStorage.setItem(EXCHANGE_RATES, JSON.stringify(exchangeRates));
  await AsyncStorage.setItem(PREFERRED_CURRENCY, JSON.stringify(preferredFiatCurrency));
  await setPrefferedCurrency(preferredFiatCurrency);
}

let interval = false;
async function startUpdater() {
  if (interval) {
    clearInterval(interval);
    exchangeRates[STRUCT.LAST_UPDATED] = 0;
  }

  interval = setInterval(() => updateExchangeRate(), 2 * 60 * 100);
  return updateExchangeRate();
}

function satoshiToLocalCurrency(satoshi) {
  if (!exchangeRates['BTC_' + preferredFiatCurrency.endPointKey]) {
    startUpdater();
    return '...';
  }

  let b = new BigNumber(satoshi).dividedBy(100000000).multipliedBy(exchangeRates['BTC_' + preferredFiatCurrency.endPointKey]);

  if (b.isGreaterThanOrEqualTo(0.005) || b.isLessThanOrEqualTo(-0.005)) {
    b = b.toFixed(2);
  } else {
    b = b.toPrecision(2);
  }

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

module.exports.updateExchangeRate = updateExchangeRate;
module.exports.startUpdater = startUpdater;
module.exports.STRUCT = STRUCT;
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
module.exports.PREFERRED_CURRENCY = PREFERRED_CURRENCY;
module.exports.EXCHANGE_RATES = EXCHANGE_RATES;
