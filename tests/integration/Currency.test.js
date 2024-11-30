import DefaultPreference from 'react-native-default-preference';
import assert from 'assert';

import {
  EXCHANGE_RATES_STORAGE_KEY,
  getPreferredCurrency,
  initCurrencyDaemon,
  LAST_UPDATED,
  PREFERRED_CURRENCY_STORAGE_KEY,
  setPreferredCurrency,
  GROUP_IO_BLUEWALLET,
} from '../../blue_modules/currency';
import { FiatUnit } from '../../models/fiatUnit';

jest.setTimeout(90 * 1000);

describe('currency', () => {
  beforeAll(async () => {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  });

  afterEach(async () => {
    await DefaultPreference.clearAll();
  });

  it('fetches exchange rate and saves to DefaultPreference', async () => {
    await initCurrencyDaemon();
    let curString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    let cur = JSON.parse(curString || '{}');
    assert.ok(Number.isInteger(cur[LAST_UPDATED]));
    assert.ok(cur[LAST_UPDATED] > 0);
    assert.ok(cur.BTC_USD > 0);

    // now, setting other currency as default
    await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, FiatUnit.JPY.endPointKey);
    await initCurrencyDaemon(true);
    curString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    cur = JSON.parse(curString || '{}');
    assert.ok(cur.BTC_JPY > 0);

    // now setting with a proper setter
    await setPreferredCurrency(FiatUnit.EUR);
    await initCurrencyDaemon(true);
    const preferred = await getPreferredCurrency();
    assert.strictEqual(preferred.endPointKey, 'EUR');
    curString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    cur = JSON.parse(curString || '{}');
    assert.ok(cur.BTC_EUR > 0);

    // test Yadio rate source
    await setPreferredCurrency(FiatUnit.ARS);
    await initCurrencyDaemon(true);
    curString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    cur = JSON.parse(curString || '{}');
    assert.ok(cur.BTC_ARS > 0);

    // test YadioConvert rate source
    await setPreferredCurrency(FiatUnit.LBP);
    await initCurrencyDaemon(true);
    curString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    cur = JSON.parse(curString || '{}');
    assert.ok(cur.BTC_LBP > 0);

    // test Exir rate source
    await setPreferredCurrency(FiatUnit.IRT);
    await initCurrencyDaemon(true);
    curString = await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY);
    cur = JSON.parse(curString || '{}');
    assert.ok(cur.BTC_IRT > 0);
  });
});
