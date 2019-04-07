import Localization from 'react-localization';
import { AsyncStorage } from 'react-native';
import { AppStorage } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
import relativeTime from 'dayjs/plugin/relativeTime';
const dayjs = require('dayjs');
const currency = require('../currency');
const BigNumber = require('bignumber.js');
let strings;
dayjs.extend(relativeTime);

// first-time loading sequence
(async () => {
  // finding out whether lang preference was saved
  let lang = await AsyncStorage.getItem(AppStorage.LANG);
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
        require('dayjs/locale/zh-cn');
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
  ru: require('./ru.js'),
  pt_br: require('./pt_BR.js'),
  pt_pt: require('./pt_PT.js'),
  es: require('./es.js'),
  it: require('./it.js'),
  el: require('./el.js'),
  ua: require('./ua.js'),
  jp_jp: require('./jp_JP.js'),
  de_de: require('./de_DE.js'),
  da_dk: require('./da_DK.js'),
  cs_cz: require('./cs_CZ.js'),
  th_th: require('./th_TH.js'),
  nl_nl: require('./nl_NL.js'),
  fi_fi: require('./fi_FI.js'),
  fr_fr: require('./fr_FR.js'),
  hr_hr: require('./hr_HR.js'),
  id_id: require('./id_ID.js'),
  zh_cn: require('./zh_cn.js'),
  sv_se: require('./sv_SE.js'),
  nb_no: require('./nb_NO.js'),
  tr_tr: require('./tr_TR.js'),
});

strings.saveLanguage = lang => AsyncStorage.setItem(AppStorage.LANG, lang);

strings.transactionTimeToReadable = time => {
  if (time === 0) {
    return strings._.never;
  }
  return dayjs(time).fromNow();
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
    return balance + ' ' + BitcoinUnit.BTC;
  }
  if (toUnit === BitcoinUnit.BTC) {
    return balance + ' ' + BitcoinUnit.BTC;
  } else if (toUnit === BitcoinUnit.SATS) {
    const value = new BigNumber(balance).multipliedBy(100000000);
    return (
      (balance < 0 ? '-' : '') +
      (withFormatting ? new Intl.NumberFormat().format(value.toString()).replace(/[^0-9]/g, ' ') : value) +
      ' ' +
      BitcoinUnit.SATS
    );
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
strings.formatBalanceWithoutSuffix = (balance, toUnit, withFormatting = false) => {
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
};

module.exports = strings;
