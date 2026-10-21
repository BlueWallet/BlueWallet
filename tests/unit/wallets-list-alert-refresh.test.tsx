import React from 'react';
import { Alert } from 'react-native';
import { act, render } from '@testing-library/react-native';
import WalletsList from '../../screen/wallets/WalletsList';
import presentAlert from '../../components/Alert';

const refreshWallets = jest.fn();
const wallets: never[] = [];
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets, getTransactions: () => [], refreshAllWalletTransactions: refreshWallets }),
}));
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => ({ isElectrumDisabled: false }) }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({}),
  useIsFocused: () => true,
  useFocusEffect: () => {},
}));
jest.mock('../../hooks/useScreenMenuActions', () => ({ __esModule: true, default: () => {} }));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../blue_modules/sizeClass', () => ({
  SizeClass: { Large: 'Large' },
  useSizeClass: () => ({ sizeClass: 'Regular', isLarge: false }),
}));
jest.mock('../../blue_modules/environment', () => ({ isDesktop: false, isIOS26OrHigher: true }));
jest.mock('../../components/SafeAreaSectionList', () => 'SectionList');
jest.mock('../../components/WalletsCarousel', () => ({ getWalletCarouselHeight: () => 200 }));
jest.mock('../../components/TransactionListItem', () => ({ TransactionListItem: 'TransactionListItem' }));
jest.mock('../../components/TotalWalletsBalance', () => 'TotalWalletsBalance');

describe('WalletsList refresh completion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    refreshWallets.mockReset().mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([false, true])('keeps refreshing until dismissal when alert is shown: %s', async showAlert => {
    const screen = render(<WalletsList />);
    await act(async () => {}); // initial background refresh
    let completeRefresh!: () => void;
    refreshWallets.mockImplementationOnce(() => new Promise<void>(resolve => (completeRefresh = resolve)));

    let refresh!: Promise<void>;
    act(() => {
      refresh = screen.getByTestId('Wallets').props.onRefresh();
    });
    expect(screen.getByTestId('Wallets').props.refreshing).toBe(true);

    await act(async () => {
      if (showAlert) presentAlert({ message: 'Network error' });
      completeRefresh();
      await refresh;
    });
    expect(screen.getByTestId('Wallets').props.refreshing).toBe(showAlert);

    if (showAlert) {
      await act(async () => {
        await jest.mocked(Alert.alert).mock.calls[0][2]?.[0].onPress?.();
        await jest.advanceTimersByTimeAsync(500);
      });
      expect(screen.getByTestId('Wallets').props.refreshing).toBe(false);
    }
  });
});
