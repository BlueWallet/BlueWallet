// Translation glossary: see ./vocabulary.md for canonical Bitcoin/Lightning term renderings per language.
// Update vocabulary.md whenever you add a new term or change a shipped translation in a locale .json.

import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import Localization, { LocalizedStrings } from 'react-localization';
import { I18nManager } from 'react-native';
import * as RNLocalize from 'react-native-localize';

import { satoshiToLocalCurrency } from '../blue_modules/currency';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { AvailableLanguages, LangCode } from './languages';
import enJson from './en.json';

export const STORAGE_KEY = 'lang';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

interface ILocalization1 extends LocalizedStrings<typeof enJson> {}

// overriding formatString to only return string
interface ILocalization extends Omit<ILocalization1, 'formatString'> {
  formatString: (...args: Parameters<ILocalization1['formatString']>) => string;
}

// Lazy loaders for non-en langs
type LanguageDict = typeof enJson;
const languageLoaders: Record<Exclude<LangCode, 'en'>, () => LanguageDict> = {
  ar: () => require('./ar.json'),
  be: () => require('./be@tarask.json'),
  bg_bg: () => require('./bg_bg.json'),
  bqi: () => require('./bqi.json'),
  ca: () => require('./ca.json'),
  cs_cz: () => require('./cs_cz.json'),
  cy: () => require('./cy.json'),
  da_dk: () => require('./da_dk.json'),
  de_de: () => require('./de_de.json'),
  el: () => require('./el.json'),
  es: () => require('./es.json'),
  es_419: () => require('./es_419.json'),
  et: () => require('./et_EE.json'),
  fa: () => require('./fa.json'),
  fi_fi: () => require('./fi_fi.json'),
  fo: () => require('./fo.json'),
  fr_fr: () => require('./fr_fr.json'),
  he: () => require('./he.json'),
  hr_hr: () => require('./hr_hr.json'),
  hu_hu: () => require('./hu_hu.json'),
  fil_PH: () => require('./fil_PH.json'),
  hy: () => require('./hy.json'),
  ak: () => require('./ak.json'),
  st_ZA: () => require('./st_ZA.json'),
  hi: () => require('./hi.json'),
  bn: () => require('./bn.json'),
  ur: () => require('./ur.json'),
  sw: () => require('./sw.json'),
  pa: () => require('./pa.json'),
  am: () => require('./am.json'),
  ff: () => require('./ff.json'),
  az: () => require('./az.json'),
  zu_ZA: () => require('./zu_ZA.json'),
  km: () => require('./km.json'),
  hak: () => require('./hak.json'),
  lv: () => require('./lv.json'),
  eu: () => require('./eu.json'),
  gug_PY: () => require('./gug_PY.json'),
  ka: () => require('./ka.json'),
  id_id: () => require('./id_id.json'),
  it: () => require('./it.json'),
  jp_jp: () => require('./jp_jp.json'),
  'kk@Cyrl': () => require('./kk@Cyrl.json'),
  kn: () => require('./kn.json'),
  ko_kr: () => require('./ko_KR.json'),
  lrc: () => require('./lrc.json'),
  ms: () => require('./ms.json'),
  nb_no: () => require('./nb_no.json'),
  ne: () => require('./ne.json'),
  nl_nl: () => require('./nl_nl.json'),
  pcm: () => require('./pcm.json'),
  pl: () => require('./pl.json'),
  pt_br: () => require('./pt_br.json'),
  pt_pt: () => require('./pt_pt.json'),
  ro: () => require('./ro.json'),
  ru: () => require('./ru.json'),
  si_lk: () => require('./si_LK.json'),
  sk_sk: () => require('./sk_sk.json'),
  sl_si: () => require('./sl_SI.json'),
  sq_AL: () => require('./sq_AL.json'),
  sr_rs: () => require('./sr_RS.json'),
  sv_se: () => require('./sv_se.json'),
  th_th: () => require('./th_th.json'),
  tr_tr: () => require('./tr_tr.json'),
  ua: () => require('./ua.json'),
  vi_vn: () => require('./vi_vn.json'),
  zar_afr: () => require('./zar_afr.json'),
  zar_xho: () => require('./zar_xho.json'),
  zh_cn: () => require('./zh_cn.json'),
  zh_tw: () => require('./zh_tw.json'),
};

