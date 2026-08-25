import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { navigationRef } from '../../NavigationService';
import TransactionsNavigationHeader from '../../components/TransactionsNavigationHeader';
import { WalletTransactionsScrolledHeaderTitle } from '../../components/WalletTransactionsScrolledHeaderTitle';
import getWalletTransactionsOptions, { createWalletDetailsHeaderRight } from '../../navigation/helpers/getWalletTransactionsOptions';
import { BitcoinUnit } from '../../models/bitcoinUnits';

jest.mock('../../NavigationService', () => ({
  navigationRef: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../components/Icon', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});

jest.mock('../../blue_modules/environment', () => ({
  isDesktop: false,
  isIOS26OrHigher: false,
}));

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock('../../components/TooltipMenu', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      foregroundColor: '#111111',
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

const wallet = {
  type: 'HDsegwitBech32',
  hideBalance: false,
  getLabel: () => 'Test Wallet',
  getBalance: () => 0,
  getPreferredBalanceUnit: () => BitcoinUnit.BTC,
  allowOnchainAddress: async () => false,
};

describe('wallet transactions header tap targets', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    jest.clearAllMocks();
  });

  it('hero overlay and gradient do not claim pointer events under the transparent nav bar', () => {
    const { getByTestId } = render(
      <TransactionsNavigationHeader
        wallet={wallet as any}
        unit={BitcoinUnit.BTC}
        headerOverlayHeight={88}
        onWalletUnitChange={jest.fn()}
      />,
    );

    // Regression guard: removing these pointerEvents reintroduces tap-stealing on iOS < 26 / Catalyst.
    expect(getByTestId('WalletTransactionsHero').props.pointerEvents).toBe('box-none');
    expect(getByTestId('WalletTransactionsHeroGradient').props.pointerEvents).toBe('none');
  });

  it('scrolled iOS title uses box-none so the full-width layout does not cover headerRight', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const { getByTestId } = render(<WalletTransactionsScrolledHeaderTitle walletLabel="Savings" balance="0.01 BTC" />);

    expect(getByTestId('WalletTransactionsScrolledHeaderTitle').props.pointerEvents).toBe('box-none');
    expect(getByTestId('WalletTransactionsScrolledHeaderTitleArea').props.pointerEvents).toBe('box-none');
  });

  it('uses JS headerRight on pre–iOS 26 and navigates to WalletDetails on press', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const options = getWalletTransactionsOptions({
      route: {
        key: 'WalletTransactions',
        name: 'WalletTransactions',
        params: { walletID: 'wallet-1', walletType: 'HDsegwitBech32', isLoading: false },
      },
    });

    expect(options.headerRight).toEqual(expect.any(Function));
    expect(options.unstable_headerRightItems).toBeUndefined();

    const HeaderRight = options.headerRight as () => React.ReactElement;
    const { getByTestId } = render(HeaderRight());
    fireEvent.press(getByTestId('WalletDetails'));

    expect(navigationRef.navigate).toHaveBeenCalledWith('WalletDetails', { walletID: 'wallet-1' });
  });

  it('does not navigate while the details control is disabled', () => {
    const HeaderRight = createWalletDetailsHeaderRight({
      walletID: 'wallet-1',
      isLoading: true,
      iconColor: '#FFFFFF',
    });
    const { getByTestId } = render(HeaderRight());

    fireEvent.press(getByTestId('WalletDetails'));
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });
});
