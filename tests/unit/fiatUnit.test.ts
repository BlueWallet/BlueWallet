import assert from 'assert';

const mockFetch = jest.fn();
jest.mock('../../util/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

// eslint-disable-next-line import/first -- mock must be registered before fiatUnit loads fetch
import { buildRateSourceOrder, getFiatRate, krakenSupportsFiat } from '../../models/fiatUnit';

function jsonResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response);
}

describe('fiatUnit', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('krakenSupportsFiat matches allowlist', () => {
    assert.strictEqual(krakenSupportsFiat('USD'), true);
    assert.strictEqual(krakenSupportsFiat('JPY'), true);
    assert.strictEqual(krakenSupportsFiat('AUD'), true);
    assert.strictEqual(krakenSupportsFiat('CHF'), true);
    assert.strictEqual(krakenSupportsFiat('AED'), false);
  });

  it('buildRateSourceOrder uses json primary and prefers Kraken over Coinbase', () => {
    const usdOrder = buildRateSourceOrder('USD');
    assert.strictEqual(usdOrder[0], 'Kraken');
    assert.ok(usdOrder.includes('YadioConvert'));
    assert.ok(usdOrder.includes('Coinbase'));
    assert.strictEqual(usdOrder.filter(s => s === 'Kraken').length, 1);

    const audOrder = buildRateSourceOrder('AUD');
    assert.strictEqual(audOrder[0], 'Kraken');

    const aedOrder = buildRateSourceOrder('AED');
    assert.strictEqual(aedOrder[0], 'Coinbase');
    assert.strictEqual(aedOrder.includes('Kraken'), false);

    // When primary is not Kraken but Kraken supports the ticker, Kraken comes before Coinbase
    const kesOrder = buildRateSourceOrder('KES');
    assert.strictEqual(kesOrder[0], 'CoinDesk');
    const krakenIdx = kesOrder.indexOf('Kraken');
    const coinbaseIdx = kesOrder.indexOf('Coinbase');
    // KES has no Kraken pair; Coinbase should still be present
    assert.strictEqual(krakenIdx, -1);
    assert.ok(coinbaseIdx > 0);
  });

  it('getFiatRate falls back when primary source fails', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('api.yadio.io/json/ARS')) {
        return jsonResponse({}, false, 500);
      }
      if (url.includes('api.yadio.io/convert/1/BTC/ARS')) {
        return jsonResponse({ rate: 9876543210 });
      }
      return jsonResponse({}, false, 404);
    });

    const rate = await getFiatRate('ARS');
    assert.strictEqual(rate, 9876543210);
  });

  it('getFiatRate skips Kraken fallback when pair is unsupported', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('api.coinbase.com') && url.includes('BTC-AED')) {
        return jsonResponse({}, false, 503);
      }
      if (url.includes('api.yadio.io/convert/1/BTC/AED')) {
        return jsonResponse({ rate: 250000 });
      }
      if (url.includes('api.kraken.com')) {
        throw new Error('Kraken should not be called for AED');
      }
      return jsonResponse({}, false, 404);
    });

    const rate = await getFiatRate('AED');
    assert.strictEqual(rate, 250000);
  });

  it('getFiatRate throws when all sources fail', async () => {
    mockFetch.mockImplementation(() => jsonResponse({}, false, 503));

    await assert.rejects(() => getFiatRate('USD'), /Could not update rate for USD from any provider/);
  });
});
