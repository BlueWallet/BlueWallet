import Localization from 'react-localization';
import { AsyncStorage } from 'react-native';
import { AppStorage } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
const currency = require('../currency');
const BigNumber = require('bignumber.js');
let strings;

// first-time loading sequence
(async () => {
  // finding out whether lang preference was saved
  let lang = await AsyncStorage.getItem(AppStorage.LANG);
  if (lang) {
    strings.setLanguage(lang);
    return;
  }

  if (Localization.getCurrentLocaleAsync) {
    let locale = await Localization.getCurrentLocaleAsync();
    if (locale) {
      locale = locale.split('-');
      locale = locale[0];
      console.log('current locale:', locale);
      if (
        locale === 'en' ||
        locale === 'ru' ||
        locale === 'ua' ||
        locale === 'es' ||
        locale === 'pt-br' ||
        locale === 'pt-pt' ||
        locale === 'de-de'
      ) {
        locale = locale.replace('-', '_');
        strings.setLanguage(locale);
      } else {
        strings.setLanguage('en');
      }
    }
  }
})();

strings = new Localization({
  en: require('./en.js'),
  ru: require('./ru.js'),
  pt_br: require('./pt_BR.js'),
  pt_pt: require('./pt_PT.js'),
  es: require('./es.js'),
  ua: require('./ua.js'),
  de_de: require('./de_DE.js'),
});

strings.saveLanguage = lang => AsyncStorage.setItem(AppStorage.LANG, lang);

strings.transactionTimeToReadable = function(time) {
  if (time === 0) {
    return strings._.never;
  }

  let ago = (Date.now() - Date.parse(time)) / 1000; // seconds
  if (ago / (3600 * 24) >= 30) {
    ago = Math.round(ago / (3600 * 24 * 30));
    return ago + ' ' + strings._.months_ago;
  } else if (ago / (3600 * 24) >= 1) {
    ago = Math.round(ago / (3600 * 24));
    return ago + ' ' + strings._.days_ago;
  } else if (ago > 3600) {
    ago = Math.round(ago / 3600);
    return ago + ' ' + strings._.hours_ago;
  } else {
    ago = Math.round(ago / 60);
    return ago + ' ' + strings._.minutes_ago;
  }
};

function removeTrailingZeros(value) {
  value = value.toString();

  if (value.indexOf('.') === -1) {
    return value;
  }
  while ((value.slice(-1) === '0' || value.slice(-1) === '.') && value.indexOf('.') !== -1) {
    value = value.substr(0, value.length - 1);
  }
  return value;
}

/**
 *
 * @param balance {Number} Float amount of bitcoins
 * @param toUnit {String} Value from models/bitcoinUnits.js
 * @returns {string}
 */
strings.formatBalance = (balance, toUnit) => {
  if (toUnit === undefined) {
    return balance + ' ' + BitcoinUnit.BTC;
  }
  if (toUnit === BitcoinUnit.BTC) {
    return balance + ' ' + BitcoinUnit.BTC;
  } else if (toUnit === BitcoinUnit.SATS) {
    const value = new BigNumber(balance).multipliedBy(100000000);
    return value.toString() + ' ' + BitcoinUnit.SATS;
  } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
    return currency.BTCToLocalCurrency(balance);
  }
};

/**
 *
 * @param balance {Integer} Satoshis
 * @param toUnit {String} Value from models/bitcoinUnits.js
 * @returns {string}
 */
strings.formatBalanceWithoutSuffix = (balance, toUnit) => {
  if (toUnit === undefined) {
    return balance;
  }
  if (balance !== 0) {
    if (toUnit === BitcoinUnit.BTC) {
      const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
      return removeTrailingZeros(value);
    } else if (toUnit === BitcoinUnit.SATS) {
      return balance;
    } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      return currency.satoshiToLocalCurrency(balance);
    }
  }
  return balance;
};

module.exports = strings;
