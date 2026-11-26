import {
  assertMoneyRange,
  decimalToSatoshis,
  satoshisToDecimal,
  toRawInteger,
  type RawAmount,
} from '@neuraiproject/neurai-create-transaction';

export { MAX_MONEY, SATS_PER_XNA } from '@neuraiproject/neurai-create-transaction';
export type Sats = bigint;
export type SatsInput = bigint | string | number;

/** Signed raw units. Never repair a number that has already lost precision. */
export function parseRawSats(value: unknown): Sats {
  if (typeof value !== 'bigint' && typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError('Missing or invalid exact amount');
  }
  return toRawInteger(value);
}
export const parseMoneySats = (value: unknown): Sats => assertMoneyRange(parseRawSats(value));
export const xnaToSats = (value: string): Sats => decimalToSatoshis(value);
export const satsToXna = (value: RawAmount): string => satoshisToDecimal(value);
export const absSats = (value: Sats): Sats => (value < 0n ? -value : value);
export const minSats = (a: Sats, b: Sats): Sats => (a < b ? a : b);
export const compareSats = (a: Sats, b: Sats): number => (a < b ? -1 : a > b ? 1 : 0);
export function sumSats(values: Iterable<Sats>): Sats {
  let total = 0n;
  for (const value of values) total += value;
  return total;
}
export function amountFromInput(input: string, allowZero = false): string {
  const text = input.trim();
  if (text.length > 100 || !/^\d+(?:\.\d{1,8})?$/.test(text)) throw new Error('Enter an amount with at most 8 decimal places');
  const raw = parseMoneySats(xnaToSats(text));
  if (!allowZero && raw === 0n) throw new Error('Amount must be greater than zero');
  return satsToXna(raw);
}
/** Only for interfaces whose numeric contract cannot represent large raw units. */
export function satsToSafeNumber(value: Sats): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('This hardware interface does not support this input amount exactly');
  return result;
}
/** Read-only native display bridge; never use this value to build payments. */
export const satsToDisplayNumber = (value: Sats): number => Number(value);
export const decimalSeparator = (locale?: string): string =>
  new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === 'decimal')?.value ?? '.';
export function formatSatsGrouped(value: SatsInput, locale?: string): string {
  const raw = parseRawSats(value);
  try {
    return new Intl.NumberFormat(locale).format(raw);
  } catch {
    // Exact fallback for native runtimes without Intl bigint support.
    const parts = new Intl.NumberFormat(locale).formatToParts(123456789);
    const integers = parts.filter(p => p.type === 'integer').map(p => p.value.length);
    const primary = integers[integers.length - 1] || 3;
    const secondary = integers[integers.length - 2] || primary;
    const group = parts.find(p => p.type === 'group')?.value ?? ',';
    let digits = absSats(raw).toString();
    const groups: string[] = [];
    let width = primary;
    while (digits.length > width) {
      groups.unshift(digits.slice(-width));
      digits = digits.slice(0, -width);
      width = secondary;
    }
    groups.unshift(digits);
    return (raw < 0n ? '-' : '') + groups.join(group);
  }
}

export function formatXnaGrouped(value: SatsInput, locale?: string): string {
  const raw = parseRawSats(value);
  const [whole, fraction] = satsToXna(absSats(raw)).split('.');
  return (raw < 0n ? '-' : '') + formatSatsGrouped(whole, locale) + (fraction ? decimalSeparator(locale) + fraction : '');
}

const COIN = 100_000_000n;

/**
 * A balance in XNA, short, for lists where only its size matters (the wallet
 * panel): under 100 with up to 3 decimals; from 100, whole XNA; from 10,000 in
 * thousands ("15.3k"); from 10,000,000 in millions ("12.3M"), with one decimal
 * below 100k / 100M. Always cut, never rounded up, so it never shows more than
 * is held; a balance above 0 but under 0.001 shows as "<0.001".
 */
export function formatCompactXna(value: SatsInput, locale?: string): string {
  const raw = parseRawSats(value);
  const sats = absSats(raw);
  const sign = raw < 0n ? '-' : '';
  const separator = decimalSeparator(locale);
  // `units / scale` with at most `digits` decimals, cut, its trailing zeros dropped.
  const scaled = (scale: bigint, digits: number): string => {
    const whole = formatSatsGrouped(sats / scale, locale);
    if (digits === 0) return whole;
    const fraction = (((sats % scale) * 10n ** BigInt(digits)) / scale).toString().padStart(digits, '0').replace(/0+$/, '');
    return fraction ? whole + separator + fraction : whole;
  };
  if (sats === 0n) return '0';
  if (sats < COIN / 1000n) return `${sign}<0${separator}001`;
  if (sats < 100n * COIN) return sign + scaled(COIN, 3);
  if (sats < 10_000n * COIN) return sign + scaled(COIN, 0);
  if (sats < 10_000_000n * COIN) return sign + scaled(1000n * COIN, sats < 100_000n * COIN ? 1 : 0) + 'k';
  return sign + scaled(1_000_000n * COIN, sats < 100_000_000n * COIN ? 1 : 0) + 'M';
}

/** Split display text using its actual decimal separator, never a thousands separator. */
export function splitFormattedAmount(text: string, separator = decimalSeparator()): [string, string, string] {
  const index = text.indexOf(separator);
  if (index < 0) return [text, '', ''];
  const match = text.slice(index + separator.length).match(/^(\d+)(.*)$/);
  if (!match) return [text, '', ''];
  return [text.slice(0, index), separator + match[1], match[2]];
}

/**
 * `splitFormattedAmount`, keeping at most `maxDecimals` decimal digits. The rest
 * are cut, never rounded, so a shortened amount never shows more than is held;
 * zeros left at the end by the cut go as well. For summaries (home, wallet
 * list); the send flow keeps the full amount.
 */
export function splitShortenedAmount(text: string, maxDecimals: number, separator = decimalSeparator()): [string, string, string] {
  const [integer, decimals, suffix] = splitFormattedAmount(text, separator);
  if (!decimals) return [integer, '', suffix];
  const digits = decimals.slice(separator.length, separator.length + Math.max(0, maxDecimals)).replace(/0+$/, '');
  return [integer, digits ? separator + digits : '', suffix];
}

/** `splitShortenedAmount` joined back into one string. */
export function shortenFormattedAmount(text: string, maxDecimals: number, separator = decimalSeparator()): string {
  return splitShortenedAmount(text, maxDecimals, separator).join('');
}
