import {
  parseRawSats,
  parseMoneySats,
  amountFromInput,
  xnaToSats,
  satsToXna,
  sumSats,
  MAX_MONEY,
  formatXnaGrouped,
  formatSatsGrouped,
  splitFormattedAmount,
  splitShortenedAmount,
  shortenFormattedAmount,
  formatCompactXna,
} from '../../blue_modules/neurai/amounts';
import { estimateNeuraiFeeSats } from '../../blue_modules/neurai/feeEstimate';
import { formatAssetAmount } from '../../blue_modules/neurai/assetUtils';
import { parseRpcJson, stringifyRpcJson } from '@neuraiproject/neurai-rpc';

describe('exact amounts', () => {
  test.each([0n, 1n, 9007199254740990n, 9007199254740991n, 9007199254740992n, 9007199254740993n, MAX_MONEY, -9007199254740993n])(
    'round trips %s without a double',
    raw => {
      expect(parseRawSats(raw.toString())).toBe(raw);
      expect(xnaToSats(satsToXna(raw))).toBe(raw);
      expect(parseRawSats(parseRpcJson(stringifyRpcJson(raw)))).toBe(raw);
    },
  );
  test.each([null, undefined, NaN, Infinity, 1.1, Number('9007199254740993'), {}, '1e8', '1.0'])('rejects invalid raw input %s', value => {
    expect(() => parseRawSats(value)).toThrow();
  });
  it('distinguishes signed deltas, outputs and aggregates', () => {
    expect(parseRawSats('-300000')).toBe(-300000n);
    expect(() => parseMoneySats(-1n)).toThrow();
    expect(() => parseMoneySats(MAX_MONEY + 1n)).toThrow();
    expect(sumSats([MAX_MONEY, MAX_MONEY, 1n])).toBe(2n * MAX_MONEY + 1n);
  });
  it('preserves both the Bitcoin-limit and IEEE-754 regression values', () => {
    expect(xnaToSats(amountFromInput('63175176.62230948'))).toBe(6317517662230948n);
    expect(xnaToSats(amountFromInput('100000000.00000001'))).toBe(10000000000000001n);
    expect(satsToXna(xnaToSats('100000000.00000001') - 100000000n)).toBe('99999999.00000001');
  });
  test.each(['1e8', '0', '-1', '0.123456789', '21000000000.00000001', 'NaN'])('rejects invalid user amount %s', amount => {
    expect(() => amountFromInput(amount)).toThrow();
  });
  it('formats signed fractional amounts and locales exactly', () => {
    expect(formatSatsGrouped(9007199254740993n, 'en-US')).toBe('9,007,199,254,740,993');
    expect(formatXnaGrouped(-1n, 'de-DE')).toBe('-0,00000001');
    expect(formatXnaGrouped(10000000000000001n, 'es-ES')).toBe('100.000.000,00000001');
    expect(splitFormattedAmount('1,284', '.')).toEqual(['1,284', '', '']);
    expect(splitFormattedAmount('1,284 XNA', ',')).toEqual(['1', ',284', ' XNA']);
    expect(formatAssetAmount('123456789.00000001')).toBe('123456789.00000001');
  });
  it('rejects invalid or unrepresentable fees', () => {
    for (const rate of [NaN, Infinity, -1, 1e20]) expect(() => estimateNeuraiFeeSats(['76a914'], ['N'], rate)).toThrow();
  });
});

it('formats aggregated balances above the safe integer limit', () => {
  expect(satsToXna(sumSats([9007199254740992n, 9007199254740992n]))).toBe('180143985.09481984');
});

it('keeps the fallback grouping exact when Intl cannot format bigint', () => {
  const real = Intl.NumberFormat;
  const replacement = jest.spyOn(Intl, 'NumberFormat').mockImplementation((locale, options) => {
    const formatter = new real(locale, options);
    return {
      format: () => {
        throw new TypeError('BigInt not supported');
      },
      formatToParts: formatter.formatToParts.bind(formatter),
    } as unknown as Intl.NumberFormat;
  });
  try {
    expect(formatSatsGrouped(10000000000000001n, 'en-US')).toBe('10,000,000,000,000,001');
    expect(formatXnaGrouped(-10000000000000001n, 'es-ES')).toBe('-100.000.000,00000001');
  } finally {
    replacement.mockRestore();
  }
});

describe('shortened amounts (at most N decimals, cut not rounded)', () => {
  it('cuts the extra decimals without rounding up', () => {
    expect(splitShortenedAmount('100.000.000,12345678', 4, ',')).toEqual(['100.000.000', ',1234', '']);
    expect(splitShortenedAmount('0,99999999', 4, ',')).toEqual(['0', ',9999', '']);
    expect(shortenFormattedAmount('9,993.994552', 4, '.')).toBe('9,993.9945');
  });
  it('leaves shorter amounts as they are', () => {
    expect(splitShortenedAmount('1,5', 4, ',')).toEqual(['1', ',5', '']);
    expect(splitShortenedAmount('10.000', 4, ',')).toEqual(['10.000', '', '']);
  });
  it('drops the zeros the cut leaves at the end, and the separator with them', () => {
    expect(splitShortenedAmount('1,10001234', 4, ',')).toEqual(['1', ',1', '']);
    expect(splitShortenedAmount('100.000.000,00001234', 4, ',')).toEqual(['100.000.000', '', '']);
  });
  it('keeps a suffix such as the unit', () => {
    expect(shortenFormattedAmount('1.284,56789 XNA', 4, ',')).toBe('1.284,5678 XNA');
    expect(shortenFormattedAmount('2.12345678 XNA', 2, '.')).toBe('2.12 XNA');
  });
});

describe('compact XNA for lists', () => {
  const xna = (value: string) => xnaToSats(value);
  test.each([
    ['0', '0'],
    ['0.0005', '<0.001'],
    ['0.001992', '0.001'],
    ['12.5', '12.5'],
    ['99.99999999', '99.999'],
    ['100', '100'],
    ['9499.9956', '9,499'],
    ['9999.99999999', '9,999'],
    ['10000', '10k'],
    ['15398.794', '15.3k'],
    ['99999.99', '99.9k'],
    ['250000', '250k'],
    ['2500000', '2,500k'],
    ['9999999.99', '9,999k'],
    ['10000000', '10M'],
    ['12345678', '12.3M'],
    ['250000000', '250M'],
  ])('%s XNA reads %s (cut, never rounded up)', (value, shown) => {
    expect(formatCompactXna(xna(value), 'en-US')).toBe(shown);
  });

  it('uses the separators of the language', () => {
    expect(formatCompactXna(xna('15398.794'), 'es-ES')).toBe('15,3k');
    expect(formatCompactXna(xna('9499.9956'), 'de-DE')).toBe('9.499');
    expect(formatCompactXna(xna('0.0005'), 'es-ES')).toBe('<0,001');
  });
});
