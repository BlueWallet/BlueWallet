import { AppStorage } from '../../class';
import { FiatUnit } from '../../models/fiatUnit';
import AsyncStorage from '@react-native-async-storage/async-storage';
const assert = require('assert');
jest.useFakeTimers();

describe('currency', () => {
  it('fetches exchange rate and saves to AsyncStorage', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
    const currency = require('../../blue_modules/currency');
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
});
