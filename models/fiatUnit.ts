import Frisbee from 'frisbee';
import untypedFiatUnit from './fiatUnits.json';

export const FiatUnitSource = {
  CoinDesk: 'CoinDesk',
  Yadio: 'Yadio',
  BitcoinduLiban: 'BitcoinduLiban',
  Exir: 'Exir',
} as const;

const RateExtractors = {
  CoinDesk: async (ticker: string): Promise<number> => {
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
  Yadio: async (ticker: string): Promise<number> => {
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
  BitcoinduLiban: async (ticker: string): Promise<number> => {
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
  Exir: async (ticker: string): Promise<number> => {
    const api = new Frisbee({ baseURI: 'https://api.exir.io' });
    const res = await api.get('/v1/ticker?symbol=btc-irt');
    if (res.err) throw new Error(`Could not update rate for ${ticker}: ${res.err}`);

    let json;
    try {
      json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    } catch (e) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.last;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
} as const;

type FiatUnit = {
  [key: string]: {
    endPointKey: string;
    symbol: string;
    locale: string;
    source: 'CoinDesk' | 'Yadio' | 'Exir' | 'BitcoinduLiban';
  };
};
export const FiatUnit = untypedFiatUnit as FiatUnit;

export async function getFiatRate(ticker: string): Promise<number> {
  return await RateExtractors[FiatUnit[ticker].source](ticker);
}
