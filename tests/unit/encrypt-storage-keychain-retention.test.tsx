import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockIsKeychainRetentionEnabled = jest.fn<Promise<boolean>, []>();
const mockSetKeychainRetentionEnabled = jest.fn<Promise<void>, [boolean]>();
const mockIsStorageEncrypted = jest.fn(async () => false);
const mockIsDeviceBiometricCapable = jest.fn(async () => false);

jest.mock('../../class/blue-app', () => ({
  BlueApp: {
    getInstance: () => ({
      isKeychainRetentionEnabled: mockIsKeychainRetentionEnabled,
      setKeychainRetentionEnabled: mockSetKeychainRetentionEnabled,
    }),
  },
}));

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ isStorageEncrypted: mockIsStorageEncrypted }),
}));

jest.mock('../../hooks/useBiometrics', () => ({
  unlockWithBiometrics: async () => true,
  useBiometrics: () => ({
    isDeviceBiometricCapable: mockIsDeviceBiometricCapable,
    biometricEnabled: false,
    setBiometricUseEnabled: jest.fn(),
    deviceBiometricType: undefined,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

jest.mock('../../components/SettingsSection', () => {
  const { ActivityIndicator, Switch, View } = require('react-native');
  return {
    SettingsScrollView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SettingsSection: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SettingsListItem: ({ switch: switchProps, isLoading }: { switch?: object; isLoading?: boolean }) =>
      isLoading ? <ActivityIndicator testID="SettingsListItemLoading" /> : switchProps ? <Switch {...switchProps} /> : null,
  };
});

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    _: { cancel: 'Cancel', ok: 'OK' },
    errors: { error: 'Error' },
    formatString: (value: string) => value,
    settings: {
      biometrics: 'Biometrics',
      biometrics_fail: 'Biometrics failed',
      encrypt_decrypt: 'Decrypt',
      encrypt_decrypt_q: 'Decrypt?',
      encrypt_enc_and_pass: 'Encrypted',
      encrypt_tstorage: 'Storage',
      encrypt_use: 'Use biometrics',
      encrypt_use_expl: 'Use biometrics explanation',
      keychain_retention: 'Retain wallets',
      keychain_retention_expl: 'Retain wallets explanation',
      plausible_deniability: 'Plausible deniability',
    },
  },
}));

const EncryptStorage = require('../../screen/settings/EncryptStorage').default;

describe('EncryptStorage Keychain retention setting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetKeychainRetentionEnabled.mockResolvedValue();
  });

  it('waits for the persisted value before enabling the switch and does not overwrite a new choice with a stale read', async () => {
    let resolveRetention!: (enabled: boolean) => void;
    mockIsKeychainRetentionEnabled.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRetention = resolve;
        }),
    );

    const screen = render(<EncryptStorage />);

    expect(screen.queryByTestId('KeychainRetentionSwitch')).toBeNull();
    expect(mockIsKeychainRetentionEnabled).toHaveBeenCalledTimes(1);

    resolveRetention(true);
    await waitFor(() => expect(screen.getByTestId('KeychainRetentionSwitch').props.value).toBe(true));

    fireEvent(screen.getByTestId('KeychainRetentionSwitch'), 'valueChange', false);

    await waitFor(() => expect(mockSetKeychainRetentionEnabled).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.getByTestId('KeychainRetentionSwitch').props.value).toBe(false));
  });
});
