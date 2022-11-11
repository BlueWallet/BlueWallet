import Localization from 'react-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import * as RNLocalize from 'react-native-localize';
import BigNumber from 'bignumber.js';

import { BitcoinUnit } from '../models/bitcoinUnits';
import { AvailableLanguages } from './languages';
import { I18nManager } from 'react-native';
const currency = require('../blue_modules/currency');

export const STORAGE_KEY = 'lang';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const setDateTimeLocale = async () => {
  let lang = (await AsyncStorage.getItem(STORAGE_KEY)) ?? '';
  let localeForDayJSAvailable = true;
  switch (lang) {
    case 'ar':
      require('dayjs/locale/ar');
      break;
    case 'bg_bg':
      lang = 'bg';
      require('dayjs/locale/bg');
      break;
    case 'ca':
      require('dayjs/locale/ca');
      break;
    case 'cy':
      require('dayjs/locale/cy');
      break;
    case 'da_dk':
      require('dayjs/locale/da');
      break;
    case 'de_de':
      require('dayjs/locale/de');
      break;
    case 'el':
      require('dayjs/locale/el');
      break;
    case 'es':
      require('dayjs/locale/es');
      break;
    case 'es_419':
      // es-do it is the closes one to es_419
      lang = 'es-do';
      require('dayjs/locale/es-do');
      break;
    case 'fi_fi':
      require('dayjs/locale/fi');
      break;
    case 'fa':
      require('dayjs/locale/fa');
      break;
    case 'fr_fr':
      require('dayjs/locale/fr');
      break;
    case 'he':
      require('dayjs/locale/he');
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
    case 'it':
      require('dayjs/locale/it');
      break;
    case 'jp_jp':
      lang = 'ja';
      require('dayjs/locale/ja');
      break;
    case 'ko_kr':
      lang = 'ko';
      require('dayjs/locale/ko');
      break;
    case 'ms':
      require('dayjs/locale/ms');
      break;
    case 'ne':
      require('dayjs/locale/ne');
      break;
    case 'nb_no':
      require('dayjs/locale/nb');
      break;
    case 'nl_nl':
      require('dayjs/locale/nl');
      break;
    case 'pt_br':
      lang = 'pt-br';
      require('dayjs/locale/pt-br');
      break;
    case 'pt_pt':
      lang = 'pt';
      require('dayjs/locale/pt');
      break;
    case 'pl':
      require('dayjs/locale/pl');
      break;
    case 'ro':
      require('dayjs/locale/ro');
      break;
    case 'ru':
      require('dayjs/locale/ru');
      break;
    case 'si_lk':
      require('dayjs/locale/si.js');
      break;
    case 'sk_sk':
      require('dayjs/locale/sk');
      break;
    case 'sl_si':
      require('dayjs/locale/sl');
      break;
    case 'sv_se':
      require('dayjs/locale/sv');
      break;
    case 'th_th':
      require('dayjs/locale/th');
      break;
    case 'tr_tr':
      require('dayjs/locale/tr');
      break;
    case 'vi_vn':
      require('dayjs/locale/vi');
      break;
    case 'zh_cn':
      lang = 'zh-cn';
      require('dayjs/locale/zh-cn');
      break;
    case 'zh_tw':
      lang = 'zh-tw';
      require('dayjs/locale/zh-tw');
      break;
    default:
      localeForDayJSAvailable = false;
      break;
  }
  if (localeForDayJSAvailable) {
    dayjs.locale(lang.split('_')[0]);
  } else {
    dayjs.locale('en');
  }
};

const init = async () => {
  // finding out whether lang preference was saved
  const lang = await AsyncStorage.getItem(STORAGE_KEY);
  if (lang) {
    await saveLanguage(lang);
    await loc.setLanguage(lang);
    if (process.env.JEST_WORKER_ID === undefined) {
      const foundLang = AvailableLanguages.find(language => language.value === lang);
      I18nManager.allowRTL(foundLang?.isRTL ?? false);
      I18nManager.forceRTL(foundLang?.isRTL ?? false);
    }
    await setDateTimeLocale();
  } else {
    const locales = RNLocalize.getLocales();
    if (Object.values(AvailableLanguages).some(language => language.value === locales[0].languageCode)) {
      await saveLanguage(locales[0].languageCode);
      await loc.setLanguage(locales[0].languageCode);
      if (process.env.JEST_WORKER_ID === undefined) {
        I18nManager.allowRTL(locales[0].isRTL ?? false);
        I18nManager.forceRTL(locales[0].isRTL ?? false);
      }
    } else {
      await saveLanguage('en');
      await loc.setLanguage('en');
      if (process.env.JEST_WORKER_ID === undefined) {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }
    }
    await setDateTimeLocale();
  }
};
init();

