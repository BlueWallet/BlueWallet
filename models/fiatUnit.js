export const FiatUnit = Object.freeze({
  USD: { endPointKey: 'USD', symbol: '$', locale: 'en-US' },
  ARS: { endPointKey: 'ARS', symbol: '$', locale: 'es-AR', dataSource: 'https://api.yadio.io/json', rateKey: 'ARS' },
  AUD: { endPointKey: 'AUD', symbol: '$', locale: 'en-AU' },
  BRL: { endPointKey: 'BRL', symbol: 'R$', locale: 'pt-BR' },
  CAD: { endPointKey: 'CAD', symbol: '$', locale: 'en-CA' },
  CHF: { endPointKey: 'CHF', symbol: 'CHF', locale: 'de-CH' },
  CLP: { endPointKey: 'CLP', symbol: '$', locale: 'es-CL' },
  COP: { endPointKey: 'COP', symbol: '$', locale: 'es-CO' },
  CZK: { endPointKey: 'CZK', symbol: 'Kč', locale: 'cs-CZ' },
  CNY: { endPointKey: 'CNY', symbol: '¥', locale: 'zh-CN' },
  EUR: { endPointKey: 'EUR', symbol: '€', locale: 'en-IE' },
  GBP: { endPointKey: 'GBP', symbol: '£', locale: 'en-GB' },
  HRK: { endPointKey: 'HRK', symbol: 'HRK', locale: 'hr-HR' },
  HUF: { endPointKey: 'HUF', symbol: 'Ft', locale: 'hu-HU' },
  ILS: { endPointKey: 'ILS', symbol: '₪', locale: 'he-IL' },
  INR: { endPointKey: 'INR', symbol: '₹', locale: 'hi-HN' },
  JPY: { endPointKey: 'JPY', symbol: '¥', locale: 'ja-JP' },
  KES: { endPointKey: 'KES', symbol: 'Ksh', locale: 'en-KE' },
  KRW: { endPointKey: 'KRW', symbol: '₩', locale: 'ko-KR' },
  MXN: { endPointKey: 'MXN', symbol: '$', locale: 'es-MX' },
  MYR: { endPointKey: 'MYR', symbol: 'RM', locale: 'ms-MY' },
  NGN: { endPointKey: 'NGN', symbol: '₦', locale: 'en-NG' },
  NOK: { endPointKey: 'NOK', symbol: 'kr', locale: 'nb-NO' },
  NZD: { endPointKey: 'NZD', symbol: '$', locale: 'en-NZ' },
  PLN: { endPointKey: 'PLN', symbol: 'zł', locale: 'pl-PL' },
  PHP: { endPointKey: 'PHP', symbol: '₱', locale: 'en-PH' },
  RUB: { endPointKey: 'RUB', symbol: '₽', locale: 'ru-RU' },
  SGD: { endPointKey: 'SGD', symbol: 'S$', locale: 'zh-SG' },
  SEK: { endPointKey: 'SEK', symbol: 'kr', locale: 'sv-SE' },
  TRY: { endPointKey: 'TRY', symbol: '₺', locale: 'tr-TR' },
  THB: { endPointKey: 'THB', symbol: '฿', locale: 'th-TH' },
  TWD: { endPointKey: 'TWD', symbol: 'NT$', locale: 'zh-Hant-TW' },
  UAH: { endPointKey: 'UAH', symbol: '₴', locale: 'uk-UA' },
  UYU: { endPointKey: 'UYU', symbol: '$', locale: 'es-UY' },
  VEF: { endPointKey: 'VEF', symbol: 'Bs.', locale: 'es-VE' },
  VES: { endPointKey: 'VES', symbol: 'Bs.', locale: 'es-VE', dataSource: 'https://api.yadio.io/json', rateKey: 'VES' },
  ZAR: { endPointKey: 'ZAR', symbol: 'R', locale: 'en-ZA' },
});

export class FiatServerResponse {
  constructor(fiatUnit) {
    this.fiatUnit = fiatUnit;
  }

  baseURI = () => {
    if (this.fiatUnit.dataSource) {
      return this.fiatUnit.dataSource;
    } else {
      return 'https://api.coindesk.com';
    }
  };

  endPoint = () => {
    if (this.fiatUnit.dataSource) {
      return `/${this.fiatUnit.endPointKey}`;
    } else {
      return '/v1/bpi/currentprice/' + this.fiatUnit.endPointKey + '.json';
    }
  };

  rate = response => {
    const json = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
    if (this.fiatUnit.dataSource) {
      return json[this.fiatUnit.rateKey].price * 1;
    } else {
      return json.bpi[this.fiatUnit.endPointKey].rate_float * 1;
    }
  };

  isErrorFound = response => {
    const json = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
    if (this.fiatUnit.dataSource) {
      if (!json || !json[this.fiatUnit.rateKey]) {
        throw new Error('Could not update currency rate: ' + response.err);
      }
    } else {
      if (!json || !json.bpi || !json.bpi[this.fiatUnit.endPointKey] || !json.bpi[this.fiatUnit.endPointKey].rate_float) {
        throw new Error('Could not update currency rate: ' + response.err);
      }
    }
  };
}
