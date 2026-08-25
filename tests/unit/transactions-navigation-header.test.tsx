import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionsNavigationHeader from '../../components/TransactionsNavigationHeader';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { formatBalanceWithoutSuffix } from '../../loc';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: { background: '#000', shadowColor: '#000' } }),
}));
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ preferredFiatCurrency: { endPointKey: 'USD' } }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useLocale: () => ({ direction: 'ltr' }),
}));
jest.mock('../../components/TooltipMenu', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../../components/BlurredBalanceView', () => ({ BlurredBalanceView: () => null }));
jest.mock('../../class/wallet-gradient', () => ({
  __esModule: true,
  default: {
    headerColorFor: () => '#000',
    gradientsFor: () => ['#000', '#111'],
  },
}));

const wallet = {
  type: 'test-wallet',
  hideBalance: false,
  getLabel: () => 'Realm wallet',
  getPreferredBalanceUnit: () => BitcoinUnit.SATS,
} as any;

it('rerenders the displayed balance when the live balance prop changes', () => {
  const commonProps = {
    wallet,
    unit: BitcoinUnit.SATS,
    headerOverlayHeight: 44,
    onWalletUnitChange: jest.fn(),
  };
  const view = render(<TransactionsNavigationHeader {...commonProps} walletBalance={1_000} />);
  expect(view.getByTestId('WalletBalance').props.children).toBe(formatBalanceWithoutSuffix(1_000, BitcoinUnit.SATS, true));

  view.rerender(<TransactionsNavigationHeader {...commonProps} walletBalance={2_000} />);
  expect(view.getByTestId('WalletBalance').props.children).toBe(formatBalanceWithoutSuffix(2_000, BitcoinUnit.SATS, true));
});
