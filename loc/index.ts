import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import Localization, { LocalizedStrings } from 'react-localization';
import { I18nManager } from 'react-native';
import * as RNLocalize from 'react-native-localize';

import { satoshiToLocalCurrency, localeSettings } from '../blue_modules/currency';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { AvailableLanguages } from './languages';
import enJson from './en.json';

export const STORAGE_KEY = 'lang';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

interface ILocalization1 extends LocalizedStrings<typeof enJson> {}

// overriding formatString to only return string
interface ILocalization extends Omit<ILocalization1, 'formatString'> {
  formatString: (...args: Parameters<ILocalization1['formatString']>) => string;
}

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
    case 'lrc':
      lang = 'fa';
      require('dayjs/locale/fa');
      break;
    case 'kn':
      require('dayjs/locale/kn');
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

const loc: ILocalization = new Localization({
  en: enJson,
  ar: require('./ar.json'),
  be: require('./be@tarask.json'),
  bg_bg: require('./bg_bg.json'),
  bqi: require('./bqi.json'),
  ca: require('./ca.json'),
  cy: require('./cy.json'),
  cs_cz: require('./cs_cz.json'),
  da_dk: require('./da_dk.json'),
  de_de: require('./de_de.json'),
  el: require('./el.json'),
  es: require('./es.json'),
  es_419: require('./es_419.json'),
  et: require('./et_EE.json'),
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
  lrc: require('./lrc.json'),
  ms: require('./ms.json'),
  kn: require('./kn.json'),
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

export const transactionTimeToReadable = (time: number | string) => {
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
    return String(time);
  }
  return ret;
};

export const removeTrailingZeros = (value: number | string): string => {
  let ret = value.toString();

  if (ret.indexOf('.') === -1) {
    return ret;
  }

  // Get device's decimal separator
  const { decimalSeparator } = RNLocalize.getNumberFormatSettings();

  // Create pattern with the correct decimal separator
  const dotSeparator = '.';

  // First standardize the decimal separator to period for processing
  if (decimalSeparator !== dotSeparator && ret.includes(decimalSeparator)) {
    ret = ret.replace(decimalSeparator, dotSeparator);
  }

  // Special case: if the value is exactly X.0, preserve the decimal point and zero
  if (/^\d+\.0+$/.test(ret)) {
    // Convert back to the device's decimal separator if needed
    if (decimalSeparator !== dotSeparator) {
      return ret.replace(dotSeparator, decimalSeparator);
    }
    return ret;
  }

  // Remove trailing zeros but preserve at least one decimal if present
  const parts = ret.split('.');
  if (parts.length === 2) {
    const cleanedDecimal = parts[1].replace(/0+$/, '');
    if (cleanedDecimal === '') {
      ret = parts[0]; // Remove decimal part entirely if it was all zeros
    } else {
      ret = parts[0] + '.' + cleanedDecimal;
    }
  }

  // Convert back to the device's decimal separator if needed
  if (decimalSeparator !== dotSeparator && ret.includes(dotSeparator)) {
    ret = ret.replace(new RegExp('\\' + dotSeparator, 'g'), decimalSeparator);
  }

  return ret;
};

/**
 * Parses a number string according to locale-specific rules,
 * strictly based on RNLocalize.getNumberFormatSettings()
 *
 * @param {string | number} numStr - The string representation of a number
 * @returns {number} The parsed float value
 */
export function parseNumberStringToFloat(numStr: string | number): number {
  if (numStr === null || numStr === undefined || numStr === '') return 0;

  // Convert to string if it's a number already
  const str = typeof numStr === 'string' ? numStr : String(numStr);

  // Always get fresh locale settings directly from the device
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

  try {
    // First, handle special case of empty string
    if (str.trim() === '') return 0;

    // Handle case with just a decimal separator (like ".5" or ",5")
    if (str === decimalSeparator || str === '.' || str === ',') {
      return 0;
    }

    // Handle leading decimal separator cases (like ".5" or ",5")
    if (
      str.startsWith(decimalSeparator) ||
      (decimalSeparator !== '.' && str.startsWith('.')) ||
      (decimalSeparator !== ',' && str.startsWith(','))
    ) {
      const withLeadingZero = '0' + (str.startsWith(decimalSeparator) ? str : str.replace(/^([.,])/, decimalSeparator));

      // Create standardized string with period as decimal
      let standardized = withLeadingZero;
      if (decimalSeparator !== '.' && standardized.includes(decimalSeparator)) {
        standardized = standardized.replace(decimalSeparator, '.');
      }

      return parseFloat(standardized);
    }

    // Special case: if the input is already a valid number with dot decimal separator,
    // and doesn't contain any locale-specific separators, just parse it directly
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return parseFloat(str);
    }

    // For more complex cases, we need to handle the separators explicitly

    // First, escape special regex characters in separators for safe regex use
    const safeGroupSep = groupingSeparator ? groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // Check if the input uses our separators
    const hasGroupSep = groupingSeparator && str.includes(groupingSeparator);
    const hasDecimalSep = decimalSeparator && str.includes(decimalSeparator);

    // Clean the string - keep only digits, decimal separator, minus sign and group separators
    const validCharsPattern = new RegExp(`[^\\d\\-${safeGroupSep}${decimalSeparator === '.' ? '\\.' : decimalSeparator}]`, 'g');
    let cleaned = str.replace(validCharsPattern, '');

    // Format detection - determine which style of number format is being used
    const commasAsDecimal = cleaned.includes(',') && (!cleaned.includes('.') || cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.'));

    // STANDARDIZING STEP: Convert to JavaScript's decimal point format

    // Handle both common number formats
    if (hasGroupSep) {
      // Remove all group separators
      cleaned = cleaned.replace(new RegExp(safeGroupSep, 'g'), '');
    }

    // Now handle decimal separator
    if (hasDecimalSep && decimalSeparator !== '.') {
      // Replace the decimal separator with a standard period
      cleaned = cleaned.replace(decimalSeparator, '.');
    }
    // Special case for comma as decimal without explicit locale setting
    else if (commasAsDecimal) {
      cleaned = cleaned.replace(',', '.');
    }

    // Final handling of European format (1.234,56 -> 1234.56)
    if ((cleaned.match(/\./g) || []).length > 1) {
      // Multiple periods found - this might be European format with periods as thousands separators
      // Remove all periods except the last one
      const parts = cleaned.split('.');
      const last = parts.pop();
      cleaned = parts.join('') + '.' + last;
    }

    // Parse the final cleaned string
    const result = parseFloat(cleaned);

    return isNaN(result) ? 0 : result;
  } catch (e) {
    console.error('Error in parseNumberStringToFloat:', e);
    return 0;
  }
}

export function _leaveNumbersAndDots(newInputValue: string) {
  if (!newInputValue) return '';

  // Get locale separators
  const { decimalSeparator } = localeSettings; // Remove unused groupSeparator

  // Clean the input by removing all characters except digits and the decimal separator
  const cleanInput = newInputValue.replace(new RegExp(`[^\\d${decimalSeparator}]`, 'g'), '');

  if (!cleanInput) return '';

  try {
    // Try to parse the number to validate it
    const numValue = parseNumberStringToFloat(cleanInput);

    if (!isNaN(numValue)) {
      // If we have a valid number, we need to determine if it has a decimal part
      const hasDecimalPart = cleanInput.includes(decimalSeparator);

      if (hasDecimalPart) {
        // Split by the decimal separator to preserve the decimal part exactly as entered
        const parts = cleanInput.split(decimalSeparator);
        if (parts.length === 2) {
          // Return in standard format with period as decimal separator for internal use
          return `${parts[0]}.${parts[1]}`;
        }
      }

      // If no decimal part or format is not recognized, just return the parsed number
      return numValue.toString();
    }
  } catch (e) {
    console.error('Error processing number input:', e);
  }

  // Fallback: Remove all non-digit characters except the first occurrence of the decimal separator
  let result = '';
  let hasAddedDecimalSeparator = false;

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    if (/\d/.test(char)) {
      // Always keep digits
      result += char;
    } else if ((char === '.' || char === ',') && !hasAddedDecimalSeparator) {
      // Convert any decimal separator to standard period for internal use
      result += '.';
      hasAddedDecimalSeparator = true;
    }
    // Ignore all other characters
  }

  return result;
}

