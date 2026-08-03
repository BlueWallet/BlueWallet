import BigNumber from 'bignumber.js';

import { BITCOIN_DECIMAL_SEPARATOR, BITCOIN_GROUPING_SEPARATOR, BITCOIN_GROUP_SIZE } from '../blue_modules/bitcoinFormat';
import { BitcoinUnit } from '../models/bitcoinUnits';

export type NumberFormatSettings = {
  decimalSeparator: string;
  groupingSeparator: string;
};

export type AmountInputNumberFormat = NumberFormatSettings & {
  asciiDigits: Readonly<Record<string, string>>;
  groupingSignature: string;
  localizedDigits: readonly string[];
  primaryGroupingSize: number;
  secondaryGroupingSize: number;
};

type NumberFormatter = Pick<Intl.NumberFormat, 'format'>;

export type AmountUnitConversionFunctions = {
  fiatToBTC: (fiatAmount: number) => string;
  formatBalancePlain: (satoshis: number, unit: BitcoinUnit, withFormatting: boolean) => string;
};

type AmountUnitConversionOptions = AmountUnitConversionFunctions & {
  cachedSatoshis?: string;
};

export type AmountUnitTransition = {
  fromUnit: BitcoinUnit;
  toUnit: BitcoinUnit;
};

export type AmountInputDisplayModel = {
  amountCharacters: string[];
  displayAmount?: string;
  displayJustifyContent: 'flex-start' | 'flex-end' | 'center';
  endSelection: { start: number; end: number };
  inputFontSize: 20 | 36;
  inputTextAlign: 'left' | 'right' | 'center';
  isCryptoUnit: boolean;
  measureAmountText: string;
};

type SecondaryDisplayFunctions = {
  btcUnitLabel: string;
  cachedSatoshis?: string;
  currencySymbol: string;
  fiatToBTC: (fiatAmount: number) => string;
  formatLocalCurrency: (satoshis: number) => string | number;
  numberFormat: AmountInputNumberFormat;
};

const BIDI_FORMAT_CHARACTERS = new Set([
  '\u061c',
  '\u200e',
  '\u200f',
  '\u202a',
  '\u202b',
  '\u202c',
  '\u202d',
  '\u202e',
  '\u2066',
  '\u2067',
  '\u2068',
  '\u2069',
]);

const NEGATIVE_AMOUNT_MARKERS = new Set(['-', '−', '﹣', '－']);

export const BTC_MAX_INTEGER_DIGITS = 8;
export const BTC_MAX_FRACTION_DIGITS = 8;
export const SATS_MAX_DIGITS = 16;
const LOCAL_CURRENCY_MAX_CHARACTERS = 15;

export const getNextAmountUnit = (unit: BitcoinUnit): AmountUnitTransition => {
  switch (unit) {
    case BitcoinUnit.BTC:
      return { fromUnit: BitcoinUnit.BTC, toUnit: BitcoinUnit.SATS };
    case BitcoinUnit.SATS:
      return { fromUnit: BitcoinUnit.SATS, toUnit: BitcoinUnit.LOCAL_CURRENCY };
    case BitcoinUnit.LOCAL_CURRENCY:
      return { fromUnit: BitcoinUnit.LOCAL_CURRENCY, toUnit: BitcoinUnit.BTC };
    case BitcoinUnit.MAX:
    default:
      return { fromUnit: BitcoinUnit.SATS, toUnit: BitcoinUnit.BTC };
  }
};

const readDigits = (formatter: NumberFormatter): string[] => {
  return Array.from({ length: 10 }, (_, digit) => {
    const integer = Array.from(formatter.format(digit))
      .filter(character => !BIDI_FORMAT_CHARACTERS.has(character))
      .join('');
    return Array.from(integer).length === 1 ? integer : String(digit);
  });
};

