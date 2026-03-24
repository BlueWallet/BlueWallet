import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import Localization, { LocalizedStrings } from 'react-localization';
import { I18nManager } from 'react-native';

import NativeLocaleHelper from '../blue_modules/LocaleHelper';
import { satoshiToLocalCurrency } from '../blue_modules/currency';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { AvailableLanguages } from './languages';
import enJson from './en.json';

export const STORAGE_KEY = 'lang';
const SYSTEM_LOCALE_KEY = 'system_locale';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// Build lookup map from Apple locale code → app language value
const appleLocaleToAppLang: Map<string, string> = new Map();
for (const lang of AvailableLanguages) {
  if (lang.appleLocale) {
    appleLocaleToAppLang.set(lang.appleLocale, lang.value);
  }
}

/**
 * Maps a system locale to the closest matching app language value.
 * Uses the appleLocale field from AvailableLanguages as the source of truth.
 * Returns undefined if no match is found.
 */
export const mapSystemLocaleToAppLanguage = (locale: {
  languageCode: string;
  countryCode: string;
  scriptCode?: string;
}): string | undefined => {
  const { languageCode, countryCode, scriptCode } = locale;
  const lc = languageCode.toLowerCase();
  const cc = countryCode.toLowerCase();

  // Chinese: distinguished by script (zh-Hans / zh-Hant)
  if (lc === 'zh') {
    const key = scriptCode === 'Hant' ? 'zh-Hant' : 'zh-Hans';
    return appleLocaleToAppLang.get(key);
  }

  // Portuguese: distinguished by region (pt-BR / pt-PT)
  if (lc === 'pt') {
    const key = cc === 'br' ? 'pt-BR' : 'pt-PT';
    return appleLocaleToAppLang.get(key);
  }

  // Spanish: Latin America (es-419) vs Spain (es)
  if (lc === 'es') {
    const latamCodes = ['419', 'mx', 'ar', 'co', 'cl', 'pe', 've', 'ec', 'gt', 'cu', 'bo', 'do', 'hn', 'py', 'sv', 'ni', 'cr', 'pa', 'uy'];
    if (latamCodes.includes(cc)) {
      return appleLocaleToAppLang.get('es-419');
    }
    return appleLocaleToAppLang.get('es');
  }

  // Standard lookup by language code
  return appleLocaleToAppLang.get(lc);
};

interface ILocalization1 extends LocalizedStrings<typeof enJson> {}

// overriding formatString to only return string
interface ILocalization extends Omit<ILocalization1, 'formatString'> {
  formatString: (...args: Parameters<ILocalization1['formatString']>) => string;
}

