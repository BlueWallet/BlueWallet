import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';
import { _leaveNumbersAndDots, formatBalanceWithoutSuffix, formatBalancePlain, formatBalance } from '../../loc';
const currency = require('../../blue_modules/currency');

jest.useFakeTimers();

describe('Localization', () => {
  it('internal formatter', () => {
    expect(_leaveNumbersAndDots('1,00 ₽')).toBe('1');
    expect(_leaveNumbersAndDots('0,50 ₽"')).toBe('0.50');
    expect(_leaveNumbersAndDots('RUB 1,00')).toBe('1');
  });

  it('formatBalancePlain() && formatBalancePlain()', () => {
    currency._setExchangeRate('BTC_RUB', 660180.143);
    currency._setPreferredFiatCurrency(FiatUnit.RUB);
    let newInputValue = formatBalanceWithoutSuffix(152, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue === 'RUB 1.00' || newInputValue === '1,00 ₽').toBeTruthy();
    newInputValue = formatBalancePlain(152, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('1');

    newInputValue = formatBalanceWithoutSuffix(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue === 'RUB 10.00' || newInputValue === '10,00 ₽').toBeTruthy();
    newInputValue = formatBalancePlain(1515, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('10');

    newInputValue = formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue === 'RUB 110,869.52' || newInputValue === '110 869,52 ₽').toBeTruthy();
    newInputValue = formatBalancePlain(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('110869.52');

    newInputValue = formatBalancePlain(76, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('0.50');

    currency._setExchangeRate('BTC_USD', 10000);
    currency._setPreferredFiatCurrency(FiatUnit.USD);
    newInputValue = formatBalanceWithoutSuffix(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('$1,679.38');
    newInputValue = formatBalancePlain(16793829, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('1679.38');

    newInputValue = formatBalancePlain(16000000, BitcoinUnit.LOCAL_CURRENCY, false);
    expect(newInputValue).toBe('1600');
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
      currency._setExchangeRate('BTC_USD', 1);
      currency._setPreferredFiatCurrency(FiatUnit.USD);
      if (shouldResetRate) {
        currency._setExchangeRate('BTC_USD', false);
      }
      const actualResult = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);
      expect(actualResult).toBe(expectedResult);
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
      const actualResult = formatBalance(balance, toUnit, withFormatting);
      expect(actualResult).toBe(expectedResult);
    },
    240000,
  );
});
