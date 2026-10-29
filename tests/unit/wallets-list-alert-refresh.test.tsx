import React from 'react';
import { Alert } from 'react-native';
import { act, render } from '@testing-library/react-native';
import WalletsList from '../../screen/wallets/WalletsList';
import presentAlert from '../../components/Alert';

const refreshWallets = jest.fn();
const wallets: any[] = [];
jest.mock('../../blue_modules/hapticFeedback', () => ({
  ...jest.requireActual('../../blue_modules/hapticFeedback'),
  __esModule: true,
  default: jest.fn(),
}));
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
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, fontScale: 1, scale: 3 }),
}));
jest.mock('../../blue_modules/environment', () => ({ isDesktop: false, isIOS26OrHigher: true }));
jest.mock('../../components/SafeAreaSectionList', () => {
  const { View } = require('react-native');
  return ({ renderItem, ...props }: any) => <View {...props}>{renderItem({ section: { key: 'CAROUSEL' } })}</View>;
});
jest.mock('../../components/WalletsCarousel', () => ({
  __esModule: true,
  default: 'WalletsCarousel',
  getWalletCarouselHeight: () => 200,
  getWalletCarouselItemWidth: () => 100,
}));
jest.mock('../../components/FloatButtons', () => ({
  FButton: 'FButton',
  FContainer: 'FContainer',
  FloatButtonsBottomFade: 'FloatButtonsBottomFade',
  getFloatingButtonReservedHeight: () => 0,
}));
jest.mock('../../components/TransactionListItem', () => ({ TransactionListItem: 'TransactionListItem' }));
jest.mock('../../components/TotalWalletsBalance', () => 'TotalWalletsBalance');

describe('WalletsList refresh completion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    wallets.length = 0;
    refreshWallets.mockReset().mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('does not clear refreshing when a carousel snap finishes under an alert', async () => {
    wallets.push({}, { timeToRefreshBalance: () => true });
    const screen = render(<WalletsList />);
    await act(async () => {});
    let completeRefresh!: () => void;
    refreshWallets.mockImplementationOnce(() => new Promise<void>(resolve => (completeRefresh = resolve)));
    let refresh!: Promise<void>;
    act(() => {
      refresh = screen.getByTestId('Wallets').props.onRefresh();
    });
    await act(async () => {
      presentAlert({ message: 'Network error' });
      completeRefresh();
      await refresh;
    });
    expect(screen.getByTestId('Wallets').props.refreshing).toBe(true);

    await act(async () => {
      screen.getByTestId('WalletsList').props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 100 } } });
    });
    expect(refreshWallets).toHaveBeenLastCalledWith(1, false);
    expect(screen.getByTestId('Wallets').props.refreshing).toBe(true);

    await act(async () => {
      await jest.mocked(Alert.alert).mock.calls[0][2]?.[0].onPress?.();
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByTestId('Wallets').props.refreshing).toBe(false);
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
