import { fetch } from '../util/fetch';
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
    `Could not update rate for ${ticker} from ${source}\n: ${error.message}. ` +
      `\nMake sure the network you're on has access to ${source}.`,
  );
};

const fetchRate = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

interface CoinbaseResponse {
  data: {
    amount: string;
  };
}

interface CoinDeskResponse {
  [ticker: string]: number;
}

interface CoinGeckoResponse {
  bitcoin: {
    [ticker: string]: number;
  };
}

interface BitstampResponse {
  last: string;
}

interface KrakenResponse {
  result: {
    [pair: string]: {
      c: [string];
    };
  };
}

interface YadioResponse {
  [ticker: string]: {
    price: number;
  };
}

interface YadioConvertResponse {
  rate: number;
}

interface ExirResponse {
  last: string;
}

interface CoinpaprikaResponse {
  quotes: {
    [ticker: string]: {
      price: number;
    };
  };
}

const RateExtractors = {
  Coinbase: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://api.coinbase.com/v2/prices/BTC-${ticker.toUpperCase()}/buy`,
      )) as CoinbaseResponse;
      const rate = Number(json?.data?.amount);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("Coinbase", ticker, error);
      return undefined as never;
    }
  },

  CoinDesk: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${ticker.toUpperCase()}`,
      )) as CoinDeskResponse;
      const rate = json?.[ticker.toUpperCase()];
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("CoinDesk", ticker, error);
      return undefined as never;
    }
  },

  CoinGecko: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${ticker.toLowerCase()}`,
      )) as CoinGeckoResponse;
      const rate = Number(json?.bitcoin?.[ticker.toLowerCase()]);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("CoinGecko", ticker, error);
      return undefined as never;
    }
  },

  Bitstamp: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://www.bitstamp.net/api/v2/ticker/btc${ticker.toLowerCase()}`,
      )) as BitstampResponse;
      const rate = Number(json?.last);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("Bitstamp", ticker, error);
      return undefined as never;
    }
  },

  Kraken: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://api.kraken.com/0/public/Ticker?pair=XXBTZ${ticker.toUpperCase()}`,
      )) as KrakenResponse;
      const rate = Number(
        json?.result?.[`XXBTZ${ticker.toUpperCase()}`]?.c?.[0],
      );
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("Kraken", ticker, error);
      return undefined as never;
    }
  },

  BNR: async (): Promise<number> => {
    try {
      // Fetching USD to RON rate

      const xmlData = await (
        await fetch("https://www.bnr.ro/nbrfxrates.xml")
      ).text();
      const matches = xmlData.match(/<Rate currency="USD">([\d.]+)<\/Rate>/);
      if (matches && matches[1]) {
        const usdToRonRate = parseFloat(matches[1]);
        const btcToUsdRate = await RateExtractors.CoinGecko("USD");
        // Convert BTC to RON using the USD to RON exchange rate
        return btcToUsdRate * usdToRonRate;
      }
      throw new Error("No valid USD to RON rate found");
    } catch (error: any) {
      handleError("BNR", "RON", error);
      return undefined as never;
    }
  },

  Yadio: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://api.yadio.io/json/${ticker}`,
      )) as YadioResponse;
      const rate = Number(json?.[ticker]?.price);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("Yadio", ticker, error);
      return undefined as never;
    }
  },

  YadioConvert: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        `https://api.yadio.io/convert/1/BTC/${ticker}`,
      )) as YadioConvertResponse;
      const rate = Number(json?.rate);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("YadioConvert", ticker, error);
      return undefined as never;
    }
  },

  Exir: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        "https://api.exir.io/v1/ticker?symbol=btc-irt",
      )) as ExirResponse;
      const rate = Number(json?.last);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("Exir", ticker, error);
      return undefined as never;
    }
  },

  coinpaprika: async (ticker: string): Promise<number> => {
    try {
      const json = (await fetchRate(
        "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR",
      )) as CoinpaprikaResponse;
      const rate = Number(json?.quotes?.INR?.price);
      if (!(rate >= 0)) throw new Error("Invalid data received");
      return rate;
    } catch (error: any) {
      handleError("coinpaprika", ticker, error);
      return undefined as never;
    }
  },
} as const;

export type TFiatUnit = {
  endPointKey: string;
  symbol: string;
  locale: string;
  country: string;
  source:
    | "Coinbase"
    | "CoinDesk"
    | "Yadio"
    | "Exir"
    | "coinpaprika"
    | "Bitstamp"
    | "Kraken";
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

// Fallback sources for each currency source to ensure availability
// CoinGecko and YadioConvert are tried FIRST (most stable), then primary source, then others
const FallbackSources: Record<
  keyof typeof FiatUnitSource,
  (keyof typeof FiatUnitSource)[]
> = {
  Coinbase: ["CoinGecko", "YadioConvert", "Yadio"],
  CoinDesk: ["CoinGecko", "YadioConvert", "CoinDesk", "Yadio"],
  CoinGecko: ["CoinGecko", "YadioConvert", "Yadio"],
  Kraken: ["CoinGecko", "YadioConvert", "Yadio"],
  Yadio: ["CoinGecko", "YadioConvert", "Yadio"],
  YadioConvert: ["CoinGecko", "YadioConvert", "Yadio"],
  Exir: ["CoinGecko", "YadioConvert", "Exir", "Yadio"],
  coinpaprika: ["CoinGecko", "YadioConvert", "coinpaprika", "Yadio"],
  Bitstamp: ["CoinGecko", "YadioConvert", "Yadio"],
  BNR: ["CoinGecko", "YadioConvert"],
};

export async function getFiatRate(ticker: string): Promise<number> {
  const primarySource = FiatUnit[ticker].source;
  // Build prioritized source chain: CoinGecko & YadioConvert first, then primary, then others
  const fallbackChain = FallbackSources[primarySource] || [];

  // Try fallback sources in priority order (CoinGecko/YadioConvert first, primary source becomes fallback)
  for (const source of fallbackChain) {
    try {
      console.log(`Attempting source ${source} for ${ticker}...`);
      return await RateExtractors[source](ticker);
    } catch (error: any) {
      console.warn(`Source ${source} failed for ${ticker}`);
      continue;
    }
  }

  // If all sources fail, throw error
  throw new Error(
    `Could not fetch rate for ${ticker} from any source. Tried: ${fallbackChain.join(", ")}.`,
  );
}
