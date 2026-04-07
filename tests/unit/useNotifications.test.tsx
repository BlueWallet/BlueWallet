import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import useNotifications from '../../hooks/useNotifications';

const initializeNotifications = jest.fn().mockResolvedValue(undefined);
const setProcessNotificationsHandler = jest.fn();
const checkNotificationPermissionStatus = jest.fn().mockResolvedValue('granted');
const configureNotifications = jest.fn().mockResolvedValue(true);
const setConfigureNotificationsFn = jest.fn();

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
}));

const HookConsumer = ({ enabled = true }: { enabled?: boolean }) => {
  useNotifications({ enabled });
  return null;
};

const appStateHandlers: Array<(status: AppStateStatus) => void | Promise<void>> = [];

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateHandlers.length = 0;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateHandlers.push(handler);
      return { remove: jest.fn() } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bootstraps and keeps notification initialization deduplicated across mounts and app activation', async () => {
    render(
      <>
        <HookConsumer enabled />
        <HookConsumer enabled />
      </>,
    );

    await waitFor(() => {
      expect(initializeNotifications).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await Promise.all(appStateHandlers.map(handler => handler('active')));
    });

    expect(initializeNotifications).toHaveBeenCalledTimes(1);
  });
});
