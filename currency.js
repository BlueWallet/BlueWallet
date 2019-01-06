import Frisbee from 'frisbee';
import { AsyncStorage } from 'react-native';
import { AppStorage } from './class';
import { FiatUnit } from './models/fiatUnit';
let BigNumber = require('bignumber.js');
let preferredFiatCurrency = FiatUnit.USD;
let exchangeRates = {};

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
  await AsyncStorage.setItem(AppStorage.PREFERRED_CURRENCY, JSON.stringify(item));
}

async function getPreferredCurrency() {
  return JSON.parse(await AsyncStorage.getItem(AppStorage.PREFERRED_CURRENCY));
}

async function updateExchangeRate() {
  if (+new Date() - exchangeRates[STRUCT.LAST_UPDATED] <= 30 * 60 * 1000) {
    // not updating too often
    return;
  }

  try {
    preferredFiatCurrency = JSON.parse(await AsyncStorage.getItem(AppStorage.PREFERRED_CURRENCY));
  } catch (_) {}
  preferredFiatCurrency = preferredFiatCurrency || FiatUnit.USD;

  let json;
  try {
    const api = new Frisbee({
      baseURI: 'https://api.coindesk.com',
    });
    let response = await api.get('/v1/bpi/currentprice/' + preferredFiatCurrency.endPointKey + '.json');
    json = JSON.parse(response.body);
    if (!json || !json.bpi || !json.bpi[preferredFiatCurrency.endPointKey] || !json.bpi[preferredFiatCurrency.endPointKey].rate_float) {
      throw new Error('Could not update currency rate: ' + response.err);
    }
  } catch (Err) {
    console.warn(Err);
    return;
  }

  exchangeRates[STRUCT.LAST_UPDATED] = +new Date();
  exchangeRates['BTC_' + preferredFiatCurrency.endPointKey] = json.bpi[preferredFiatCurrency.endPointKey].rate_float * 1;
  await AsyncStorage.setItem(AppStorage.EXCHANGE_RATES, JSON.stringify(exchangeRates));
  await AsyncStorage.setItem(AppStorage.PREFERRED_CURRENCY, JSON.stringify(preferredFiatCurrency));
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
  if (!exchangeRates['BTC_' + preferredFiatCurrency.endPointKey]) return satoshi;

  let b = new BigNumber(satoshi);
  b = b
    .dividedBy(100000000)
    .multipliedBy(exchangeRates['BTC_' + preferredFiatCurrency.endPointKey])
    .toString(10);
  b = parseFloat(b).toFixed(2);

  let formatter;

  try {
    formatter = new Intl.NumberFormat(preferredFiatCurrency.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
      minimumFractionDigits: 2,
    });
  } catch (error) {
    console.warn(error);
    console.log(error);
    formatter = new Intl.NumberFormat(FiatUnit.USD.locale, {
      style: 'currency',
      currency: preferredFiatCurrency.endPointKey,
      minimumFractionDigits: 2,
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
  return b.toString(10) + ' BTC';
}

module.exports.updateExchangeRate = updateExchangeRate;
module.exports.startUpdater = startUpdater;
module.exports.STRUCT = STRUCT;
module.exports.satoshiToLocalCurrency = satoshiToLocalCurrency;
module.exports.satoshiToBTC = satoshiToBTC;
module.exports.BTCToLocalCurrency = BTCToLocalCurrency;
module.exports.setPrefferedCurrency = setPrefferedCurrency;
module.exports.getPreferredCurrency = getPreferredCurrency;
