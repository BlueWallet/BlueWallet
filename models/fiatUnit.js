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

export const FiatUnit = Object.freeze({
  USD: { endPointKey: 'USD', symbol: '$', locale: 'en-US', source: FiatUnitSource.CoinDesk },
  ARS: { endPointKey: 'ARS', symbol: '$', locale: 'es-AR', source: FiatUnitSource.Yadio },
  AUD: { endPointKey: 'AUD', symbol: '$', locale: 'en-AU', source: FiatUnitSource.CoinDesk },
  BRL: { endPointKey: 'BRL', symbol: 'R$', locale: 'pt-BR', source: FiatUnitSource.CoinDesk },
  CAD: { endPointKey: 'CAD', symbol: '$', locale: 'en-CA', source: FiatUnitSource.CoinDesk },
  CHF: { endPointKey: 'CHF', symbol: 'CHF', locale: 'de-CH', source: FiatUnitSource.CoinDesk },
  CLP: { endPointKey: 'CLP', symbol: '$', locale: 'es-CL', source: FiatUnitSource.CoinDesk },
  COP: { endPointKey: 'COP', symbol: '$', locale: 'es-CO', source: FiatUnitSource.CoinDesk },
  CZK: { endPointKey: 'CZK', symbol: 'Kč', locale: 'cs-CZ', source: FiatUnitSource.CoinDesk },
  CNY: { endPointKey: 'CNY', symbol: '¥', locale: 'zh-CN', source: FiatUnitSource.CoinDesk },
  EUR: { endPointKey: 'EUR', symbol: '€', locale: 'en-IE', source: FiatUnitSource.CoinDesk },
  GBP: { endPointKey: 'GBP', symbol: '£', locale: 'en-GB', source: FiatUnitSource.CoinDesk },
  HRK: { endPointKey: 'HRK', symbol: 'HRK', locale: 'hr-HR', source: FiatUnitSource.CoinDesk },
  HUF: { endPointKey: 'HUF', symbol: 'Ft', locale: 'hu-HU', source: FiatUnitSource.CoinDesk },
  ILS: { endPointKey: 'ILS', symbol: '₪', locale: 'he-IL', source: FiatUnitSource.CoinDesk },
  INR: { endPointKey: 'INR', symbol: '₹', locale: 'hi-HN', source: FiatUnitSource.CoinDesk },
  JPY: { endPointKey: 'JPY', symbol: '¥', locale: 'ja-JP', source: FiatUnitSource.CoinDesk },
  KES: { endPointKey: 'KES', symbol: 'Ksh', locale: 'en-KE', source: FiatUnitSource.CoinDesk },
  KRW: { endPointKey: 'KRW', symbol: '₩', locale: 'ko-KR', source: FiatUnitSource.CoinDesk },
  LBP: { endPointKey: 'LBP', symbol: 'ل.ل.', locale: 'ar-LB', source: FiatUnitSource.BitcoinduLiban },
  MXN: { endPointKey: 'MXN', symbol: '$', locale: 'es-MX', source: FiatUnitSource.CoinDesk },
  MYR: { endPointKey: 'MYR', symbol: 'RM', locale: 'ms-MY', source: FiatUnitSource.CoinDesk },
  NGN: { endPointKey: 'NGN', symbol: '₦', locale: 'en-NG', source: FiatUnitSource.CoinDesk },
  NOK: { endPointKey: 'NOK', symbol: 'kr', locale: 'nb-NO', source: FiatUnitSource.CoinDesk },
  NZD: { endPointKey: 'NZD', symbol: '$', locale: 'en-NZ', source: FiatUnitSource.CoinDesk },
  PLN: { endPointKey: 'PLN', symbol: 'zł', locale: 'pl-PL', source: FiatUnitSource.CoinDesk },
  PHP: { endPointKey: 'PHP', symbol: '₱', locale: 'en-PH', source: FiatUnitSource.CoinDesk },
  RUB: { endPointKey: 'RUB', symbol: '₽', locale: 'ru-RU', source: FiatUnitSource.CoinDesk },
  SGD: { endPointKey: 'SGD', symbol: 'S$', locale: 'zh-SG', source: FiatUnitSource.CoinDesk },
  SEK: { endPointKey: 'SEK', symbol: 'kr', locale: 'sv-SE', source: FiatUnitSource.CoinDesk },
  TRY: { endPointKey: 'TRY', symbol: '₺', locale: 'tr-TR', source: FiatUnitSource.CoinDesk },
  THB: { endPointKey: 'THB', symbol: '฿', locale: 'th-TH', source: FiatUnitSource.CoinDesk },
  TWD: { endPointKey: 'TWD', symbol: 'NT$', locale: 'zh-Hant-TW', source: FiatUnitSource.CoinDesk },
  TZS: { endPointKey: 'TZS', symbol: 'TSh', locale: 'en-TZ', source: FiatUnitSource.CoinDesk },
  UAH: { endPointKey: 'UAH', symbol: '₴', locale: 'uk-UA', source: FiatUnitSource.CoinDesk },
  UYU: { endPointKey: 'UYU', symbol: '$', locale: 'es-UY', source: FiatUnitSource.CoinDesk },
  VEF: { endPointKey: 'VEF', symbol: 'Bs.', locale: 'es-VE', source: FiatUnitSource.CoinDesk },
  VES: { endPointKey: 'VES', symbol: 'Bs.', locale: 'es-VE', source: FiatUnitSource.Yadio },
  ZAR: { endPointKey: 'ZAR', symbol: 'R', locale: 'en-ZA', source: FiatUnitSource.CoinDesk },
});

export async function getFiatRate(ticker) {
  return await RateExtractors[FiatUnit[ticker].source](ticker);
}