/**
 * Custom number formatter that explicitly respects the number formatting settings
 * regardless of the device locale
 *
 * @param {number} num - Number to format
 * @param {number} decimals - Max decimal places
 * @returns {string} - Formatted number string
 */
function formatNumberWithSeparators(num: number, decimals: number = 8): string {
  // Always get latest formatting settings directly from RNLocalize
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

  // Convert to string with specified decimal places
  const str = num.toFixed(decimals);

  // Split into integer and decimal parts
  const parts = str.split('.');
  const integerPart = parts[0];
  // Remove trailing zeros from decimal part if needed
  const decimalPart = parts.length > 1 ? parts[1].replace(/0+$/, '') : '';

  // Format the integer part with grouping separators
  let formattedInteger = '';
  for (let i = 0; i < integerPart.length; i++) {
    if (i > 0 && (integerPart.length - i) % 3 === 0) {
      formattedInteger += groupingSeparator;
    }
    formattedInteger += integerPart[i];
  }

  // Return formatted number with appropriate separators
  return decimalPart ? `${formattedInteger}${decimalSeparator}${decimalPart}` : formattedInteger;
}

/**
 * Formats a number according to the device's locale settings
 * @param number The number to format
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
function formatNumberWithLocale(number: number | string, decimals: number = 2): string {
  try {
    // Convert string to number if needed
    const num = typeof number === 'string' ? parseFloat(number) : number;

    // Handle NaN and Infinity
    if (!isFinite(num)) {
      console.warn(`Attempt to format non-finite number: ${num}`);
      return '0';
    }

    // Always get fresh locale settings directly from RNLocalize
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

    // Safety check: ensure decimals is a positive number
    decimals = Math.max(0, Math.min(20, decimals || 0));

    // Format with appropriate decimal places
    let formatted;

    try {
      // Format the number but don't use the result directly

      // Instead of using Intl result directly, use our manual formatting
      // with the exact separators from RNLocalize
      const parts = num.toFixed(decimals).split('.');
      const integerPart = parts[0] || '0';
      const decimalPart = parts.length > 1 ? parts[1] : '';

      // Format integer part with grouping separators
      let formattedInteger = '';
      for (let i = 0; i < integerPart.length; i++) {
        if (i > 0 && (integerPart.length - i) % 3 === 0) {
          formattedInteger += groupingSeparator;
        }
        formattedInteger += integerPart[i];
      }

      // Combine with decimal part if available
      if (decimalPart && decimals > 0) {
        // Ensure we never have trailing zeros if not needed
        const significantDecimal = removeTrailingZeros(decimalPart);
        if (significantDecimal) {
          formatted = `${formattedInteger}${decimalSeparator}${significantDecimal}`;
        } else {
          formatted = formattedInteger;
        }
      } else {
        formatted = formattedInteger;
      }
    } catch (intlError) {
      console.warn('Intl.NumberFormat error, using manual formatting:', intlError);

      // Manual formatting as fallback - with extra safety
      try {
        // First get the fixed string representation
        const fixedString = num.toFixed(decimals);

        // Split into integer and decimal parts
        const parts = fixedString.split('.');
        const integerPart = parts[0] || '0';
        const decimalPart = parts.length > 1 ? parts[1] : '';

        // Format integer part with grouping separators
        let formattedInteger = '';
        for (let i = 0; i < integerPart.length; i++) {
          if (i > 0 && (integerPart.length - i) % 3 === 0) {
            formattedInteger += groupingSeparator || ','; // Fallback to comma if null
          }
          formattedInteger += integerPart[i];
        }

        // Combine with decimal part if available
        if (decimalPart) {
          formatted = `${formattedInteger}${decimalSeparator || '.'}${decimalPart}`;
        } else {
          formatted = formattedInteger;
        }
      } catch (manualError) {
        console.error('Manual formatting failed:', manualError);
        // Ultimate fallback
        formatted = String(num);
      }
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting number for device locale:', error);
    // Simple fallback if all formatting fails
    return String(number);
  }
}

export { formatNumberWithLocale };

/**
 * @param balance {number} Satoshis
 * @param toUnit {string} Value from models/bitcoinUnits.js
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces between groups of 000
 * @returns {string}
 */
