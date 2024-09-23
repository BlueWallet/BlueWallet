import { getUserPreference, setUserPreference } from '../../helpers/userPreference';
import assert from 'assert';

import {
  EXCHANGE_RATES_STORAGE_KEY,
  getPreferredCurrency,
  initCurrencyDaemon,
  LAST_UPDATED,
  PREFERRED_CURRENCY_STORAGE_KEY,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import { FiatUnit } from '../../models/fiatUnit';

jest.setTimeout(90 * 1000);

describe('currency', () => {
  it('fetches exchange rate and saves to storage using userPreference', async () => {
    // Initialize and check the currency daemon, fetching rates
    await initCurrencyDaemon();
    let cur = await getUserPreference({ key: EXCHANGE_RATES_STORAGE_KEY });

    assert.ok(Number.isInteger(cur[LAST_UPDATED]));
    assert.ok(cur[LAST_UPDATED] > 0);
    assert.ok(cur.BTC_USD > 0);

    // Set other currency as default using setUserPreference
    await setUserPreference({ key: PREFERRED_CURRENCY_STORAGE_KEY, value: JSON.stringify(FiatUnit.JPY) });
    await initCurrencyDaemon(true);
    cur = await getUserPreference({ key: EXCHANGE_RATES_STORAGE_KEY });
    assert.ok(cur.BTC_JPY > 0);

    // Set with a proper setter
    await setPreferredCurrency(FiatUnit.EUR);
    await initCurrencyDaemon(true);
    const preferred = await getPreferredCurrency();
    assert.strictEqual(preferred.endPointKey, 'EUR');
    cur = await getUserPreference({ key: EXCHANGE_RATES_STORAGE_KEY });
    assert.ok(cur.BTC_EUR > 0);

    // Test Yadio rate source
    await setPreferredCurrency(FiatUnit.ARS);
    await initCurrencyDaemon(true);
    cur = await getUserPreference({ key: EXCHANGE_RATES_STORAGE_KEY });
    assert.ok(cur.BTC_ARS > 0);

    // Test YadioConvert rate source
    await setPreferredCurrency(FiatUnit.LBP);
    await initCurrencyDaemon(true);
    cur = await getUserPreference({ key: EXCHANGE_RATES_STORAGE_KEY });
    assert.ok(cur.BTC_LBP > 0);

    // Test Exir rate source
    await setPreferredCurrency(FiatUnit.IRT);
    await initCurrencyDaemon(true);
    cur = await getUserPreference({ key: EXCHANGE_RATES_STORAGE_KEY });
    assert.ok(cur.BTC_IRT > 0);
  });
});
