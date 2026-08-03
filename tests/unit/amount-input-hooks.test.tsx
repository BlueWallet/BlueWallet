import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import * as RNLocalize from 'react-native-localize';

import { getCurrencyFractionDigits } from '../../blue_modules/currency';
import { useAmountInputController } from '../../components/AmountInput.hooks';
import { BitcoinUnit } from '../../models/bitcoinUnits';

jest.mock('../../blue_modules/currency', () => ({
  getCurrencyFractionDigits: jest.fn(() => 2),
  isRateOutdated: jest.fn(async () => false),
  mostRecentFetchedRate: jest.fn(async () => undefined),
  updateExchangeRate: jest.fn(async () => undefined),
}));

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: jest.fn(),
}));

const getNumberFormatSettings = RNLocalize.getNumberFormatSettings as jest.MockedFunction<typeof RNLocalize.getNumberFormatSettings>;
const mockGetCurrencyFractionDigits = getCurrencyFractionDigits as jest.MockedFunction<typeof getCurrencyFractionDigits>;

describe('useAmountInputController', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const removeAppStateListener = jest.fn();

  beforeEach(() => {
    getNumberFormatSettings.mockReset();
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });
    mockGetCurrencyFractionDigits.mockReset();
    mockGetCurrencyFractionDigits.mockReturnValue(2);
    removeAppStateListener.mockReset();
    appStateListener = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove: removeAppStateListener };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads changed native settings when explicitly refreshed', () => {
    const { result } = renderHook(() => useAmountInputController());
    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    act(() => result.current.refreshInputSettings());

    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
  });

  it('keeps BTC and sats fixed while retaining native fiat metadata for their secondary display', () => {
    const { result, rerender } = renderHook(({ unit }) => useAmountInputController(unit), {
      initialProps: { unit: BitcoinUnit.BTC as BitcoinUnit },
    });

    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: '.',
      groupingSeparator: ',',
      localizedDigits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    });
    expect(result.current.currencyFractionDigits).toBe(0);
    expect(result.current.fiatNumberFormat).toMatchObject({ decimalSeparator: '.', groupingSeparator: ',' });
    expect(getNumberFormatSettings).toHaveBeenCalledTimes(1);
    expect(mockGetCurrencyFractionDigits).toHaveBeenCalledTimes(1);

    act(() => result.current.refreshInputSettings());
    rerender({ unit: BitcoinUnit.SATS });

    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: '.',
      groupingSeparator: ',',
      localizedDigits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    });
    expect(getNumberFormatSettings).toHaveBeenCalledTimes(3);
    expect(mockGetCurrencyFractionDigits).toHaveBeenCalledTimes(3);
  });

  it('reads current native settings when a crypto input changes to fiat', () => {
    const { result, rerender } = renderHook(({ unit }) => useAmountInputController(unit), {
      initialProps: { unit: BitcoinUnit.BTC as BitcoinUnit },
    });
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });

    rerender({ unit: BitcoinUnit.LOCAL_CURRENCY });

    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    expect(getNumberFormatSettings).toHaveBeenCalledTimes(2);
    expect(mockGetCurrencyFractionDigits).toHaveBeenCalledTimes(2);
  });

  it('keeps the current format object when native settings have not changed', () => {
    const { result } = renderHook(() => useAmountInputController());
    const initialNumberFormat = result.current.numberFormat;

    act(() => result.current.refreshInputSettings());

    expect(result.current.numberFormat).toBe(initialNumberFormat);
  });

  it('detects a grouping-only settings change', () => {
    const { result } = renderHook(() => useAmountInputController());
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: '.',
      groupingSeparator: '’',
    });

    act(() => result.current.refreshInputSettings());

    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: '.',
      groupingSeparator: '’',
    });
  });

  it('detects a selected-currency minor-unit change', () => {
    const { result } = renderHook(() => useAmountInputController());
    expect(result.current.currencyFractionDigits).toBe(2);
    mockGetCurrencyFractionDigits.mockReturnValue(3);

    act(() => result.current.refreshInputSettings());

    expect(result.current.currencyFractionDigits).toBe(3);
  });

  it('refreshes settings when the app becomes active and removes its listener on unmount', () => {
    const { result, unmount } = renderHook(() => useAmountInputController());
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: '٫',
      groupingSeparator: '٬',
    });

    act(() => appStateListener?.('background'));
    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });

    act(() => appStateListener?.('active'));
    expect(result.current.numberFormat).toMatchObject({
      decimalSeparator: '٫',
      groupingSeparator: '٬',
    });

    unmount();
    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });
});
