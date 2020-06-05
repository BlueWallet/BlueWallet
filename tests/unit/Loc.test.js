/* global it, describe */
import { BitcoinUnit } from '../../models/bitcoinUnits';
const assert = require('assert');
const fs = require('fs');
const loc = require('../../loc/');

describe('Localization', () => {
  it.each([
    [123000000, BitcoinUnit.SATS, false, '123000000'],
    [123000000, BitcoinUnit.SATS, true, '123 000 000'],
    [123456000, BitcoinUnit.BTC, true, '1.23456'],
    ['123456000', BitcoinUnit.BTC, true, '1.23456'], // can handle strings
    [100000000, BitcoinUnit.BTC, true, '1'],
    [10000000, BitcoinUnit.BTC, true, '0.1'],
    [1, BitcoinUnit.BTC, true, '0.00000001'],
    [10000000, BitcoinUnit.LOCAL_CURRENCY, true, '...'], // means unknown since we did not receive exchange rate
  ])(
    'can formatBalanceWithoutSuffix',
    async (balance, toUnit, withFormatting, expectedResult) => {
      const actualResult = loc.formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  it.each([
    [123000000, BitcoinUnit.SATS, false, '123000000 sats'],
    [123000000, BitcoinUnit.BTC, false, '1.23 BTC'],
    [123000000, BitcoinUnit.LOCAL_CURRENCY, false, '...'], // means unknown since we did not receive exchange rate
  ])(
    'can formatBalance',
    async (balance, toUnit, withFormatting, expectedResult) => {
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
          if (lang === 'en.js') continue; // iteratin all locales except EN
          if (lang === 'index.js') continue;

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
