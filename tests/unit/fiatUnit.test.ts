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

/** Route fetch by URL substring; unmatched URLs get 404. Returns the list of hosts hit, in order. */
function route(routes: Record<string, Reply>): string[] {
  const hits: string[] = [];
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    hits.push(new URL(url).hostname + new URL(url).pathname);
    const reply = Object.entries(routes).find(([needle]) => url.includes(needle))?.[1] ?? http(404);
    const status = reply.status ?? 200;
    return Promise.resolve({
      ok: status < 400,
      status,
      json: async () => reply.body,
      text: async () => (typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body)),
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

  it('buildRateSourceOrder: primary first, then YadioConvert > Kraken > Coinbase > Bitstamp, gated per ticker', () => {
    assert.deepStrictEqual(buildRateSourceOrder('USD'), ['Kraken', 'YadioConvert', 'Coinbase', 'Bitstamp']);
    assert.deepStrictEqual(buildRateSourceOrder('AUD'), ['Kraken', 'YadioConvert', 'Coinbase']);
    assert.deepStrictEqual(buildRateSourceOrder('AED'), ['Coinbase', 'YadioConvert']);
    assert.deepStrictEqual(buildRateSourceOrder('RON'), ['BNR', 'YadioConvert', 'Coinbase']);
    assert.deepStrictEqual(buildRateSourceOrder('ARS'), ['Yadio', 'YadioConvert', 'Coinbase']);
  });

  it('parses each provider payload, including non-XXBTZ Kraken pair keys', async () => {
    route({ 'pair=XBTAUD': KRAKEN_OK('XBTAUD', '120000.5') });
    assert.strictEqual(await getFiatRate('AUD'), 120000.5);

    route({ 'yadio.io/json/ARS': ok({ ARS: { price: 134000000 }, timestamp: 1 }) });
    assert.strictEqual(await getFiatRate('ARS'), 134000000);

    route({ 'bitstamp.net/api/v2/ticker/btcgbp': ok({ last: '63000' }), 'pair=XXBTZGBP': http(503) });
    assert.strictEqual(await getFiatRate('GBP'), 63000);
  });

  it('walks the whole chain in order and succeeds on the last hop', async () => {
    const hits = route({
      'pair=XXBTZUSD': http(500),
      'yadio.io/convert': http(500),
      'coinbase.com': http(500),
      'bitstamp.net': ok({ last: '83000' }),
    });
    assert.strictEqual(await getFiatRate('USD'), 83000);
    assert.deepStrictEqual(hits, [
      'api.kraken.com/0/public/Ticker',
      'api.yadio.io/convert/1/BTC/USD',
      'api.coinbase.com/v2/prices/BTC-USD/spot',
      'www.bitstamp.net/api/v2/ticker/btcusd',
    ]);
  });

  it('never calls Kraken for a ticker without a BTC pair', async () => {
    const hits = route({ 'coinbase.com': http(503), 'yadio.io/convert': ok({ rate: 250000 }) });
    assert.strictEqual(await getFiatRate('AED'), 250000);
    assert.ok(hits.every(h => !h.includes('kraken')));
  });

  it.each<[string, string, Reply]>([
    ['Kraken error array with HTTP 200', 'pair=XXBTZUSD', ok({ error: ['EQuery:Unknown asset pair'], result: {} })],
    ['Kraken zero rate', 'pair=XXBTZUSD', KRAKEN_OK('XXBTZUSD', '0')],
    ['YadioConvert currency-not-found with HTTP 200', 'yadio.io/convert', ok({ error: 'currency not found' })],
    ['YadioConvert non-numeric rate', 'yadio.io/convert', ok({ rate: 'N/A' })],
    ['Coinbase Infinity', 'coinbase.com', ok({ data: { amount: 'Infinity' } })],
    ['Yadio object without price (CLP shape)', 'yadio.io/json/USD', ok({ USD: { offers: {} }, timestamp: 1 })],
  ])('treats bad payload as failure and moves on: %s', async (_name, needle, reply) => {
    route({ [needle]: reply, 'bitstamp.net': ok({ last: '83000' }) });
    assert.strictEqual(await getFiatRate('USD'), 83000);
  });

  it('BNR: USD/RON × BTC/USD via the USD chain, never recursing into BNR', async () => {
    const hits = route({
      'curs.bnr.ro': ok('<DataSet><Rate currency="USD">4.5</Rate></DataSet>'),
      'pair=XXBTZUSD': http(500),
      'yadio.io/convert/1/BTC/USD': ok({ rate: 80000 }),
    });
    assert.strictEqual(await getFiatRate('RON'), 360000);
    assert.strictEqual(hits.filter(h => h.includes('bnr.ro')).length, 1);
  });

  it('BNR: XML without a USD rate falls through to the RON fallbacks', async () => {
    route({ 'curs.bnr.ro': ok('<DataSet></DataSet>'), 'yadio.io/convert/1/BTC/RON': ok({ rate: 390000 }) });
    assert.strictEqual(await getFiatRate('RON'), 390000);
  });

  it('throws listing every provider when all sources fail', async () => {
    route({});
    await assert.rejects(
      () => getFiatRate('USD'),
      /Could not update rate for USD from any provider[\s\S]*Kraken[\s\S]*YadioConvert[\s\S]*Coinbase[\s\S]*Bitstamp/,
    );
  });
});
