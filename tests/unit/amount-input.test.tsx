import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { AmountInput } from '../../components/AmountInput';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import * as currency from '../../blue_modules/currency';

let localeDirection: 'ltr' | 'rtl' = 'ltr';

jest.mock('@react-navigation/native', () => ({
  useLocale: () => ({ direction: localeDirection }),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      buttonDisabledTextColor: '#777',
      alternativeTextColor2: '#111',
      buttonAlternativeTextColor: '#222',
    },
  }),
}));

jest.mock('../../components/Badge', () => 'Badge');
jest.mock('../../components/Icon', () => 'Icon');

jest.mock('../../BlueComponents', () => {
  const ReactMock = require('react');
  const { Text } = require('react-native');
  return {
    BlueText: ({ children, ...props }: any) => ReactMock.createElement(Text, props, children),
  };
});

jest.mock('../../helpers/confirm', () => jest.fn(async () => false));

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {
    Selection: 'Selection',
  },
}));

jest.mock('../../blue_modules/currency', () => ({
  isRateOutdated: jest.fn(async () => false),
  mostRecentFetchedRate: jest.fn(async () => ({ LastUpdated: '2026-04-12T10:30:00.000Z' })),
  updateExchangeRate: jest.fn(async () => undefined),
  getCurrencySymbol: jest.fn(() => '$'),
  fiatToBTC: jest.fn((value: number) => String(value / 10000)),
  satoshiToBTC: jest.fn((value: number) => (value / 100000000).toFixed(8)),
  CurrencyRate: {},
}));

jest.mock('dayjs', () => {
  const actualDayjs = jest.requireActual('dayjs');
  const mockDayjs = (date?: string | number | Date | null) => {
    const instance = actualDayjs(date);
    return {
      ...instance,
      format: (_fmt: string) => '04/12/2026 10:30 AM',
    };
  };
  Object.assign(mockDayjs, actualDayjs);
  return { __esModule: true, default: mockDayjs };
});

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    _: {
      enter_amount: 'Enter amount',
      change_input_currency: 'Change input currency',
      refresh: 'Refresh',
    },
    units: {
      BTC: 'BTC',
      sats: 'sats',
      MAX: 'MAX',
    },
    send: {
      outdated_rate: 'Outdated rate at {date}',
      reset_amount: 'Reset amount',
      reset_amount_confirm: 'Confirm reset',
    },
    wallets: {
      xpub_copiedToClipboard: 'Copied to clipboard',
    },
    formatString: (template: string, params: Record<string, string>) =>
      Object.entries(params).reduce((acc, [key, value]) => acc.replace(`{${key}}`, value), template),
  },
  formatBalancePlain: (value: number, unit: string) => {
    if (unit === 'sats') return String(Math.round(value));
    if (unit === 'BTC') return (value / 100000000).toFixed(8).replace(/\.0+$/, '');
    return String(value);
  },
  formatBalanceWithoutSuffix: (value: number | string, unit: string) => `${value}-${unit}`,
  removeTrailingZeros: (value: string) => value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1'),
}));

