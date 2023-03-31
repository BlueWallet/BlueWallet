import untypedFiatUnit from './fiatUnits.json';

export const FiatUnitSource = {
  CoinDesk: 'CoinDesk',
  CoinGecko: 'CoinGecko',
  Yadio: 'Yadio',
  YadioConvert: 'YadioConvert',
  Exir: 'Exir',
  wazirx: 'wazirx',
  Bitstamp: 'Bitstamp',

} as const;

const RateExtractors = {
  CoinDesk: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.coindesk.com/v1/bpi/currentprice/${ticker}.json`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.bpi?.[ticker]?.rate_float; // eslint-disable-line
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
  CoinGecko: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${ticker.toLowerCase()}`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.bitcoin?.[ticker]; // eslint-disable-line
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },
  Bitstamp: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://www.bitstamp.net/api/v2/ticker/btc${ticker.toLowerCase()}`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate from Bitstamp for ${ticker}: ${e.message}`);
    }

    if (Array.isArray(json)) {
      throw new Error(`Unsupported ticker for Bitstamp: ${ticker}`);
    }

    let rate = +json?.last;
    if (!rate) throw new Error(`Could not update rate from Bitstamp for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate from Bitstamp for ${ticker}: data is wrong`);
    return rate;
  },

  Yadio: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.yadio.io/json/${ticker}`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.[ticker]?.price;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  YadioConvert: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.yadio.io/convert/1/BTC/${ticker}`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.rate;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  Exir: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch('https://api.exir.io/v1/ticker?symbol=btc-irt');
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.last;
    if (!rate) throw new Error(`Could not update rate for ${ticker}: data is wrong`);

    rate = Number(rate);
    if (!(rate >= 0)) throw new Error(`Could not update rate for ${ticker}: data is wrong`);
    return rate;
  },

  wazirx: async (ticker: string): Promise<number> => {
    let json;
    try {
      const res = await fetch(`https://api.wazirx.com/api/v2/tickers/btcinr`);
      json = await res.json();
    } catch (e: any) {
      throw new Error(`Could not update rate for ${ticker}: ${e.message}`);
    }
    let rate = json?.ticker?.buy; // eslint-disable-line
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
    source: 'CoinDesk' | 'Yadio' | 'Exir' | 'wazirx' | 'Bitstamp';
  };
};
export const FiatUnit = untypedFiatUnit as FiatUnit;

export async function getFiatRate(ticker: string): Promise<number> {
  return await RateExtractors[FiatUnit[ticker].source](ticker);
}
