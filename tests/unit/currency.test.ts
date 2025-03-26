import assert from 'assert';

import {
  _setExchangeRate,
  _setPreferredFiatCurrency,
  BTCToLocalCurrency,
  formatNumberByUnit,
  formatNumberWithLocale,
  parsePastedNumber,
  satoshiToBTC,
  satoshiToLocalCurrency,
} from '../../blue_modules/currency';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';

describe('currency', () => {
  it('formats everything correctly', async () => {
    _setExchangeRate('BTC_USD', 10000);

    assert.strictEqual(satoshiToLocalCurrency(1), '$0.0001');
    assert.strictEqual(satoshiToLocalCurrency(-1), '-$0.0001');
    assert.strictEqual(satoshiToLocalCurrency(123), '$0.01');
    assert.strictEqual(satoshiToLocalCurrency(156), '$0.02');
    assert.strictEqual(satoshiToLocalCurrency(51), '$0.01');
    assert.strictEqual(satoshiToLocalCurrency(45), '$0.0045');
    assert.strictEqual(satoshiToLocalCurrency(123456789), '$12,345.68');

    assert.strictEqual(BTCToLocalCurrency(1), '$10,000.00');
    assert.strictEqual(BTCToLocalCurrency(-1), '-$10,000.00');
    assert.strictEqual(BTCToLocalCurrency(1.00000001), '$10,000.00');
    assert.strictEqual(BTCToLocalCurrency(1.0000123), '$10,000.12');
    assert.strictEqual(BTCToLocalCurrency(1.0000146), '$10,000.15');

    assert.strictEqual(satoshiToBTC(1), '0.00000001');
    assert.strictEqual(satoshiToBTC(-1), '-0.00000001');
    assert.strictEqual(satoshiToBTC(100000000), '1');
    assert.strictEqual(satoshiToBTC(123456789123456789), '1234567891.2345678'); // eslint-disable-line @typescript-eslint/no-loss-of-precision

    _setPreferredFiatCurrency(FiatUnit.JPY);
    _setExchangeRate('BTC_JPY', 1043740.8614);

    assert.ok(satoshiToLocalCurrency(1) === '¥0.01' || satoshiToLocalCurrency(1) === '￥0.01', 'Unexpected: ' + satoshiToLocalCurrency(1));
  });

  // Add new tests for the currency formatting functions
  it('formats numbers by unit correctly', () => {
    // Test BTC formatting
    assert.strictEqual(formatNumberByUnit(1.23456789, BitcoinUnit.BTC), '1.23456789');
    assert.strictEqual(formatNumberByUnit(1000.5, BitcoinUnit.BTC), '1,000.5');

    // Test SATS formatting - no decimals
    assert.strictEqual(formatNumberByUnit(1000, BitcoinUnit.SATS), '1,000');
    assert.strictEqual(formatNumberByUnit(1234567, BitcoinUnit.SATS), '1,234,567');

    // Test with override decimal places
    assert.strictEqual(formatNumberByUnit(1.23456789, BitcoinUnit.BTC, 2), '1.23');
    assert.strictEqual(formatNumberByUnit(1.23456789, BitcoinUnit.BTC, 0), '1');
  });

  it('formats numbers with locale correctly', () => {
    // Basic formatting
    assert.strictEqual(formatNumberWithLocale(1234.56), '1,234.56');
    assert.strictEqual(formatNumberWithLocale(1234.56, 0), '1,235');
    assert.strictEqual(formatNumberWithLocale(1234.56, 4), '1,234.5600');

    // Negative numbers
    assert.strictEqual(formatNumberWithLocale(-1234.56), '-1,234.56');
  });

  it('parses pasted numbers correctly', () => {
    // Test US format
    const usFormat = parsePastedNumber('1,234.56');
    assert.strictEqual(usFormat.numericValue, 1234.56);
    assert.strictEqual(usFormat.integerPart, '1234');
    assert.strictEqual(usFormat.decimalPart, '56');
    assert.strictEqual(usFormat.hasDecimal, true);

    // Test EU format
    const euFormat = parsePastedNumber('1.234,56');
    assert.strictEqual(euFormat.numericValue, 1234.56);
    assert.strictEqual(euFormat.integerPart, '1234');
    assert.strictEqual(euFormat.decimalPart, '56');
    assert.strictEqual(euFormat.hasDecimal, true);

    // Test simple number
    const simpleNumber = parsePastedNumber('1234');
    assert.strictEqual(simpleNumber.numericValue, 1234);
    assert.strictEqual(simpleNumber.integerPart, '1234');
    assert.strictEqual(simpleNumber.decimalPart, '');
    assert.strictEqual(simpleNumber.hasDecimal, false);

    // Test invalid input
    const invalidNumber = parsePastedNumber('abc');
    assert.strictEqual(invalidNumber.numericValue, 0);
    assert.strictEqual(invalidNumber.integerPart, '0');
    assert.strictEqual(invalidNumber.decimalPart, '');
    assert.strictEqual(invalidNumber.hasDecimal, false);
  });
});
