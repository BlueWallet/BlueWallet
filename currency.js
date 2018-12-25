import Frisbee from 'frisbee';
import { AsyncStorage } from 'react-native';
import { AppStorage } from './class';
import { FiatUnit } from './models/fiatUnit';
let BigNumber = require('bignumber.js');
let preferredFiatCurrency = FiatUnit.USD;
let lang = {};
// let btcusd = 6500; // default

const STRUCT = {
  LAST_UPDATED: 'LAST_UPDATED',
  BTC_USD: 'BTC_USD',
  BTC_EUR: 'BTC_EUR',
};

async function updateExchangeRate() {
  let preferredFiatCurrency;
  try {
    preferredFiatCurrency = JSON.parse(await AsyncStorage.getItem(AppStorage.PREFERREDCURRENCY));
    if (preferredFiatCurrency === null) {
      throw Error();
    }
  } catch (_error) {
    preferredFiatCurrency = FiatUnit.USD;
  }
  if (+new Date() - lang[STRUCT.LAST_UPDATED] <= 30 * 60 * 1000) {
    // not updating too often
    return;
  }
  let json;
  try {
    const api = new Frisbee({
      baseURI: 'https://api.coindesk.com',
    });
    let response = await api.get('/v1/bpi/currentprice/' + preferredFiatCurrency.endPointKey + '.json');
    json = response.body;
    if (typeof json === 'undefined' || typeof json.bpi[preferredFiatCurrency.endPointKey].rate_foat === 'undefined') {
      throw new Error('Could not update currency rate: ' + response.err);
    }
  } catch (Err) {
    console.warn(Err);
    return;
  }

  lang[STRUCT.LAST_UPDATED] = +new Date();
  lang[STRUCT[preferredFiatCurrency['BTC_' + preferredFiatCurrency.endPointKey]]] =
    json.bpi[preferredFiatCurrency.endPointKey].rate_foat * 1;
  await AsyncStorage.setItem(AppStorage.CURRENCY, JSON.stringify(lang));
}

async function startUpdater(force = false) {
  if (force) {
    const lang = JSON.parse(await AsyncStorage.getItem(AppStorage.CURRENCY));
    delete lang[STRUCT.LAST_UPDATED];
    await AsyncStorage.setItem(AppStorage.CURRENCY, JSON.stringify(lang));
    try {
      preferredFiatCurrency = JSON.parse(await AsyncStorage.getItem(AppStorage.PREFERREDCURRENCY));
      if (preferredFiatCurrency === null) {
        throw Error();
      }
    } catch (_error) {
      preferredFiatCurrency = FiatUnit.USD;
    }
  }
  lang = await AsyncStorage.getItem(AppStorage.CURRENCY);
  try {
    lang = JSON.parse(lang);
  } catch (Err) {
    lang = {};
  }
  lang = lang || {};
  lang[STRUCT.LAST_UPDATED] = lang[STRUCT.LAST_UPDATED] || 0;
  lang[STRUCT['BTC_' + preferredFiatCurrency.endPointKey]] = lang[STRUCT['BTC_' + preferredFiatCurrency.endPointKey]] || 6500;
  setInterval(() => updateExchangeRate(), 2 * 60 * 100);
  return updateExchangeRate();
}

function satoshiToLocalCurrency(satoshi) {
  if (!lang[STRUCT['BTC_' + preferredFiatCurrency.endPointKey]]) return satoshi;

  let b = new BigNumber(satoshi);
  b = b
    .dividedBy(100000000)
    .multipliedBy(lang[STRUCT['BTC_' + preferredFiatCurrency.endPointKey]])
    .toString(10);
  b = parseFloat(b).toFixed(2);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: preferredFiatCurrency.endPointKey,
    minimumFractionDigits: 2,
  });
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
