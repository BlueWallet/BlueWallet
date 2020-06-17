/* global it, describe */
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';
const assert = require('assert');
const fs = require('fs');
const loc = require('../../loc/');
const currency = require('../../blue_modules/currency');

describe('Localization', () => {
  it('internal formatter', () => {
    assert.strictEqual(loc._leaveNumbersAndDots('1,00 ₽'), '1');
    assert.strictEqual(loc._leaveNumbersAndDots('0,50 ₽"'), '0.50');
    assert.strictEqual(loc._leaveNumbersAndDots('RUB 1,00'), '1');
  });

  it('formatBalancePlain() && formatBalancePlain()', () => {
    currency._setExchangeRate('BTC_RUB', 660180.143);
    currency._setPreferredFiatCurrency(FiatUnit.RUB);
    let newInputValue = loc.formatBalanceWithoutSuffix(152, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, 'RUB 1.00');
    newInputValue = loc.formatBalancePlain(152, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1');

    newInputValue = loc.formatBalanceWithoutSuffix(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, 'RUB 10.00');
    newInputValue = loc.formatBalancePlain(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '10');

    newInputValue = loc.formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, 'RUB 110,869.52');
    newInputValue = loc.formatBalancePlain(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '110869.52');

    newInputValue = loc.formatBalancePlain(76, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '0.50');

    currency._setExchangeRate('BTC_USD', 10000);
    currency._setPreferredFiatCurrency(FiatUnit.USD);
    newInputValue = loc.formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '$1,679.38');
    newInputValue = loc.formatBalancePlain(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1679.38');

    newInputValue = loc.formatBalancePlain(16000000, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1600');
  });

  it.each([
    [123000000, BitcoinUnit.SATS, false, '123000000', false],
    [123000000, BitcoinUnit.SATS, true, '123 000 000', false],
    [123456000, BitcoinUnit.BTC, true, '1.23456', false],
    ['123456000', BitcoinUnit.BTC, true, '1.23456', false], // can handle strings
    [100000000, BitcoinUnit.BTC, true, '1', false],
    [10000000, BitcoinUnit.BTC, true, '0.1', false],
    [1, BitcoinUnit.BTC, true, '0.00000001', false],
    [10000000, BitcoinUnit.LOCAL_CURRENCY, true, '...', true], // means unknown since we did not receive exchange rate
  ])(
    'can formatBalanceWithoutSuffix',
    async (balance, toUnit, withFormatting, expectedResult, shouldResetRate) => {
      currency._setExchangeRate('BTC_USD', 1);
      currency._setPreferredFiatCurrency(FiatUnit.USD);
      if (shouldResetRate) {
        currency._setExchangeRate('BTC_USD', false);
      }
      const actualResult = loc.formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  it.each([
    [123000000, BitcoinUnit.SATS, false, '123000000 sats'],
    [123000000, BitcoinUnit.BTC, false, '1.23 BTC'],
    [123000000, BitcoinUnit.LOCAL_CURRENCY, false, '$1.23'],
  ])(
    'can formatBalance',
    async (balance, toUnit, withFormatting, expectedResult) => {
      currency._setExchangeRate('BTC_USD', 1);
      currency._setPreferredFiatCurrency(FiatUnit.USD);
      const actualResult = loc.formatBalance(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  it('has all keys in all locales', async () => {
    const en = require('../../loc/en');
    let issues = 0;
    for (const key1 of Object.keys(en)) {
      for (const key2 of Object.keys(en[key1])) {
        // iterating all keys and subkeys in EN locale, which is main
        const files = fs.readdirSync('./loc/');

        for (const lang of files) {
          if (lang === 'en.js' || lang === 'index.js' || lang === 'languages.js') continue; // iteratin all locales except EN

          const locale = require('../../loc/' + lang);

          if (typeof locale[key1] === 'undefined') {
            console.error('Missing: ' + lang + '.' + key1);
            issues++;
          } else if (typeof locale[key1][key2] === 'undefined') {
            console.error('Missing: ' + lang + '.' + key1 + '.' + key2);
            issues++;
          }

          // level 1 & 2 done, doing level 3 (if it exists):

          if (typeof en[key1][key2] !== 'string') {
            for (const key3 of Object.keys(en[key1][key2])) {
              if (typeof locale[key1][key2][key3] === 'undefined') {
                console.error('Missing: ' + lang + '.' + key1 + '.' + key2 + '.' + key3);
                issues++;
              }
            }
          }
        }
      }
    }
    assert.ok(issues === 0, 'Some localizations are missing keys. Total issues: ' + issues);
  });
});
