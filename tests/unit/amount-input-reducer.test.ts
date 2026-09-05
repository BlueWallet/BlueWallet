import {
  amountInputReducer,
  amountInputSelectionReducer,
  amountInputValueReducer,
  AmountInputState,
  type AmountInputSelectionState,
  type AmountInputValueState,
  createInitialAmountInputSelectionState,
  createInitialAmountInputState,
} from '../../components/AmountInput.reducer';
import { createAmountInputNumberFormat } from '../../components/AmountInput.utils';
import { BitcoinUnit } from '../../models/bitcoinUnits';

const outdatedRate = { LastUpdated: new Date(1), Rate: 50000 };
const refreshedButStillOutdatedRate = { LastUpdated: new Date(2), Rate: 51000 };
const numberFormat = createAmountInputNumberFormat({
  decimalSeparator: '.',
  groupingSeparator: ',',
});
const settings = { numberFormat, currencyFractionDigits: 2 };
const createState = (overrides: Partial<AmountInputState> = {}): AmountInputState => ({
  ...createInitialAmountInputState(settings),
  ...overrides,
});

describe('amountInputReducer', () => {
  it('starts with native formatting in an idle state without an outdated-rate warning', () => {
    expect(createInitialAmountInputState(settings)).toEqual({
      isRateBeingUpdated: false,
      outdatedRefreshRate: undefined,
      numberFormat,
      currencyFractionDigits: 2,
    });
  });

  it('updates native formatting while preserving unrelated state', () => {
    const germanFormat = createAmountInputNumberFormat({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    const state = createState({ outdatedRefreshRate: outdatedRate });

    expect(
      amountInputReducer(state, {
        type: 'inputSettingsRead',
        settings: { ...settings, numberFormat: germanFormat },
      }),
    ).toEqual({
      ...state,
      numberFormat: germanFormat,
    });
  });

  it('returns the current state when native formatting has not changed', () => {
    const state = createState();
    const equivalentFormat = createAmountInputNumberFormat({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    expect(
      amountInputReducer(state, {
        type: 'inputSettingsRead',
        settings: { ...settings, numberFormat: equivalentFormat },
      }),
    ).toBe(state);
  });

  it('updates native formatting when only the numbering system changes', () => {
    const state = createState({ outdatedRefreshRate: outdatedRate });
    const formatter = new Intl.NumberFormat('ar-EG', { useGrouping: false });
    const arabicFormat = createAmountInputNumberFormat({ decimalSeparator: '.', groupingSeparator: ',' }, { format: formatter.format });

    expect(
      amountInputReducer(state, {
        type: 'inputSettingsRead',
        settings: { ...settings, numberFormat: arabicFormat },
      }),
    ).toEqual({
      ...state,
      numberFormat: arabicFormat,
    });
  });

  it('updates the selected currency precision without disturbing rate state', () => {
    const state = createState({ outdatedRefreshRate: outdatedRate });

    expect(
      amountInputReducer(state, {
        type: 'inputSettingsRead',
        settings: { ...settings, currencyFractionDigits: 3 },
      }),
    ).toEqual({
      ...state,
      currencyFractionDigits: 3,
    });
  });

  it('records the result of the initial rate check without changing refresh progress', () => {
    const refreshingState = createState({ isRateBeingUpdated: true });

    expect(
      amountInputReducer(refreshingState, {
        type: 'rateCheckCompleted',
        outdatedRefreshRate: outdatedRate,
      }),
    ).toEqual({
      ...refreshingState,
      outdatedRefreshRate: outdatedRate,
    });
  });

  it('starts a refresh while preserving the current warning', () => {
    const state = createState({ outdatedRefreshRate: outdatedRate });

    expect(amountInputReducer(state, { type: 'rateRefreshStarted' })).toEqual({
      ...state,
      isRateBeingUpdated: true,
    });
  });

  it('returns the same state when a refresh is already running', () => {
    const state = createState({
      isRateBeingUpdated: true,
      outdatedRefreshRate: outdatedRate,
    });

    expect(amountInputReducer(state, { type: 'rateRefreshStarted' })).toBe(state);
  });

  it.each([
    ['clears', undefined],
    ['replaces', refreshedButStillOutdatedRate],
  ])('%s the warning when refresh completes', (_caseName, nextRate) => {
    const state = createState({
      isRateBeingUpdated: true,
      outdatedRefreshRate: outdatedRate,
    });

    expect(
      amountInputReducer(state, {
        type: 'rateRefreshCompleted',
        outdatedRefreshRate: nextRate,
      }),
    ).toEqual({
      numberFormat,
      currencyFractionDigits: 2,
      isRateBeingUpdated: false,
      outdatedRefreshRate: nextRate,
    });
  });
});

describe('amountInputSelectionReducer', () => {
  const endSelection = { start: 8, end: 8 };

  it('starts with the cursor at the end', () => {
    expect(createInitialAmountInputSelectionState(endSelection)).toEqual({ selection: endSelection });
  });

  it.each([
    ['end cursor', { start: 8, end: 8 }, { start: 8, end: 8 }],
    ['Select All', { start: 0, end: 8 }, { start: 0, end: 8 }],
    ['middle cursor', { start: 3, end: 3 }, { start: 8, end: 8 }],
    ['partial selection', { start: 2, end: 6 }, { start: 8, end: 8 }],
  ])('owns the %s native selection transition', (_caseName, selection, expectedSelection) => {
    expect(
      amountInputSelectionReducer(createInitialAmountInputSelectionState(endSelection), {
        type: 'nativeSelectionChanged',
        selection,
        endSelection,
      }),
    ).toEqual({ selection: expectedSelection });
  });

  it('returns the current state when the normalized selection has not changed', () => {
    const state = createInitialAmountInputSelectionState(endSelection);

    expect(
      amountInputSelectionReducer(state, {
        type: 'nativeSelectionChanged',
        selection: { start: 4, end: 4 },
        endSelection,
      }),
    ).toBe(state);
  });

  it('returns to the new display end after replacement text is rendered', () => {
    const state: AmountInputSelectionState = { selection: { start: 0, end: 8 } };

    expect(
      amountInputSelectionReducer(state, {
        type: 'displayChanged',
        endSelection: { start: 10, end: 10 },
      }),
    ).toEqual({ selection: { start: 10, end: 10 } });
  });
});

describe('amountInputValueReducer', () => {
  const commaSettings = {
    numberFormat: createAmountInputNumberFormat({
      decimalSeparator: ',',
      groupingSeparator: '.',
    }),
    currencyFractionDigits: 2,
  };
  const createValueState = (overrides: Partial<AmountInputValueState> = {}): AmountInputValueState => ({
    amount: '12.30',
    displayAmount: '12,30',
    unit: BitcoinUnit.LOCAL_CURRENCY,
    ...overrides,
  });

  it.each([
    ['12,30', '12.30', 'edit'],
    ['12,3', '12.3', 'backspace'],
    ['12,', '12.', 'backspace'],
    ['12', '12', 'backspace'],
    ['1', '1', 'backspace'],
    ['', '', 'backspace'],
  ] as const)('reduces localized deletion text %s to canonical %s', (text, expectedAmount, editKind) => {
    const result = amountInputValueReducer(createValueState(), {
      type: 'nativeTextChanged',
      text,
      settings: commaSettings,
    });

    expect(result).toEqual({
      amount: expectedAmount,
      displayAmount: text,
      unit: BitcoinUnit.LOCAL_CURRENCY,
      transition: editKind,
      shouldNotifyAmount: expectedAmount !== '12.30',
      shouldNotifyUnit: false,
    });
  });

  it('backspaces localized numerals and decimal separators through the same reducer path', () => {
    const formatter = new Intl.NumberFormat('ar-EG', { useGrouping: false });
    const arabicSettings = {
      numberFormat: createAmountInputNumberFormat({ decimalSeparator: '٫', groupingSeparator: '٬' }, { format: formatter.format }),
      currencyFractionDigits: 2,
    };

    expect(
      amountInputValueReducer(createValueState({ displayAmount: '١٢٫٣٠' }), {
        type: 'nativeTextChanged',
        text: '١٢٫٣',
        settings: arabicSettings,
      }),
    ).toEqual({
      amount: '12.3',
      displayAmount: '١٢٫٣',
      unit: BitcoinUnit.LOCAL_CURRENCY,
      transition: 'backspace',
      shouldNotifyAmount: true,
      shouldNotifyUnit: false,
    });
  });

  it.each([
    [2, '1,239', '1.23'],
    [3, '1,2399', '1.239'],
    [0, '1,2', '1'],
  ])('caps fiat input at %i native currency fraction digits', (currencyFractionDigits, text, expectedAmount) => {
    const result = amountInputValueReducer(createValueState({ amount: '1', displayAmount: '1' }), {
      type: 'nativeTextChanged',
      text,
      settings: { ...commaSettings, currencyFractionDigits },
    });

    expect(result.amount).toBe(expectedAmount);
    expect(result.shouldNotifyAmount).toBe(expectedAmount !== '1');
  });

  it.each([
    [BitcoinUnit.BTC, '123456789.123456789', '12345678.12345678'],
    [BitcoinUnit.SATS, '21,000,000,000,000,001', '2100000000000000'],
    [BitcoinUnit.LOCAL_CURRENCY, '0,50', '0.50'],
  ])('owns normalization and fixed limits for %s edits', (unit, text, expectedAmount) => {
    const result = amountInputValueReducer(createValueState({ amount: '0', displayAmount: '0', unit }), {
      type: 'nativeTextChanged',
      text,
      settings: commaSettings,
    });

    expect(result).toMatchObject({
      amount: expectedAmount,
      transition: 'edit',
      shouldNotifyAmount: true,
      shouldNotifyUnit: false,
    });
  });

  it('uses fixed Bitcoin input rules even when native settings use comma decimals', () => {
    expect(
      amountInputValueReducer(
        createValueState({
          amount: '1',
          displayAmount: '1',
          unit: BitcoinUnit.BTC,
        }),
        {
          type: 'nativeTextChanged',
          text: '1,234.50',
          settings: commaSettings,
        },
      ),
    ).toMatchObject({
      amount: '1234.50',
      displayAmount: '1,234.50',
      transition: 'edit',
      shouldNotifyAmount: true,
    });

    expect(
      amountInputValueReducer(
        createValueState({
          amount: '1',
          displayAmount: '1',
          unit: BitcoinUnit.SATS,
        }),
        {
          type: 'nativeTextChanged',
          text: '1.5',
          settings: commaSettings,
        },
      ),
    ).toMatchObject({
      amount: '1',
      displayAmount: '1',
      transition: 'rejected',
      shouldNotifyAmount: false,
    });
  });

  it('retains the numeric token when a trailing hardware-keyboard letter is harmless', () => {
    expect(
      amountInputValueReducer(
        createValueState({
          amount: '12',
          displayAmount: '12',
          unit: BitcoinUnit.BTC,
        }),
        {
          type: 'nativeTextChanged',
          text: '123a',
          settings: commaSettings,
        },
      ),
    ).toMatchObject({
      amount: '123',
      displayAmount: '123a',
      transition: 'edit',
      shouldNotifyAmount: true,
    });
  });

  it.each(['letters only', '12,34.56', '-12'])('keeps the controlled value and display unchanged when %s is rejected', text => {
    expect(
      amountInputValueReducer(createValueState({ amount: '12', displayAmount: '12' }), {
        type: 'nativeTextChanged',
        text,
        settings: commaSettings,
      }),
    ).toEqual({
      amount: '12',
      displayAmount: '12',
      unit: BitcoinUnit.LOCAL_CURRENCY,
      transition: 'rejected',
      shouldNotifyAmount: false,
      shouldNotifyUnit: false,
    });
  });

  it('owns the confirmed reset transition without changing the selected unit', () => {
    expect(
      amountInputValueReducer(createValueState({ amount: BitcoinUnit.MAX, displayAmount: 'MAX' }), { type: 'resetConfirmed' }),
    ).toEqual({
      amount: '0',
      displayAmount: '0',
      unit: BitcoinUnit.LOCAL_CURRENCY,
      transition: 'reset',
      shouldNotifyAmount: true,
      shouldNotifyUnit: false,
    });
  });

  it('cycles BTC to sats with exact package arithmetic', () => {
    const formatBalancePlain = jest.fn(() => 'unused');
    const result = amountInputValueReducer(
      createValueState({
        amount: '0.001',
        displayAmount: '0.001',
        unit: BitcoinUnit.BTC,
      }),
      {
        type: 'unitCycleRequested',
        conversionFunctions: {
          fiatToBTC: jest.fn(() => 'unused'),
          formatBalancePlain,
        },
      },
    );

    expect(result).toEqual({
      amount: '100000',
      displayAmount: '100000',
      unit: BitcoinUnit.SATS,
      cacheWrite: undefined,
      transition: 'unitChange',
      shouldNotifyAmount: true,
      shouldNotifyUnit: true,
    });
    expect(formatBalancePlain).not.toHaveBeenCalled();
  });

  it('cycles sats to fiat and returns the exact conversion-cache write as reducer output', () => {
    const formatBalancePlain = jest.fn(() => '50');
    const result = amountInputValueReducer(
      createValueState({
        amount: '100000',
        displayAmount: '100,000',
        unit: BitcoinUnit.SATS,
      }),
      {
        type: 'unitCycleRequested',
        conversionFunctions: {
          fiatToBTC: jest.fn(() => 'unused'),
          formatBalancePlain,
        },
      },
    );

    expect(result).toEqual({
      amount: '50',
      displayAmount: '50',
      unit: BitcoinUnit.LOCAL_CURRENCY,
      cacheWrite: { localAmount: '50', satoshis: '100000' },
      transition: 'unitChange',
      shouldNotifyAmount: true,
      shouldNotifyUnit: true,
    });
    expect(formatBalancePlain).toHaveBeenCalledWith(100000, BitcoinUnit.LOCAL_CURRENCY, false);
  });

  it('cycles fiat to BTC using an exact cached satoshi value when available', () => {
    const fiatToBTC = jest.fn(() => '9');
    const result = amountInputValueReducer(createValueState({ amount: '50', displayAmount: '50' }), {
      type: 'unitCycleRequested',
      cachedSatoshis: '100000',
      conversionFunctions: {
        fiatToBTC,
        formatBalancePlain: jest.fn(() => 'unused'),
      },
    });

    expect(result).toMatchObject({
      amount: '0.001',
      unit: BitcoinUnit.BTC,
      transition: 'unitChange',
    });
    expect(fiatToBTC).not.toHaveBeenCalled();
  });

  it('cycles fiat to BTC through the rate function when the cache misses', () => {
    const fiatToBTC = jest.fn(() => '0.00100000');
    const result = amountInputValueReducer(createValueState({ amount: '50', displayAmount: '50' }), {
      type: 'unitCycleRequested',
      conversionFunctions: {
        fiatToBTC,
        formatBalancePlain: jest.fn(() => 'unused'),
      },
    });

    expect(result).toMatchObject({
      amount: '0.001',
      unit: BitcoinUnit.BTC,
      transition: 'unitChange',
    });
    expect(fiatToBTC).toHaveBeenCalledWith(50);
  });
});
