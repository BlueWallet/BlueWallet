import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import useNotifications from '../../hooks/useNotifications';

const initializeNotifications = jest.fn().mockResolvedValue(undefined);
const setProcessNotificationsHandler = jest.fn();
const checkNotificationPermissionStatus = jest.fn().mockResolvedValue('granted');
const configureNotifications = jest.fn().mockResolvedValue(true);
const setConfigureNotificationsFn = jest.fn();
const getDeliveredNotifications = jest.fn().mockResolvedValue([]);
const removeAllDeliveredNotifications = jest.fn();
const setApplicationIconBadgeNumber = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../blue_modules/notifications', () => ({
  NOTIFICATIONS_NO_AND_DONT_ASK_FLAG: 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG',
  _setConfigureNotificationsFn: (...args: unknown[]) => setConfigureNotificationsFn(...args),
  checkNotificationPermissionStatus: (...args: unknown[]) => checkNotificationPermissionStatus(...args),
  configureNotifications: (...args: unknown[]) => configureNotifications(...args),
  initializeNotifications: (...args: unknown[]) => initializeNotifications(...args),
  setProcessNotificationsHandler: (...args: unknown[]) => setProcessNotificationsHandler(...args),
  getDeliveredNotifications: (...args: unknown[]) => getDeliveredNotifications(...args),
  removeAllDeliveredNotifications: (...args: unknown[]) => removeAllDeliveredNotifications(...args),
  setApplicationIconBadgeNumber: (...args: unknown[]) => setApplicationIconBadgeNumber(...args),
}));

const mockWalletsInitialized = { current: true };

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    wallets: [],
    walletsInitialized: mockWalletsInitialized.current,
    fetchAndSaveWalletTransactions: jest.fn(),
    refreshAllWalletTransactions: jest.fn(),
  }),
}));

const HookConsumer = () => {
  useNotifications();
  return null;
};

const appStateHandlers: Array<(status: AppStateStatus) => void | Promise<void>> = [];

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateHandlers.length = 0;
    mockWalletsInitialized.current = true;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateHandlers.push(handler);
      return { remove: jest.fn() } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bootstraps notifications once and wires up globals', async () => {
    render(<HookConsumer />);

    await waitFor(() => {
      expect(initializeNotifications).toHaveBeenCalledTimes(1);
    });

    expect(setProcessNotificationsHandler).toHaveBeenCalledWith(expect.any(Function));
    expect(setConfigureNotificationsFn).toHaveBeenCalledWith(expect.any(Function));
  });

  it('cleans up globals on unmount', async () => {
    const { unmount } = render(<HookConsumer />);

    await waitFor(() => {
      expect(setConfigureNotificationsFn).toHaveBeenLastCalledWith(expect.any(Function));
    });

    unmount();

    expect(setConfigureNotificationsFn).toHaveBeenLastCalledWith(null);
    expect(setProcessNotificationsHandler).toHaveBeenLastCalledWith(undefined);
  });
});
