import Localization from 'react-localization';
import { AsyncStorage } from 'react-native';
import { AppStorage } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
let currency = require('../currency');
let BigNumber = require('bignumber.js');
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
      if (locale === 'en' || locale === 'ru' || locale === 'ua' || locale === 'es' || locale === 'pt-br' || locale === 'pt-pt') {
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

/**
 *
 * @param balance {Number} Float amount of bitcoins
 * @param unit {String} Value from models/bitcoinUnits.js
 * @returns {string}
 */
strings.formatBalance = (balance, unit) => {
  const conversion = 100000000;
  if (unit === undefined) {
    return balance + ' ' + BitcoinUnit.BTC;
  } else {
    if (balance !== 0) {
      let b = new BigNumber(balance);
      if (unit === BitcoinUnit.BTC) {
        if (!Number.isInteger(balance)) {
          return balance + ' ' + BitcoinUnit.BTC;
        }
        return b.times(conversion).toString() + ' ' + BitcoinUnit.BTC;
      } else if (unit === BitcoinUnit.SATS) {
        return (b.times(conversion).toString() + ' ' + BitcoinUnit.SATS).replace(/\./g, '');
      } else if (unit === BitcoinUnit.LOCAL_CURRENCY) {
        return currency.satoshiToLocalCurrency(b.times(conversion).toNumber());
      }
    }
  }
  return balance + ' ' + BitcoinUnit.BTC;
};

strings.formatBalanceWithoutSuffix = (balance, unit) => {
  const conversion = 100000000;
  if (balance !== 0) {
    let b = new BigNumber(balance);
    if (unit === BitcoinUnit.BTC) {
      if (!Number.isInteger(balance)) {
        return b.times(conversion).toString();
      }
      return b.times(conversion).toString();
    } else if (unit === BitcoinUnit.SATS) {
      return b
        .times(conversion)
        .toString()
        .replace(/\./g, '');
    } else if (unit === BitcoinUnit.LOCAL_CURRENCY) {
      return currency.satoshiToLocalCurrency(b.times(conversion).toNumber());
    }
  }
  return balance;
};

module.exports = strings;
