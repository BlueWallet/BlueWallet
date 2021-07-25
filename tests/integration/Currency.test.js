import AsyncStorage from '@react-native-async-storage/async-storage';
import { FiatUnit } from '../../models/fiatUnit';

jest.useFakeTimers();

describe('currency', () => {
  it('fetches exchange rate and saves to AsyncStorage', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
    const currency = require('../../blue_modules/currency');
    await currency.startUpdater();
    let cur = await AsyncStorage.getItem(currency.EXCHANGE_RATES);
    cur = JSON.parse(cur);
    expect(Number.isInteger(cur[currency.STRUCT.LAST_UPDATED])).toBeTruthy();
    expect(cur[currency.STRUCT.LAST_UPDATED] > 0).toBeTruthy();
    expect(cur.BTC_USD > 0).toBeTruthy();

    // now, setting other currency as default
    await AsyncStorage.setItem(currency.PREFERRED_CURRENCY, JSON.stringify(FiatUnit.JPY));
    await currency.startUpdater();
    cur = JSON.parse(await AsyncStorage.getItem(currency.EXCHANGE_RATES));
    expect(cur.BTC_JPY > 0).toBeTruthy();

    // now setting with a proper setter
    await currency.setPrefferedCurrency(FiatUnit.EUR);
    await currency.startUpdater();
    const preferred = await currency.getPreferredCurrency();
    expect(preferred.endPointKey).toBe('EUR');
    cur = JSON.parse(await AsyncStorage.getItem(currency.EXCHANGE_RATES));
    expect(cur.BTC_EUR > 0).toBeTruthy();

    // test Yadio rate source
    await currency.setPrefferedCurrency(FiatUnit.ARS);
    await currency.startUpdater();
    cur = JSON.parse(await AsyncStorage.getItem(currency.EXCHANGE_RATES));
    expect(cur.BTC_ARS > 0).toBeTruthy();

    // test BitcoinduLiban rate source
    // disabled, because it throws "Service Temporarily Unavailable" on circleci
    // await currency.setPrefferedCurrency(FiatUnit.LBP);
    // await currency.startUpdater();
    // cur = JSON.parse(await AsyncStorage.getItem(currency.EXCHANGE_RATES));
    // assert.ok(cur.BTC_LBP > 0);

    // test Exir rate source
    await currency.setPrefferedCurrency(FiatUnit.IRR);
    await currency.startUpdater();
    cur = JSON.parse(await AsyncStorage.getItem(currency.EXCHANGE_RATES));
    expect(cur.BTC_IRR > 0).toBeTruthy();
  });
});