export function formatBalance(balance: number, toUnit: string, withFormatting = false): string {
  if (toUnit === undefined) {
    return balance + ' ' + loc.units[BitcoinUnit.BTC];
  }

  // Get number formatting settings
  const { decimalSeparator } = RNLocalize.getNumberFormatSettings();

  if (toUnit === BitcoinUnit.BTC) {
    const btcValue = new BigNumber(balance).dividedBy(100000000).toFixed(8);

    if (withFormatting) {
      // Use our custom formatter that respects the RNLocalize settings
      const formattedValue = formatNumberWithSeparators(parseFloat(btcValue));
      return formattedValue + ' ' + loc.units[BitcoinUnit.BTC];
    } else {
      const valueWithoutTrailing = removeTrailingZeros(+btcValue);
      // Replace decimal point with device's decimal separator if needed
      const formattedValue = decimalSeparator !== '.' ? valueWithoutTrailing.replace('.', decimalSeparator) : valueWithoutTrailing;
      return formattedValue + ' ' + loc.units[BitcoinUnit.BTC];
    }
  } else if (toUnit === BitcoinUnit.SATS) {
    if (withFormatting) {
      // Use our custom formatter with 0 decimals for satoshis
      const formattedValue = formatNumberWithSeparators(balance, 0);
      return formattedValue + ' ' + loc.units[BitcoinUnit.SATS];
    } else {
      return String(balance) + ' ' + loc.units[BitcoinUnit.SATS];
    }
  } else {
    return satoshiToLocalCurrency(balance);
  }
}

