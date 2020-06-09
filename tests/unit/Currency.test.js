/* global describe, it */
import { FiatUnit } from '../../models/fiatUnit';
const assert = require('assert');

describe('currency', () => {
  it('formats everything correctly', async () => {
    const currency = require('../../currency');
    currency.exchangeRates.BTC_USD = 10000;

    assert.strictEqual(currency.satoshiToLocalCurrency(1), '$0.0001');
    assert.strictEqual(currency.satoshiToLocalCurrency(-1), '-$0.0001');
    assert.strictEqual(currency.satoshiToLocalCurrency(123), '$0.01');
    assert.strictEqual(currency.satoshiToLocalCurrency(156), '$0.02');
    assert.strictEqual(currency.satoshiToLocalCurrency(51), '$0.01');
    assert.strictEqual(currency.satoshiToLocalCurrency(45), '$0.0045');
    assert.strictEqual(currency.satoshiToLocalCurrency(123456789), '$12,345.68');

    assert.strictEqual(currency.BTCToLocalCurrency(1), '$10,000.00');
    assert.strictEqual(currency.BTCToLocalCurrency(-1), '-$10,000.00');
    assert.strictEqual(currency.BTCToLocalCurrency(1.00000001), '$10,000.00');
    assert.strictEqual(currency.BTCToLocalCurrency(1.0000123), '$10,000.12');
    assert.strictEqual(currency.BTCToLocalCurrency(1.0000146), '$10,000.15');

    assert.strictEqual(currency.satoshiToBTC(1), '0.00000001');
    assert.strictEqual(currency.satoshiToBTC(-1), '-0.00000001');
    assert.strictEqual(currency.satoshiToBTC(100000000), '1');
    assert.strictEqual(currency.satoshiToBTC(123456789123456789), '1234567891.2345678');

    currency.preferredFiatCurrency.endPointKey = FiatUnit.JPY.endPointKey;
    currency.preferredFiatCurrency.symbol = FiatUnit.JPY.symbol;
    currency.preferredFiatCurrency.locale = FiatUnit.JPY.locale;
    currency.exchangeRates.BTC_JPY = 1043740.8614;

    assert.strictEqual(currency.satoshiToLocalCurrency(1), '¥0.01');
  });
});
