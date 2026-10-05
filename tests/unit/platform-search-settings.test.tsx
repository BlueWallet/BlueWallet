import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import GeneralSettings from '../../screen/settings/GeneralSettings';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { usePlatformSearchAvailability } from '../../blue_modules/NativePlatformSearch';
import loc from '../../loc';

jest.mock('../../hooks/context/useSettings', () => ({ useSettings: jest.fn() }));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: jest.fn() }));
jest.mock('../../blue_modules/NativePlatformSearch', () => ({ usePlatformSearchAvailability: jest.fn() }));
jest.mock('../../blue_modules/analytics', () => ({ setOptOut: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../components/SettingsSection', () => {
  const { View, Text, Switch } = require('react-native');
  return {
    SettingsScrollView: View,
    SettingsSection: View,
    SettingsListItem: ({ testID, subtitle, switch: control }: any) => (
      <View testID={testID}>
        <Text>{subtitle}</Text>
        {control && <Switch testID={`${testID}-switch`} {...control} />}
      </View>
    ),
  };
});

const save = jest.fn().mockResolvedValue(undefined);
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useStorage)
    .mockReturnValue({ wallets: [], isStorageEncrypted: async () => false } as unknown as ReturnType<typeof useStorage>);
  jest
    .mocked(useSettings)
    .mockReturnValue({ isPlatformSearchEnabled: true, setIsPlatformSearchEnabledStorage: save } as unknown as ReturnType<
      typeof useSettings
    >);
});

it.each([null, false])('disables the opt-in when device availability is %s and shows guidance', async available => {
  jest.mocked(usePlatformSearchAvailability).mockReturnValue(available);
  const screen = render(<GeneralSettings />);
  await act(async () => {});
  const toggle = screen.getByTestId('PlatformSearchEnabled-switch');
  expect(toggle.props.disabled).toBe(true);
  expect(toggle.props.value).toBe(false);
  expect(screen.queryByTestId('PlatformSearchAddresses')).toBeNull();
  expect(
    screen.getByText(new RegExp(available === null ? loc.settings.platform_search_checking : loc.settings.platform_search_unavailable)),
  ).toBeTruthy();
  expect(screen.getByTestId('PlatformSearchDeviceSettings')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

it('allows explicit opt-in when device indexing is available', async () => {
  jest.mocked(usePlatformSearchAvailability).mockReturnValue(true);
  jest.mocked(useSettings).mockReturnValue({ ...useSettings(), isPlatformSearchEnabled: false });
  const screen = render(<GeneralSettings />);
  await act(async () => {});
  const toggle = screen.getByTestId('PlatformSearchEnabled-switch');
  expect(toggle.props.disabled).toBe(false);
  await act(async () => fireEvent(toggle, 'valueChange', true));
  expect(save).toHaveBeenCalledWith(true);
});
