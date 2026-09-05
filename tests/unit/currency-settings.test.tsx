import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { createAmountInputNumberFormat } from '../../components/AmountInput.utils';
import { useAmountInputController } from '../../components/AmountInput.hooks';
import Currency from '../../screen/settings/Currency';

const setOptions = jest.fn();

jest.mock('../../blue_modules/currency', () => {
  const { FiatUnit } = jest.requireActual('../../models/fiatUnit');
  return {
    getCurrencyFractionDigits: jest.fn(() => 2),
    getPreferredCurrency: jest.fn(async () => FiatUnit.USD),
    initCurrencyDaemon: jest.fn(async () => undefined),
    mostRecentFetchedRate: jest.fn(async () => ({ LastUpdated: new Date(0), Rate: '$50,000', RawRate: 50000 })),
    setPreferredCurrency: jest.fn(async () => undefined),
  };
});

jest.mock('../../components/AmountInput.hooks', () => ({
  useAmountInputController: jest.fn(),
}));

jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../components/SafeAreaFlatList', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ ListHeaderComponent }: { ListHeaderComponent?: React.ReactNode }) =>
      ReactModule.createElement(View, { testID: 'CurrencyList' }, ListHeaderComponent),
  };
});

jest.mock('../../components/SettingsSection', () => ({
  SettingsListItem: 'SettingsListItem',
  settingsListCard: {},
  settingsSectionHeaderText: {},
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      alternativeTextColor: '#666666',
      cardSectionBackground: '#ffffff',
      cardSectionHeaderBackground: '#eeeeee',
      foregroundColor: '#000000',
    },
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ setPreferredFiatCurrencyStorage: jest.fn() }),
}));

jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: () => ({ setOptions }),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    _: { never: 'Never' },
    settings: {
      currency_fetch_error: 'Unable to fetch currency',
      currency_source: 'Source:',
      last_updated: 'Last updated',
      rate: 'Rate',
    },
    units: { BTC: 'BTC', sats: 'sats' },
  },
}));

const mockUseAmountInputController = useAmountInputController as jest.MockedFunction<typeof useAmountInputController>;

describe('Currency settings previews', () => {
  beforeEach(() => {
    setOptions.mockClear();
    mockUseAmountInputController.mockReturnValue({
      currencyFractionDigits: 2,
      fiatNumberFormat: createAmountInputNumberFormat({ decimalSeparator: ',', groupingSeparator: '.' }),
      isRateBeingUpdated: false,
      numberFormat: createAmountInputNumberFormat({ decimalSeparator: ',', groupingSeparator: '.' }),
      outdatedRefreshRate: undefined,
      refreshInputSettings: jest.fn(),
      updateRate: jest.fn(),
    });
  });

  it('renders formatting and conversions from the current native settings and rate', async () => {
    const screen = render(<Currency />);

    await waitFor(() => expect(screen.getByTestId('CurrencyBtcToFiatPreview')).toHaveTextContent('Rate: 1 BTC = $50.000'));

    expect(screen.getByTestId('CurrencyFormattingPreview')).toHaveTextContent('USD: $1.234,56');
    expect(screen.getByTestId('CurrencySatsToFiatPreview')).toHaveTextContent('100,000 sats = $50');
    expect(screen.getByTestId('CurrencyFiatToBtcPreview')).toHaveTextContent('$1.234,56 = 0.0246912 BTC');
    expect(screen.queryByTestId('CurrencyRateUnavailable')).toBeNull();
  });

  it('snapshots the user-facing conversion examples', async () => {
    const screen = render(<Currency />);

    await waitFor(() => expect(screen.getByTestId('CurrencyBtcToFiatPreview')).toBeTruthy());

    expect({
      btcToFiat: screen.getByTestId('CurrencyBtcToFiatPreview').props.children,
      fiat: screen.getByTestId('CurrencyFormattingPreview').props.children,
      fiatToBtc: screen.getByTestId('CurrencyFiatToBtcPreview').props.children,
      satsToFiat: screen.getByTestId('CurrencySatsToFiatPreview').props.children,
    }).toMatchInlineSnapshot(`
      {
        "btcToFiat": [
          "Rate",
          ": ",
          "1",
          " ",
          "BTC",
          " = ",
          "$50.000",
        ],
        "fiat": [
          "USD",
          ": ",
          "$1.234,56",
        ],
        "fiatToBtc": [
          "$1.234,56",
          " = ",
          "0.0246912",
          " ",
          "BTC",
        ],
        "satsToFiat": [
          "100,000",
          " ",
          "sats",
          " = ",
          "$50",
        ],
      }
    `);
  });
});