const readGroupingSizes = (
  formatter: NumberFormatter,
  localizedDigits: readonly string[],
): {
  groupingSignature: string;
  primaryGroupingSize: number;
  secondaryGroupingSize: number;
} => {
  const digitSet = new Set(localizedDigits);
  const groups: number[] = [];
  let currentGroupSize = 0;

  for (const character of Array.from(formatter.format(123456789012345))) {
    if (digitSet.has(character)) {
      currentGroupSize++;
    } else if (!BIDI_FORMAT_CHARACTERS.has(character) && currentGroupSize > 0) {
      groups.push(currentGroupSize);
      currentGroupSize = 0;
    }
  }
  if (currentGroupSize > 0) groups.push(currentGroupSize);

  if (groups.length < 2)
    return {
      groupingSignature: 'none',
      primaryGroupingSize: 0,
      secondaryGroupingSize: 0,
    };
  const primaryGroupingSize = groups[groups.length - 1];
  const secondaryGroupingSize = groups[groups.length - 2];
  return {
    groupingSignature: `${primaryGroupingSize}:${secondaryGroupingSize}`,
    primaryGroupingSize,
    secondaryGroupingSize,
  };
};

const createDigitMap = (localizedDigits: readonly string[]): Readonly<Record<string, string>> => {
  const asciiDigits = Array.from({ length: 10 }, (_, value) => [String(value), String(value)]);
  const normalizedLocalizedDigits = localizedDigits.flatMap((digit, value) => [
    [digit, String(value)],
    [digit.normalize('NFKC'), String(value)],
  ]);

  return Object.fromEntries([...asciiDigits, ...normalizedLocalizedDigits]);
};

const ASCII_DIGITS = Object.freeze(Array.from({ length: 10 }, (_, digit) => String(digit)));

/**
 * BTC and sats use one stable representation regardless of the app language,
 * device region, or a live change to native number-format settings.
 */
export const BITCOIN_AMOUNT_NUMBER_FORMAT: AmountInputNumberFormat = Object.freeze({
  asciiDigits: Object.freeze(createDigitMap(ASCII_DIGITS)),
  decimalSeparator: BITCOIN_DECIMAL_SEPARATOR,
  groupingSeparator: BITCOIN_GROUPING_SEPARATOR,
  groupingSignature: `${BITCOIN_GROUP_SIZE}:${BITCOIN_GROUP_SIZE}`,
  localizedDigits: ASCII_DIGITS,
  primaryGroupingSize: BITCOIN_GROUP_SIZE,
  secondaryGroupingSize: BITCOIN_GROUP_SIZE,
});

const getNumberFormatForUnit = (unit: BitcoinUnit, fiatNumberFormat: AmountInputNumberFormat): AmountInputNumberFormat => {
  return unit === BitcoinUnit.LOCAL_CURRENCY ? fiatNumberFormat : BITCOIN_AMOUNT_NUMBER_FORMAT;
};

/**
 * Builds input metadata from the device's native number-format settings.
 * Separators are intentionally not inferred from a language tag because users
 * can configure regional number formatting independently of app language.
 */
export const createAmountInputNumberFormat = (
  settings: NumberFormatSettings,
  formatter: NumberFormatter = new Intl.NumberFormat(undefined, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }),
): AmountInputNumberFormat => {
  const localizedDigits = readDigits(formatter);
  const grouping = readGroupingSizes(formatter, localizedDigits);

  return {
    ...grouping,
    decimalSeparator: settings.decimalSeparator,
    groupingSeparator: settings.groupingSeparator,
    asciiDigits: createDigitMap(localizedDigits),
    localizedDigits,
  };
};

const readAsciiDigit = (character: string, numberFormat: AmountInputNumberFormat): string | undefined => {
  return numberFormat.asciiDigits[character] ?? numberFormat.asciiDigits[character.normalize('NFKC')];
};

const isNumericSeparator = (character: string, numberFormat: AmountInputNumberFormat): boolean => {
  return (
    character === numberFormat.decimalSeparator || character === numberFormat.groupingSeparator || BIDI_FORMAT_CHARACTERS.has(character)
  );
};

const isDecimalSeparator = (character: string, numberFormat: AmountInputNumberFormat): boolean => {
  return character === numberFormat.decimalSeparator;
};

/**
 * Extracts the first number from text pasted from a wallet, exchange, browser,
 * or spreadsheet. Currency labels and bidirectional marks around the value are
 * ignored, while a second explanatory value is deliberately not concatenated.
 */
