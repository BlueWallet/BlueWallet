import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionsNavigationHeader from '../../components/TransactionsNavigationHeader';
import { BitcoinUnit } from '../../models/bitcoinUnits';

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View testID="HeroLinearGradient" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      shadowColor: '#000000',
    },
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({
    preferredFiatCurrency: { endPointKey: 'USD' },
  }),
}));

jest.mock('../../components/TooltipMenu', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../../components/BlurredBalanceView', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    BlurredBalanceView: () => <View testID="BlurredBalanceView" />,
  };
});

jest.mock('../../class/wallet-gradient', () => ({
  __esModule: true,
  default: {
    gradientsFor: () => ['#000000', '#111111'],
    headerColorFor: () => '#000000',
  },
}));

describe('TransactionsNavigationHeader pointer events', () => {
  const wallet = {
    type: 'HDsegwitBech32',
    hideBalance: false,
    getLabel: () => 'Test Wallet',
    getBalance: () => 0,
    getPreferredBalanceUnit: () => BitcoinUnit.BTC,
    allowOnchainAddress: async () => false,
  };

  it('lets taps pass through the transparent-header overlay to native/JS header buttons', () => {
    const { getByTestId, UNSAFE_root } = render(
      <TransactionsNavigationHeader
        wallet={wallet as any}
        unit={BitcoinUnit.BTC}
        headerOverlayHeight={88}
        onWalletUnitChange={jest.fn()}
      />,
    );

    const gradient = getByTestId('HeroLinearGradient');
    expect(gradient.props.pointerEvents).toBe('none');

    // Root hero view must be box-none so padding under the nav bar does not steal taps.
    expect(UNSAFE_root.findByProps({ pointerEvents: 'box-none' })).toBeTruthy();
  });
});
