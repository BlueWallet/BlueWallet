import { _setExchangeRate, _setPreferredFiatCurrency, fiatToBTC } from '../../blue_modules/currency';
import {
  BITCOIN_AMOUNT_NUMBER_FORMAT,
  btcToSatoshis,
  convertAmountUnit,
  createAmountInputNumberFormat,
  formatAmountInputForDisplay,
  getAmountInputDisplayModel,
  getMaxEstimateText,
  getNextAmountUnit,
  getSecondaryAmountDisplay,
  limitAmountInputLength,
  normalizeAmountInput,
  satoshisToBtc,
  shouldResetAmountSelection,
} from '../../components/AmountInput.utils';
import { formatBalancePlain } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { FiatUnit } from '../../models/fiatUnit';

describe('AmountInput native number-format handling', () => {
  it.each([
    [BitcoinUnit.BTC, BitcoinUnit.BTC, BitcoinUnit.SATS],
    [BitcoinUnit.SATS, BitcoinUnit.SATS, BitcoinUnit.LOCAL_CURRENCY],
    [BitcoinUnit.LOCAL_CURRENCY, BitcoinUnit.LOCAL_CURRENCY, BitcoinUnit.BTC],
    [BitcoinUnit.MAX, BitcoinUnit.SATS, BitcoinUnit.BTC],
  ])('defines the %s unit transition outside the presentation component', (unit, fromUnit, toUnit) => {
    expect(getNextAmountUnit(unit)).toEqual({ fromUnit, toUnit });
  });

  it.each([
    ['en-US', '.', ',', '1,234,567.89'],
    ['de-DE', ',', '.', '1.234.567,89'],
    ['fr-FR', ',', '\u202f', '1\u202f234\u202f567,89'],
    ['de-CH', '.', '’', '1’234’567.89'],
  ])('normalizes grouped %s input', (_formatName, decimalSeparator, groupingSeparator, input) => {
    const format = createAmountInputNumberFormat({
      decimalSeparator,
      groupingSeparator,
    });

    expect(normalizeAmountInput(input, BitcoinUnit.LOCAL_CURRENCY, format)).toBe('1234567.89');
  });

  it('uses Arabic separators and numerals only for fiat', () => {
    const formatter = new Intl.NumberFormat('ar-EG', {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
    const format = createAmountInputNumberFormat(
      {
        decimalSeparator: '٫',
        groupingSeparator: '٬',
      },
      { format: formatter.format },
    );

    expect(normalizeAmountInput('١٬٢٣٤٫٥٦', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('1234.56');
    expect(normalizeAmountInput('1٬234٫56', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('1234.56');
    expect(formatAmountInputForDisplay('1234.56', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('١٬٢٣٤٫٥٦');
    expect(normalizeAmountInput('١٬٢٣٤٫٥٦', BitcoinUnit.BTC, format)).toBe('');
    expect(normalizeAmountInput('١٬٢٣٤', BitcoinUnit.SATS, format)).toBe('');
  });

  it('rejects pasted separators that conflict with the user’s native settings', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(normalizeAmountInput('EUR 1.234,56', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('');
  });

  it.each([
    ['narrow spaces', 'en-US', ',', '\u202f', 'Copied: 1\u202f234\u202f567,89 EUR', '1234567.89'],
    ['Devanagari digits and Indian grouping', 'hi-IN-u-nu-deva', '.', ',', '₹\u00a0१२,३४,५६७.८९', '1234567.89'],
    ['fullwidth digits and separators', 'en-US-u-nu-fullwide', '．', '，', '＄１２，３４５．６７', '12345.67'],
    ['Chinese decimal digits', 'zh-CN-u-nu-hanidec', '.', ',', 'CNY  一二三四.五六', '1234.56'],
    ['bidirectional marks and Arabic digits', 'ar-EG', '٫', '٬', '\u200fد.إ\u00a0١\u2066٬٢٣٤٫٥٦\u2069', '1234.56'],
  ])('normalizes pasted text with configured %s separators', (_caseName, locale, decimalSeparator, groupingSeparator, input, expected) => {
    const formatter = new Intl.NumberFormat(locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
    const format = createAmountInputNumberFormat(
      {
        decimalSeparator,
        groupingSeparator,
      },
      { format: formatter.format },
    );

    expect(normalizeAmountInput(input, BitcoinUnit.LOCAL_CURRENCY, format)).toBe(expected);
  });

  it('supports arbitrary separators supplied by native settings without a separator lookup table', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '·',
      groupingSeparator: '_',
    });

    expect(normalizeAmountInput('1_234·56', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('1234.56');
    expect(formatAmountInputForDisplay('1234.56', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('1_234·56');
  });

  it('falls back to ASCII when a formatter does not return one digit per value', () => {
    const format = createAmountInputNumberFormat(
      { decimalSeparator: '.', groupingSeparator: ',' },
      { format: value => (value < 10 ? `digit ${value}` : String(value)) },
    );

    expect(format.localizedDigits).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(format.groupingSignature).toBe('none');
  });

  it('lets Intl determine grouping placement while using the configured native symbol', () => {
    const indianFormatter = new Intl.NumberFormat('en-IN', {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
    const format = createAmountInputNumberFormat({ decimalSeparator: '.', groupingSeparator: '_' }, { format: indianFormatter.format });

    expect(formatAmountInputForDisplay('1234567.89', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('12_34_567.89');
  });

  it('groups exact maximum-length values and preserves entered cents and trailing zeroes', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(formatAmountInputForDisplay('9999999999999999', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('9,999,999,999,999,999');
    expect(formatAmountInputForDisplay('3000.00', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('3,000.00');
  });

  it.each([
    [BitcoinUnit.BTC, '1234.50', '1,234.50', 'right', 'flex-end', true],
    [BitcoinUnit.SATS, '1234', '1,234', 'right', 'flex-end', true],
    [BitcoinUnit.LOCAL_CURRENCY, '1234.50', '1,234.50', 'left', 'flex-start', false],
  ] as const)(
    'derives the %s presentation outside the component',
    (unit, amount, expectedDisplay, textAlign, justifyContent, isCryptoUnit) => {
      const format = createAmountInputNumberFormat({
        decimalSeparator: '.',
        groupingSeparator: ',',
      });
      const model = getAmountInputDisplayModel(amount, unit, format, 'MAX');

      expect(model).toMatchObject({
        displayAmount: expectedDisplay,
        inputTextAlign: textAlign,
        displayJustifyContent: justifyContent,
        isCryptoUnit,
        measureAmountText: expectedDisplay,
        inputFontSize: 36,
        endSelection: {
          start: expectedDisplay.length,
          end: expectedDisplay.length,
        },
      });
      expect(model.amountCharacters).toEqual(Array.from(expectedDisplay));
    },
  );

  it('derives MAX, invalid, empty-display, and long-value presentation branches', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(getAmountInputDisplayModel(BitcoinUnit.MAX, BitcoinUnit.BTC, format, 'Maximum')).toMatchObject({
      displayAmount: 'Maximum',
      inputTextAlign: 'center',
      displayJustifyContent: 'center',
      measureAmountText: 'Maximum',
      endSelection: { start: 7, end: 7 },
    });
    expect(getAmountInputDisplayModel('-1', BitcoinUnit.BTC, format, 'MAX')).toMatchObject({
      displayAmount: undefined,
      measureAmountText: '0',
      amountCharacters: ['0'],
      endSelection: { start: 0, end: 0 },
    });
    expect(getAmountInputDisplayModel('not a number', BitcoinUnit.LOCAL_CURRENCY, format, 'MAX').displayAmount).toBeUndefined();
    expect(getAmountInputDisplayModel('99999999999', BitcoinUnit.SATS, format, 'MAX').inputFontSize).toBe(20);
  });

  it.each([
    [{ start: 3, end: 3 }, false],
    [{ start: 2, end: 2 }, true],
    [{ start: 1, end: 3 }, true],
    [{ start: 0, end: 3 }, false],
  ])('decides whether cursor selection %o must return to the end', (selection, expected) => {
    expect(shouldResetAmountSelection(selection, { start: 3, end: 3 })).toBe(expected);
  });

  it('derives every secondary-display unit branch with cached precision when available', () => {
    const numberFormat = createAmountInputNumberFormat({ decimalSeparator: ',', groupingSeparator: '.' });
    const formatLocalCurrency = jest.fn((satoshis: number) => String(satoshis));
    const baseFunctions = {
      btcUnitLabel: 'BTC',
      currencySymbol: '$',
      fiatToBTC: jest.fn(() => '0.00100000'),
      formatLocalCurrency,
      numberFormat,
    };

    expect(getSecondaryAmountDisplay('0.001', BitcoinUnit.BTC, baseFunctions)).toBe('$100.000');
    expect(getSecondaryAmountDisplay('100000', BitcoinUnit.SATS, baseFunctions)).toBe('$100.000');
    expect(getSecondaryAmountDisplay('50', BitcoinUnit.LOCAL_CURRENCY, baseFunctions)).toBe('0.001 BTC');
    expect(
      getSecondaryAmountDisplay('50', BitcoinUnit.LOCAL_CURRENCY, {
        ...baseFunctions,
        cachedSatoshis: '100001',
      }),
    ).toBe('0.00100001 BTC');
    expect(getSecondaryAmountDisplay(BitcoinUnit.MAX, BitcoinUnit.BTC, baseFunctions)).toBe('');
    expect(getSecondaryAmountDisplay('100000', BitcoinUnit.MAX, baseFunctions)).toBe('');
  });

  it.each([
    [BitcoinUnit.BTC, '0'],
    [BitcoinUnit.BTC, '0.00000000'],
    [BitcoinUnit.SATS, '0'],
    [BitcoinUnit.SATS, '000'],
    [BitcoinUnit.LOCAL_CURRENCY, '0.00'],
    [BitcoinUnit.LOCAL_CURRENCY, ''],
  ])('hides the %s secondary display for zero amount %j without converting it', (unit, amount) => {
    const functions = {
      btcUnitLabel: 'BTC',
      currencySymbol: '$',
      fiatToBTC: jest.fn(() => '1'),
      formatLocalCurrency: jest.fn(() => '$1'),
      numberFormat: BITCOIN_AMOUNT_NUMBER_FORMAT,
    };

    expect(getSecondaryAmountDisplay(amount, unit, functions)).toBe('');
    expect(functions.fiatToBTC).not.toHaveBeenCalled();
    expect(functions.formatLocalCurrency).not.toHaveBeenCalled();
  });

  it('formats fiat secondary values with the same native settings as fiat input', () => {
    const formatter = new Intl.NumberFormat('ar-EG', { useGrouping: true, maximumFractionDigits: 0 });
    const numberFormat = createAmountInputNumberFormat({ decimalSeparator: '٫', groupingSeparator: '٬' }, { format: formatter.format });

    expect(
      getSecondaryAmountDisplay('123456', BitcoinUnit.SATS, {
        btcUnitLabel: 'BTC',
        currencySymbol: 'د.إ.',
        fiatToBTC: jest.fn(),
        formatLocalCurrency: jest.fn(() => '1234.56'),
        numberFormat,
      }),
    ).toBe('د.إ.١٬٢٣٤٫٥٦');
  });

  it('keeps BTC secondary values on the fixed Bitcoin format', () => {
    const numberFormat = createAmountInputNumberFormat({ decimalSeparator: ',', groupingSeparator: '.' });

    expect(
      getSecondaryAmountDisplay('5000', BitcoinUnit.LOCAL_CURRENCY, {
        btcUnitLabel: 'BTC',
        currencySymbol: '$',
        fiatToBTC: jest.fn(() => '1234.50000000'),
        formatLocalCurrency: jest.fn(),
        numberFormat,
      }),
    ).toBe('1,234.5 BTC');
  });

  it('preserves an unavailable fiat conversion without applying numeric formatting', () => {
    expect(
      getSecondaryAmountDisplay('1', BitcoinUnit.BTC, {
        btcUnitLabel: 'BTC',
        currencySymbol: '$',
        fiatToBTC: jest.fn(),
        formatLocalCurrency: jest.fn(() => '...'),
        numberFormat: createAmountInputNumberFormat({ decimalSeparator: ',', groupingSeparator: '.' }),
      }),
    ).toBe('...');
  });

  it('derives optional exact MAX estimates without component branching', () => {
    expect(getMaxEstimateText(undefined, false, 'BTC')).toBeUndefined();
    expect(getMaxEstimateText(null, true, 'BTC')).toBeUndefined();
    expect(getMaxEstimateText(0, false, 'BTC')).toBe('0 BTC');
    expect(getMaxEstimateText(100000000, true, 'BTC')).toBe('≈ 1 BTC');
  });

  it('uses only the first pasted amount instead of joining explanatory values', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(normalizeAmountInput('1.25 BTC ≈ 62,500 USD', BitcoinUnit.BTC, format)).toBe('1.25');
    expect(normalizeAmountInput('1.25\n62.5', BitcoinUnit.BTC, format)).toBe('1.25');
    expect(normalizeAmountInput('.5', BitcoinUnit.BTC, format)).toBe('0.5');
    expect(normalizeAmountInput('1X\u20662', BitcoinUnit.BTC, format)).toBe('');
    expect(normalizeAmountInput('1a2', BitcoinUnit.BTC, format)).toBe('');
  });

  it.each(['-$1.00', '− 1,00 EUR', '(1.00)', '1.00-', '1e-8', '1e8'])('rejects a pasted negative or exponential amount: %s', input => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(normalizeAmountInput(input, BitcoinUnit.LOCAL_CURRENCY, format)).toBe('');
  });

  it('keeps Bitcoin separators and ASCII digits stable across native settings', () => {
    const englishFormat = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });
    const germanFormat = createAmountInputNumberFormat({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });

    expect(normalizeAmountInput('1,234', BitcoinUnit.BTC, englishFormat)).toBe('1234');
    expect(normalizeAmountInput('1,234', BitcoinUnit.BTC, germanFormat)).toBe('1234');
    expect(normalizeAmountInput('0.001', BitcoinUnit.BTC, germanFormat)).toBe('0.001');
    expect(normalizeAmountInput('1.234,56', BitcoinUnit.BTC, germanFormat)).toBe('');
    expect(normalizeAmountInput('1,234.56 BTC', BitcoinUnit.BTC, germanFormat)).toBe('1234.56');
    expect(formatAmountInputForDisplay('1234.56', BitcoinUnit.BTC, germanFormat)).toBe('1,234.56');
    expect(formatAmountInputForDisplay('1234', BitcoinUnit.SATS, germanFormat)).toBe('1,234');
    expect(BITCOIN_AMOUNT_NUMBER_FORMAT).toMatchObject({
      decimalSeparator: '.',
      groupingSeparator: ',',
      localizedDigits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      primaryGroupingSize: 3,
      secondaryGroupingSize: 3,
    });
  });

  it('handles ungrouped input and rejects malformed configured grouping', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(normalizeAmountInput('1234', BitcoinUnit.BTC, format)).toBe('1234');
    expect(normalizeAmountInput('0001234', BitcoinUnit.BTC, format)).toBe('1234');
    expect(normalizeAmountInput('0000', BitcoinUnit.BTC, format)).toBe('0');
    expect(normalizeAmountInput('1,,234', BitcoinUnit.BTC, format)).toBe('');
    expect(normalizeAmountInput(',123', BitcoinUnit.BTC, format)).toBe('123');
    expect(normalizeAmountInput('123,', BitcoinUnit.BTC, format)).toBe('');
    expect(normalizeAmountInput('1.2,3', BitcoinUnit.BTC, format)).toBe('');

    const ungroupedFormat = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: '',
    });
    const sharedSeparatorFormat = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: '.',
    });
    expect(normalizeAmountInput('1234', BitcoinUnit.LOCAL_CURRENCY, ungroupedFormat)).toBe('1234');
    expect(normalizeAmountInput('1.5', BitcoinUnit.LOCAL_CURRENCY, sharedSeparatorFormat)).toBe('1.5');
  });

  it('removes correctly placed configured grouping without assuming a language-specific group size', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(normalizeAmountInput('1,234,567', BitcoinUnit.SATS, format)).toBe('1234567');
    expect(normalizeAmountInput('12,34,567', BitcoinUnit.SATS, format)).toBe('1234567');
    expect(normalizeAmountInput('1,23,4567', BitcoinUnit.SATS, format)).toBe('1234567');
    expect(normalizeAmountInput('1.5', BitcoinUnit.SATS, format)).toBe('');
  });

  it('enforces fixed BTC integer and fractional limits after normalization', () => {
    expect(limitAmountInputLength('123456789.123456789', BitcoinUnit.BTC)).toBe('12345678.12345678');
    expect(limitAmountInputLength('123456789', BitcoinUnit.BTC)).toBe('12345678');
    expect(limitAmountInputLength('0.', BitcoinUnit.BTC)).toBe('0.');
    expect(limitAmountInputLength('.5', BitcoinUnit.BTC)).toBe('.5');
    expect(
      formatAmountInputForDisplay(
        '.5',
        BitcoinUnit.BTC,
        createAmountInputNumberFormat({
          decimalSeparator: '.',
          groupingSeparator: ',',
        }),
      ),
    ).toBe('.5');
  });

  it('allows the full fixed 16-digit satoshi range', () => {
    expect(limitAmountInputLength('2100000000000000', BitcoinUnit.SATS)).toBe('2100000000000000');
    expect(limitAmountInputLength('21000000000000001', BitcoinUnit.SATS)).toBe('2100000000000000');
  });

  it('preserves partial decimals and removes extra decimal separators', () => {
    const format = createAmountInputNumberFormat({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });

    expect(normalizeAmountInput(',', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('0.');
    expect(normalizeAmountInput('000,', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('0.');
    expect(normalizeAmountInput('1,2,3', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('1.23');
    expect(formatAmountInputForDisplay('0.', BitcoinUnit.LOCAL_CURRENCY, format)).toBe('0,');
  });

  it('round-trips localized input through BTC, sats, and fiat units', () => {
    _setPreferredFiatCurrency(FiatUnit.USD);
    _setExchangeRate('BTC_USD', 50000);
    const germanFormat = createAmountInputNumberFormat({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    const conversionFunctions = { fiatToBTC, formatBalancePlain };

    const canonicalBtc = normalizeAmountInput('0.001', BitcoinUnit.BTC, germanFormat);
    const sats = convertAmountUnit(canonicalBtc, BitcoinUnit.BTC, BitcoinUnit.SATS, conversionFunctions);
    const fiat = convertAmountUnit(sats.amount, BitcoinUnit.SATS, BitcoinUnit.LOCAL_CURRENCY, conversionFunctions);
    const btc = convertAmountUnit(fiat.amount, BitcoinUnit.LOCAL_CURRENCY, BitcoinUnit.BTC, {
      ...conversionFunctions,
      cachedSatoshis: fiat.satoshis,
    });

    expect(canonicalBtc).toBe('0.001');
    expect(sats).toEqual({ amount: '100000', satoshis: '100000' });
    expect(fiat).toEqual({ amount: '50', satoshis: '100000' });
    expect(btc).toEqual({ amount: '0.001', satoshis: '100000' });
    expect(formatAmountInputForDisplay(btc.amount, BitcoinUnit.BTC, germanFormat)).toBe('0.001');
  });

  it.each([
    ['0.00000001', '1', '0.00000001'],
    ['1', '100000000', '1'],
    ['21000000', '2100000000000000', '21000000'],
    ['21000000.00000000', '2100000000000000', '21000000'],
    ['99999999.99999999', '9999999999999999', '99999999.99999999'],
  ])('converts %s BTC to %s sats exactly with bignumber.js', (btc, sats, canonicalBtc) => {
    expect(btcToSatoshis(btc)).toBe(sats);
    expect(satoshisToBtc(sats)).toBe(canonicalBtc);
  });

  it('treats an empty canonical BTC amount as zero at the conversion boundary', () => {
    expect(btcToSatoshis('')).toBe('0');
  });

  it('keeps maximum-length crypto unit switches out of floating-point and fiat formatting', () => {
    const formatFiat = jest.fn(() => 'unused');
    const conversionFunctions = { fiatToBTC, formatBalancePlain: formatFiat };

    expect(convertAmountUnit('99999999.99999999', BitcoinUnit.BTC, BitcoinUnit.SATS, conversionFunctions)).toEqual({
      amount: '9999999999999999',
      satoshis: '9999999999999999',
    });
    expect(convertAmountUnit('9999999999999999', BitcoinUnit.SATS, BitcoinUnit.BTC, conversionFunctions)).toEqual({
      amount: '99999999.99999999',
      satoshis: '9999999999999999',
    });
    expect(formatFiat).not.toHaveBeenCalled();
  });

  it('converts fiat back to BTC without a cached satoshi value', () => {
    _setPreferredFiatCurrency(FiatUnit.USD);
    _setExchangeRate('BTC_USD', 50000);

    expect(
      convertAmountUnit('50', BitcoinUnit.LOCAL_CURRENCY, BitcoinUnit.BTC, {
        fiatToBTC,
        formatBalancePlain,
      }),
    ).toEqual({ amount: '0.001', satoshis: '100000' });
  });
});
