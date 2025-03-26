import assert from 'assert';

import { _setExchangeRate, _setPreferredFiatCurrency, _setSkipUpdateExchangeRate } from '../../blue_modules/currency';
import {
  _leaveNumbersAndDots,
  cleanNumberString,
  formatBalance,
  formatBalancePlain,
  formatBalanceWithoutSuffix,
  getTextSizeForAmount,
  parseNumberStringToFloat,
  removeTrailingZeros,
} from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';

describe('Localization', () => {
  it('internal formatter', () => {
    assert.strictEqual(_leaveNumbersAndDots('1,00 ₽'), '1');
    assert.strictEqual(_leaveNumbersAndDots('0,50 ₽"'), '0.50');
    assert.strictEqual(_leaveNumbersAndDots('RUB 1,00'), '1');
  });

  it('formatBalancePlain() && formatBalanceWithoutSuffix()', () => {
    _setExchangeRate('BTC_RUB', 660180.143);
    _setPreferredFiatCurrency(FiatUnit.RUB);
    let newInputValue = formatBalanceWithoutSuffix(152, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 1.00' || newInputValue === '1,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(152, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1');

    newInputValue = formatBalanceWithoutSuffix(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 10.00' || newInputValue === '10,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '10');

    newInputValue = formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 110,869.52' || newInputValue === '110 869,52 ₽', 'Unexpected: ' + newInputValue);
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

  // Add tests for new functions
  it('should clean number strings correctly', () => {
    assert.strictEqual(cleanNumberString('123,456.78'), '123456.78');
    assert.strictEqual(cleanNumberString('-123,456.78'), '-123456.78');
    assert.strictEqual(cleanNumberString('$1,234.56'), '1234.56');
    assert.strictEqual(cleanNumberString('1,234.56 USD'), '1234.56');
    assert.strictEqual(cleanNumberString('1.234,56'), '1234,56'); // keep comma as decimal if it's used that way
  });

  it('should parse number strings to floats according to locale', () => {
    assert.strictEqual(parseNumberStringToFloat('1234.56'), 1234.56);
    assert.strictEqual(parseNumberStringToFloat('1,234.56'), 1234.56);
    assert.strictEqual(parseNumberStringToFloat('1.234,56'), 1234.56); // Handles European format
    assert.strictEqual(parseNumberStringToFloat('-1,234.56'), -1234.56);
    assert.strictEqual(parseNumberStringToFloat('not a number'), 0);
    assert.strictEqual(parseNumberStringToFloat(''), 0);
  });

  it('should remove trailing zeros according to locale', () => {
    assert.strictEqual(removeTrailingZeros(1.2), '1.2');
    assert.strictEqual(removeTrailingZeros(1.0), '1.0'); // Keeps at least one decimal place
    assert.strictEqual(removeTrailingZeros('123.4500'), '123.45');
    assert.strictEqual(removeTrailingZeros('100.0000'), '100.0');
    assert.strictEqual(removeTrailingZeros(100), '100'); // No decimal point, no change
  });

  it('should calculate appropriate font size for amount display', () => {
    assert.strictEqual(getTextSizeForAmount('123'), 36); // Default size
    assert.strictEqual(getTextSizeForAmount('1234567890'), 36); // 10 chars - default size
    assert.strictEqual(getTextSizeForAmount('12345678901'), 20); // 11 chars - smaller
    assert.strictEqual(getTextSizeForAmount('1234567890123456'), 16); // Very long - smallest
    assert.strictEqual(getTextSizeForAmount(null), 36); // Handles null - default
    assert.strictEqual(getTextSizeForAmount(undefined), 36); // Handles undefined - default
    assert.strictEqual(getTextSizeForAmount(''), 36); // Handles empty - default
    assert.strictEqual(getTextSizeForAmount(123), 36); // Handles number - default
  });
});