describe('AmountInput', () => {
  const mockOnChangeText = jest.fn();
  const mockOnAmountUnitChange = jest.fn();

  const baseProps = {
    amount: '0.001',
    unit: BitcoinUnit.BTC,
    onChangeText: mockOnChangeText,
    onAmountUnitChange: mockOnAmountUnitChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localeDirection = 'ltr';
    jest.spyOn(ReactNative.PixelRatio, 'getFontScale').mockReturnValue(1);
    jest.spyOn(ReactNative.AccessibilityInfo, 'announceForAccessibility').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders default state', () => {
    const view = render(<AmountInput {...baseProps} />);
    expect(view.toJSON()).toMatchSnapshot();
  });

  it('switches unit and converts amount when pressing unit switch button', () => {
    const view = render(<AmountInput {...baseProps} />);

    fireEvent.press(view.getByTestId('changeAmountUnitButton'));

    expect(mockOnAmountUnitChange).toHaveBeenCalledWith(BitcoinUnit.SATS);
    expect(mockOnChangeText).toHaveBeenCalledWith('100000');
  });

  it('renders MAX with estimated sendable amount', () => {
    const view = render(<AmountInput {...baseProps} amount={BitcoinUnit.MAX} maxSendableAmount={123456789} isMaxAmountEstimate />);

    expect(view.toJSON()).toMatchSnapshot();
  });

  it('renders outdated-rate warning block', async () => {
    (currency.isRateOutdated as jest.Mock).mockResolvedValueOnce(true);
    (currency.mostRecentFetchedRate as jest.Mock).mockResolvedValueOnce({ LastUpdated: '2026-04-12T10:30:00.000Z' });

    const view = render(<AmountInput {...baseProps} />);

    await waitFor(() => {
      expect(view.getByLabelText('Refresh')).toBeTruthy();
    });

    expect(view.toJSON()).toMatchSnapshot();
  });

  it('keeps readable base font size and allows dynamic type scaling', () => {
    jest.spyOn(ReactNative.PixelRatio, 'getFontScale').mockReturnValue(1.8);

    const view = render(<AmountInput {...baseProps} amount="123456789.12" />);
    const input = view.getByTestId('BitcoinAmountInput');
    const flattened = ReactNative.StyleSheet.flatten(input.props.style);

    expect(flattened.fontSize).toBe(24);
    expect(input.props.allowFontScaling).toBe(true);
    expect(input.props.maxFontSizeMultiplier).toBe(2);
  });

  it('switches outdated warning layout direction based on constrained width', async () => {
    (currency.isRateOutdated as jest.Mock).mockResolvedValue(true);
    (currency.mostRecentFetchedRate as jest.Mock).mockResolvedValue({ LastUpdated: '2026-04-12T10:30:00.000Z' });

    const dimensionsSpy = jest.spyOn(ReactNative.Dimensions, 'get');

    dimensionsSpy.mockImplementation((dimension: 'window' | 'screen') => {
      if (dimension === 'window') {
        return { width: 320, height: 844, scale: 3, fontScale: 1 } as any;
      }
      return { width: 320, height: 844, scale: 3, fontScale: 1 } as any;
    });

    const narrowView = render(<AmountInput {...baseProps} />);
    await waitFor(() => {
      expect(narrowView.getByLabelText('Refresh')).toBeTruthy();
    });
    const narrowRefresh = narrowView.getByLabelText('Refresh');
    const getFlexDirectionFromAncestors = (node: any): string | undefined => {
      let current = node?.parent;
      while (current) {
        const style = ReactNative.StyleSheet.flatten(current?.props?.style);
        if (style?.flexDirection) return style.flexDirection;
        current = current.parent;
      }
      return undefined;
    };
    expect(getFlexDirectionFromAncestors(narrowRefresh)).toBe('column');

    narrowView.unmount();

    dimensionsSpy.mockImplementation((dimension: 'window' | 'screen') => {
      if (dimension === 'window') {
        return { width: 420, height: 844, scale: 3, fontScale: 1 } as any;
      }
      return { width: 420, height: 844, scale: 3, fontScale: 1 } as any;
    });

    const wideView = render(<AmountInput {...baseProps} />);
    await waitFor(() => {
      expect(wideView.getByLabelText('Refresh')).toBeTruthy();
    });
    const wideRefresh = wideView.getByLabelText('Refresh');
    expect(getFlexDirectionFromAncestors(wideRefresh)).toBe('row');
  });

  it('disables refresh while rate update is in flight', async () => {
    (currency.isRateOutdated as jest.Mock).mockResolvedValue(true);
    (currency.mostRecentFetchedRate as jest.Mock).mockResolvedValue({ LastUpdated: '2026-04-12T10:30:00.000Z' });

    let resolveUpdate: (() => void) | undefined;
    (currency.updateExchangeRate as jest.Mock).mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveUpdate = resolve;
        }),
    );

    const view = render(<AmountInput {...baseProps} />);
    await waitFor(() => {
      expect(view.getByLabelText('Refresh')).toBeTruthy();
    });

    const refreshButton = view.getByLabelText('Refresh');
    fireEvent.press(refreshButton);
    fireEvent.press(refreshButton);

    expect(currency.updateExchangeRate).toHaveBeenCalledTimes(1);

    resolveUpdate?.();

    await waitFor(() => {
      expect(currency.updateExchangeRate).toHaveBeenCalledTimes(1);
    });
  });

  it('does not expose wrapper as a button in accessibility tree', () => {
    const view = render(<AmountInput {...baseProps} />);
    const root = view.toJSON() as any;
    expect(root.props.accessible).toBe(false);
    expect(root.props.accessibilityRole).toBeUndefined();
  });

  it('mirrors header layout in RTL mode', () => {
    localeDirection = 'rtl';
    const view = render(<AmountInput {...baseProps} />);
    const root = view.toJSON() as any;
    const rootStyle = ReactNative.StyleSheet.flatten(root.children?.[0]?.props?.style);
    expect(rootStyle.flexDirection).toBe('row-reverse');
  });
});
