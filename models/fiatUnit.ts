import untypedFiatUnit from './fiatUnits.json';

export const FiatUnitSource = {
  Coinbase: 'Coinbase',
  CoinDesk: 'CoinDesk',
  CoinGecko: 'CoinGecko',
  Kraken: 'Kraken',
  Yadio: 'Yadio',
  YadioConvert: 'YadioConvert',
  Exir: 'Exir',
  coinpaprika: 'coinpaprika',
  Bitstamp: 'Bitstamp',
  BNR: 'BNR',
} as const;

const handleError = (source: string, ticker: string, error: Error) => {
  throw new Error(
    `Could not update rate for ${ticker} from ${source}: ${error.message}. ` + `Make sure the network you're on has access to ${source}.`,
  );
};

const fetchRate = async (url: string): Promise<any> => {
  const response = await fetch(url);
  return await response.json();
};

const RateExtractors = {
  Coinbase: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://api.coinbase.com/v2/prices/BTC-${ticker.toUpperCase()}/buy`);
      const rate = Number(json?.data?.amount);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('Coinbase', ticker, error);
      return undefined as never;
    }
  },

  CoinDesk: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://api.coindesk.com/v1/bpi/currentprice/${ticker}.json`);
      const rate = Number(json?.bpi?.[ticker]?.rate_float);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('CoinDesk', ticker, error);
      return undefined as never;
    }
  },

  CoinGecko: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${ticker.toLowerCase()}`);
      const rate = Number(json?.bitcoin?.[ticker.toLowerCase()]);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('CoinGecko', ticker, error);
      return undefined as never;
    }
  },

  Bitstamp: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://www.bitstamp.net/api/v2/ticker/btc${ticker.toLowerCase()}`);
      const rate = Number(json?.last);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('Bitstamp', ticker, error);
      return undefined as never;
    }
  },

  Kraken: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://api.kraken.com/0/public/Ticker?pair=XXBTZ${ticker.toUpperCase()}`);
      const rate = Number(json?.result?.[`XXBTZ${ticker.toUpperCase()}`]?.c?.[0]);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('Kraken', ticker, error);
      return undefined as never;
    }
  },

  BNR: async (): Promise<number> => {
    try {
      // Fetching USD to RON rate
      const xmlData = await (await fetch('https://www.bnr.ro/nbrfxrates.xml')).text();
      const matches = xmlData.match(/<Rate currency="USD">([\d.]+)<\/Rate>/);
      if (matches && matches[1]) {
        const usdToRonRate = parseFloat(matches[1]);
        const btcToUsdRate = await RateExtractors.CoinGecko('USD');
        // Convert BTC to RON using the USD to RON exchange rate
        return btcToUsdRate * usdToRonRate;
      }
      throw new Error('No valid USD to RON rate found');
    } catch (error: any) {
      handleError('BNR', 'RON', error);
      return undefined as never;
    }
  },

  Yadio: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://api.yadio.io/json/${ticker}`);
      const rate = Number(json?.[ticker]?.price);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('Yadio', ticker, error);
      return undefined as never;
    }
  },

  YadioConvert: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate(`https://api.yadio.io/convert/1/BTC/${ticker}`);
      const rate = Number(json?.rate);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('YadioConvert', ticker, error);
      return undefined as never;
    }
  },

  Exir: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate('https://api.exir.io/v1/ticker?symbol=btc-irt');
      const rate = Number(json?.last);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('Exir', ticker, error);
      return undefined as never;
    }
  },

  coinpaprika: async (ticker: string): Promise<number> => {
    try {
      const json = await fetchRate('https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR');
      const rate = Number(json?.quotes?.INR?.price);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    } catch (error: any) {
      handleError('coinpaprika', ticker, error);
      return undefined as never;
    }
  },
} as const;

export type TFiatUnit = {
  endPointKey: string;
  symbol: string;
  locale: string;
  country: string;
  source: 'CoinDesk' | 'Yadio' | 'Exir' | 'coinpaprika' | 'Bitstamp' | 'Kraken';
};

export type TFiatUnits = {
  [key: string]: TFiatUnit;
};

export const FiatUnit = untypedFiatUnit as TFiatUnits;

export type FiatUnitType = {
  endPointKey: string;
  symbol: string;
  locale: string;
  country: string;
  source: keyof typeof FiatUnitSource;
};

export async function getFiatRate(ticker: string): Promise<number> {
  return await RateExtractors[FiatUnit[ticker].source](ticker);
}
