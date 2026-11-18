import assert from 'assert';

const mockFetch = jest.fn();
jest.mock('../../util/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

// eslint-disable-next-line import/first -- mock must be registered before fiatUnit loads fetch
import { buildRateSourceOrder, getFiatRate, krakenSupportsFiat } from '../../models/fiatUnit';

type Reply = { status?: number; body: unknown };
const ok = (body: unknown): Reply => ({ body });
const http = (status: number): Reply => ({ status, body: {} });

/** Route fetch by URL substring; unmatched URLs get 404. Returns the list of URLs hit (host+path+query), in order. */
function route(routes: Record<string, Reply>): string[] {
  const hits: string[] = [];
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const u = new URL(url);
    hits.push(u.hostname + u.pathname + u.search);
    const reply = Object.entries(routes).find(([needle]) => url.includes(needle))?.[1] ?? http(404);
    const status = reply.status ?? 200;
    return Promise.resolve({
      ok: status < 400,
      status,
      json: async () => reply.body,
    } as Response);
  });
  return hits;
}

const KRAKEN_OK = (pair: string, price: string) => ok({ error: [], result: { [pair]: { c: [price] } } });

describe('fiatUnit', () => {
  beforeEach(() => mockFetch.mockReset());

  it('krakenSupportsFiat matches allowlist', () => {
    for (const t of ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD', 'CHF']) assert.strictEqual(krakenSupportsFiat(t), true, t);
    assert.strictEqual(krakenSupportsFiat('AED'), false);
  });

  it('buildRateSourceOrder: primary first, then YadioConvert > Kraken > Coinbase > CoinGecko > Bitstamp, gated per ticker', () => {
    assert.deepStrictEqual(buildRateSourceOrder('USD'), ['Kraken', 'YadioConvert', 'Coinbase', 'CoinGecko', 'Bitstamp']);
    assert.deepStrictEqual(buildRateSourceOrder('AUD'), ['Kraken', 'YadioConvert', 'Coinbase', 'CoinGecko']);
    assert.deepStrictEqual(buildRateSourceOrder('AED'), ['Coinbase', 'YadioConvert', 'CoinGecko']);
    assert.deepStrictEqual(buildRateSourceOrder('RON'), ['Coinbase', 'YadioConvert']);
    assert.deepStrictEqual(buildRateSourceOrder('KES'), ['Coinbase', 'YadioConvert']);
    assert.deepStrictEqual(buildRateSourceOrder('ARS'), ['Yadio', 'YadioConvert', 'Coinbase', 'CoinGecko']);
  });

  it('parses each provider payload, including non-XXBTZ Kraken pair keys', async () => {
    route({ 'pair=XBTAUD': KRAKEN_OK('XBTAUD', '120000.5') });
    assert.strictEqual(await getFiatRate('AUD'), 120000.5);

    route({ 'yadio.io/json/ARS': ok({ ARS: { price: 134000000 }, timestamp: 1 }) });
    assert.strictEqual(await getFiatRate('ARS'), 134000000);

    route({ 'bitstamp.net/api/v2/ticker/btcgbp': ok({ last: '63000' }), 'pair=XXBTZGBP': http(503) });
    assert.strictEqual(await getFiatRate('GBP'), 63000);

    route({ 'coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=aed': ok({ bitcoin: { aed: 307000 } }) });
    assert.strictEqual(await getFiatRate('AED'), 307000);
  });

  it('walks the whole chain in order and succeeds on the last hop', async () => {
    const hits = route({
      'pair=XXBTZUSD': http(500),
      'yadio.io/convert': http(500),
      'coinbase.com': http(500),
      'coingecko.com': http(429),
      'bitstamp.net': ok({ last: '83000' }),
    });
    assert.strictEqual(await getFiatRate('USD'), 83000);
    assert.deepStrictEqual(hits, [
      'api.kraken.com/0/public/Ticker?pair=XXBTZUSD',
      'api.yadio.io/convert/1/BTC/USD',
      'api.coinbase.com/v2/prices/BTC-USD/spot',
      'api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      'www.bitstamp.net/api/v2/ticker/btcusd',
    ]);
  });

  it('never calls Kraken for a ticker without a BTC pair', async () => {
    const hits = route({ 'coinbase.com': http(503), 'yadio.io/convert': ok({ rate: 250000 }) });
    assert.strictEqual(await getFiatRate('AED'), 250000);
    assert.ok(hits.every(h => !h.includes('kraken')));
  });

  // [name, ticker, bad-route, bad-reply, rescue-route]; rescue always answers 83000
  it.each<[string, string, string, Reply, string]>([
    ['Kraken error array with HTTP 200', 'USD', 'pair=XXBTZUSD', ok({ error: ['EQuery:Unknown asset pair'], result: {} }), 'bitstamp.net'],
    ['Kraken zero rate', 'USD', 'pair=XXBTZUSD', KRAKEN_OK('XXBTZUSD', '0'), 'bitstamp.net'],
    ['Kraken negative rate', 'USD', 'pair=XXBTZUSD', KRAKEN_OK('XXBTZUSD', '-1'), 'bitstamp.net'],
    ['YadioConvert currency-not-found with HTTP 200', 'USD', 'yadio.io/convert', ok({ error: 'currency not found' }), 'bitstamp.net'],
    ['YadioConvert non-numeric rate', 'USD', 'yadio.io/convert', ok({ rate: 'N/A' }), 'bitstamp.net'],
    ['Coinbase Infinity', 'USD', 'coinbase.com', ok({ data: { amount: 'Infinity' } }), 'bitstamp.net'],
    ['Coinbase overflow string', 'USD', 'coinbase.com', ok({ data: { amount: '1e309' } }), 'bitstamp.net'],
    ['CoinGecko empty object with HTTP 200', 'USD', 'coingecko.com', ok({}), 'bitstamp.net'],
    ['Yadio object without price', 'ARS', 'yadio.io/json/ARS', ok({ ARS: { offers: {} }, timestamp: 1 }), 'yadio.io/convert/1/BTC/ARS'],
  ])('treats bad payload as failure and moves on: %s', async (_name, ticker, badRoute, badReply, rescueRoute) => {
    const rescue = rescueRoute.includes('bitstamp') ? ok({ last: '83000' }) : ok({ rate: 83000 });
    const hits = route({ [badRoute]: badReply, [rescueRoute]: rescue });
    assert.strictEqual(await getFiatRate(ticker), 83000);
    assert.ok(
      hits.some(h => h.includes(badRoute)),
      `bad route ${badRoute} was never requested`,
    );
  });

  it('throws listing every provider when all sources fail', async () => {
    route({});
    await assert.rejects(
      () => getFiatRate('USD'),
      /Could not update rate for USD from any provider[\s\S]*Kraken[\s\S]*YadioConvert[\s\S]*Coinbase[\s\S]*CoinGecko[\s\S]*Bitstamp/,
    );
  });
});
