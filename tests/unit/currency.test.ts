import assert from 'assert';

import DefaultPreference from 'react-native-default-preference';

import {
  _setExchangeRate,
  _setPreferredFiatCurrency,
  BTCToLocalCurrency,
  isRateOutdated,
  satoshiToBTC,
  satoshiToLocalCurrency,
} from '../../blue_modules/currency';
import { FiatUnit } from '../../models/fiatUnit';

jest.mock('react-native-default-preference', () => ({
  __esModule: true,
  default: {
    setName: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native-localize', () => ({
  getCurrencies: () => ['USD'],
}));

describe('currency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DefaultPreference.get as jest.Mock).mockResolvedValue(null);
  });

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
    assert.strictEqual(satoshiToBTC(123456789123456789), '1234567891.2345678'); // eslint-disable-line no-loss-of-precision

    _setPreferredFiatCurrency(FiatUnit.JPY);
    _setExchangeRate('BTC_JPY', 1043740.8614);

    assert.ok(satoshiToLocalCurrency(1) === '¥0.01' || satoshiToLocalCurrency(1) === '￥0.01', 'Unexpected: ' + satoshiToLocalCurrency(1));
  });

  it('does not mark a missing last-updated timestamp as stale', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(JSON.stringify({}));

    await expect(isRateOutdated()).resolves.toBe(false);
  });

  it('marks a rate as stale when the last update is older than the threshold', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(JSON.stringify({ LAST_UPDATED: Date.now() - 32 * 60 * 1000 }));

    await expect(isRateOutdated()).resolves.toBe(true);
  });
});
