import Clipboard from '@react-native-clipboard/clipboard';
import React, { useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import { ReduceMotion } from 'react-native-reanimated';

import {
  type CurrencyRate,
  getCurrencyFractionDigits,
  isRateOutdated,
  mostRecentFetchedRate,
  updateExchangeRate,
} from '../../blue_modules/currency';
import triggerHapticFeedback from '../../blue_modules/hapticFeedback';
import { AmountInput, clearCachedSatoshis, getCachedSatoshis, setCachedSatoshis } from '../../components/AmountInput';
import confirm from '../../helpers/confirm';
import { BitcoinUnit } from '../../models/bitcoinUnits';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: jest.fn(),
}));

jest.mock('../../blue_modules/currency', () => ({
  fiatToBTC: jest.fn(() => '0.001'),
  getCurrencyFractionDigits: jest.fn(() => 2),
  getCurrencySymbol: jest.fn(() => '$'),
  isRateOutdated: jest.fn(async () => false),
  mostRecentFetchedRate: jest.fn(async () => undefined),
  satoshiToBTC: jest.fn((satoshis: number) => String(Number(satoshis) / 100000000)),
  updateExchangeRate: jest.fn(async () => undefined),
}));

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { Selection: 'selection' },
}));

jest.mock('../../helpers/confirm', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../loc', () => {
  const units = {
    BTC: 'BTC',
    sats: 'sats',
    local_currency: 'USD',
    MAX: 'MAX',
  };
  return {
    __esModule: true,
    default: {
      _: {
        enter_amount: 'Enter amount',
        change_input_currency: 'Change currency',
        refresh: 'Refresh',
      },
      send: {
        reset_amount: 'Reset',
        reset_amount_confirm: 'Reset?',
        outdated_rate: 'Outdated',
      },
      units,
      formatString: jest.fn(() => 'Outdated'),
    },
    formatBalancePlain: jest.fn((satoshis: number, unit: string) =>
      unit === 'BTC' ? String(Number(satoshis) / 100000000) : String(satoshis),
    ),
    formatBalanceWithoutSuffix: jest.fn(() => ''),
    removeTrailingZeros: jest.fn((value: number | string) => String(value).replace(/\.0+$/, '')),
  };
});

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      alternativeTextColor2: '#111111',
      buttonAlternativeTextColor: '#222222',
      buttonDisabledTextColor: '#333333',
    },
  }),
}));

jest.mock('../../components/Icon', () => 'Icon');

const getNumberFormatSettings = RNLocalize.getNumberFormatSettings as jest.MockedFunction<typeof RNLocalize.getNumberFormatSettings>;
const mockGetCurrencyFractionDigits = getCurrencyFractionDigits as jest.MockedFunction<typeof getCurrencyFractionDigits>;
const mockIsRateOutdated = isRateOutdated as jest.MockedFunction<typeof isRateOutdated>;
const mockMostRecentFetchedRate = mostRecentFetchedRate as jest.MockedFunction<typeof mostRecentFetchedRate>;
const mockUpdateExchangeRate = updateExchangeRate as jest.MockedFunction<typeof updateExchangeRate>;
const mockConfirm = confirm as jest.MockedFunction<typeof confirm>;
const mockTriggerHapticFeedback = triggerHapticFeedback as jest.MockedFunction<typeof triggerHapticFeedback>;

const renderAmountInputSnapshot = ({
  amount,
  unit,
  maxSendableAmount,
}: {
  amount: string;
  unit: BitcoinUnit;
  maxSendableAmount?: number;
}) => {
  const screen = render(
    <AmountInput
      amount={amount}
      unit={unit}
      maxSendableAmount={maxSendableAmount}
      isMaxAmountEstimate={maxSendableAmount !== undefined}
      onChangeText={jest.fn()}
      onAmountUnitChange={jest.fn()}
    />,
  );
  const input = screen.queryByTestId('BitcoinAmountInput');
  const maxButton = screen.queryByTestId('AmountInputMaxButton');
  const secondaryDisplay = screen.queryByTestId('AmountInputSecondaryDisplay');
  const snapshot = {
    input: input
      ? {
          accessibilityLabel: input.props.accessibilityLabel,
          inputMode: input.props.inputMode,
          keyboardType: input.props.keyboardType,
          selection: input.props.selection,
          value: input.props.value,
        }
      : null,
    max: maxButton
      ? {
          accessibilityLabel: maxButton.props.accessibilityLabel,
          accessibilityState: { disabled: maxButton.props.accessibilityState.disabled },
          accessibilityValue: { text: maxButton.props.accessibilityValue.text },
        }
      : null,
    secondary: secondaryDisplay ? secondaryDisplay.findByType(Text).props.children : null,
  };
  screen.unmount();
  return snapshot;
};

