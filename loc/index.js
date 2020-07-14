import Localization from 'react-localization';
import AsyncStorage from '@react-native-community/async-storage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as RNLocalize from 'react-native-localize';
import BigNumber from 'bignumber.js';

import { AppStorage } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { AvailableLanguages } from './languages';
const currency = require('../blue_modules/currency');

dayjs.extend(relativeTime);

// first-time loading sequence
(async () => {
  // finding out whether lang preference was saved
  // For some reason using the AppStorage.LANG constant is not working. Hard coding string for now.
  let lang = await AsyncStorage.getItem('lang');
  if (lang) {
    strings.setLanguage(lang);
    let localeForDayJSAvailable = true;
    switch (lang) {
      case 'el':
        require('dayjs/locale/el');
        break;
      case 'it':
        require('dayjs/locale/it');
        break;
      case 'zh_cn':
        lang = 'zh-cn';
        require('dayjs/locale/zh-cn');
        break;
      case 'zh_tw':
        lang = 'zh-tw';
        require('dayjs/locale/zh-tw');
        break;
      case 'ru':
        require('dayjs/locale/ru');
        break;
      case 'es':
        require('dayjs/locale/es');
        break;
      case 'fi_fi':
        require('dayjs/locale/fi');
        break;
      case 'fr_fr':
        require('dayjs/locale/fr');
        break;
      case 'pt_br':
        lang = 'pt-br';
        require('dayjs/locale/pt-br');
        break;
      case 'pt_pt':
        lang = 'pt';
        require('dayjs/locale/pt');
        break;
      case 'jp_jp':
        lang = 'ja';
        require('dayjs/locale/ja');
        break;
      case 'de_de':
        require('dayjs/locale/de');
        break;
      case 'th_th':
        require('dayjs/locale/th');
        break;
      case 'da_dk':
        require('dayjs/locale/da');
        break;
      case 'nl_nl':
        require('dayjs/locale/nl');
        break;
      case 'hr_hr':
        require('dayjs/locale/hr');
        break;
      case 'hu_hu':
        require('dayjs/locale/hu');
        break;
      case 'id_id':
        require('dayjs/locale/id');
        break;
      case 'sv_se':
        require('dayjs/locale/sv');
        break;
      case 'nb_no':
        require('dayjs/locale/nb');
        break;
      case 'tr_tr':
        require('dayjs/locale/tr');
        break;
      case 'vi_vn':
        require('dayjs/locale/vi');
        break;
      case 'ca':
        require('dayjs/locale/ca');
        break;
      default:
        localeForDayJSAvailable = false;
        break;
    }
    if (localeForDayJSAvailable) {
      dayjs.locale(lang.split('_')[0]);
    }
  } else {
    const locales = RNLocalize.getLocales();
    if (Object.keys(AvailableLanguages).some(language => language === locales[0])) {
      strings.saveLanguage(locales[0].languageCode);
      strings.setLanguage(locales[0].languageCode);
    } else {
      strings.saveLanguage('en');
      strings.setLanguage('en');
    }
  }
})();

const strings = new Localization({
  en: require('./en.json'),
  ru: require('./ru.json'),
  pt_br: require('./pt_br.json'),
  pt_pt: require('./pt_pt.json'),
  es: require('./es.json'),
  it: require('./it.json'),
  el: require('./el.json'),
  ua: require('./ua.json'),
  ca: require('./ca.json'),
  jp_jp: require('./jp_jp.json'),
  de_de: require('./de_de.json'),
  da_dk: require('./da_dk.json'),
  cs_cz: require('./cs_cz.json'),
  sk_sk: require('./sk_sk.json'),
  th_th: require('./th_th.json'),
  nl_nl: require('./nl_nl.json'),
  fi_fi: require('./fi_fi.json'),
  fr_fr: require('./fr_fr.json'),
  hr_hr: require('./hr_hr.json'),
  hu_hu: require('./hu_hu.json'),
  id_id: require('./id_id.json'),
  zh_cn: require('./zh_cn.json'),
  zh_tw: require('./zh_tw.json'),
  sv_se: require('./sv_se.json'),
  nb_no: require('./nb_no.json'),
  tr_tr: require('./tr_tr.json'),
  vi_vn: require('./vi_vn.json'),
  zar_xho: require('./zar_xho.json'),
  zar_afr: require('./zar_afr.json'),
});

strings.saveLanguage = lang => AsyncStorage.setItem(AppStorage.LANG, lang);

export const transactionTimeToReadable = time => {
  if (time === 0) {
    return strings._.never;
  }
  let ret;
  try {
    ret = dayjs(time).fromNow();
  } catch (_) {
    console.warn('incorrect locale set for dayjs');
    return time;
  }
  return ret;
};

export const removeTrailingZeros = value => {
  value = value.toString();

  if (value.indexOf('.') === -1) {
    return value;
  }
  while ((value.slice(-1) === '0' || value.slice(-1) === '.') && value.indexOf('.') !== -1) {
    value = value.substr(0, value.length - 1);
  }
  return value;
};

/**
 *
 * @param balance {number} Satoshis
 * @param toUnit {String} Value from models/bitcoinUnits.js
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalance(balance, toUnit, withFormatting = false) {
  if (toUnit === undefined) {
    return balance + ' ' + BitcoinUnit.BTC;
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
    return currency.satoshiToLocalCurrency(balance);
  }
}

/**
 *
 * @param balance {Integer} Satoshis
 * @param toUnit {String} Value from models/bitcoinUnits.js, for example `BitcoinUnit.SATS`
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalanceWithoutSuffix(balance = 0, toUnit, withFormatting = false) {
  if (toUnit === undefined) {
    return balance;
  }
  if (balance !== 0) {
    if (toUnit === BitcoinUnit.BTC) {
      const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
      return removeTrailingZeros(value);
    } else if (toUnit === BitcoinUnit.SATS) {
      return (balance < 0 ? '-' : '') + (withFormatting ? new Intl.NumberFormat().format(balance).replace(/[^0-9]/g, ' ') : balance);
    } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      return currency.satoshiToLocalCurrency(balance);
    }
  }
  return balance.toString();
}

/**
 * Should be used when we need a simple string to be put in text input, for example
 *
 * @param  balance {integer} Satoshis
 * @param toUnit {String} Value from models/bitcoinUnits.js, for example `BitcoinUnit.SATS`
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalancePlain(balance = 0, toUnit, withFormatting = false) {
  const newInputValue = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
  return _leaveNumbersAndDots(newInputValue);
}

export function _leaveNumbersAndDots(newInputValue) {
  newInputValue = newInputValue.replace(/[^\d.,-]/g, ''); // filtering, leaving only numbers, dots & commas
  if (newInputValue.endsWith('.00') || newInputValue.endsWith(',00')) newInputValue = newInputValue.substring(0, newInputValue.length - 3);

  if (newInputValue[newInputValue.length - 3] === ',') {
    // this is a fractional value, lets replace comma to dot so it represents actual fractional value for normal people
    newInputValue = newInputValue.substring(0, newInputValue.length - 3) + '.' + newInputValue.substring(newInputValue.length - 2);
  }
  newInputValue = newInputValue.replace(/,/gi, '');

  return newInputValue;
}

export default strings;