const extractNumericToken = (text: string, numberFormat: AmountInputNumberFormat): string => {
  const characters = Array.from(text.trim());
  const firstDigitIndex = characters.findIndex(character => readAsciiDigit(character, numberFormat) !== undefined);

  if (firstDigitIndex < 0) {
    return characters.length === 1 && isDecimalSeparator(characters[0], numberFormat) ? characters[0] : '';
  }

  let startIndex = firstDigitIndex;
  if (startIndex > 0 && isDecimalSeparator(characters[startIndex - 1], numberFormat)) startIndex--;

  const prefix = characters.slice(0, startIndex);
  if (prefix.some(character => NEGATIVE_AMOUNT_MARKERS.has(character)) || prefix.includes('(')) return '';

  let token = '';
  for (let index = startIndex; index < characters.length; index++) {
    const character = characters[index];
    const nextCharacter = characters[index + 1];
    if (NEGATIVE_AMOUNT_MARKERS.has(character)) return '';
    if (
      (character === 'e' || character === 'E') &&
      nextCharacter !== undefined &&
      (nextCharacter === '+' || NEGATIVE_AMOUNT_MARKERS.has(nextCharacter) || readAsciiDigit(nextCharacter, numberFormat) !== undefined)
    ) {
      return '';
    }
    if (readAsciiDigit(character, numberFormat) !== undefined || isNumericSeparator(character, numberFormat)) {
      token += character;
    } else {
      let nextContentIndex = index + 1;
      while (BIDI_FORMAT_CHARACTERS.has(characters[nextContentIndex])) nextContentIndex++;
      const nextContent = characters[nextContentIndex];
      const isLineBreak = character === '\n' || character === '\r';
      if (!isLineBreak && nextContent !== undefined && readAsciiDigit(nextContent, numberFormat) !== undefined) return '';
      break;
    }
  }

  return token.trim();
};

const trimLeadingZeros = (value: string): string => {
  return value.length > 0 ? new BigNumber(value).toFixed(0) : '';
};

const findDecimalSeparatorIndex = (value: string, numberFormat: AmountInputNumberFormat): number => {
  return Array.from(value).findIndex(character => character === numberFormat.decimalSeparator);
};

const hasValidConfiguredGrouping = (
  characters: string[],
  decimalSeparatorIndex: number,
  numberFormat: AmountInputNumberFormat,
): boolean => {
  if (!numberFormat.groupingSeparator || numberFormat.groupingSeparator === numberFormat.decimalSeparator) return true;

  return characters.every((character, index) => {
    if (character !== numberFormat.groupingSeparator) return true;
    if (index === 0 || index === characters.length - 1) return false;
    if (decimalSeparatorIndex >= 0 && index > decimalSeparatorIndex) return false;
    return (
      readAsciiDigit(characters[index - 1], numberFormat) !== undefined && readAsciiDigit(characters[index + 1], numberFormat) !== undefined
    );
  });
};

/**
 * Converts editable/pasted localized text into the canonical representation
 * used throughout the app: ASCII digits, no grouping, and `.` for decimals.
 */
export const normalizeAmountInput = (text: string, unit: BitcoinUnit, numberFormat: AmountInputNumberFormat): string => {
  numberFormat = getNumberFormatForUnit(unit, numberFormat);
  const value = Array.from(extractNumericToken(text, numberFormat))
    .filter(character => !BIDI_FORMAT_CHARACTERS.has(character))
    .join('');
  const decimalSeparatorIndex = findDecimalSeparatorIndex(value, numberFormat);
  const characters = Array.from(value);
  if (!hasValidConfiguredGrouping(characters, decimalSeparatorIndex, numberFormat)) return '';

  let integer = '';
  let fraction = '';

  characters.forEach((character, index) => {
    const digit = readAsciiDigit(character, numberFormat);
    if (digit === undefined) return;

    if (decimalSeparatorIndex >= 0 && index > decimalSeparatorIndex) {
      fraction += digit;
    } else {
      integer += digit;
    }
  });

  integer = trimLeadingZeros(integer);

  if (unit === BitcoinUnit.SATS) return decimalSeparatorIndex < 0 ? integer : '';
  if (decimalSeparatorIndex < 0) return integer;
  return `${integer || '0'}.${fraction}`;
};

