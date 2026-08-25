import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { navigationRef } from '../../NavigationService';
import getWalletTransactionsOptions, { createWalletDetailsHeaderRight } from '../../navigation/helpers/getWalletTransactionsOptions';
import loc from '../../loc';

jest.mock('../../NavigationService', () => ({
  navigationRef: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../components/Icon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View />,
  };
});

jest.mock('../../blue_modules/environment', () => ({
  isDesktop: false,
  isIOS26OrHigher: false,
}));

describe('wallet details header right', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    jest.clearAllMocks();
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
    const button = getByTestId('WalletDetails');

    expect(button.props.accessibilityLabel).toBe(loc.wallets.details_title);
    fireEvent.press(button);

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
