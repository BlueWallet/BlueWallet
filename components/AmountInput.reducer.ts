import { type CurrencyRate } from '../blue_modules/currency';
import { BitcoinUnit } from '../models/bitcoinUnits';
import {
  type AmountInputNumberFormat,
  type AmountUnitConversionFunctions,
  convertAmountUnit,
  getNextAmountUnit,
  limitAmountInputLength,
  normalizeAmountInput,
  shouldResetAmountSelection,
} from './AmountInput.utils';

export type AmountInputSettings = {
  numberFormat: AmountInputNumberFormat;
  currencyFractionDigits: number;
};

export type AmountInputState = AmountInputSettings & {
  isRateBeingUpdated: boolean;
  outdatedRefreshRate?: CurrencyRate;
};

export type AmountInputAction =
  | { type: 'inputSettingsRead'; settings: AmountInputSettings }
  | { type: 'rateCheckCompleted'; outdatedRefreshRate: CurrencyRate }
  | { type: 'rateRefreshStarted' }
  | { type: 'rateRefreshCompleted'; outdatedRefreshRate?: CurrencyRate };

export const createInitialAmountInputState = (settings: AmountInputSettings): AmountInputState => ({
  ...settings,
  isRateBeingUpdated: false,
  outdatedRefreshRate: undefined,
});

const hasSameNumberFormat = (current: AmountInputNumberFormat, latest: AmountInputNumberFormat): boolean => {
  return (
    current.decimalSeparator === latest.decimalSeparator &&
    current.groupingSeparator === latest.groupingSeparator &&
    current.groupingSignature === latest.groupingSignature &&
    current.localizedDigits.every((digit, index) => digit === latest.localizedDigits[index])
  );
};

export const amountInputReducer = (state: AmountInputState, action: AmountInputAction): AmountInputState => {
  switch (action.type) {
    case 'inputSettingsRead':
      if (
        state.currencyFractionDigits === action.settings.currencyFractionDigits &&
        hasSameNumberFormat(state.numberFormat, action.settings.numberFormat)
      ) {
        return state;
      }
      return { ...state, ...action.settings };
    case 'rateCheckCompleted':
      return { ...state, outdatedRefreshRate: action.outdatedRefreshRate };
    case 'rateRefreshStarted':
      if (state.isRateBeingUpdated) return state;
      return { ...state, isRateBeingUpdated: true };
    case 'rateRefreshCompleted':
      return {
        ...state,
        isRateBeingUpdated: false,
        outdatedRefreshRate: action.outdatedRefreshRate,
      };
  }
};

export type AmountInputSelection = { start: number; end: number };

export type AmountInputSelectionState = {
  selection: AmountInputSelection;
};

export type AmountInputSelectionAction =
  | {
      type: 'nativeSelectionChanged';
      selection: AmountInputSelection;
      endSelection: AmountInputSelection;
    }
  | {
      type: 'displayChanged';
      endSelection: AmountInputSelection;
    };

export const createInitialAmountInputSelectionState = (endSelection: AmountInputSelection): AmountInputSelectionState => ({
  selection: endSelection,
});

export const amountInputSelectionReducer = (
  state: AmountInputSelectionState,
  action: AmountInputSelectionAction,
): AmountInputSelectionState => {
  const selection =
    action.type === 'nativeSelectionChanged' && !shouldResetAmountSelection(action.selection, action.endSelection)
      ? action.selection
      : action.endSelection;

  if (state.selection.start === selection.start && state.selection.end === selection.end) return state;
  return { selection };
};

export type AmountInputValueState = {
  amount: string;
  displayAmount: string;
  unit: BitcoinUnit;
};

export type AmountInputValueAction =
  | {
      type: 'nativeTextChanged';
      text: string;
      settings: AmountInputSettings;
    }
  | { type: 'resetConfirmed' }
  | {
      type: 'unitCycleRequested';
      cachedSatoshis?: string;
      conversionFunctions: AmountUnitConversionFunctions;
    };

export type AmountInputCacheWrite = {
  localAmount: string;
  satoshis: string;
};

export type AmountInputValueResult = AmountInputValueState & {
  cacheWrite?: AmountInputCacheWrite;
  transition: 'backspace' | 'edit' | 'rejected' | 'reset' | 'unitChange';
  shouldNotifyAmount: boolean;
  shouldNotifyUnit: boolean;
};

export const amountInputValueReducer = (state: AmountInputValueState, action: AmountInputValueAction): AmountInputValueResult => {
  switch (action.type) {
    case 'nativeTextChanged': {
      const editKind =
        action.text.length < state.displayAmount.length && state.displayAmount.startsWith(action.text) ? 'backspace' : 'edit';
      const normalizedAmount = normalizeAmountInput(action.text, state.unit, action.settings.numberFormat);
      const nextAmount = limitAmountInputLength(normalizedAmount, state.unit, action.settings.currencyFractionDigits);
      const rejected = action.text.length > 0 && nextAmount.length === 0;

      return {
        ...state,
        amount: rejected ? state.amount : nextAmount,
        displayAmount: rejected ? state.displayAmount : action.text,
        transition: rejected ? 'rejected' : editKind,
        shouldNotifyAmount: !rejected && nextAmount !== state.amount,
        shouldNotifyUnit: false,
      };
    }
    case 'resetConfirmed':
      return {
        ...state,
        amount: '0',
        displayAmount: '0',
        transition: 'reset',
        shouldNotifyAmount: true,
        shouldNotifyUnit: false,
      };
    case 'unitCycleRequested': {
      const { fromUnit, toUnit } = getNextAmountUnit(state.unit);
      const converted = convertAmountUnit(state.amount, fromUnit, toUnit, {
        ...action.conversionFunctions,
        cachedSatoshis: fromUnit === BitcoinUnit.LOCAL_CURRENCY ? action.cachedSatoshis : undefined,
      });
      const cacheWrite =
        fromUnit === BitcoinUnit.SATS && toUnit === BitcoinUnit.LOCAL_CURRENCY
          ? { localAmount: converted.amount, satoshis: converted.satoshis }
          : undefined;

      return {
        amount: converted.amount,
        displayAmount: converted.amount,
        unit: toUnit,
        cacheWrite,
        transition: 'unitChange',
        shouldNotifyAmount: true,
        shouldNotifyUnit: true,
      };
    }
  }
};
