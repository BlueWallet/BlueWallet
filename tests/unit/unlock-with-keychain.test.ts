import {
  AuthType,
  resolveAuthType,
  resolveKeychainSecurityState,
  resolveUnlockButtonState,
  resolveUnlockStorageState,
} from '../../screen/UnlockWith';

describe('UnlockWith Keychain state resolution', () => {
  it('does not read protected wallet data while selecting the unlock mode', async () => {
    const isStorageEncrypted = jest.fn(async () => false);

    await expect(resolveUnlockStorageState(async () => 'biometricsOrPasscode', isStorageEncrypted)).resolves.toEqual({
      dataProtection: 'biometricsOrPasscode',
      storageEncrypted: false,
    });
    expect(isStorageEncrypted).not.toHaveBeenCalled();
  });

  it('inspects the payload only when wallet data has no system protection', async () => {
    const isStorageEncrypted = jest.fn(async () => true);

    await expect(resolveUnlockStorageState(async () => undefined, isStorageEncrypted)).resolves.toEqual({
      dataProtection: undefined,
      storageEncrypted: true,
    });
    expect(isStorageEncrypted).toHaveBeenCalledTimes(1);
  });

  it('uses the actual passcode-protected wallet entry even when the auxiliary preference says disabled', () => {
    expect(
      resolveKeychainSecurityState({
        dataProtection: 'devicePasscode',
        configuredOption: 'disabled',
        configuredStatus: 'disabled',
      }),
    ).toEqual({ option: 'devicePasscode', status: 'enabled' });
  });

  it('keeps the unlock button enabled and shows its label while idle', () => {
    expect(resolveUnlockButtonState(false)).toEqual({
      disabled: false,
      showActivityIndicator: false,
    });
  });

  it('disables the unlock button and replaces its label with a loading indicator while unlocking', () => {
    expect(resolveUnlockButtonState(true)).toEqual({
      disabled: true,
      showActivityIndicator: true,
    });
  });

  it('keeps password unlock disabled until a password is entered', () => {
    expect(resolveUnlockButtonState(false, false)).toEqual({
      disabled: true,
      showActivityIndicator: false,
    });
  });

  it.each([
    {
      scenario: 'unencrypted storage with biometrics disabled',
      storageEncrypted: false,
      biometricUseStatus: 'disabled' as const,
      authenticationAvailable: false,
      expected: AuthType.None,
    },
    {
      scenario: 'encrypted storage with biometrics disabled',
      storageEncrypted: true,
      biometricUseStatus: 'disabled' as const,
      authenticationAvailable: false,
      expected: AuthType.Encrypted,
    },
    {
      scenario: 'encrypted storage with biometrics enabled',
      storageEncrypted: true,
      biometricUseStatus: 'enabled' as const,
      authenticationAvailable: true,
      expected: AuthType.Encrypted,
    },
    {
      scenario: 'encrypted storage when biometric state cannot be read',
      storageEncrypted: true,
      biometricUseStatus: 'unavailable' as const,
      authenticationAvailable: false,
      expected: AuthType.Encrypted,
    },
    {
      scenario: 'unencrypted storage with biometrics available',
      storageEncrypted: false,
      biometricUseStatus: 'enabled' as const,
      authenticationAvailable: true,
      expected: AuthType.Biometrics,
    },
    {
      scenario: 'biometrics or passcode removed in device settings',
      storageEncrypted: false,
      biometricUseStatus: 'enabled' as const,
      authenticationAvailable: false,
      expected: AuthType.BiometricsUnavailable,
    },
    {
      scenario: 'biometric preference cannot be read',
      storageEncrypted: false,
      biometricUseStatus: 'unavailable' as const,
      authenticationAvailable: false,
      expected: AuthType.KeychainUnavailable,
    },
  ])('$scenario', ({ expected, ...options }) => {
    expect(resolveAuthType(options)).toBe(expected);
  });
});