// Cache so toggling between languages does not re-parse the JSON.
export const parsedLanguages: Record<string, LanguageDict> = { en: enJson };

const loc = new Localization<typeof enJson>({ en: enJson }) as ILocalization;

const isKnownLang = (lang: string): lang is Exclude<LangCode, 'en'> => Object.prototype.hasOwnProperty.call(languageLoaders, lang);

const applyLanguage = (lang: string) => {
  if (lang === 'en' || !isKnownLang(lang)) {
    loc.setContent({ en: enJson });
    loc.setLanguage('en');
    return;
  }
  if (!parsedLanguages[lang]) {
    parsedLanguages[lang] = languageLoaders[lang]();
  }
  // `setContent` resets active language to interface; explicit setLanguage after, with `en` as fallback.
  loc.setContent({ en: enJson, [lang]: parsedLanguages[lang] });
  loc.setLanguage(lang);
};

const setDateTimeLocale = async () => {
  let lang = (await AsyncStorage.getItem(STORAGE_KEY)) ?? '';
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
    case 'fil_PH':
      lang = 'tl-ph';
      require('dayjs/locale/tl-ph');
      break;
    case 'hy':
      lang = 'hy-am';
      require('dayjs/locale/hy-am');
      break;
    // Akan, Sesotho, Fula, Zulu, Hakka, Guaraní — no dayjs locale available, using English as closest match
    case 'ak':
    case 'st_ZA':
    case 'ff':
    case 'zu_ZA':
    case 'hak':
    case 'gug_PY':
      lang = 'en';
      require('dayjs/locale/en');
      break;
    case 'hi':
      require('dayjs/locale/hi');
      break;
    case 'bn':
      require('dayjs/locale/bn');
      break;
    case 'ur':
      require('dayjs/locale/ur');
      break;
    case 'sw':
      require('dayjs/locale/sw');
      break;
    case 'pa':
      lang = 'pa-in';
      require('dayjs/locale/pa-in');
      break;
    case 'am':
      require('dayjs/locale/am');
      break;
    case 'az':
      require('dayjs/locale/az');
      break;
    case 'km':
      require('dayjs/locale/km');
      break;
    case 'lv':
      require('dayjs/locale/lv');
      break;
    case 'eu':
      require('dayjs/locale/eu');
      break;
    case 'ka':
      require('dayjs/locale/ka');
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

// Fire-and-forget; `loc` starts as `{en}` until this resolves, so synchronous reads on a cold launch with non-en saved preference render English briefly.
const init = async () => {
  const lang = await AsyncStorage.getItem(STORAGE_KEY);
  if (lang) {
    await saveLanguage(lang);
  } else {
    const locales = RNLocalize.getLocales();
    const detected = locales[0]?.languageCode;
    if (detected && AvailableLanguages.some(language => language.value === detected)) {
      await saveLanguage(detected);
    } else {
      await saveLanguage('en');
    }
  }
};
init();

export const saveLanguage = async (lang: string) => {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  applyLanguage(lang);
  // even tho it makes no effect changing it in this run, it will on the next run, so we are doign it here:
  if (process.env.JEST_WORKER_ID === undefined) {
    const foundLang = AvailableLanguages.find(language => language.value === lang);
    I18nManager.allowRTL(foundLang?.isRTL ?? false);
    I18nManager.forceRTL(foundLang?.isRTL ?? false);
  }
  await setDateTimeLocale();
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

const FALLBACK_LOCALE = 'en-US';

/**
 * Overrides for BlueWallet language codes that are NOT valid BCP 47 even after the
 * `_` -> `-` + upper-case-region normalisation. Without these, `Intl.NumberFormat`
 * silently resolves the tag to en-US (or throws), defeating the locale fix for
 * those languages. The set of overrides mirrors the language-renaming switch in
 * `setDateTimeLocale` (above) so the source of truth stays consistent.
 */
const BCP47_OVERRIDES: Record<string, string> = {
  bqi: 'fa', // Bakhtiari -> Persian (no Bakhtiari data in Intl)
  jp_jp: 'ja-JP', // BlueWallet uses ISO-3166 `jp`; BCP 47 wants the ISO-639 `ja`
  'kk@Cyrl': 'kk-Cyrl', // Linux modifier syntax -> BCP 47 script subtag
  lrc: 'fa', // Northern Luri -> Persian (no Luri data in Intl)
  pcm: 'en', // Nigerian Pidgin -> English (no Pidgin data in Intl)
  sr_rs: 'sr-Cyrl', // BlueWallet defaults Serbian to Cyrillic script
  ua: 'uk', // BlueWallet uses country `ua`; BCP 47 wants language `uk`
  zar_afr: 'af', // Afrikaans (South Africa); `zar` isn't a language subtag
  zar_xho: 'xh', // Xhosa; same reasoning
};

/**
 * Returns the user's current in-app language as a BCP 47 tag. BlueWallet stores codes with
 * underscores (e.g. "de_de", "pt_br"); BCP 47 wants dashes with an upper-case region
 * ("de-DE", "pt-BR"). Anything we can't normalize is returned as-is so that the formatter's
 * own try/catch can fall back to FALLBACK_LOCALE.
 */
function getCurrentLocale(): string {
  try {
    const lang = loc.getLanguage();
    if (!lang) return FALLBACK_LOCALE;
    if (BCP47_OVERRIDES[lang]) return BCP47_OVERRIDES[lang];
    // Default: only uppercase 2-3 letter trailing tokens (ISO-3166 region codes).
    // Longer tails are likely script subtags (e.g. "Cyrl", "Hant") that should
    // stay Title Case — those are handled by BCP47_OVERRIDES above.
    return lang.replace('_', '-').replace(/-([a-z]{2,3})$/i, (_match, region) => '-' + region.toUpperCase());
  } catch {
    return FALLBACK_LOCALE;
  }
}

/** Returns the locale's decimal separator (e.g. "." for en-US, "," for de-DE). */
function getDecimalSeparator(locale: string): string {
  try {
    return new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === 'decimal')?.value ?? '.';
  } catch {
    return '.';
  }
}

/** Locale-aware integer grouping using Latin digits, falling back to en-US on bad locales. */
function formatIntegerForLocale(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { numberingSystem: 'latn' }).format(value);
  } catch {
    return new Intl.NumberFormat(FALLBACK_LOCALE, { numberingSystem: 'latn' }).format(value);
  }
}

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
    const decimalSep = getDecimalSeparator(getCurrentLocale());
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
    const trimmed = removeTrailingZeros(value); // operates on "."-decimal string first
    const localized = decimalSep === '.' ? trimmed : trimmed.replace('.', decimalSep);
    return localized + ' ' + loc.units[BitcoinUnit.BTC];
  } else if (toUnit === BitcoinUnit.SATS) {
    return (withFormatting ? formatIntegerForLocale(balance, getCurrentLocale()) : String(balance)) + ' ' + loc.units[BitcoinUnit.SATS];
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
    const decimalSep = getDecimalSeparator(getCurrentLocale());
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);
    const trimmed = removeTrailingZeros(value);
    return decimalSep === '.' ? trimmed : trimmed.replace('.', decimalSep);
  } else if (toUnit === BitcoinUnit.SATS) {
    return withFormatting ? formatIntegerForLocale(balance, getCurrentLocale()) : String(balance);
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