/**
 *
 * @param balance {number} Satoshis
 * @param toUnit {string} Value from models/bitcoinUnits.js, for example `BitcoinUnit.SATS`
 * @param withFormatting {boolean} Works only with `BitcoinUnit.SATS`, makes spaces between groups of 000
 * @returns {string | number}
 */
export function formatBalanceWithoutSuffix(balance = 0, toUnit: string, withFormatting = false): string | number {
  if (toUnit === undefined) {
    return balance;
  }

  // Always get fresh locale settings
  const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

  if (toUnit === BitcoinUnit.BTC) {
    const value = new BigNumber(balance).dividedBy(100000000).toFixed(8);

    if (withFormatting) {
      // Use our improved formatNumberWithSeparators function
      return formatNumberWithSeparators(parseFloat(value));
    } else {
      const valueWithoutTrailing = removeTrailingZeros(value);
      // Replace decimal point with device's decimal separator if needed
      return decimalSeparator !== '.' ? valueWithoutTrailing.replace(/\./g, decimalSeparator) : valueWithoutTrailing;
    }
  } else if (toUnit === BitcoinUnit.SATS) {
    if (withFormatting) {
      try {
        // Use imported formatSats function from currency module
        const { formatSatsInternal } = require('../blue_modules/currency');
        return formatSatsInternal(balance);
      } catch (error) {
        console.error('Error formatting SATS in formatBalanceWithoutSuffix:', error);

        // Fallback to local implementation if import fails
        let formatted = '';
        const numberStr = String(balance);
        for (let i = 0; i < numberStr.length; i++) {
          if (i > 0 && (numberStr.length - i) % 3 === 0) {
            formatted += groupingSeparator;
          }
          formatted += numberStr[i];
        }
        return formatted;
      }
    } else {
      return String(balance);
    }
  } else {
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
  const newInputValue = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);

  if (typeof newInputValue === 'number') {
    return newInputValue.toString();
  }

  // Use the enhanced _leaveNumbersAndDots function
  return _leaveNumbersAndDots(newInputValue.toString());
}

/**
 * @see https://github.com/BlueWallet/BlueWallet/issues/3466
 */
export function formatStringAddTwoWhiteSpaces(text: string): string {
  return `${text}  `;
}

/**
 * Cleans a number string by removing all characters except digits, decimal separator and negative sign
 * @param numStr The number string to clean
 * @returns A standardized number string with proper decimal separator
 *
 * @export - Exported for use in UI components
 */
export function cleanNumberString(numStr: string): string {
  if (!numStr) return '';

  // Get device's locale settings
  const { decimalSeparator } = RNLocalize.getNumberFormatSettings();

  // Escape special regex characters in the decimal separator
  const safeDecimalSep = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Keep only digits, decimal separator, and minus sign
  const validCharsPattern = new RegExp(`[^\\d${safeDecimalSep}\\-]`, 'g');
  const sanitizedText = numStr.replace(validCharsPattern, '');

  // Ensure there's only one decimal separator
  if (sanitizedText.includes(decimalSeparator)) {
    const parts = sanitizedText.split(decimalSeparator);
    // Keep first occurrence of decimal separator
    return `${parts[0]}${decimalSeparator}${parts.slice(1).join('')}`;
  }

  return sanitizedText;
}

/**
 * Determines an appropriate font size for displaying an amount
 * @param amount The amount string to display
 * @param defaultSize The default font size
 * @returns Appropriate font size for the amount
 */
export function getTextSizeForAmount(amount: string | null | undefined, defaultSize = 36): number {
  if (!amount) return defaultSize;

  const length = amount.toString().length;

  if (length > 15) {
    return 16; // Very long numbers (e.g., with decimals)
  } else if (length > 10) {
    return 20; // Long numbers
  }

  return defaultSize; // Default size
}

export default loc;
