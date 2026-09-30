import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import NotificationPrivacySettings from '../../components/NotificationPrivacySettings';
import { checkNotificationPermissionStatus, isNotificationsEnabled } from '../../blue_modules/notifications';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../blue_modules/notifications', () => ({
  getPushToken: jest.fn().mockResolvedValue({ token: 'existing-token', os: 'ios' }),
  isNotificationsEnabled: jest.fn(),
  checkNotificationPermissionStatus: jest.fn(),
  isNotificationsRedacted: jest.fn().mockResolvedValue(true),
  setRedactNotifications: jest.fn(),
}));
jest.mock('../../components/Alert', () => jest.fn());
jest.mock('../../components/SettingsSection', () => ({
  SettingsListItem: ({ switch: props }: { switch: object }) => {
    const { Switch } = require('react-native');
    return <Switch testID="redaction" {...props} />;
  },
}));

describe('notification privacy availability', () => {
  it.each([
    [false, 'granted', true],
    [true, 'blocked', true],
    [true, 'granted', false],
  ])('with notifications=%s and permission=%s, disabled=%s', async (enabled, permission, disabled) => {
    jest.mocked(isNotificationsEnabled).mockResolvedValue(enabled as boolean);
    jest.mocked(checkNotificationPermissionStatus).mockResolvedValue(permission as 'granted' | 'blocked');
    const screen = render(<NotificationPrivacySettings />);
    await waitFor(() => expect(screen.getByTestId('redaction').props.value).toBe(true));
    expect(screen.getByTestId('redaction').props.disabled).toBe(disabled);
  });
});
