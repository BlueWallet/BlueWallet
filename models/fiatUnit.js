import Frisbee from 'frisbee';

export const FiatUnitSource = Object.freeze({
  CoinDesk: 'CoinDesk',
  Yadio: 'Yadio',
  BitcoinduLiban: 'BitcoinduLiban',
});

const RateExtractors = Object.freeze({
  CoinDesk: async ticker => {
    const api = new Frisbee({ baseURI: 'https://api.coindesk.com' });
    const res = await api.get(`/v1/bpi/currentprice/${ticker}.json`);
    if (res.err) throw new Error(`Could not update rate for ${ticker}: ${res.err}`);

    let json;
    try {
      json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    } catch (e) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.bpi?.[ticker]?.rate_float; // eslint-disable-line
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
  Yadio: async ticker => {
    const api = new Frisbee({ baseURI: 'https://api.yadio.io/json' });
    const res = await api.get(`/${ticker}`);
    if (res.err) throw new Error(`Could not update rate for ${ticker}: ${res.err}`);

    let json;
    try {
      json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    } catch (e) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.[ticker]?.price;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
  BitcoinduLiban: async ticker => {
    const api = new Frisbee({ baseURI: 'https://bitcoinduliban.org' });
    const res = await api.get('/api.php?key=lbpusd');
    if (res.err) throw new Error(`Could not update rate for ${ticker}: ${res.err}`);

    let json;
    try {
      json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    } catch (e) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.[`BTC/${ticker}`];
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
});

export const FiatUnit = require('./fiatUnit.json');

export async function getFiatRate(ticker) {
  return await RateExtractors[FiatUnit[ticker].source](ticker);
}
