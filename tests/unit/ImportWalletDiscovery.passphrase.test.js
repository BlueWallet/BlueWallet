import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ImportWalletDiscovery from '../../screen/wallets/ImportWalletDiscovery';
import loc from '../../loc';
import startImport from '../../class/wallet-import';
import { useRoute } from '@react-navigation/native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

jest.mock('../../components/WalletToImport', () => {
  const ReactNative = require('react-native');
  const React = require('react');
  return ({ onPress, title }) =>
    React.createElement(
      ReactNative.TouchableOpacity,
      { onPress, accessibilityLabel: title },
      React.createElement(ReactNative.Text, null, title),
    );
});

jest.mock('../../BlueComponents', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    BlueButtonLink: ({ title, onPress, testID }) =>
      React.createElement(TouchableOpacity, { onPress, testID }, React.createElement(Text, null, title)),
    BlueFormLabel: ({ children }) => React.createElement(Text, null, children),
    BlueText: ({ children }) => React.createElement(Text, null, children),
  };
});

jest.mock('../../components/themes', () => {
  const actual = jest.requireActual('../../components/themes');
  return {
    ...actual,
    useTheme: () => actual.BlueDefaultTheme,
  };
});

jest.mock('../../hooks/context/useStorage', () => {
  const addAndSaveWallet = jest.fn();
  return {
    useStorage: () => ({ addAndSaveWallet }),
  };
});

jest.mock('../../hooks/context/useSettings', () => {
  const settings = { isElectrumDisabled: false, isPrivacyBlurEnabled: false };
  return {
    useSettings: () => settings,
  };
});

jest.mock('../../hooks/useScreenProtect', () => {
  const screenProtect = { enableScreenProtect: jest.fn(), disableScreenProtect: jest.fn() };
  return {
    useScreenProtect: () => screenProtect,
  };
});

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { ImpactLight: 'ImpactLight', Selection: 'Selection' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../components/PassphrasePrompt', () => {
  const React = require('react');
  const { View, Text, TextInput, Button } = require('react-native');

  return ({ visible, title, message, onCancel, onSubmit }) => {
    const [value, setValue] = React.useState('');

    if (!visible) {
      return null;
    }

    return React.createElement(
      View,
      { accessibilityLabel: 'PassphrasePrompt' },
      React.createElement(Text, null, title),
      React.createElement(Text, null, message),
      React.createElement(TextInput, {
        testID: 'PassphrasePromptInput',
        value,
        onChangeText: setValue,
      }),
      React.createElement(Button, {
        testID: 'PassphrasePromptConfirmButton',
        title: 'OK',
        onPress: () => onSubmit(value),
      }),
      React.createElement(Button, {
        testID: 'PassphrasePromptCancelButton',
        title: 'Cancel',
        onPress: onCancel,
      }),
    );
  };
});

jest.mock('@react-navigation/native', () => ({
  ...(jest.requireActual('@react-navigation/native')),
  useRoute: jest.fn(),
}));

jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: jest.fn(),
}));

jest.mock('../../class/wallet-import');

const startImportMock = startImport;
const useRouteMock = useRoute;
const useExtendedNavigationMock = useExtendedNavigation;
const parentNavigationMock = { goBack: jest.fn() };
const navigationMock = {
  navigate: jest.fn(),
  getParent: () => parentNavigationMock,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('ImportWalletDiscovery passphrase prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRouteMock.mockReturnValue({
      params: {
        importText: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        askPassphrase: true,
        searchAccounts: false,
      },
    });
    useExtendedNavigationMock.mockReturnValue(navigationMock);
  });

  it('resolves passphrase from inline prompt', async () => {
    let passwordRequestPromise = null;
    startImportMock.mockImplementation((_, __, ___, ____, _____, ______, onPassword) => {
      passwordRequestPromise = onPassword(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
      return {
        promise: new Promise(() => {}),
        stop: jest.fn(),
      };
    });

    const { getByText, getByTestId } = render(<ImportWalletDiscovery />);

    await waitFor(() => expect(startImportMock).toHaveBeenCalled());
    await waitFor(() => expect(getByText(loc.wallets.import_passphrase_title)).toBeTruthy());

    fireEvent.changeText(getByTestId('PassphrasePromptInput'), 'secret');
    fireEvent.press(getByTestId('PassphrasePromptConfirmButton'));

    await waitFor(() => expect(passwordRequestPromise).not.toBeNull());
    await expect(passwordRequestPromise).resolves.toBe('secret');
  });
});
