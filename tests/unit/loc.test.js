import { DoichainUnit } from '../../models/doichainUnits';
import { FiatUnit } from '../../models/fiatUnit';
import { _leaveNumbersAndDots, formatBalanceWithoutSuffix, formatBalancePlain, formatBalance } from '../../loc';
const assert = require('assert');
const currency = require('../../blue_modules/currency');
jest.useFakeTimers();

describe('Localization', () => {
  it('internal formatter', () => {
    assert.strictEqual(_leaveNumbersAndDots('1,00 ₽'), '1');
    assert.strictEqual(_leaveNumbersAndDots('0,50 ₽"'), '0.50');
    assert.strictEqual(_leaveNumbersAndDots('RUB 1,00'), '1');
  });

  it('formatBalancePlain() && formatBalancePlain()', () => {
    currency._setExchangeRate('BTC_RUB', 660180.143);
    currency._setPreferredFiatCurrency(FiatUnit.RUB);
    let newInputValue = formatBalanceWithoutSuffix(152, DoichainUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 1.00' || newInputValue === '1,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(152, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1');

    newInputValue = formatBalanceWithoutSuffix(1515, DoichainUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 10.00' || newInputValue === '10,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(1515, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '10');

    newInputValue = formatBalanceWithoutSuffix(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 110,869.52' || newInputValue === '110 869,52 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '110869.52');

    newInputValue = formatBalancePlain(76, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '0.50');

    currency._setExchangeRate('BTC_USD', 10000);
    currency._setPreferredFiatCurrency(FiatUnit.USD);
    newInputValue = formatBalanceWithoutSuffix(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '$1,679.38');
    newInputValue = formatBalancePlain(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1679.38');

    newInputValue = formatBalancePlain(16000000, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1600');
  });

  it.each([
    [123000000, DoichainUnit.SWARTZ, false, '123000000', false],
    [123000000, DoichainUnit.SWARTZ, true, '123,000,000', false],
    [123456000, DoichainUnit.DOI, true, '1.23456', false],
    ['123456000', DoichainUnit.DOI, true, '1.23456', false], // can handle strings
    [100000000, DoichainUnit.DOI, true, '1', false],
    [10000000, DoichainUnit.DOI, true, '0.1', false],
    [1, DoichainUnit.DOI, true, '0.00000001', false],
    [10000000, DoichainUnit.LOCAL_CURRENCY, true, '...', true], // means unknown since we did not receive exchange rate
  ])(
    'can formatBalanceWithoutSuffix',
    async (balance, toUnit, withFormatting, expectedResult, shouldResetRate) => {
      currency._setExchangeRate('BTC_USD', 1);
      currency._setPreferredFiatCurrency(FiatUnit.USD);
      if (shouldResetRate) {
        currency._setExchangeRate('BTC_USD', false);
      }
      const actualResult = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  it.each([
    [123000000, DoichainUnit.SWARTZ, false, '123000000 sats'],
    [123000000, DoichainUnit.DOI, false, '1.23 BTC'],
    [123000000, DoichainUnit.LOCAL_CURRENCY, false, '$1.23'],
  ])(
    'can formatBalance',
    async (balance, toUnit, withFormatting, expectedResult) => {
      currency._setExchangeRate('BTC_USD', 1);
      currency._setPreferredFiatCurrency(FiatUnit.USD);
      const actualResult = formatBalance(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );
});
