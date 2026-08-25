import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

import getWalletTransactionsOptions, { createWalletDetailsHeaderRight } from '../../navigation/helpers/getWalletTransactionsOptions';

jest.mock('../../NavigationService', () => ({
  navigationRef: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../components/Icon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View testID="HeaderMoreIcon" {...props} />,
  };
});

jest.mock('../../blue_modules/environment', () => ({
  isDesktop: false,
  isIOS26OrHigher: false,
}));

describe('getWalletTransactionsOptions', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('uses JS headerRight for wallet details on pre–iOS 26 (and keeps a tappable target)', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const options = getWalletTransactionsOptions({
      route: {
        key: 'WalletTransactions',
        name: 'WalletTransactions',
        params: { walletID: 'wallet-1', isLoading: false },
      },
    });

    expect(options.headerTransparent).toBe(true);
    expect(options.headerRight).toEqual(expect.any(Function));
    expect(options.unstable_headerRightItems).toBeUndefined();

    const HeaderRight = options.headerRight as () => React.ReactElement;
    const { getByTestId } = render(HeaderRight());
    expect(getByTestId('WalletDetails')).toBeTruthy();
  });

  it('createWalletDetailsHeaderRight exposes a large hit target for the details control', () => {
    const HeaderRight = createWalletDetailsHeaderRight({
      walletID: 'wallet-1',
      isLoading: false,
      iconColor: '#FFFFFF',
    });
    const { getByTestId } = render(HeaderRight());
    const button = getByTestId('WalletDetails');

    expect(button.props.accessibilityLabel).toBeTruthy();
    expect(button.props.hitSlop).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
  });
});
