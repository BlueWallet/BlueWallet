import assert from 'assert';

import { _setExchangeRate, _setPreferredFiatCurrency, _setSkipUpdateExchangeRate } from '../../blue_modules/currency';
import { _leaveNumbersAndDots, formatBalance, formatBalancePlain, formatBalanceWithoutSuffix, mapSystemLocaleToAppLanguage } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';

describe('Localization', () => {
  it('internal formatter', () => {
    assert.strictEqual(_leaveNumbersAndDots('1,00 ₽'), '1');
    assert.strictEqual(_leaveNumbersAndDots('0,50 ₽"'), '0.50');
    assert.strictEqual(_leaveNumbersAndDots('RUB 1,00'), '1');
  });

  it('formatBalancePlain() && formatBalancePlain()', () => {
    _setExchangeRate('BTC_RUB', 660180.143);
    _setPreferredFiatCurrency(FiatUnit.RUB);
    let newInputValue = formatBalanceWithoutSuffix(152, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 1.00' || newInputValue === '1,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(152, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1');

    newInputValue = formatBalanceWithoutSuffix(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 10.00' || newInputValue === '10,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '10');

    newInputValue = formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 110,869.52' || newInputValue === '110 869,52 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '110869.52');

    newInputValue = formatBalancePlain(76, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '0.50');

    _setExchangeRate('BTC_USD', 10000);
    _setPreferredFiatCurrency(FiatUnit.USD);
    newInputValue = formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '$1,679.38');
    newInputValue = formatBalancePlain(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1679.38');

    newInputValue = formatBalancePlain(16000000, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1600');
  });

  it.each([
    [123000000, BitcoinUnit.SATS, false, '123000000', false],
    [123000000, BitcoinUnit.SATS, true, '123,000,000', false],
    [123456000, BitcoinUnit.BTC, true, '1.23456', false],
    ['123456000', BitcoinUnit.BTC, true, '1.23456', false], // can handle strings
    [100000000, BitcoinUnit.BTC, true, '1', false],
    [10000000, BitcoinUnit.BTC, true, '0.1', false],
    [1, BitcoinUnit.BTC, true, '0.00000001', false],
    [10000000, BitcoinUnit.LOCAL_CURRENCY, true, '...', true], // means unknown since we did not receive exchange rate
  ])(
    'can formatBalanceWithoutSuffix',
    async (balance, toUnit, withFormatting, expectedResult, shouldResetRate) => {
      _setExchangeRate('BTC_USD', 1);
      _setPreferredFiatCurrency(FiatUnit.USD);
      if (shouldResetRate) {
        _setExchangeRate('BTC_USD', false);
        _setSkipUpdateExchangeRate();
      }
      const actualResult = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  it.each([
    [123000000, BitcoinUnit.SATS, false, '123000000 sats'],
    [123000000, BitcoinUnit.BTC, false, '1.23 BTC'],
    [15, BitcoinUnit.BTC, false, '0.00000015 BTC'],
    [1, BitcoinUnit.BTC, false, '0.00000001 BTC'],
    [0, BitcoinUnit.BTC, false, '0 BTC'],
    [123000000, BitcoinUnit.LOCAL_CURRENCY, false, '$1.23'],
  ])(
    'can formatBalance',
    async (balance, toUnit, withFormatting, expectedResult) => {
      _setExchangeRate('BTC_USD', 1);
      _setPreferredFiatCurrency(FiatUnit.USD);
      const actualResult = formatBalance(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  describe('mapSystemLocaleToAppLanguage', () => {
    it.each([
      // Direct matches (languageCode === app value)
      [{ languageCode: 'en', countryCode: 'US' }, 'en'],
      [{ languageCode: 'ar', countryCode: 'SA' }, 'ar'],
      [{ languageCode: 'he', countryCode: 'IL' }, 'he'],
      [{ languageCode: 'it', countryCode: 'IT' }, 'it'],
      [{ languageCode: 'pl', countryCode: 'PL' }, 'pl'],
      [{ languageCode: 'ro', countryCode: 'RO' }, 'ro'],
      [{ languageCode: 'ru', countryCode: 'RU' }, 'ru'],
      [{ languageCode: 'ca', countryCode: 'ES' }, 'ca'],
      // Mapped language codes
      [{ languageCode: 'fr', countryCode: 'FR' }, 'fr_fr'],
      [{ languageCode: 'de', countryCode: 'DE' }, 'de_de'],
      [{ languageCode: 'ja', countryCode: 'JP' }, 'jp_jp'],
      [{ languageCode: 'ko', countryCode: 'KR' }, 'ko_kr'],
      [{ languageCode: 'uk', countryCode: 'UA' }, 'ua'],
      [{ languageCode: 'tr', countryCode: 'TR' }, 'tr_tr'],
      [{ languageCode: 'nl', countryCode: 'NL' }, 'nl_nl'],
      [{ languageCode: 'sv', countryCode: 'SE' }, 'sv_se'],
      [{ languageCode: 'da', countryCode: 'DK' }, 'da_dk'],
      [{ languageCode: 'nb', countryCode: 'NO' }, 'nb_no'],
      [{ languageCode: 'fi', countryCode: 'FI' }, 'fi_fi'],
      [{ languageCode: 'hu', countryCode: 'HU' }, 'hu_hu'],
      [{ languageCode: 'cs', countryCode: 'CZ' }, 'cs_cz'],
      [{ languageCode: 'sk', countryCode: 'SK' }, 'sk_sk'],
      [{ languageCode: 'bg', countryCode: 'BG' }, 'bg_bg'],
      [{ languageCode: 'hr', countryCode: 'HR' }, 'hr_hr'],
      [{ languageCode: 'sl', countryCode: 'SI' }, 'sl_si'],
      [{ languageCode: 'vi', countryCode: 'VN' }, 'vi_vn'],
      [{ languageCode: 'th', countryCode: 'TH' }, 'th_th'],
      [{ languageCode: 'id', countryCode: 'ID' }, 'id_id'],
      [{ languageCode: 'af', countryCode: 'ZA' }, 'zar_afr'],
      [{ languageCode: 'xh', countryCode: 'ZA' }, 'zar_xho'],
      // Chinese variants
      [{ languageCode: 'zh', countryCode: 'CN', scriptCode: 'Hans' }, 'zh_cn'],
      [{ languageCode: 'zh', countryCode: 'TW', scriptCode: 'Hant' }, 'zh_tw'],
      [{ languageCode: 'zh', countryCode: 'CN' }, 'zh_cn'],
      // Portuguese variants
      [{ languageCode: 'pt', countryCode: 'BR' }, 'pt_br'],
      [{ languageCode: 'pt', countryCode: 'PT' }, 'pt_pt'],
      // Spanish variants
      [{ languageCode: 'es', countryCode: 'ES' }, 'es'],
      [{ languageCode: 'es', countryCode: 'MX' }, 'es_419'],
      [{ languageCode: 'es', countryCode: '419' }, 'es_419'],
      [{ languageCode: 'es', countryCode: 'AR' }, 'es_419'],
      // Unknown language
      [{ languageCode: 'xx', countryCode: 'XX' }, undefined],
    ])('maps %j to %s', (locale, expected) => {
      assert.strictEqual(mapSystemLocaleToAppLanguage(locale), expected);
    });
  });
});
