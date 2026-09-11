import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlueDefaultTheme } from '../../components/themes';
import loc from '../../loc';
import EncryptStorage from '../../screen/settings/EncryptStorage';

const mockNavigate = jest.fn();
let mockTooltipMenuProps: any;
const mockSetSecurityUseOption = jest.fn();
const mockSetSensitiveActionsUseOption = jest.fn();
const mockIsDeviceBiometricCapable = jest.fn(async () => true);
const mockIsDevicePasscodeCapable = jest.fn(async () => true);
const mockIsStorageEncrypted = jest.fn(async () => false);
let mockSecurityUseOption = 'disabled';
let mockSecurityStateStatus = 'loaded';
let mockSensitiveActionsUseOption = 'disabled';
let mockSensitiveActionsStateStatus = 'loaded';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('../../hooks/useBiometrics', () => ({
  useBiometrics: () => ({
    deviceBiometricType: 'Face ID',
    isDeviceBiometricCapable: mockIsDeviceBiometricCapable,
  }),
}));

jest.mock('../../hooks/useKeychainAuthentication', () => ({
  useKeychainAuthentication: () => ({
    securityUseOption: mockSecurityUseOption,
    securityStateStatus: mockSecurityStateStatus,
    isDevicePasscodeCapable: mockIsDevicePasscodeCapable,
    setSecurityUseOption: mockSetSecurityUseOption,
    sensitiveActionsUseOption: mockSensitiveActionsUseOption,
    sensitiveActionsStateStatus: mockSensitiveActionsStateStatus,
    setSensitiveActionsUseOption: mockSetSensitiveActionsUseOption,
  }),
}));

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ isStorageEncrypted: mockIsStorageEncrypted }),
}));

jest.mock('../../components/TooltipMenu', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return (props: any) => {
    mockTooltipMenuProps = props;
    return ReactModule.createElement(View, { testID: props.testID, onPressMenuItem: props.onPressMenuItem }, props.children);
  };
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialSafeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <NavigationContainer theme={BlueDefaultTheme}>
        <EncryptStorage />
      </NavigationContainer>
    </SafeAreaProvider>,
  );

