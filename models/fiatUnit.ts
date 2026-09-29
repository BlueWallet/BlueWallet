import { fetch } from '../util/fetch';
import untypedFiatUnit from './fiatUnits.json';

export const FiatUnitSource = {
  Coinbase: 'Coinbase',
  CoinDesk: 'CoinDesk',
  Kraken: 'Kraken',
  Yadio: 'Yadio',
  YadioConvert: 'YadioConvert',
  Exir: 'Exir',
  coinpaprika: 'coinpaprika',
  Bitstamp: 'Bitstamp',
  BNR: 'BNR',
} as const;

export type RateSource = keyof typeof FiatUnitSource;

const BITSTAMP_FIAT = new Set(['USD', 'EUR', 'GBP']);

/** Kraken public ticker pair keys for BTC/fiat — verified via AssetPairs */
export const KRAKEN_BTC_FIAT_PAIRS: Record<string, string> = {
  USD: 'XXBTZUSD',
  EUR: 'XXBTZEUR',
  GBP: 'XXBTZGBP',
  CAD: 'XXBTZCAD',
  JPY: 'XXBTZJPY',
  AUD: 'XBTAUD',
  CHF: 'XBTCHF',
};

/** Prefer Kraken over Coinbase when both can serve the ticker */
const UNIVERSAL_FALLBACKS: RateSource[] = ['YadioConvert', 'Kraken', 'Coinbase', 'CoinDesk', 'Bitstamp'];

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

interface BitstampResponse {
  last: string;
}

interface KrakenResponse {
  result: {
    [pair: string]: {
      c: [string];
    };
  };
  error?: string[];
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

export function krakenSupportsFiat(ticker: string): boolean {
  return ticker.toUpperCase() in KRAKEN_BTC_FIAT_PAIRS;
}

function canUseRateSource(source: RateSource, ticker: string): boolean {
  const upper = ticker.toUpperCase();
  if (source === 'Kraken') return upper in KRAKEN_BTC_FIAT_PAIRS;
  if (source === 'Bitstamp') return BITSTAMP_FIAT.has(upper);
  if (source === 'BNR') return upper === 'RON';
  if (source === 'Exir') return upper === 'IRR' || upper === 'IRT';
  if (source === 'coinpaprika') return upper === 'INR';
  return true;
}

export function buildRateSourceOrder(ticker: string): RateSource[] {
  const primary = FiatUnit[ticker].source as RateSource;
  const order: RateSource[] = [primary];
  for (const fallback of UNIVERSAL_FALLBACKS) {
    if (fallback === primary) continue;
    if (!canUseRateSource(fallback, ticker)) continue;
    order.push(fallback);
  }
  return order;
}

async function fetchRateFromSource(source: RateSource, ticker: string): Promise<number> {
  if (!canUseRateSource(source, ticker)) {
    throw new Error(`Source ${source} does not support ${ticker}`);
  }

  switch (source) {
    case 'Coinbase': {
      const json = (await fetchRate(`https://api.coinbase.com/v2/prices/BTC-${ticker.toUpperCase()}/buy`)) as CoinbaseResponse;
      const rate = Number(json?.data?.amount);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'CoinDesk': {
      const json = (await fetchRate(
        `https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${ticker.toUpperCase()}`,
      )) as CoinDeskResponse;
      const rate = json?.[ticker.toUpperCase()];
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'Bitstamp': {
      const json = (await fetchRate(`https://www.bitstamp.net/api/v2/ticker/btc${ticker.toLowerCase()}`)) as BitstampResponse;
      const rate = Number(json?.last);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'Kraken': {
      const pair = KRAKEN_BTC_FIAT_PAIRS[ticker.toUpperCase()];
      if (!pair) throw new Error(`No Kraken BTC pair for ${ticker}`);
      const json = (await fetchRate(`https://api.kraken.com/0/public/Ticker?pair=${pair}`)) as KrakenResponse;
      if (json.error && json.error.length > 0) {
        throw new Error(json.error.join(', '));
      }
      const rate = Number(json?.result?.[pair]?.c?.[0]);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'BNR': {
      const xmlResponse = await fetch('https://www.bnr.ro/nbrfxrates.xml');
      if (!xmlResponse.ok) {
        throw new Error(`HTTP error! status: ${xmlResponse.status}`);
      }
      const xmlData = await xmlResponse.text();
      const matches = xmlData.match(/<Rate currency="USD">([\d.]+)<\/Rate>/);
      if (!matches?.[1]) {
        throw new Error('No valid USD to RON rate found');
      }
      const usdToRonRate = parseFloat(matches[1]);
      let btcToUsdRate: number | undefined;
      const usdErrors: string[] = [];
      for (const usdSource of buildRateSourceOrder('USD')) {
        if (usdSource === 'BNR') continue;
        try {
          btcToUsdRate = await fetchRateFromSource(usdSource, 'USD');
          break;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          usdErrors.push(`${usdSource}: ${message}`);
        }
      }
      if (btcToUsdRate === undefined) {
        throw new Error(`Could not fetch BTC/USD for RON conversion (${usdErrors.join('; ')})`);
      }
      return btcToUsdRate * usdToRonRate;
    }
    case 'Yadio': {
      const json = (await fetchRate(`https://api.yadio.io/json/${ticker}`)) as YadioResponse;
      const rate = Number(json?.[ticker]?.price);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'YadioConvert': {
      const json = (await fetchRate(`https://api.yadio.io/convert/1/BTC/${ticker}`)) as YadioConvertResponse;
      const rate = Number(json?.rate);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'Exir': {
      const json = (await fetchRate('https://api.exir.io/v1/ticker?symbol=btc-irt')) as ExirResponse;
      const rate = Number(json?.last);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    case 'coinpaprika': {
      const json = (await fetchRate('https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR')) as CoinpaprikaResponse;
      const rate = Number(json?.quotes?.INR?.price);
      if (!(rate >= 0)) throw new Error('Invalid data received');
      return rate;
    }
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function trySourcesForTicker(ticker: string): Promise<number> {
  const errors: string[] = [];
  for (const source of buildRateSourceOrder(ticker)) {
    try {
      return await fetchRateFromSource(source, ticker);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${source}: ${message}`);
    }
  }
  throw new Error(
    `Could not update rate for ${ticker} from any provider.\n` +
      errors.map(e => `- ${e}`).join('\n') +
      `\nMake sure the network you're on has access to these services.`,
  );
}

export type TFiatUnit = {
  endPointKey: string;
  symbol: string;
  locale: string;
  country: string;
  source: RateSource;
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
  source: RateSource;
};

export async function getFiatRate(ticker: string): Promise<number> {
  return trySourcesForTicker(ticker);
}
