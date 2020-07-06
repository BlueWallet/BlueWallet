import AsyncStorage from '@react-native-community/async-storage';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import relativeTime from 'dayjs/plugin/relativeTime';
import Localization from 'react-localization';

import { AppStorage } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';

const BigNumber = require('bignumber.js');

let strings;
dayjs.extend(relativeTime);
dayjs.extend(localeData);

// first-time loading sequence
(async () => {
  // finding out whether lang preference was saved
  // For some reason using the AppStorage.LANG constant is not working. Hard coding string for now.
  let lang = await AsyncStorage.getItem('lang');
  if (lang) {
    strings.setLanguage(lang);
    let localeForDayJSAvailable = true;
    switch (lang) {
      case 'zh_cn':
        lang = 'zh-cn';
        require('dayjs/locale/zh-cn');
        break;
      case 'es':
        require('dayjs/locale/es');
        break;
      case 'pt_pt':
        lang = 'pt';
        require('dayjs/locale/pt');
        break;
      case 'ja':
        lang = 'ja';
        require('dayjs/locale/ja');
        break;
      case 'id_id':
        require('dayjs/locale/id');
        break;
      case 'tr_tr':
        require('dayjs/locale/tr');
        break;
      case 'vi_vn':
        require('dayjs/locale/vi');
        break;
      case 'ko_KR':
        lang = 'ko';
        require('dayjs/locale/ko');
        break;
      default:
        localeForDayJSAvailable = false;
        break;
    }
    if (localeForDayJSAvailable) {
      dayjs.locale(lang.split('_')[0]);
    }
  }
})();

strings = new Localization({
  en: require('./en.js'),
  pt_pt: require('./pt_PT.js'),
  es: require('./es.js'),
  ja: require('./jp_JP.js'),
  id_id: require('./id_ID.js'),
  zh_cn: require('./zh_cn.js'),
  tr_tr: require('./tr_TR.js'),
  vi_vn: require('./vi_VN.js'),
  ko_kr: require('./ko_KR.js'),
});

strings.saveLanguage = lang => AsyncStorage.setItem(AppStorage.LANG, lang);

strings.transactionTimeToReadable = time => {
  if (time === 0) {
    return strings._.never;
  }
  let timejs;
  try {
    timejs = dayjs(time).format('YYYY-MM-DD, HH:mm:ss');
  } catch (_) {
    console.warn('incorrect locale set for dayjs');
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