/** Applies unit limits after pasted/localized text has been normalized. */
export const limitAmountInputLength = (amount: string, unit: BitcoinUnit, localCurrencyFractionDigits = 2): string => {
  if (unit === BitcoinUnit.SATS) return amount.slice(0, SATS_MAX_DIGITS);
  if (unit !== BitcoinUnit.BTC) {
    const [integer, fraction] = amount.split('.');
    if (fraction === undefined || localCurrencyFractionDigits === 0) return integer.slice(0, LOCAL_CURRENCY_MAX_CHARACTERS);
    return `${integer}.${fraction.slice(0, localCurrencyFractionDigits)}`.slice(0, LOCAL_CURRENCY_MAX_CHARACTERS);
  }

  const [integer, fraction] = amount.split('.');
  const limitedInteger = integer.slice(0, BTC_MAX_INTEGER_DIGITS);
  if (fraction === undefined) return limitedInteger;

  return `${limitedInteger}.${fraction.slice(0, BTC_MAX_FRACTION_DIGITS)}`;
};

const formatIntegerForDisplay = (integer: string, numberFormat: AmountInputNumberFormat): string => {
  if (integer.length === 0) return '';

  const groupedInteger = new BigNumber(integer).toFormat(0, {
    groupSeparator: numberFormat.groupingSeparator,
    groupSize: numberFormat.primaryGroupingSize,
    secondaryGroupSize: numberFormat.secondaryGroupingSize === numberFormat.primaryGroupingSize ? 0 : numberFormat.secondaryGroupingSize,
  });

  return Array.from(groupedInteger)
    .map(character => {
      const digit = Number.parseInt(character, 10);
      return Number.isNaN(digit) ? character : numberFormat.localizedDigits[digit];
    })
    .join('');
};

const formatFractionForDisplay = (fraction: string, numberFormat: AmountInputNumberFormat): string => {
  return Array.from(fraction)
    .map(character => numberFormat.localizedDigits[Number(character)])
    .join('');
};

/**
 * Keeps partial values and trailing zeroes intact. Fiat uses native settings;
 * BTC/sats always use the fixed Bitcoin format above.
 */
export const formatAmountInputForDisplay = (amount: string, unit: BitcoinUnit, fiatNumberFormat: AmountInputNumberFormat): string => {
  const numberFormat = getNumberFormatForUnit(unit, fiatNumberFormat);
  const [integer, fraction] = amount.split('.');
  const formattedInteger = formatIntegerForDisplay(integer, numberFormat);
  if (fraction === undefined) return formattedInteger;
  return `${formattedInteger}${numberFormat.decimalSeparator}${formatFractionForDisplay(fraction, numberFormat)}`;
};

export const getAmountInputDisplayModel = (
  amount: string,
  unit: BitcoinUnit,
  numberFormat: AmountInputNumberFormat,
  maxLabel: string,
): AmountInputDisplayModel => {
  const numericAmount = new BigNumber(amount);
  const displayAmount =
    amount === BitcoinUnit.MAX
      ? maxLabel
      : numericAmount.isFinite() && numericAmount.isGreaterThanOrEqualTo(0)
        ? formatAmountInputForDisplay(amount, unit, numberFormat)
        : undefined;
  const inputTextAlign = amount === BitcoinUnit.MAX ? 'center' : unit === BitcoinUnit.LOCAL_CURRENCY ? 'left' : 'right';
  const displayJustifyContent = inputTextAlign === 'right' ? 'flex-end' : inputTextAlign === 'left' ? 'flex-start' : 'center';
  const measureAmountText = displayAmount && displayAmount.length > 0 ? displayAmount : '0';
  const displayLength = displayAmount?.length ?? 0;

  return {
    amountCharacters: Array.from(measureAmountText),
    displayAmount,
    displayJustifyContent,
    endSelection: { start: displayLength, end: displayLength },
    inputFontSize: (displayAmount?.length ?? amount.length) > 10 ? 20 : 36,
    inputTextAlign,
    isCryptoUnit: unit !== BitcoinUnit.LOCAL_CURRENCY,
    measureAmountText,
  };
};

