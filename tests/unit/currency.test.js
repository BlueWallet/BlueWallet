import { FiatUnit } from '../../models/fiatUnit';

describe('currency', () => {
  it('formats everything correctly', async () => {
    const currency = require('../../blue_modules/currency');
    currency._setExchangeRate('BTC_USD', 10000);

    expect(currency.satoshiToLocalCurrency(1)).toBe('$0.0001');
    expect(currency.satoshiToLocalCurrency(-1)).toBe('-$0.0001');
    expect(currency.satoshiToLocalCurrency(123)).toBe('$0.01');
    expect(currency.satoshiToLocalCurrency(156)).toBe('$0.02');
    expect(currency.satoshiToLocalCurrency(51)).toBe('$0.01');
    expect(currency.satoshiToLocalCurrency(45)).toBe('$0.0045');
    expect(currency.satoshiToLocalCurrency(123456789)).toBe('$12,345.68');

    expect(currency.BTCToLocalCurrency(1)).toBe('$10,000.00');
    expect(currency.BTCToLocalCurrency(-1)).toBe('-$10,000.00');
    expect(currency.BTCToLocalCurrency(1.00000001)).toBe('$10,000.00');
    expect(currency.BTCToLocalCurrency(1.0000123)).toBe('$10,000.12');
    expect(currency.BTCToLocalCurrency(1.0000146)).toBe('$10,000.15');

    expect(currency.satoshiToBTC(1)).toBe('0.00000001');
    expect(currency.satoshiToBTC(-1)).toBe('-0.00000001');
    expect(currency.satoshiToBTC(100000000)).toBe('1');
    expect(currency.satoshiToBTC(123456789123456789)).toBe('1234567891.2345678'); // eslint-disable-line no-loss-of-precision

    currency._setPreferredFiatCurrency(FiatUnit.JPY);
    currency._setExchangeRate('BTC_JPY', 1043740.8614);

    expect(currency.satoshiToLocalCurrency(1) === '¥0.01' || currency.satoshiToLocalCurrency(1) === '￥0.01').toBeTruthy();
  });
});
