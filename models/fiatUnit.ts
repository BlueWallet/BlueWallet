import { fetch } from '../util/fetch';
import untypedFiatUnit from './fiatUnits.json';

export const FiatUnitSource = {
  Coinbase: 'Coinbase',
  CoinGecko: 'CoinGecko',
  Kraken: 'Kraken',
  Yadio: 'Yadio',
  YadioConvert: 'YadioConvert',
  Exir: 'Exir',
  coinpaprika: 'coinpaprika',
  Bitstamp: 'Bitstamp',
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

/** Our tickers that CoinGecko accepts as vs_currency — from /api/v3/simple/supported_vs_currencies */
const COINGECKO_FIAT = new Set([
  'USD',
  'AED',
  'ARS',
  'AUD',
  'BHD',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'JPY',
  'KRW',
  'KWD',
  'LKR',
  'MXN',
  'MYR',
  'NGN',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RUB',
  'SAR',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'UAH',
  'ZAR',
]);

/**
 * Prefer Kraken over Coinbase when both can serve the ticker.
 * CoinGecko sits after the exchanges on purpose: the keyless tier is throttled per IP (observed 429 after ~5 calls
 * in 10 s), so many users behind one NAT would be rate-limited if it were primary. Fine as a last resort.
 */
const UNIVERSAL_FALLBACKS: RateSource[] = ['YadioConvert', 'Kraken', 'Coinbase', 'CoinGecko', 'Bitstamp'];

/** Reject 0 / NaN / Infinity so a broken provider falls through to the next source instead of ending the chain */
const assertValidRate = (rate: number): number => {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid data received');
  return rate;
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
  if (source === 'CoinGecko') return COINGECKO_FIAT.has(upper);
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
      const json = (await fetchRate(`https://api.coinbase.com/v2/prices/BTC-${ticker.toUpperCase()}/spot`)) as CoinbaseResponse;
      const rate = Number(json?.data?.amount);
      return assertValidRate(rate);
    }
    case 'CoinGecko': {
      const json = (await fetchRate(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${ticker.toLowerCase()}`,
      )) as CoinGeckoResponse;
      const rate = Number(json?.bitcoin?.[ticker.toLowerCase()]);
      return assertValidRate(rate);
    }
    case 'Bitstamp': {
      const json = (await fetchRate(`https://www.bitstamp.net/api/v2/ticker/btc${ticker.toLowerCase()}`)) as BitstampResponse;
      const rate = Number(json?.last);
      return assertValidRate(rate);
    }
    case 'Kraken': {
      const pair = KRAKEN_BTC_FIAT_PAIRS[ticker.toUpperCase()];
      if (!pair) throw new Error(`No Kraken BTC pair for ${ticker}`);
      const json = (await fetchRate(`https://api.kraken.com/0/public/Ticker?pair=${pair}`)) as KrakenResponse;
      if (json.error && json.error.length > 0) {
        throw new Error(json.error.join(', '));
      }
      const rate = Number(json?.result?.[pair]?.c?.[0]);
      return assertValidRate(rate);
    }
    case 'Yadio': {
      const json = (await fetchRate(`https://api.yadio.io/json/${ticker}`)) as YadioResponse;
      const rate = Number(json?.[ticker]?.price);
      return assertValidRate(rate);
    }
    case 'YadioConvert': {
      const json = (await fetchRate(`https://api.yadio.io/convert/1/BTC/${ticker}`)) as YadioConvertResponse;
      const rate = Number(json?.rate);
      return assertValidRate(rate);
    }
    case 'Exir': {
      const json = (await fetchRate('https://api.exir.io/v1/ticker?symbol=btc-irt')) as ExirResponse;
      const rate = Number(json?.last);
      return assertValidRate(rate);
    }
    case 'coinpaprika': {
      const json = (await fetchRate('https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR')) as CoinpaprikaResponse;
      const rate = Number(json?.quotes?.INR?.price);
      return assertValidRate(rate);
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
