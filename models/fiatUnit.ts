import { fetch } from "../util/fetch";
import untypedFiatUnit from "./fiatUnits.json";

export const FiatUnitSource = {
  Coinbase: "Coinbase",
  CoinDesk: "CoinDesk",
  CoinGecko: "CoinGecko",
  Kraken: "Kraken",
  Yadio: "Yadio",
  YadioConvert: "YadioConvert",
  Exir: "Exir",
  coinpaprika: "coinpaprika",
  Bitstamp: "Bitstamp",
  BNR: "BNR",
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
      // Kraken can be slow or occasionally time out — use a longer timeout and a retry
      const url = `https://api.kraken.com/0/public/Ticker?pair=XXBTZ${ticker.toUpperCase()}`;
      let json: KrakenResponse | undefined;
      let attempt = 0;
      const maxAttempts = 2;
      while (attempt < maxAttempts && !json) {
        attempt += 1;
        const resp = await fetch(url, { timeout: 3000 });
        if (!resp.ok) {
          // if non-OK, let the loop retry (or eventually throw below)
          if (attempt >= maxAttempts)
            throw new Error(`HTTP error! status: ${resp.status}`);
          continue;
        }
        json = (await resp.json()) as KrakenResponse;
      }
      const rate = Number(
        json?.result?.[`XXBTZ${ticker.toUpperCase()}`]?.c?.[0],
      );
      if (rate >= 0) {
        return rate;
      }
      // If Kraken returned invalid data, fail here and let the central
      // getFiatRate() perform the CoinGecko fallback so the resulting
      // `source` value correctly reflects the provider used.
      throw new Error('Invalid data received from Kraken');
    } catch (error: any) {
      // Let getFiatRate() handle the fallback to CoinGecko so it can also
      // set the returned `source` to 'CoinGecko'. Propagate the error.
      handleError('Kraken', ticker, error);
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

export type RateWithSource = { rate: number; source: string };

export async function getFiatRate(ticker: string): Promise<RateWithSource> {
  const source = FiatUnit[ticker].source;
  try {
    const rate = await RateExtractors[source](ticker);
    return { rate, source };
  } catch (err) {
    console.warn(`Primary source ${source} failed for ${ticker}: ${err}. Falling back to CoinGecko.`);
    try {
      const fallbackRate = await RateExtractors.CoinGecko(ticker);
      return { rate: fallbackRate, source: 'CoinGecko' };
    } catch (fallbackErr) {
      throw fallbackErr;
    }
  }
}
