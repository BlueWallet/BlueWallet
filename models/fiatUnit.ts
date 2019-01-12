export interface IUnit {
  readonly endPointKey: string;
  readonly symbol: string;
  readonly locale: string;
}

interface IFiatUnit {
  readonly [fiatKey: string]: IUnit;
}

export const FiatUnit: IFiatUnit = Object.freeze({
  USD: { endPointKey: 'USD', symbol: '$', locale: 'en-US' },
  AUD: { endPointKey: 'AUD', symbol: '$', locale: 'en-AU' },
  CAD: { endPointKey: 'CAD', symbol: '$', locale: 'en-CA' },
  CZK: { endPointKey: 'CZK', symbol: 'Kč', locale: 'cs-CZ' },
  CNY: { endPointKey: 'CNY', symbol: '¥', locale: 'zh-CN' },
  EUR: { endPointKey: 'EUR', symbol: '€', locale: 'en-EN' },
  GBP: { endPointKey: 'GBP', symbol: '£', locale: 'en-GB' },
  HRK: { endPointKey: 'HRK', symbol: 'HRK', locale: 'hr-HR' },
  INR: { endPointKey: 'INR', symbol: '₹', locale: 'hi-HN' },
  JPY: { endPointKey: 'JPY', symbol: '¥', locale: 'ja-JP' },
  RUB: { endPointKey: 'RUB', symbol: '₽', locale: 'ru-RU' },
  SGD: { endPointKey: 'SGD', symbol: 'S$', locale: 'zh-SG' },
  THB: { endPointKey: 'THB', symbol: '฿', locale: 'th-TH' },
  VEF: { endPointKey: 'VEF', symbol: 'Bs.', locale: 'es-VE' },
  ZAR: { endPointKey: 'ZAR', symbol: 'R', locale: 'en-ZA' },
});
