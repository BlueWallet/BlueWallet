import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import Settings from '../../screen/settings/Settings';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({
    language: 'en',
  }),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    dark: false,
    colors: {
      lightButton: '#f4f4f4',
      modal: '#f7f7f7',
      elevated: '#ffffff',
      background: '#ffffff',
      foregroundColor: '#000000',
    },
  }),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    settings: {
      header: 'Settings',
      donate: 'Donate',
      donate_description: 'Help us keep Blue free!',
      general: 'General',
      currency: 'Currency',
      language: 'Language',
      encrypt_title: 'Security',
      network: 'Network',
      notifications: 'Notifications',
      block_explorer: 'Block Explorer',
      network_electrum: 'Electrum Server',
      lightning_settings: 'Lightning Settings',
      about_selftest: 'Run self-test',
      about_release_notes: 'Release notes',
      about_license: 'MIT License',
      network_broadcast: 'Broadcast Transaction',
      tools: 'Tools',
      about: 'About',
      widgets: 'Widgets',
    },
    is_it_my_address: {
      title: 'Is it my address?',
    },
    autofill_word: {
      title: 'Seed final word',
    },
    wallets: {
      no_results_found: 'No results found',
      manage_wallets_search_placeholder: 'Search',
    },
    _: {
      search: 'Search',
    },
  },
}));

jest.mock('../../components/platform', () => {
  const Native = require('react-native');

  return {
    SettingsScrollView: ({ children }: { children: React.ReactNode }) => <Native.View>{children}</Native.View>,
    SettingsSection: ({ children }: { children: React.ReactNode }) => <Native.View>{children}</Native.View>,
    SettingsListItem: ({ title, testID, onPress }: { title: string; testID?: string; onPress?: () => void }) => (
      <Native.TouchableOpacity testID={testID} onPress={onPress}>
        <Native.Text>{title}</Native.Text>
      </Native.TouchableOpacity>
    ),
    getSettingsHeaderOptions: () => ({ title: 'Settings' }),
  };
});

describe('Settings search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses existing localized placeholder entry for header search', () => {
    render(<Settings />);

    expect(mockSetOptions).toHaveBeenCalled();
    const options = mockSetOptions.mock.calls[0][0];

    expect(options.headerSearchBarOptions.placeholder).toBe('Search');
  });

  it('filters settings items when search text changes', () => {
    const view = render(<Settings />);

    expect(view.getByText('General')).toBeTruthy();
    expect(view.getByText('Tools')).toBeTruthy();

    const options = mockSetOptions.mock.calls[0][0];
    act(() => {
      options.headerSearchBarOptions.onChangeText({ nativeEvent: { text: 'tools' } });
    });

    expect(view.getByText('Tools')).toBeTruthy();
    expect(view.queryByText('General')).toBeNull();
  });

  it('shows no results state when search has no matches', () => {
    const view = render(<Settings />);

    const options = mockSetOptions.mock.calls[0][0];
    act(() => {
      options.headerSearchBarOptions.onChangeText({ nativeEvent: { text: 'zzz-not-found' } });
    });

    expect(view.getByText('No results found')).toBeTruthy();
    expect(view.queryByText('About')).toBeNull();
  });

  it('finds deep settings destinations and navigates to notifications', () => {
    const view = render(<Settings />);

    const options = mockSetOptions.mock.calls[0][0];
    act(() => {
      options.headerSearchBarOptions.onChangeText({ nativeEvent: { text: 'notifications' } });
    });

    expect(view.getByText('Notifications')).toBeTruthy();

    fireEvent.press(view.getByTestId('SearchNotificationSettings'));

    expect(mockNavigate).toHaveBeenCalledWith('NotificationSettings');
  });

  it('navigates to general settings with widget section target', () => {
    const view = render(<Settings />);

    const options = mockSetOptions.mock.calls[0][0];
    act(() => {
      options.headerSearchBarOptions.onChangeText({ nativeEvent: { text: 'widget' } });
    });

    expect(view.getByText('Widgets')).toBeTruthy();
    fireEvent.press(view.getByTestId('SearchWidgets'));

    expect(mockNavigate).toHaveBeenCalledWith('GeneralSettings', { targetItemId: 'widgetsSectionHeader' });
  });
});
