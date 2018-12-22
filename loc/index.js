import Localization from 'react-localization';
import { AsyncStorage } from 'react-native';
import { AppStorage } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
const BTCUnits = require('bitcoin-units');
const currency = require('../currency');
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
strings.formatBalance = (balance, fromUnit, toUnit) => {
  if (toUnit === undefined || fromUnit === toUnit) {
    return balance + ' ' + BitcoinUnit.BTC;
  }
  if (balance !== 0) {
    if (toUnit === BitcoinUnit.BTC) {
      return BTCUnits(balance, fromUnit)
        .to(BitcoinUnit.BTC)
        .format();
    } else if (toUnit === BitcoinUnit.SATS) {
      return BTCUnits(balance, fromUnit)
        .to(BitcoinUnit.SATS)
        .format();
    } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      return currency.satoshiToLocalCurrency(
        BTCUnits(balance, BitcoinUnit.BTC)
          .to(BitcoinUnit.SATS)
          .toString(),
      );
    }
  }
  return balance + ' ' + BitcoinUnit.BTC;
};

strings.formatBalanceWithoutSuffix = (balance, fromUnit, toUnit) => {
  if (toUnit === undefined) {
    return balance;
  }
  if (balance !== 0) {
    if (fromUnit === BitcoinUnit.LOCAL_CURRENCY || toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      BTCUnits.setFiat(BitcoinUnit.LOCAL_CURRENCY, 3600);
    }
    if (toUnit === BitcoinUnit.BTC || toUnit === undefined) {
      return BTCUnits(balance, fromUnit)
        .to(BitcoinUnit.BTC)
        .toString();
    } else if (toUnit === BitcoinUnit.SATS) {
      return BTCUnits(balance, fromUnit)
        .to(BitcoinUnit.SATS)
        .toString();
    } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      return currency.satoshiToLocalCurrency(BTCUnits(balance, fromUnit).to(BitcoinUnit.SATS));
    }
  }
  return balance;
};

module.exports = strings;
