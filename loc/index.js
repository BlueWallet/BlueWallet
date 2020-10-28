import AsyncStorage from '@react-native-community/async-storage';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import relativeTime from 'dayjs/plugin/relativeTime';
import Localization from 'react-localization';
import { LocaleConfig } from 'react-native-calendars';
import * as RNLocalize from 'react-native-localize';

import { BitcoinUnit } from '../models/bitcoinUnits';
import { CONST } from '../src/consts';

const BigNumber = require('bignumber.js');

let strings;
dayjs.extend(relativeTime);
dayjs.extend(localeData);

// first-time loading sequence
(async () => {
  // finding out whether lang preference was saved
  // For some reason using the AppStorage.LANG constant is not working. Hard coding string for now.
  // hardcoding for presentional purposes
  // let lang = await AsyncStorage.getItem('lang');
  const lang =
    (await AsyncStorage.getItem('lang')) || RNLocalize.getLocales()[0]?.languageCode || CONST.defaultLanguage;
  await strings.saveLanguage(lang);
})();

const init = async lang => {
  if (lang) {
    strings.setLanguage(lang);
    let dayJsLangName = lang;
    switch (lang) {
      case 'zh':
        dayJsLangName = 'zh-cn';
        require('dayjs/locale/zh-cn');
        break;
      case 'es':
        require('dayjs/locale/es');
        break;
      case 'pt':
        require('dayjs/locale/pt');
        break;
      case 'ja':
        require('dayjs/locale/ja');
        break;
      case 'id':
        require('dayjs/locale/id');
        break;
      case 'tr':
        require('dayjs/locale/tr');
        break;
      case 'vi':
        require('dayjs/locale/vi');
        break;
      case 'ko':
        require('dayjs/locale/ko');
        break;
      default:
        lang = CONST.defaultLanguage;
        break;
    }
    dayjs.locale(dayJsLangName);
    await AsyncStorage.setItem('lang', lang);
    LocaleConfig.locales[lang] = strings.getListOfMonthsAndWeekdays();
    LocaleConfig.defaultLocale = lang;
  }
};

strings = new Localization({
  en: require('./en.js'),
  pt: require('./pt_PT.js'),
  es: require('./es.js'),
  ja: require('./jp_JP.js'),
  id: require('./id_ID.js'),
  zh: require('./zh_cn.js'),
  tr: require('./tr_TR.js'),
  vi: require('./vi_VN.js'),
  ko: require('./ko_KR.js'),
});

strings.saveLanguage = async lang => {
  await init(lang);
};

strings.transactionTimeToReadable = time => {
  if (time === 0) {
    return strings._.never;
  }
  let timejs;
  try {
    timejs = dayjs(time).format('YYYY-MM-DD, HH:mm:ss');
  } catch (_) {
    return time;
  }
  return timejs;
};

strings.getListOfMonthsAndWeekdays = () => {
  const dayjsLocaleData = dayjs.localeData();
  return {
    monthNames: dayjsLocaleData.months(),
    monthNamesShort: dayjsLocaleData.monthsShort(),
    dayNames: dayjsLocaleData.weekdays(),
    dayNamesShort: dayjsLocaleData.weekdaysShort(),
  };
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
strings.formatBalance = (balance, toUnit, withFormatting = false) => {
  if (toUnit === undefined) {
    return parseFloat(balance.toFixed(8)) + ' ' + BitcoinUnit.BTC;
  }
  if (toUnit === BitcoinUnit.BTC) {
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
    return removeTrailingZeros(value) + ' ' + BitcoinUnit.BTC;
  } else if (toUnit === BitcoinUnit.SATS) {
    return (
      (balance < 0 ? '-' : '') +
      (withFormatting ? new Intl.NumberFormat().format(balance.toString()).replace(/[^0-9]/g, ' ') : balance) +
      ' ' +
      BitcoinUnit.SATS
    );
  } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
    return ' ';
    //return currency.satoshiToLocalCurrency(balance);
  }
};

/**
 *
 * @param balance {Integer} Satoshis
 * @param toUnit {String} Value from models/bitcoinUnits.js
 * @returns {string}
 */
strings.formatBalanceWithoutSuffix = (balance = 0, toUnit, withFormatting = false) => {
  if (toUnit === undefined) {
    return parseFloat(balance.toFixed(8));
  }
  if (balance !== 0) {
    if (toUnit === BitcoinUnit.BTC) {
      const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
      return removeTrailingZeros(value);
    } else if (toUnit === BitcoinUnit.SATS) {
      return (
        (balance < 0 ? '-' : '') +
        (withFormatting ? new Intl.NumberFormat().format(balance).replace(/[^0-9]/g, ' ') : balance)
      );
    } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      return ' ';
      //return currency.satoshiToLocalCurrency(balance);
    }
  }
  return balance.toString();
};

module.exports = strings;
