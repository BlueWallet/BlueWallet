/* global describe, it, jest, jasmine */
import { AppStorage } from '../../class';
import { FiatUnit } from '../../models/fiatUnit';
import AsyncStorage from '@react-native-community/async-storage';
const assert = require('assert');
jest.useFakeTimers();

describe('currency', () => {
  it('fetches exchange rate and saves to AsyncStorage', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
    const currency = require('../../currency');
    await currency.startUpdater();
    let cur = await AsyncStorage.getItem(AppStorage.EXCHANGE_RATES);
    cur = JSON.parse(cur);
    assert.ok(Number.isInteger(cur[currency.STRUCT.LAST_UPDATED]));
    assert.ok(cur[currency.STRUCT.LAST_UPDATED] > 0);
    assert.ok(cur.BTC_USD > 0);

    // now, setting other currency as default
    await AsyncStorage.setItem(AppStorage.PREFERRED_CURRENCY, JSON.stringify(FiatUnit.JPY));
    await currency.startUpdater();
    cur = JSON.parse(await AsyncStorage.getItem(AppStorage.EXCHANGE_RATES));
    assert.ok(cur.BTC_JPY > 0);

    // now setting with a proper setter
    await currency.setPrefferedCurrency(FiatUnit.EUR);
    await currency.startUpdater();
    const preferred = await currency.getPreferredCurrency();
    assert.strictEqual(preferred.endPointKey, 'EUR');
    cur = JSON.parse(await AsyncStorage.getItem(AppStorage.EXCHANGE_RATES));
    assert.ok(cur.BTC_EUR > 0);
  });

  it('formats everything correctly', async () => {
    const currency = require('../../currency');
    await currency.setPrefferedCurrency(FiatUnit.USD);
    await currency.startUpdater();
    currency.exchangeRates.BTC_USD = 10000;
    assert.strictEqual(currency.satoshiToLocalCurrency(1), '$0.0001');
    assert.strictEqual(currency.satoshiToLocalCurrency(-1), '-$0.0001');
    assert.strictEqual(currency.satoshiToLocalCurrency(123), '$0.012');
    assert.strictEqual(currency.satoshiToLocalCurrency(146), '$0.015');
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

    await currency.setPrefferedCurrency(FiatUnit.JPY);
    await currency.startUpdater();
    currency.exchangeRates.BTC_JPY = 1043740.8614;
    assert.strictEqual(currency.satoshiToLocalCurrency(1), '¥0.01');
  });
});