const loc = new Localization({
  en: require('./en.json'),
  ar: require('./ar.json'),
  bg_bg: require('./bg_bg.json'),
  ca: require('./ca.json'),
  cy: require('./cy.json'),
  cs_cz: require('./cs_cz.json'),
  da_dk: require('./da_dk.json'),
  de_de: require('./de_de.json'),
  el: require('./el.json'),
  es: require('./es.json'),
  es_419: require('./es_419.json'),
  fa: require('./fa.json'),
  fi_fi: require('./fi_fi.json'),
  fr_fr: require('./fr_fr.json'),
  he: require('./he.json'),
  hr_hr: require('./hr_hr.json'),
  hu_hu: require('./hu_hu.json'),
  id_id: require('./id_id.json'),
  it: require('./it.json'),
  jp_jp: require('./jp_jp.json'),
  ko_kr: require('./ko_KR.json'),
  ms: require('./ms.json'),
  ne: require('./ne.json'),
  nb_no: require('./nb_no.json'),
  nl_nl: require('./nl_nl.json'),
  pt_br: require('./pt_br.json'),
  pt_pt: require('./pt_pt.json'),
  pl: require('./pl.json'),
  ro: require('./ro.json'),
  ru: require('./ru.json'),
  si_lk: require('./si_LK.json'),
  sk_sk: require('./sk_sk.json'),
  sl_si: require('./sl_SI.json'),
  sv_se: require('./sv_se.json'),
  th_th: require('./th_th.json'),
  tr_tr: require('./tr_tr.json'),
  ua: require('./ua.json'),
  vi_vn: require('./vi_vn.json'),
  zar_afr: require('./zar_afr.json'),
  zar_xho: require('./zar_xho.json'),
  zh_cn: require('./zh_cn.json'),
  zh_tw: require('./zh_tw.json'),
});

export const saveLanguage = async (lang: string) => {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  loc.setLanguage(lang);
  // even tho it makes no effect changing it in this run, it will on the next run, so we are doign it here:
  if (process.env.JEST_WORKER_ID === undefined) {
    const foundLang = AvailableLanguages.find(language => language.value === lang);
    I18nManager.allowRTL(foundLang?.isRTL ?? false);
    I18nManager.forceRTL(foundLang?.isRTL ?? false);
  }
  await setDateTimeLocale();
};

export const transactionTimeToReadable = (time: number) => {
  if (time === -1) {
    return 'unknown';
  }
  if (time === 0) {
    return loc._.never;
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

export const removeTrailingZeros = (value: number | string) => {
  let ret = value.toString();

  if (ret.indexOf('.') === -1) {
    return ret;
  }
  while ((ret.slice(-1) === '0' || ret.slice(-1) === '.') && ret.indexOf('.') !== -1) {
    ret = ret.substr(0, ret.length - 1);
  }
  return ret;
};

/**
 *
 * @param balance {number} Satoshis
 * @param toUnit {string} Value from models/bitcoinUnits.js
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalance(balance: number, toUnit: string, withFormatting = false) {
  if (toUnit === undefined) {
    return balance + ' ' + loc.units[BitcoinUnit.BTC];
  }
  if (toUnit === BitcoinUnit.BTC) {
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
    return removeTrailingZeros(+value) + ' ' + loc.units[BitcoinUnit.BTC];
  } else if (toUnit === BitcoinUnit.SATS) {
    return (withFormatting ? new Intl.NumberFormat().format(balance).toString() : String(balance)) + ' ' + loc.units[BitcoinUnit.SATS];
  } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
    return currency.satoshiToLocalCurrency(balance);
  }
}

/**
 *
 * @param balance {number} Satoshis
 * @param toUnit {string} Value from models/bitcoinUnits.js, for example `BitcoinUnit.SATS`
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalanceWithoutSuffix(balance = 0, toUnit: string, withFormatting = false) {
  if (toUnit === undefined) {
    return balance;
  }
  if (balance !== 0) {
    if (toUnit === BitcoinUnit.BTC) {
      const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
      return removeTrailingZeros(value);
    } else if (toUnit === BitcoinUnit.SATS) {
      return withFormatting ? new Intl.NumberFormat().format(balance).toString() : String(balance);
    } else if (toUnit === BitcoinUnit.LOCAL_CURRENCY) {
      return currency.satoshiToLocalCurrency(balance);
    }
  }
  return balance.toString();
}

/**
 * Should be used when we need a simple string to be put in text input, for example
 *
 * @param  balance {number} Satoshis
 * @param toUnit {string} Value from models/bitcoinUnits.js, for example `BitcoinUnit.SATS`
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalancePlain(balance = 0, toUnit: string, withFormatting = false) {
  const newInputValue = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return _leaveNumbersAndDots(newInputValue);
}

export function _leaveNumbersAndDots(newInputValue: string) {
  newInputValue = newInputValue.replace(/[^\d.,-]/g, ''); // filtering, leaving only numbers, dots & commas
  if (newInputValue.endsWith('.00') || newInputValue.endsWith(',00')) newInputValue = newInputValue.substring(0, newInputValue.length - 3);

  if (newInputValue[newInputValue.length - 3] === ',') {
    // this is a fractional value, lets replace comma to dot so it represents actual fractional value for normal people
    newInputValue = newInputValue.substring(0, newInputValue.length - 3) + '.' + newInputValue.substring(newInputValue.length - 2);
  }
  newInputValue = newInputValue.replace(/,/gi, '');

  return newInputValue;
}

/**
 * @see https://github.com/BlueWallet/BlueWallet/issues/3466
 */
export function formatStringAddTwoWhiteSpaces(text: string): string {
  return `${text}  `;
}

export default loc;