describe('AmountInput native format integration', () => {
  beforeEach(() => {
    getNumberFormatSettings.mockReset();
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: '.',
      groupingSeparator: ',',
    });
    mockGetCurrencyFractionDigits.mockReset();
    mockGetCurrencyFractionDigits.mockReturnValue(2);
    mockIsRateOutdated.mockReset();
    mockIsRateOutdated.mockResolvedValue(false);
    mockMostRecentFetchedRate.mockReset();
    mockMostRecentFetchedRate.mockResolvedValue({
      LastUpdated: null,
      Rate: null,
    });
    mockUpdateExchangeRate.mockReset();
    mockUpdateExchangeRate.mockResolvedValue(undefined);
    mockConfirm.mockReset();
    mockConfirm.mockResolvedValue(true);
    mockTriggerHapticFeedback.mockReset();
    jest.mocked(Clipboard.setString).mockClear();
    clearCachedSatoshis();
  });

  it('refreshes fiat display settings on focus and parses changes with the latest settings', async () => {
    const changedAmounts: string[] = [];
    const onFocus = jest.fn();

    const Harness = () => {
      const [amount, setAmount] = useState('0.001');
      return (
        <AmountInput
          amount={amount}
          unit={BitcoinUnit.LOCAL_CURRENCY}
          onChangeText={nextAmount => {
            changedAmounts.push(nextAmount);
            setAmount(nextAmount);
          }}
          onAmountUnitChange={jest.fn()}
          onFocus={onFocus}
        />
      );
    };

    const screen = render(<Harness />);
    const input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.value).toBe('0.001');

    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    fireEvent(input, 'focus', { nativeEvent: {} });

    await waitFor(() => expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('0,001'));
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '1.234,56');

    await waitFor(() => expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('1.234,56'));
    expect(changedAmounts).toEqual(['1234.56']);
  });

  it('does not localize BTC when native settings refresh', () => {
    const screen = render(<AmountInput amount="1.5" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);
    expect(getNumberFormatSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('1.5');

    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    fireEvent.press(screen.getByTestId('AmountInputPressable'));

    expect(getNumberFormatSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('1.5');
  });

  it('does not localize sats grouping when native settings refresh', () => {
    const screen = render(<AmountInput amount="1234" unit={BitcoinUnit.SATS} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('1,234');

    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '\u202f',
    });
    fireEvent.press(screen.getByTestId('AmountInputPressable'));

    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('1,234');
  });

  it('accepts only fixed Bitcoin separators on the next BTC edit or paste', () => {
    const onChangeText = jest.fn();
    const screen = render(<AmountInput amount="0" unit={BitcoinUnit.BTC} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />);

    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: '٫',
      groupingSeparator: '٬',
    });
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '1٬234٫56');

    expect(getNumberFormatSettings).not.toHaveBeenCalled();
    expect(onChangeText).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), 'Copied: 1,234.56 BTC');
    expect(onChangeText).toHaveBeenCalledWith('1234.56');
  });

  it('normalizes a full localized number pasted with surrounding text before enforcing the canonical length', () => {
    const onChangeText = jest.fn();
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '\u202f',
    });
    const screen = render(
      <AmountInput amount="0" unit={BitcoinUnit.LOCAL_CURRENCY} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />,
    );

    const input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.maxLength).toBeUndefined();

    fireEvent.changeText(input, 'Copied from exchange: 1\u202f234\u202f567,890123456 EUR');

    expect(onChangeText).toHaveBeenCalledWith('1234567.89');
  });

  it.each([
    [BitcoinUnit.BTC, '12.345678901', '12.34567890'],
    [BitcoinUnit.BTC, '123456789.1', '12345678.1'],
    [BitcoinUnit.SATS, '21000000000000001', '2100000000000000'],
  ])('enforces the fixed %s input limit after parsing pasted text', (unit, pasted, expected) => {
    const onChangeText = jest.fn();
    const screen = render(<AmountInput amount="0" unit={unit} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), pasted);

    expect(onChangeText).toHaveBeenCalledWith(expected);
  });

  it.each([
    [BitcoinUnit.BTC, 'decimal', 'decimal-pad'],
    [BitcoinUnit.LOCAL_CURRENCY, 'decimal', 'decimal-pad'],
    [BitcoinUnit.SATS, 'numeric', 'number-pad'],
  ] as const)('uses a restricted native keyboard for %s', (unit, inputMode, keyboardType) => {
    const screen = render(<AmountInput amount="1" unit={unit} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);
    const input = screen.getByTestId('BitcoinAmountInput');

    expect(input.props.inputMode).toBe(inputMode);
    expect(input.props.keyboardType).toBe(keyboardType);
  });

  it('rejects typed letters without notifying the controlled parent', () => {
    const onChangeText = jest.fn();
    const screen = render(<AmountInput amount="12" unit={BitcoinUnit.BTC} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />);
    const input = screen.getByTestId('BitcoinAmountInput');

    fireEvent.changeText(input, '12a');
    fireEvent.changeText(input, 'letters only');

    expect(onChangeText).not.toHaveBeenCalled();
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('12');
  });

  it('retains the numeric portion when hardware input includes a letter', () => {
    const onChangeText = jest.fn();
    const screen = render(<AmountInput amount="12" unit={BitcoinUnit.BTC} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '123a');

    expect(onChangeText).toHaveBeenCalledWith('123');
  });

  it('backspaces through localized cents without restoring deleted zeroes', () => {
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    const changedAmounts: string[] = [];
    const Harness = () => {
      const [amount, setAmount] = useState('12.30');
      return (
        <AmountInput
          amount={amount}
          unit={BitcoinUnit.LOCAL_CURRENCY}
          onChangeText={nextAmount => {
            changedAmounts.push(nextAmount);
            setAmount(nextAmount);
          }}
          onAmountUnitChange={jest.fn()}
        />
      );
    };
    const screen = render(<Harness />);

    for (const [nativeText, displayedText] of [
      ['12,3', '12,3'],
      ['12,', '12,'],
      ['12', '12'],
      ['1', '1'],
      ['', '0'],
    ]) {
      fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), nativeText);
      expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(displayedText);
    }

    expect(changedAmounts).toEqual(['12.3', '12.', '12', '1', '']);
  });

  it.each([
    ['.', ',', ['0.', '0.5', '0.50']],
    [',', '.', ['0,', '0,5', '0,50']],
  ])('allows entering and preserving cents with the native %s decimal separator', (decimalSeparator, groupingSeparator, nativeTexts) => {
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator,
      groupingSeparator,
    });
    const changedAmounts: string[] = [];
    const Harness = () => {
      const [amount, setAmount] = useState('0');
      return (
        <AmountInput
          amount={amount}
          unit={BitcoinUnit.LOCAL_CURRENCY}
          onChangeText={nextAmount => {
            changedAmounts.push(nextAmount);
            setAmount(nextAmount);
          }}
          onAmountUnitChange={jest.fn()}
        />
      );
    };
    const screen = render(<Harness />);

    for (const nativeText of nativeTexts) {
      fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), nativeText);
      expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(nativeText);
    }
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), `${nativeTexts.at(-1)}1`);

    expect(changedAmounts).toEqual(['0.', '0.5', '0.50']);
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(nativeTexts.at(-1));
  });

  it.each([
    [',', '3,000', '30,000'],
    ['.', '3.000', '30.000'],
  ])('groups digits live with the native %s separator', (groupingSeparator, firstDisplay, secondDisplay) => {
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: groupingSeparator === ',' ? '.' : ',',
      groupingSeparator,
    });
    const changedAmounts: string[] = [];
    const Harness = () => {
      const [amount, setAmount] = useState('300');
      return (
        <AmountInput
          amount={amount}
          unit={BitcoinUnit.LOCAL_CURRENCY}
          onChangeText={nextAmount => {
            changedAmounts.push(nextAmount);
            setAmount(nextAmount);
          }}
          onAmountUnitChange={jest.fn()}
        />
      );
    };
    const screen = render(<Harness />);

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), '3000');
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(firstDisplay);
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), `${firstDisplay}0`);
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(secondDisplay);
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), secondDisplay.slice(0, -1));
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(firstDisplay);
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), firstDisplay.slice(0, -1));
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe('300');
    expect(changedAmounts).toEqual(['3000', '30000', '3000', '300']);
  });

  it.each([
    [BitcoinUnit.BTC, '3000.50', '3,000.50'],
    [BitcoinUnit.SATS, '3000', '3,000'],
  ])('groups and backspaces %s with fixed Bitcoin formatting', (unit, nextAmount, expectedDisplay) => {
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    const changedAmounts: string[] = [];
    const Harness = () => {
      const [amount, setAmount] = useState('300');
      return (
        <AmountInput
          amount={amount}
          unit={unit}
          onChangeText={value => {
            changedAmounts.push(value);
            setAmount(value);
          }}
          onAmountUnitChange={jest.fn()}
        />
      );
    };
    const screen = render(<Harness />);

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), nextAmount);
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(expectedDisplay);
    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), expectedDisplay.slice(0, -1));

    const expectedBackspaceAmount = unit === BitcoinUnit.BTC ? '3000.5' : '300';
    const expectedBackspaceDisplay = unit === BitcoinUnit.BTC ? '3,000.5' : '300';
    expect(screen.getByTestId('BitcoinAmountInput').props.value).toBe(expectedBackspaceDisplay);
    expect(changedAmounts).toEqual([nextAmount, expectedBackspaceAmount]);
  });

  it.each([
    [2, '1.239', '1.23'],
    [3, '1.2399', '1.239'],
    [0, '1.2', '1'],
  ])('uses the selected currency’s %i-digit minor-unit precision', (fractionDigits, nativeText, expectedAmount) => {
    mockGetCurrencyFractionDigits.mockReturnValue(fractionDigits);
    const onChangeText = jest.fn();
    const screen = render(
      <AmountInput amount="0" unit={BitcoinUnit.LOCAL_CURRENCY} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), nativeText);

    expect(onChangeText).toHaveBeenCalledWith(expectedAmount);
  });

  it('keeps the actual text field accessible and hides duplicate animated content', () => {
    const screen = render(<AmountInput amount="12.5" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);

    expect(screen.getByTestId('AmountInputPressable').props.accessible).toBe(false);

    const input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.accessibilityLabel).toBe('Enter amount, BTC');
    expect(input.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));

    const visualCharacters = screen.getByTestId('AmountInputVisualCharacters', {
      includeHiddenElements: true,
    });
    expect(visualCharacters.props.accessible).toBe(false);
    expect(visualCharacters.props.accessibilityElementsHidden).toBe(true);
    expect(visualCharacters.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(
      screen.getByTestId('AmountInputMeasureText', {
        includeHiddenElements: true,
      }).props.accessible,
    ).toBe(false);
    expect(
      screen.getByTestId('AmountInputMeasureText', {
        includeHiddenElements: true,
      }).props.importantForAccessibility,
    ).toBe('no-hide-descendants');

    const changeUnitButton = screen.getByTestId('changeAmountUnitButton');
    expect(changeUnitButton.props.accessibilityLabel).toBe('Change currency');
    expect(changeUnitButton.props.accessibilityRole).toBe('button');
    expect(changeUnitButton.props.hitSlop).toEqual({ left: 10, right: 10 });
  });

  it('honors Dynamic Type overrides consistently across the input layers', () => {
    const screen = render(
      <AmountInput
        accessibilityHint="Type a bitcoin amount"
        accessibilityLabel="Bitcoin amount"
        accessibilityState={{ selected: true }}
        allowFontScaling={false}
        maxFontSizeMultiplier={1.5}
        amount="1.5"
        unit={BitcoinUnit.BTC}
        onChangeText={jest.fn()}
        onAmountUnitChange={jest.fn()}
      />,
    );

    const input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.accessibilityHint).toBe('Type a bitcoin amount');
    expect(input.props.accessibilityLabel).toBe('Bitcoin amount');
    expect(input.props.allowFontScaling).toBe(false);
    expect(input.props.maxFontSizeMultiplier).toBe(1.5);
    expect(input.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false, selected: true }));

    for (const testID of ['AmountInputMeasureText', 'AmountInputCharacter-0', 'AmountInputCharacter-1', 'AmountInputCharacter-2']) {
      expect(screen.getByTestId(testID, { includeHiddenElements: true }).props.allowFontScaling).toBe(false);
      expect(screen.getByTestId(testID, { includeHiddenElements: true }).props.maxFontSizeMultiplier).toBe(1.5);
    }
  });

  it('uses font scaling by default and reports loading and disabled states', () => {
    const baseProps = {
      amount: '1',
      unit: BitcoinUnit.SATS,
      onChangeText: jest.fn(),
      onAmountUnitChange: jest.fn(),
    };
    const screen = render(<AmountInput {...baseProps} isLoading />);

    let input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.allowFontScaling).toBe(true);
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toEqual(expect.objectContaining({ busy: true, disabled: true }));

    screen.rerender(<AmountInput {...baseProps} disabled />);
    input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(screen.queryByTestId('changeAmountUnitButton')).toBeNull();
  });

  it('cycles BTC, sats, and local currency while preserving the cached satoshi amount', () => {
    const onChangeText = jest.fn();
    const onAmountUnitChange = jest.fn();
    const screen = render(
      <AmountInput amount="0.001" unit={BitcoinUnit.BTC} onChangeText={onChangeText} onAmountUnitChange={onAmountUnitChange} />,
    );

    fireEvent.press(screen.getByTestId('changeAmountUnitButton'));
    expect(onChangeText).toHaveBeenLastCalledWith('100000');
    expect(onAmountUnitChange).toHaveBeenLastCalledWith(BitcoinUnit.SATS);

    screen.rerender(
      <AmountInput amount="100000" unit={BitcoinUnit.SATS} onChangeText={onChangeText} onAmountUnitChange={onAmountUnitChange} />,
    );
    fireEvent.press(screen.getByTestId('changeAmountUnitButton'));
    expect(onChangeText).toHaveBeenLastCalledWith('100000');
    expect(onAmountUnitChange).toHaveBeenLastCalledWith(BitcoinUnit.LOCAL_CURRENCY);
    expect(getCachedSatoshis('100000')).toBe('100000');

    screen.rerender(
      <AmountInput amount="100000" unit={BitcoinUnit.LOCAL_CURRENCY} onChangeText={onChangeText} onAmountUnitChange={onAmountUnitChange} />,
    );
    expect(screen.getByText('0.001 BTC')).toBeTruthy();
    fireEvent.press(screen.getByTestId('changeAmountUnitButton'));
    expect(onChangeText).toHaveBeenLastCalledWith('0.001');
    expect(onAmountUnitChange).toHaveBeenLastCalledWith(BitcoinUnit.BTC);

    setCachedSatoshis('12.5', '62500000');
    expect(getCachedSatoshis('12.5')).toBe('62500000');
  });

  it.each([
    [BitcoinUnit.BTC, '0'],
    [BitcoinUnit.BTC, '0.00000000'],
    [BitcoinUnit.SATS, '0'],
    [BitcoinUnit.LOCAL_CURRENCY, '0.00'],
  ])('hides the secondary display and its layout for zero %s amount %j', (unit, amount) => {
    const screen = render(<AmountInput amount={amount} unit={unit} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);

    expect(screen.queryByTestId('AmountInputSecondaryDisplay')).toBeNull();
  });

  it('renders the secondary display container for a non-zero converted value', () => {
    const screen = render(
      <AmountInput amount="50" unit={BitcoinUnit.LOCAL_CURRENCY} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />,
    );

    expect(screen.getByTestId('AmountInputSecondaryDisplay')).toBeTruthy();
    expect(screen.getByText('0.001 BTC')).toBeTruthy();
  });

  it('snapshots zero values without a secondary display across every unit', () => {
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });

    expect({
      btc: renderAmountInputSnapshot({ amount: '0.00000000', unit: BitcoinUnit.BTC }),
      fiat: renderAmountInputSnapshot({ amount: '0.00', unit: BitcoinUnit.LOCAL_CURRENCY }),
      sats: renderAmountInputSnapshot({ amount: '0', unit: BitcoinUnit.SATS }),
    }).toMatchInlineSnapshot(`
      {
        "btc": {
          "input": {
            "accessibilityLabel": "Enter amount, BTC",
            "inputMode": "decimal",
            "keyboardType": "decimal-pad",
            "selection": {
              "end": 10,
              "start": 10,
            },
            "value": "0.00000000",
          },
          "max": null,
          "secondary": null,
        },
        "fiat": {
          "input": {
            "accessibilityLabel": "Enter amount, $",
            "inputMode": "decimal",
            "keyboardType": "decimal-pad",
            "selection": {
              "end": 4,
              "start": 4,
            },
            "value": "0,00",
          },
          "max": null,
          "secondary": null,
        },
        "sats": {
          "input": {
            "accessibilityLabel": "Enter amount, sats",
            "inputMode": "numeric",
            "keyboardType": "number-pad",
            "selection": {
              "end": 1,
              "start": 1,
            },
            "value": "0",
          },
          "max": null,
          "secondary": null,
        },
      }
    `);
  });

  it('snapshots formatted BTC, sats, localized fiat, and MAX states', () => {
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });

    expect({
      btc: renderAmountInputSnapshot({ amount: '1234.50', unit: BitcoinUnit.BTC }),
      fiat: renderAmountInputSnapshot({ amount: '1234.50', unit: BitcoinUnit.LOCAL_CURRENCY }),
      max: renderAmountInputSnapshot({ amount: BitcoinUnit.MAX, unit: BitcoinUnit.BTC, maxSendableAmount: 100000000 }),
      sats: renderAmountInputSnapshot({ amount: '1234', unit: BitcoinUnit.SATS }),
    }).toMatchInlineSnapshot(`
      {
        "btc": {
          "input": {
            "accessibilityLabel": "Enter amount, BTC",
            "inputMode": "decimal",
            "keyboardType": "decimal-pad",
            "selection": {
              "end": 8,
              "start": 8,
            },
            "value": "1,234.50",
          },
          "max": null,
          "secondary": null,
        },
        "fiat": {
          "input": {
            "accessibilityLabel": "Enter amount, $",
            "inputMode": "decimal",
            "keyboardType": "decimal-pad",
            "selection": {
              "end": 8,
              "start": 8,
            },
            "value": "1.234,50",
          },
          "max": null,
          "secondary": "0.001 BTC",
        },
        "max": {
          "input": null,
          "max": {
            "accessibilityLabel": "Reset",
            "accessibilityState": {
              "disabled": false,
            },
            "accessibilityValue": {
              "text": "≈ 1 BTC",
            },
          },
          "secondary": null,
        },
        "sats": {
          "input": {
            "accessibilityLabel": "Enter amount, sats",
            "inputMode": "numeric",
            "keyboardType": "number-pad",
            "selection": {
              "end": 5,
              "start": 5,
            },
            "value": "1,234",
          },
          "max": null,
          "secondary": null,
        },
      }
    `);
  });

  it('allows Select All while correcting partial selections and cursor moves to the end', () => {
    const onSelectionChange = jest.fn();
    getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    const screen = render(
      <AmountInput
        amount="1.5"
        unit={BitcoinUnit.BTC}
        onChangeText={jest.fn()}
        onAmountUnitChange={jest.fn()}
        onSelectionChange={onSelectionChange}
        selection={{ start: 0, end: 1 }}
        selectTextOnFocus
      />,
    );
    let input = screen.getByTestId('BitcoinAmountInput');

    expect(input.props.value).toBe('1.5');
    expect(input.props.selection).toEqual({ start: 3, end: 3 });
    expect(input.props.selectTextOnFocus).toBe(true);

    fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 3 } },
    });
    expect(screen.getByTestId('BitcoinAmountInput').props.selection).toEqual({ start: 0, end: 3 });

    fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 1 } },
    });
    fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 1, end: 1 } },
    });
    fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 3, end: 3 } },
    });
    expect(onSelectionChange).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId('BitcoinAmountInput').props.selection).toEqual({
      start: 3,
      end: 3,
    });

    screen.rerender(<AmountInput amount="1234.56" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);
    input = screen.getByTestId('BitcoinAmountInput');
    expect(input.props.value).toBe('1,234.56');
    expect(input.props.selection).toEqual({ start: 8, end: 8 });
  });

  it('replaces the whole amount when pasting after Select All and restores the cursor to the end', () => {
    const changedAmounts: string[] = [];
    const Harness = () => {
      const [amount, setAmount] = useState('1234.50');
      return (
        <AmountInput
          amount={amount}
          unit={BitcoinUnit.BTC}
          onChangeText={nextAmount => {
            changedAmounts.push(nextAmount);
            setAmount(nextAmount);
          }}
          onAmountUnitChange={jest.fn()}
        />
      );
    };
    const screen = render(<Harness />);
    let input = screen.getByTestId('BitcoinAmountInput');

    expect(input.props.value).toBe('1,234.50');
    fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 8 } },
    });
    expect(screen.getByTestId('BitcoinAmountInput').props.selection).toEqual({ start: 0, end: 8 });

    fireEvent.changeText(screen.getByTestId('BitcoinAmountInput'), 'Copied: 0.00000001 BTC');
    input = screen.getByTestId('BitcoinAmountInput');

    expect(changedAmounts).toEqual(['0.00000001']);
    expect(input.props.value).toBe('0.00000001');
    expect(input.props.selection).toEqual({ start: 10, end: 10 });
  });

  it('follows the system Reduce Motion setting for every amount animation', () => {
    const screen = render(<AmountInput amount="1" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);

    expect(screen.getByTestId('AmountInputSizer').props.layout.getReduceMotion()).toBe(ReduceMotion.System);
    expect(
      screen
        .getByTestId('AmountInputVisualCharacters', {
          includeHiddenElements: true,
        })
        .props.layout.getReduceMotion(),
    ).toBe(ReduceMotion.System);

    const character = screen.getByTestId('AmountInputCharacter-0', {
      includeHiddenElements: true,
    });
    expect(character.props.entering.getReduceMotion()).toBe(ReduceMotion.System);
    expect(character.props.exiting.getReduceMotion()).toBe(ReduceMotion.System);
    expect(character.props.layout.getReduceMotion()).toBe(ReduceMotion.System);
  });

  it('exposes MAX as a labelled button with its value and disabled state', () => {
    const baseProps = {
      amount: BitcoinUnit.MAX,
      unit: BitcoinUnit.BTC,
      maxSendableAmount: 100000000,
      isMaxAmountEstimate: true,
      onChangeText: jest.fn(),
      onAmountUnitChange: jest.fn(),
    };
    const screen = render(<AmountInput {...baseProps} />);

    let maxButton = screen.getByTestId('AmountInputMaxButton');
    expect(maxButton.props.accessibilityLabel).toBe('Reset');
    expect(maxButton.props.accessibilityRole).toBe('button');
    expect(maxButton.props.accessibilityState).toEqual({ disabled: false });
    expect(maxButton.props.accessibilityValue).toEqual({ text: '≈ 1 BTC' });

    screen.rerender(<AmountInput {...baseProps} isLoading />);
    maxButton = screen.getByTestId('AmountInputMaxButton');
    expect(maxButton.props.accessibilityState).toEqual({ disabled: true });
  });

  it('resets MAX after confirmation and copies its estimate on long press', async () => {
    const onChangeText = jest.fn();
    const screen = render(
      <AmountInput
        amount={BitcoinUnit.MAX}
        unit={BitcoinUnit.BTC}
        maxSendableAmount={100000000}
        onChangeText={onChangeText}
        onAmountUnitChange={jest.fn()}
      />,
    );
    const maxButton = screen.getByTestId('AmountInputMaxButton');

    fireEvent(maxButton, 'longPress');
    expect(Clipboard.setString).toHaveBeenCalledWith('1');
    expect(mockTriggerHapticFeedback).toHaveBeenCalledWith('selection');

    fireEvent.press(maxButton);
    await waitFor(() => expect(onChangeText).toHaveBeenCalledWith('0'));
    expect(mockConfirm).toHaveBeenCalledWith('Reset', 'Reset?');

    mockConfirm.mockResolvedValue(false);
    onChangeText.mockClear();
    fireEvent.press(maxButton);
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(2));
    expect(onChangeText).not.toHaveBeenCalled();

    screen.rerender(
      <AmountInput amount={BitcoinUnit.MAX} unit={BitcoinUnit.BTC} onChangeText={onChangeText} onAmountUnitChange={jest.fn()} />,
    );
    expect(screen.getByTestId('AmountInputMaxButton').props.accessibilityValue).toEqual({ text: 'MAX' });
  });

  it('announces an outdated-rate warning and exposes refresh progress', async () => {
    mockIsRateOutdated.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockMostRecentFetchedRate.mockResolvedValue({
      LastUpdated: new Date(1),
      Rate: 1,
    } satisfies CurrencyRate);
    let finishUpdate: (() => void) | undefined;
    mockUpdateExchangeRate.mockImplementation(
      () =>
        new Promise(resolve => {
          finishUpdate = resolve;
        }),
    );

    const screen = render(<AmountInput amount="1" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);

    const warning = await screen.findByText('Outdated');
    expect(warning.props.accessibilityLiveRegion).toBe('polite');
    expect(warning.props.accessibilityRole).toBe('alert');

    const refreshButton = screen.getByLabelText('Refresh');
    expect(refreshButton.props.accessibilityRole).toBe('button');
    expect(refreshButton.props.accessibilityState).toEqual({ disabled: false });
    expect(refreshButton.props.hitSlop).toBe(14);

    fireEvent.press(refreshButton);
    await waitFor(() => expect(screen.getByLabelText('Refresh').props.accessibilityState).toEqual({ disabled: true }));
    fireEvent.press(refreshButton);
    expect(mockUpdateExchangeRate).toHaveBeenCalledTimes(1);

    await act(async () => finishUpdate?.());
    await waitFor(() => expect(screen.queryByText('Outdated')).toBeNull());
  });

  it('keeps the refreshed-rate warning when the newly fetched rate is still outdated', async () => {
    mockIsRateOutdated.mockResolvedValue(true);
    mockMostRecentFetchedRate.mockResolvedValue({
      LastUpdated: new Date(2),
      Rate: 2,
    });
    const screen = render(<AmountInput amount="1" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);

    await screen.findByText('Outdated');
    fireEvent.press(screen.getByLabelText('Refresh'));

    await waitFor(() => expect(mockMostRecentFetchedRate).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Outdated')).toBeTruthy();
  });

  it('returns to idle and preserves the warning when refresh and recheck fail', async () => {
    mockIsRateOutdated.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('rate check failed'));
    mockMostRecentFetchedRate.mockResolvedValue({
      LastUpdated: new Date(3),
      Rate: 3,
    });
    mockUpdateExchangeRate.mockRejectedValue(new Error('refresh failed'));
    const screen = render(<AmountInput amount="1" unit={BitcoinUnit.BTC} onChangeText={jest.fn()} onAmountUnitChange={jest.fn()} />);

    await screen.findByText('Outdated');
    fireEvent.press(screen.getByLabelText('Refresh'));
    expect(screen.getByLabelText('Refresh').props.accessibilityState).toEqual({
      disabled: true,
    });

    await waitFor(() => expect(screen.getByLabelText('Refresh').props.accessibilityState).toEqual({ disabled: false }));
    expect(screen.getByText('Outdated')).toBeTruthy();
  });
});