const setDateTimeLocale = (langValue: string) => {
  let lang = langValue;
  let localeForDayJSAvailable = true;
  switch (lang) {
    case 'ar':
      require('dayjs/locale/ar');
      break;
    case 'be':
      require('dayjs/locale/be');
      break;
    case 'bg_bg':
      lang = 'bg';
      require('dayjs/locale/bg');
      break;
    case 'bqi':
      lang = 'fa';
      require('dayjs/locale/fa');
      break;
    case 'ca':
      require('dayjs/locale/ca');
      break;
    case 'cy':
      require('dayjs/locale/cy');
      break;
    case 'cs_cz':
      require('dayjs/locale/cs');
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
    case 'et':
      require('dayjs/locale/et');
      break;
    case 'fa':
      require('dayjs/locale/fa');
      break;
    case 'fi_fi':
      require('dayjs/locale/fi');
      break;
    case 'fo':
      require('dayjs/locale/fo');
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
    case 'kk@Cyrl':
      lang = 'kk';
      require('dayjs/locale/kk');
      break;
    case 'kn':
      require('dayjs/locale/kn');
      break;
    case 'ko_kr':
      lang = 'ko';
      require('dayjs/locale/ko');
      break;
    case 'lrc':
      lang = 'fa';
      require('dayjs/locale/fa');
      break;
    case 'ms':
      require('dayjs/locale/ms');
      break;
    case 'nb_no':
      require('dayjs/locale/nb');
      break;
    case 'ne':
      require('dayjs/locale/ne');
      break;
    case 'nl_nl':
      require('dayjs/locale/nl');
      break;
    case 'pcm':
      // Nigerian Pidgin - using English as closest match (pcm is English-based creole)
      lang = 'en';
      require('dayjs/locale/en');
      break;
    case 'pl':
      require('dayjs/locale/pl');
      break;
    case 'pt_br':
      lang = 'pt-br';
      require('dayjs/locale/pt-br');
      break;
    case 'pt_pt':
      lang = 'pt';
      require('dayjs/locale/pt');
      break;
    case 'ro':
      require('dayjs/locale/ro');
      break;
    case 'ru':
      require('dayjs/locale/ru');
      break;
    case 'si_lk':
      require('dayjs/locale/si');
      break;
    case 'sk_sk':
      require('dayjs/locale/sk');
      break;
    case 'sq_AL':
      lang = 'sq';
      require('dayjs/locale/sq');
      break;
    case 'sl_si':
      require('dayjs/locale/sl');
      break;
    case 'sr_rs':
      lang = 'sr-cyrl';
      require('dayjs/locale/sr-cyrl');
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
    case 'ua':
      require('dayjs/locale/uk');
      break;
    case 'vi_vn':
      require('dayjs/locale/vi');
      break;
    case 'zar_afr':
      require('dayjs/locale/af');
      break;
    case 'zar_xho':
      // Xhosa - no dayjs locale available, using English as closest match
      lang = 'en';
      require('dayjs/locale/en');
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
  // One-time migration: move language preference from AsyncStorage to native per-app language setting
  const storedLang = await AsyncStorage.getItem(STORAGE_KEY);
  if (storedLang) {
    const langEntry = AvailableLanguages.find(l => l.value === storedLang);
    if (langEntry?.appleLocale) {
      NativeLocaleHelper?.setPreferredLanguage(langEntry.appleLocale);
    }
    await AsyncStorage.multiRemove([STORAGE_KEY, SYSTEM_LOCALE_KEY]);
    loc.setLanguage(storedLang);
    if (process.env.JEST_WORKER_ID === undefined) {
      I18nManager.allowRTL(langEntry?.isRTL ?? false);
      I18nManager.forceRTL(langEntry?.isRTL ?? false);
    }
    setDateTimeLocale(storedLang);
    return;
  }

  // Read language from system / per-app locale (set via NativeLocaleHelper or iOS Settings)
  const locales = NativeLocaleHelper?.getLocales() ?? [];
  const lang = (locales.length > 0 ? mapSystemLocaleToAppLanguage(locales[0]) : undefined) ?? 'en';

  loc.setLanguage(lang);
  if (process.env.JEST_WORKER_ID === undefined) {
    const foundLang = AvailableLanguages.find(l => l.value === lang);
    I18nManager.allowRTL(foundLang?.isRTL ?? false);
    I18nManager.forceRTL(foundLang?.isRTL ?? false);
  }
  setDateTimeLocale(lang);
};
init();

const loc: ILocalization = new Localization({
  en: enJson,
  ar: require('./ar.json'),
  be: require('./be@tarask.json'),
  bg_bg: require('./bg_bg.json'),
  bqi: require('./bqi.json'),
  ca: require('./ca.json'),
  cs_cz: require('./cs_cz.json'),
  cy: require('./cy.json'),
  da_dk: require('./da_dk.json'),
  de_de: require('./de_de.json'),
  el: require('./el.json'),
  es: require('./es.json'),
  es_419: require('./es_419.json'),
  et: require('./et_EE.json'),
  fa: require('./fa.json'),
  fi_fi: require('./fi_fi.json'),
  fo: require('./fo.json'),
  fr_fr: require('./fr_fr.json'),
  he: require('./he.json'),
  hr_hr: require('./hr_hr.json'),
  hu_hu: require('./hu_hu.json'),
  id_id: require('./id_id.json'),
  it: require('./it.json'),
  jp_jp: require('./jp_jp.json'),
  'kk@Cyrl': require('./kk@Cyrl.json'),
  kn: require('./kn.json'),
  ko_kr: require('./ko_KR.json'),
  lrc: require('./lrc.json'),
  ms: require('./ms.json'),
  nb_no: require('./nb_no.json'),
  ne: require('./ne.json'),
  nl_nl: require('./nl_nl.json'),
  pcm: require('./pcm.json'),
  pl: require('./pl.json'),
  pt_br: require('./pt_br.json'),
  pt_pt: require('./pt_pt.json'),
  ro: require('./ro.json'),
  ru: require('./ru.json'),
  si_lk: require('./si_LK.json'),
  sk_sk: require('./sk_sk.json'),
  sl_si: require('./sl_SI.json'),
  sq_AL: require('./sq_AL.json'),
  sr_rs: require('./sr_RS.json'),
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
  // Persist to native per-app language setting (iOS: AppleLanguages, Android: AppCompatDelegate)
  const langEntry = AvailableLanguages.find(language => language.value === lang);
  if (langEntry?.appleLocale) {
    NativeLocaleHelper?.setPreferredLanguage(langEntry.appleLocale);
  }
  loc.setLanguage(lang);
  if (process.env.JEST_WORKER_ID === undefined) {
    I18nManager.allowRTL(langEntry?.isRTL ?? false);
    I18nManager.forceRTL(langEntry?.isRTL ?? false);
  }
  setDateTimeLocale(lang);
};

/** Returns the currently active app language value */
export const getCurrentLanguage = (): string => {
  return loc.getLanguage();
};

export const transactionTimeToReadable = (time: number | string) => {
  if (time === -1) {
    return 'unknown';
  }
  if (+time < 1000000000000) {
    // converting timestamp to milliseconds timestamp
    // (we dont expect timestamps before September 9, 2001 so this conversion is fine)
    time = +time * 1000;
  }
  if (time === 0) {
    return loc._.never;
  }
  let ret;
  try {
    ret = dayjs(time).fromNow();
  } catch (_) {
    console.warn('incorrect locale set for dayjs');
    return String(time);
  }
  return ret;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Formats a timestamp (milliseconds) for the transaction list. Uses relative time (e.g. "2 hours ago") for the past 24 hours, otherwise absolute date. */
export const formatTransactionListDate = (timestampMs: number): string => {
  const d = dayjs(timestampMs);
  const now = dayjs();
  const diff = now.valueOf() - timestampMs;
  if (diff >= 0 && diff < ONE_DAY_MS) {
    return d.fromNow();
  }
  const format = d.year() === now.year() ? 'MMM D, h:mm a' : 'MMM D, YYYY h:mm a';
  return d.format(format);
};

export const removeTrailingZeros = (value: number | string): string => {
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
export function formatBalance(balance: number, toUnit: string, withFormatting = false): string {
  if (toUnit === undefined) {
    return balance + ' ' + loc.units[BitcoinUnit.BTC];
  }
  if (toUnit === BitcoinUnit.BTC) {
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
    return removeTrailingZeros(value) + ' ' + loc.units[BitcoinUnit.BTC];
  } else if (toUnit === BitcoinUnit.SATS) {
    return (withFormatting ? new Intl.NumberFormat().format(balance).toString() : String(balance)) + ' ' + loc.units[BitcoinUnit.SATS];
  } else {
    console.debug('[UnitSwitch/Fiat] formatBalance to fiat', { balance, unit: toUnit, withFormatting });
    return satoshiToLocalCurrency(balance);
  }
}

/**
 *
 * @param balance {number} Satoshis
 * @param toUnit {string} Value from models/bitcoinUnits.js, for example `BitcoinUnit.SATS`
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces wetween groups of 000
 * @returns {string}
 */
export function formatBalanceWithoutSuffix(balance = 0, toUnit: string, withFormatting = false): string | number {
  if (toUnit === undefined) {
    return balance;
  }
  if (toUnit === BitcoinUnit.BTC) {
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
    return removeTrailingZeros(value);
  } else if (toUnit === BitcoinUnit.SATS) {
    return withFormatting ? new Intl.NumberFormat().format(balance).toString() : String(balance);
  } else {
    console.debug('[UnitSwitch/Fiat] formatBalanceWithoutSuffix to fiat', { balance, unit: toUnit, withFormatting });
    return satoshiToLocalCurrency(balance);
  }
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
  console.debug('[UnitSwitch/Fiat] formatBalancePlain', { balance, unit: toUnit, withFormatting });
  const newInputValue = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return _leaveNumbersAndDots(newInputValue.toString());
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