describe('EncryptStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecurityUseOption = 'disabled';
    mockSecurityStateStatus = 'loaded';
    mockSensitiveActionsUseOption = 'disabled';
    mockSensitiveActionsStateStatus = 'loaded';
    mockIsDeviceBiometricCapable.mockResolvedValue(true);
    mockIsDevicePasscodeCapable.mockResolvedValue(true);
    mockIsStorageEncrypted.mockResolvedValue(false);
    mockSetSecurityUseOption.mockResolvedValue(true);
  });

  it('keeps the master layout with only the authentication switch replaced by a policy menu', async () => {
    const { getByTestId, getByText, queryByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('SecurityAuthenticationMenu')).toBeTruthy());
    expect(getByText(loc.settings.security_wallet_access)).toBeTruthy();
    expect(getByText(loc.settings.security_authentication_method)).toBeTruthy();
    expect(getByText(loc.settings.security_authentication_wallets_explain)).toBeTruthy();
    expect(getByText(loc.settings.wallet_password)).toBeTruthy();
    expect(getByText(loc.settings.wallet_password_explain)).toBeTruthy();
    expect(getByText(loc.settings.security_disabled).props.style).toEqual(
      expect.objectContaining({ color: BlueDefaultTheme.colors.foregroundColor, marginStart: 16 }),
    );
    expect(getByTestId('EncyptedAndPasswordProtectedSwitch')).toBeTruthy();
    expect(queryByTestId('BiometricsSwitch')).toBeNull();
    expect(queryByTestId('SensitiveActionsAuthenticationMenu')).toBeNull();
    expect(mockTooltipMenuProps.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'disabled', menuState: true }),
        expect.objectContaining({ id: 'biometricsOrPasscode' }),
        expect.objectContaining({ id: 'devicePasscode' }),
      ]),
    );
  });

  it('uses the Keychain-backed policy setter for menu changes', async () => {
    mockSecurityUseOption = 'biometricsOrPasscode';
    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('SecurityAuthenticationMenu')).toBeTruthy());
    fireEvent(getByTestId('SecurityAuthenticationMenu'), 'pressMenuItem', 'disabled');
    await waitFor(() => expect(mockSetSecurityUseOption).toHaveBeenCalledWith('disabled'));
  });

  it('opens password creation from the encrypted-storage switch', async () => {
    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('EncyptedAndPasswordProtectedSwitch')).toBeTruthy());
    fireEvent(getByTestId('EncyptedAndPasswordProtectedSwitch'), 'valueChange', true);

    expect(mockNavigate).toHaveBeenCalledWith('PromptPasswordConfirmationSheet', {
      modalType: 'CREATE_PASSWORD',
      returnTo: 'EncryptStorage',
    });
  });

  it('passes the current Wallets authentication method to the password warning', async () => {
    mockSecurityUseOption = 'biometricsOrPasscode';
    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('EncyptedAndPasswordProtectedSwitch')).toBeTruthy());
    fireEvent(getByTestId('EncyptedAndPasswordProtectedSwitch'), 'valueChange', true);

    expect(mockNavigate).toHaveBeenCalledWith('PromptPasswordConfirmationSheet', {
      modalType: 'CREATE_PASSWORD',
      returnTo: 'EncryptStorage',
      appUnlockSecurityOption: 'biometricsOrPasscode',
    });
  });

  it('confirms password removal before opening the Keychain-backed decryption flow', async () => {
    mockIsStorageEncrypted.mockResolvedValue(true);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_, __, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    const { getByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('EncyptedAndPasswordProtectedSwitch').props.value).toBe(true));
    fireEvent(getByTestId('EncyptedAndPasswordProtectedSwitch'), 'valueChange', false);

    expect(alert).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('PromptPasswordConfirmationSheet', {
      modalType: 'ENTER_PASSWORD',
      returnTo: 'EncryptStorage',
      securityOptionAfterDecryption: undefined,
    });
    alert.mockRestore();
  });

  it('keeps Password separate and uses the same menu for sensitive-action authentication', async () => {
    mockIsStorageEncrypted.mockResolvedValue(true);
    const { getByTestId, getByText, queryByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('PlausibleDeniabilityButton')).toBeTruthy());
    expect(queryByTestId('BiometricsSwitch')).toBeNull();
    expect(getByTestId('SecurityAuthenticationMenu')).toBeTruthy();
    expect(getByTestId('EncyptedAndPasswordProtectedSwitch').props.value).toBe(true);
    expect(getByText(loc.settings.security_sensitive_actions)).toBeTruthy();
    expect(getByText(loc.settings.security_confirmation_method)).toBeTruthy();
    expect(getByText(loc.settings.security_authentication_actions_explain)).toBeTruthy();
    expect(getByText(loc.settings.wallet_password_explain)).toBeTruthy();

    fireEvent.press(getByTestId('PlausibleDeniabilityButton'));
    expect(mockNavigate).toHaveBeenCalledWith('PlausibleDeniability');

    fireEvent(getByTestId('SecurityAuthenticationMenu'), 'pressMenuItem', 'biometricsOrPasscode');
    await waitFor(() => expect(mockSetSensitiveActionsUseOption).toHaveBeenCalledWith('biometricsOrPasscode'));
    expect(mockSetSecurityUseOption).not.toHaveBeenCalled();
  });

  it('keeps a configured but unavailable authentication policy visible and locked', async () => {
    mockSecurityUseOption = 'biometricsOrPasscode';
    mockIsDeviceBiometricCapable.mockResolvedValue(false);
    mockIsDevicePasscodeCapable.mockResolvedValue(false);
    const { getByTestId, getByText } = renderScreen();

    await waitFor(() => expect(getByTestId('SecurityAuthenticationMenu')).toBeTruthy());
    expect(mockTooltipMenuProps.actions.every((action: { disabled?: boolean }) => action.disabled)).toBe(true);
    expect(getByText(loc.settings.biometrics_not_enrolled)).toBeTruthy();
  });

  it('keeps Password available when device-authentication capabilities cannot be read', async () => {
    mockIsDeviceBiometricCapable.mockRejectedValueOnce(new Error('Device authentication unavailable'));
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getByTestId, queryByTestId } = renderScreen();

    await waitFor(() => expect(getByTestId('SecurityAuthenticationUnavailable')).toBeTruthy());
    expect(getByTestId('EncyptedAndPasswordProtectedSwitch').props.disabled).toBe(false);
    expect(queryByTestId('SecurityAuthenticationMenu')).toBeNull();
    consoleWarn.mockRestore();
  });

  it('prevents Password changes when its Keychain state cannot be read', async () => {
    mockIsStorageEncrypted.mockRejectedValueOnce(new Error('Keychain unavailable'));
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getByTestId, getByText, queryByTestId } = renderScreen();

    await waitFor(() => expect(getByText(loc.settings.keychain_unavailable)).toBeTruthy());
    expect(getByTestId('EncyptedAndPasswordProtectedSwitch').props.disabled).toBe(true);
    expect(queryByTestId('SecurityAuthenticationMenu')).toBeNull();
    consoleWarn.mockRestore();
  });
});
