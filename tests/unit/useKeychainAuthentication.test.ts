import { Platform } from 'react-native';
import Keychain, { ACCESS_CONTROL, AUTHENTICATION_TYPE, BIOMETRY_TYPE, SECURITY_LEVEL } from 'react-native-keychain';

import { BlueApp } from '../../class/blue-app';
import {
  authenticateSensitiveAction,
  confirmSecurityOptionChange,
  requestSecurityAuthentication,
  setAppUnlockSecurityOption,
  unlockAppWithAuthentication,
} from '../../hooks/useKeychainAuthentication';

const mockedKeychain = Keychain as jest.Mocked<typeof Keychain> & {
  __mockKeychainHelpers: { reset: () => void; store: Map<string, { username: string; password: string }> };
};

describe('useKeychainAuthentication native authentication', () => {
  beforeEach(() => {
    mockedKeychain.__mockKeychainHelpers.reset();
    mockedKeychain.getSupportedBiometryType.mockReset().mockResolvedValue(BIOMETRY_TYPE.FACE_ID);
    mockedKeychain.isPasscodeAuthAvailable.mockReset().mockResolvedValue(true);
    mockedKeychain.requestAuthentication.mockReset().mockResolvedValue(true);
    mockedKeychain.setGenericPassword.mockClear();
    mockedKeychain.getGenericPassword.mockClear();
    mockedKeychain.resetGenericPassword.mockClear();
    const app = BlueApp.getInstance();
    app.clearInMemoryWalletData();
    app.wallets = [];
    app.tx_metadata = {};
    app.counterparty_metadata = {};
    app.cachedPassword = false;
  });

  it('uses the native biometrics-or-passcode policy for app confirmation', async () => {
    await expect(requestSecurityAuthentication('biometricsOrPasscode')).resolves.toBe(true);

    expect(mockedKeychain.requestAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS }),
    );
  });

  it('uses Android Keystore access control instead of the iOS policy', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    try {
      await expect(requestSecurityAuthentication('biometricsOrPasscode')).resolves.toBe(true);

      const androidOptions = expect.objectContaining({
        accessControl: ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        securityLevel: SECURITY_LEVEL.SECURE_SOFTWARE,
      });
      expect(mockedKeychain.setGenericPassword).toHaveBeenCalledWith(expect.any(String), expect.any(String), androidOptions);
      const options = mockedKeychain.setGenericPassword.mock.calls[0][2];
      expect(options).not.toHaveProperty('accessible');
      expect(options).not.toHaveProperty('storage');
      expect(mockedKeychain.requestAuthentication).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('allows the configured passcode fallback when biometric enrollment disappears', async () => {
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);

    await expect(confirmSecurityOptionChange('biometricsOrPasscode', 'disabled')).resolves.toBe(true);

    expect(mockedKeychain.requestAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS }),
    );
  });

  it('uses a passcode-only Keychain challenge when changing app unlock from biometrics to device passcode', async () => {
    await expect(confirmSecurityOptionChange('biometricsOrPasscode', 'devicePasscode')).resolves.toBe(true);

    expect(mockedKeychain.requestAuthentication).not.toHaveBeenCalled();
    expect(mockedKeychain.setGenericPassword).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ accessControl: ACCESS_CONTROL.DEVICE_PASSCODE }),
    );
    expect(mockedKeychain.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        accessControl: ACCESS_CONTROL.DEVICE_PASSCODE,
        requireFreshAuthentication: true,
      }),
    );
  });

  it('does not allow a new biometric policy without enrolled biometrics', async () => {
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);

    await expect(confirmSecurityOptionChange('disabled', 'biometricsOrPasscode')).resolves.toBe(false);

    expect(mockedKeychain.requestAuthentication).not.toHaveBeenCalled();
  });

  it('keeps biometric-only sensitive-action changes locked after enrollment is removed', async () => {
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);

    await expect(confirmSecurityOptionChange('biometricsOrPasscode', 'disabled', true)).resolves.toBe(false);

    expect(mockedKeychain.requestAuthentication).not.toHaveBeenCalled();
  });

  it('rejects app policy changes when neither biometrics nor passcode is available', async () => {
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);
    mockedKeychain.isPasscodeAuthAvailable.mockResolvedValue(false);

    await expect(confirmSecurityOptionChange('biometricsOrPasscode', 'disabled')).resolves.toBe(false);

    expect(mockedKeychain.requestAuthentication).not.toHaveBeenCalled();
  });

  it('requires a fresh native result instead of trusting the app-unlock marker', async () => {
    await mockedKeychain.setGenericPassword('authentication', 'required', { service: BlueApp.BIOMETRIC_AUTH_SERVICE });
    mockedKeychain.requestAuthentication.mockResolvedValueOnce(false);

    await expect(unlockAppWithAuthentication()).resolves.toBe(false);

    expect(mockedKeychain.requestAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS }),
    );
  });

  it('authorizes a sensitive action without a native prompt when its policy is Off', async () => {
    await expect(authenticateSensitiveAction()).resolves.toBe(true);

    expect(mockedKeychain.requestAuthentication).not.toHaveBeenCalled();
    expect(mockedKeychain.getGenericPassword).not.toHaveBeenCalledWith(expect.objectContaining({ requireFreshAuthentication: true }));
  });

  it('authenticates sensitive biometrics by reading the current-enrollment Keychain marker', async () => {
    await mockedKeychain.setGenericPassword('sensitive-actions', 'biometricsOrPasscode', {
      service: BlueApp.SENSITIVE_ACTIONS_POLICY_SERVICE,
    });
    await mockedKeychain.setGenericPassword('authentication', 'required', {
      service: BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE,
      accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    });
    mockedKeychain.getGenericPassword.mockClear();
    mockedKeychain.requestAuthentication.mockClear();

    await expect(authenticateSensitiveAction()).resolves.toBe(true);

    expect(mockedKeychain.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        service: BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE,
        accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        authenticationType: AUTHENTICATION_TYPE.BIOMETRICS,
        requireFreshAuthentication: true,
      }),
    );
    expect(mockedKeychain.requestAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ authenticationType: AUTHENTICATION_TYPE.BIOMETRICS }),
    );
  });

  it('denies sensitive biometric access when the current-enrollment marker is invalidated', async () => {
    await mockedKeychain.setGenericPassword('sensitive-actions', 'biometricsOrPasscode', {
      service: BlueApp.SENSITIVE_ACTIONS_POLICY_SERVICE,
    });
    await mockedKeychain.setGenericPassword('authentication', 'required', {
      service: BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE,
      accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    });
    const originalGet = mockedKeychain.getGenericPassword.getMockImplementation();
    mockedKeychain.getGenericPassword.mockImplementation(async options => {
      if (options?.service === BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE && options.requireFreshAuthentication) {
        throw new Error('Keychain item was invalidated by biometric enrollment change');
      }
      return await originalGet!(options);
    });

    await expect(authenticateSensitiveAction()).resolves.toBe(false);
  });

  it('authenticates and protects the real wallet data when app unlock is enabled', async () => {
    const app = BlueApp.getInstance();
    await app.setItem('data', 'wallet-data');
    mockedKeychain.setGenericPassword.mockClear();

    await expect(setAppUnlockSecurityOption('biometricsOrPasscode')).resolves.toBe(true);

    expect(mockedKeychain.requestAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ authenticationType: AUTHENTICATION_TYPE.BIOMETRICS }),
    );
    expect(mockedKeychain.setGenericPassword).toHaveBeenCalledWith(
      'wallet-data-key',
      expect.any(String),
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      }),
    );
    await expect(app.getConfiguredKeychainSecurityOption()).resolves.toBe('biometricsOrPasscode');
  });

  it('leaves the real wallet data policy unchanged when confirmation is cancelled', async () => {
    const app = BlueApp.getInstance();
    await app.setItem('data', 'wallet-data');
    mockedKeychain.requestAuthentication.mockResolvedValueOnce(false);

    await expect(setAppUnlockSecurityOption('biometricsOrPasscode')).resolves.toBe(false);

    await expect(app.getConfiguredKeychainSecurityOption()).resolves.toBeUndefined();
    expect(mockedKeychain.__mockKeychainHelpers.store.has(BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE)).toBe(false);
  });
});
