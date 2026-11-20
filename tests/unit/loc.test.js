import assert from 'assert';

import { _setExchangeRate, _setPreferredFiatCurrency, _setSkipUpdateExchangeRate } from '../../blue_modules/currency';
import loc, {
  _leaveNumbersAndDots,
  formatBalance,
  formatBalancePlain,
  formatBalanceWithoutSuffix,
  parsedLanguages,
  saveLanguage,
} from '../../loc';
import enJson from '../../loc/en.json';
import ruJson from '../../loc/ru.json';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';

describe('Localization', () => {
  it('switches active language and round-trips back to en', async () => {
    await saveLanguage('en');
    const enValue = enJson._.never;
    assert.strictEqual(loc._.never, enValue, 'starts on en');

    await saveLanguage('ru');
    assert.strictEqual(loc.getLanguage(), 'ru', 'active language is ru');
    assert.strictEqual(loc._.never, ruJson._.never, 'ru strings applied');
    assert.notStrictEqual(loc._.never, enValue, 'ru differs from en');

    await saveLanguage('en');
    assert.strictEqual(loc.getLanguage(), 'en', 'active language back to en');
    assert.strictEqual(loc._.never, enValue, 'en strings restored');
  });

  it('caches parsed language dictionaries across toggles', async () => {
    // fr_fr is untouched by other tests so we observe the first cache fill, not a residue.
    await saveLanguage('fr_fr');
    assert.ok('fr_fr' in parsedLanguages, 'fr_fr cached after first switch');
    const cached = parsedLanguages.fr_fr;

    await saveLanguage('en');
    await saveLanguage('fr_fr');
    assert.strictEqual(parsedLanguages.fr_fr, cached, 'cached dict reused, not re-required');
  });

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
      // Pin to en so BTC/SATS assertions are deterministic; locale-aware behaviour
      // is exercised by the dedicated describe block below.
      await saveLanguage('en');
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
      await saveLanguage('en');
      _setExchangeRate('BTC_USD', 1);
      _setPreferredFiatCurrency(FiatUnit.USD);
      const actualResult = formatBalance(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  describe('locale-aware separators (issue #7504)', () => {
    afterEach(async () => {
      await saveLanguage('en');
    });

    it('BTC amounts use the active language decimal separator', async () => {
      await saveLanguage('de_de');
      // 1.23456 BTC in German uses comma as decimal separator
      assert.strictEqual(formatBalance(123456000, BitcoinUnit.BTC, false), '1,23456 BTC');
      assert.strictEqual(formatBalanceWithoutSuffix(123456000, BitcoinUnit.BTC, false), '1,23456');

      await saveLanguage('es');
      assert.strictEqual(formatBalance(123456000, BitcoinUnit.BTC, false), '1,23456 BTC');

      await saveLanguage('en');
      assert.strictEqual(formatBalance(123456000, BitcoinUnit.BTC, false), '1.23456 BTC');
    });

    it('SATS amounts use the active language thousands separator', async () => {
      await saveLanguage('en');
      assert.strictEqual(formatBalance(123000000, BitcoinUnit.SATS, true), '123,000,000 sats');

      await saveLanguage('de_de');
      // German thousands separator is "."
      assert.strictEqual(formatBalance(123000000, BitcoinUnit.SATS, true), '123.000.000 sats');

      await saveLanguage('es');
      // Spanish thousands separator is "."
      assert.strictEqual(formatBalance(123000000, BitcoinUnit.SATS, true), '123.000.000 sats');
    });

    it('SATS with withFormatting=false stays unformatted regardless of locale', async () => {
      await saveLanguage('de_de');
      assert.strictEqual(formatBalance(123000000, BitcoinUnit.SATS, false), '123000000 sats');
    });

    it('falls back gracefully for unknown locale tags', async () => {
      // Unusual codes like "kk@Cyrl" (Linux-style modifier, not BCP 47) must not throw.
      await saveLanguage('kk@Cyrl');
      const result = formatBalance(123000000, BitcoinUnit.SATS, true);
      // We don't pin the unit suffix because some languages translate "sats" itself.
      assert.ok(typeof result === 'string' && /\d/.test(result), 'Unexpected: ' + result);
    });

    // Several BlueWallet language codes are NOT valid BCP 47 (e.g. "jp_jp", "ua",
    // "zar_afr", "kk@Cyrl"). Naive underscore->dash normalisation would silently
    // resolve them to en-US in Intl.NumberFormat — defeating the locale fix for
    // those users. Each case below pins separators that are clearly distinct from
    // en-US (NBSP thousands, comma decimal) so a silent fallback would fail loudly.
    const NBSP = ' ';

    it('maps "ua" to Ukrainian (uk)', async () => {
      await saveLanguage('ua');
      // Ukrainian: NBSP thousands, comma decimal
      assert.strictEqual(formatBalanceWithoutSuffix(1234567, BitcoinUnit.SATS, true), `1${NBSP}234${NBSP}567`);
      assert.strictEqual(formatBalanceWithoutSuffix(123456000, BitcoinUnit.BTC, false), '1,23456');
    });

    it('maps "zar_afr" to Afrikaans (af)', async () => {
      await saveLanguage('zar_afr');
      // Afrikaans: NBSP thousands, comma decimal
      assert.strictEqual(formatBalanceWithoutSuffix(1234567, BitcoinUnit.SATS, true), `1${NBSP}234${NBSP}567`);
      assert.strictEqual(formatBalanceWithoutSuffix(123456000, BitcoinUnit.BTC, false), '1,23456');
    });

    it('maps "kk@Cyrl" to Kazakh-Cyrillic (kk-Cyrl)', async () => {
      await saveLanguage('kk@Cyrl');
      // Kazakh: NBSP thousands, comma decimal
      assert.strictEqual(formatBalanceWithoutSuffix(1234567, BitcoinUnit.SATS, true), `1${NBSP}234${NBSP}567`);
      assert.strictEqual(formatBalanceWithoutSuffix(123456000, BitcoinUnit.BTC, false), '1,23456');
    });

    it('does not throw on "jp_jp" (Japanese)', async () => {
      // ja-JP groups identically to en-US for plain numbers, so this can't
      // visually distinguish the two. But the override must still route jp_jp
      // through Intl without exception (and without crashing the formatter).
      await saveLanguage('jp_jp');
      assert.strictEqual(formatBalanceWithoutSuffix(1234567, BitcoinUnit.SATS, true), '1,234,567');
    });
  });
});