export const shouldResetAmountSelection = (
  selection: { start: number; end: number },
  endSelection: { start: number; end: number },
): boolean => {
  const isAtEnd = selection.start === selection.end && selection.start === endSelection.start;
  const isEntireValueSelected = endSelection.end > 0 && selection.start === 0 && selection.end === endSelection.end;
  return !isAtEnd && !isEntireValueSelected;
};

export const getSecondaryAmountDisplay = (
  amount: string,
  unit: BitcoinUnit,
  { btcUnitLabel, cachedSatoshis, currencySymbol, fiatToBTC, formatLocalCurrency, numberFormat }: SecondaryDisplayFunctions,
): string => {
  if (amount === BitcoinUnit.MAX || new BigNumber(amount || 0).isZero()) return '';

  switch (unit) {
    case BitcoinUnit.BTC:
    case BitcoinUnit.SATS: {
      const satoshis = unit === BitcoinUnit.BTC ? btcToSatoshis(amount) : amount;
      const convertedAmount = formatLocalCurrency(Number(satoshis));
      const canonicalAmount = new BigNumber(convertedAmount);
      if (!canonicalAmount.isFinite()) return String(convertedAmount);
      return `${currencySymbol}${formatAmountInputForDisplay(canonicalAmount.toFixed(), BitcoinUnit.LOCAL_CURRENCY, numberFormat)}`;
    }
    case BitcoinUnit.LOCAL_CURRENCY: {
      const bitcoinAmount = cachedSatoshis ? satoshisToBtc(cachedSatoshis) : new BigNumber(fiatToBTC(Number(amount))).toFixed();
      return `${formatAmountInputForDisplay(bitcoinAmount, BitcoinUnit.BTC, numberFormat)} ${btcUnitLabel}`;
    }
    case BitcoinUnit.MAX:
    default:
      return '';
  }
};

export const getMaxEstimateText = (
  maxSendableAmount: number | null | undefined,
  isEstimate: boolean | undefined,
  btcUnitLabel: string,
): string | undefined => {
  if (maxSendableAmount == null) return undefined;
  return `${isEstimate ? '≈ ' : ''}${satoshisToBtc(maxSendableAmount)} ${btcUnitLabel}`;
};

/** Converts canonical BTC text to satoshis exactly with the project's arbitrary-precision number package. */
export const btcToSatoshis = (amount: string): string => {
  return new BigNumber(amount || 0).shiftedBy(BTC_MAX_FRACTION_DIGITS).integerValue(BigNumber.ROUND_DOWN).toFixed(0);
};

/** Converts satoshis to canonical BTC text without losing integer precision. */
export const satoshisToBtc = (satoshis: BigNumber.Value): string => new BigNumber(satoshis).shiftedBy(-BTC_MAX_FRACTION_DIGITS).toFixed();

/**
 * Converts a canonical amount between denominations through satoshis. Keeping
 * this separate from display localization prevents commas or native numerals
 * from reaching the arbitrary-precision and exchange-rate helpers.
 */
export const convertAmountUnit = (
  amount: string,
  fromUnit: BitcoinUnit,
  toUnit: BitcoinUnit,
  { cachedSatoshis, fiatToBTC, formatBalancePlain }: AmountUnitConversionOptions,
): { amount: string; satoshis: string } => {
  let satoshis: string;

  switch (fromUnit) {
    case BitcoinUnit.BTC:
      satoshis = btcToSatoshis(amount);
      break;
    case BitcoinUnit.LOCAL_CURRENCY:
      satoshis = cachedSatoshis ?? btcToSatoshis(fiatToBTC(Number(amount)));
      break;
    case BitcoinUnit.SATS:
    default:
      satoshis = amount;
      break;
  }

  let convertedAmount: string;
  switch (toUnit) {
    case BitcoinUnit.BTC:
      convertedAmount = satoshisToBtc(satoshis);
      break;
    case BitcoinUnit.SATS:
      convertedAmount = satoshis;
      break;
    case BitcoinUnit.LOCAL_CURRENCY:
    default:
      // Intl formats currency but does not supply exchange rates. The app's
      // rate-aware formatter is therefore the only conversion-specific edge.
      convertedAmount = formatBalancePlain(Number(satoshis), toUnit, false);
      break;
  }

  return {
    amount: convertedAmount,
    satoshis,
  };
};
