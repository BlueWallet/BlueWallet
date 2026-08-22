import { Platform } from 'react-native';
import { BlueApp } from '../../class/blue-app';
import { isWalletDataEnvelope } from '../../blue_modules/wallet-data-envelope';

const Keychain = require('react-native-keychain');

const activeWalletDataCredential = () => {
  const manifestCredential = Keychain.__mockKeychainHelpers.store.get(BlueApp.WALLET_DATA_MANIFEST_SERVICE);
  const manifest = manifestCredential ? JSON.parse(manifestCredential.password) : undefined;
  const service = manifest?.active === 'secondary' ? BlueApp.WALLET_DATA_SECONDARY_SERVICE : BlueApp.storageKeychainService('data');
  return Keychain.__mockKeychainHelpers.store.get(service);
};

describe('BlueApp encrypted-storage biometric separation', () => {
  let app: BlueApp;

  beforeEach(() => {
    Keychain.__mockKeychainHelpers.reset();
    Keychain.setGenericPassword.mockClear();
    Keychain.getGenericPassword.mockClear();
    Keychain.resetGenericPassword.mockClear();

    app = new BlueApp();
    app.wallets = [];
    app.tx_metadata = {};
    app.counterparty_metadata = {};
    app.cachedPassword = false;
  });

  it('removes biometric password copies created by older builds', async () => {
    await Keychain.setGenericPassword(BlueApp.BIOMETRIC_PASSWORD_SERVICE, 'legacy-encryption-password', {
      service: BlueApp.BIOMETRIC_PASSWORD_SERVICE,
    });

    await app.removeBiometricPassword();

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.BIOMETRIC_PASSWORD_SERVICE)).toBe(false);
  });

  it('stores wallet ciphertext and its envelope key in the iOS Keychain when authentication is Off', async () => {
    await app.setItem('data', 'wallet-secret');

    const protectedServices = [
      BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
      BlueApp.WALLET_DATA_SECONDARY_SERVICE,
      BlueApp.WALLET_DATA_MANIFEST_SERVICE,
    ];
    for (const service of protectedServices) {
      const call = Keychain.setGenericPassword.mock.calls.find((candidate: any[]) => candidate[2]?.service === service);
      expect(call?.[2]).toEqual(
        expect.objectContaining({
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
      expect(call?.[2]).not.toHaveProperty('accessControl');
    }
    expect(activeWalletDataCredential()?.password).not.toContain('wallet-secret');
  });

  it('uses the Android Keystore AES-GCM baseline when authentication is Off', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    try {
      await app.setItem('data', 'wallet-secret');

      const protectedServices = [
        BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        BlueApp.WALLET_DATA_SECONDARY_SERVICE,
        BlueApp.WALLET_DATA_MANIFEST_SERVICE,
      ];
      for (const service of protectedServices) {
        const call = Keychain.setGenericPassword.mock.calls.find((candidate: any[]) => candidate[2]?.service === service);
        expect(call?.[2]).toEqual(
          expect.objectContaining({
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
          }),
        );
        expect(call?.[2]).not.toHaveProperty('storage');
        expect(call?.[2]).not.toHaveProperty('accessControl');
        expect(call?.[2]).not.toHaveProperty('accessible');
      }
      expect(activeWalletDataCredential()?.password).not.toContain('wallet-secret');
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('does not retain a biometric password when storage is encrypted', async () => {
    await Keychain.setGenericPassword(BlueApp.BIOMETRIC_PASSWORD_SERVICE, 'legacy-encryption-password', {
      service: BlueApp.BIOMETRIC_PASSWORD_SERVICE,
    });
    const plaintext = '{"wallets":[],"tx_metadata":{},"counterparty_metadata":{}}';
    await app.setItem('data', plaintext);
    const saveToDisk = jest.spyOn(app, 'saveToDisk').mockResolvedValue();

    await app.encryptStorage('storage-password');

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.BIOMETRIC_PASSWORD_SERVICE)).toBe(false);
    const storedData = await app.getItem('data');
    expect(isWalletDataEnvelope(activeWalletDataCredential()?.password)).toBe(true);
    expect(app.decryptData(storedData, 'storage-password')).toBe(plaintext);
    expect(Keychain.setGenericPassword.mock.calls).toContainEqual([
      expect.stringContaining(BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX),
      'storage-password',
      expect.objectContaining({
        accessControl: Keychain.ACCESS_CONTROL.APPLICATION_PASSWORD,
        applicationPassword: 'storage-password',
      }),
    ]);

    saveToDisk.mockRestore();
  });

  it('does not encrypt storage when an obsolete biometric password cannot be removed', async () => {
    const error = new Error('Keychain unavailable');
    Keychain.resetGenericPassword.mockRejectedValueOnce(error);
    const saveToDisk = jest.spyOn(app, 'saveToDisk').mockResolvedValue();
    const setItem = jest.spyOn(app, 'setItem').mockResolvedValue();

    await expect(app.encryptStorage('storage-password')).rejects.toBe(error);

    expect(saveToDisk).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();

    saveToDisk.mockRestore();
    setItem.mockRestore();
  });

  it('rewraps wallet data with and without biometric Keychain access control', async () => {
    await app.setItem('data', 'wallet-data');
    const encryptedPayload = activeWalletDataCredential()?.password;
    Keychain.setGenericPassword.mockClear();

    await app.setKeychainDataBiometricProtection(true);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'wallet-data-key',
      expect.any(String),
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      }),
    );
    expect(activeWalletDataCredential()?.password).toBe(encryptedPayload);

    await app.setKeychainDataBiometricProtection(false);

    const disabledKeyWrite = Keychain.setGenericPassword.mock.calls.findLast(
      (call: any[]) => call[2]?.service === BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
    );
    expect(disabledKeyWrite?.[2]).not.toHaveProperty('accessControl');
    expect(activeWalletDataCredential()?.password).toBe(encryptedPayload);
    await expect(app.getItem('data')).resolves.toBe('wallet-data');
  });

  it('creates protected empty wallet data so Face ID unlock can advance navigation', async () => {
    await app.setKeychainDataProtection('biometricsOrPasscode');

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE)).toBe(true);
    const launchingApp = new BlueApp();
    await expect(launchingApp.unlockKeychainDataWithBiometrics(true)).resolves.toBe(true);
    await expect(launchingApp.loadFromDisk()).resolves.toBe(true);
    expect(launchingApp.wallets).toEqual([]);
  });

  it('does not replace missing persisted data when wallets remain in memory', async () => {
    app.wallets = [{} as any];

    await expect(app.setKeychainDataProtection('biometricsOrPasscode')).rejects.toThrow(
      'Wallet data is missing while wallets remain loaded',
    );
    expect(activeWalletDataCredential()).toBeUndefined();
  });

  it('restores wallet data and its previous policy when enabling protection fails', async () => {
    await app.setItem('data', 'wallet-data');
    const originalSet = Keychain.setGenericPassword.getMockImplementation();
    let failedProtectedWrite = false;
    Keychain.setGenericPassword.mockImplementation(
      async (username: string, password: string, options: { service?: string; accessControl?: string }) => {
        if (
          options?.service === BlueApp.DATA_ENCRYPTION_KEY_SERVICE &&
          options.accessControl === Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE &&
          !failedProtectedWrite
        ) {
          failedProtectedWrite = true;
          throw new Error('protected write failed');
        }
        return await originalSet(username, password, options);
      },
    );

    await expect(app.setKeychainDataProtection('biometricsOrPasscode')).rejects.toThrow('protected write failed');

    await expect(app.getItem('data')).resolves.toBe('wallet-data');
    await expect(app.getKeychainDataProtection()).resolves.toBeUndefined();
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_KEY_BACKUP_SERVICE)).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_KEY_TRANSACTION_SERVICE)).toBe(false);
  });

  it('recovers an interrupted data-key policy change without rewriting wallet ciphertext', async () => {
    await app.setItem('data', 'wallet-data');
    const encryptedPayload = activeWalletDataCredential()?.password;
    const dataKey = Keychain.__mockKeychainHelpers.store.get(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)?.password;
    if (!dataKey) throw new Error('Expected wallet data-encryption key');
    await Keychain.setGenericPassword('wallet-data-key', dataKey, { service: BlueApp.DATA_KEY_BACKUP_SERVICE });
    await Keychain.setGenericPassword(
      'data-key-rewrap',
      JSON.stringify({ previousOption: 'disabled', targetOption: 'biometricsOrPasscode' }),
      { service: BlueApp.DATA_KEY_TRANSACTION_SERVICE },
    );
    await Keychain.resetGenericPassword({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE });

    const launchingApp = new BlueApp();
    await expect(launchingApp.getKeychainDataProtection()).resolves.toBe('biometricsOrPasscode');
    await expect(launchingApp.unlockKeychainDataWithBiometrics(true)).resolves.toBe(true);
    await expect(launchingApp.getItem('data')).resolves.toBe('wallet-data');
    expect(activeWalletDataCredential()?.password).toBe(encryptedPayload);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_KEY_BACKUP_SERVICE)).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_KEY_TRANSACTION_SERVICE)).toBe(false);
  });

  it('keeps password-encrypted wallet data independent from biometric Keychain protection', async () => {
    await app.setItem('data', JSON.stringify(['password-encrypted-wallet-data']));
    Keychain.setGenericPassword.mockClear();

    await app.setKeychainDataBiometricProtection(true);

    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    await expect(app.getItem('data')).resolves.toBe(JSON.stringify(['password-encrypted-wallet-data']));
  });

  it('preserves biometric protection on later unencrypted wallet-data saves', async () => {
    await app.setItem('data', 'wallet-data');
    await app.setKeychainDataBiometricProtection(true);

    await app.setItem('data', 'updated-wallet-data');

    const storedPayload = activeWalletDataCredential()?.password;
    expect(isWalletDataEnvelope(storedPayload)).toBe(true);
    expect(storedPayload).not.toContain('updated-wallet-data');
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE)).toBe(true);
  });

  it('keeps the previous committed generation when a wallet-data manifest update is interrupted', async () => {
    await app.setItem('data', 'previous-wallet-data');
    const originalSet = Keychain.setGenericPassword.getMockImplementation();
    Keychain.setGenericPassword
      .mockImplementationOnce(originalSet)
      .mockImplementationOnce(async (username: string, password: string, options: { service?: string }) => {
        if (options?.service === BlueApp.WALLET_DATA_MANIFEST_SERVICE) return false;
        return await originalSet(username, password, options);
      });

    await expect(app.setItem('data', 'uncommitted-wallet-data')).rejects.toThrow('Failed to commit wallet-data generation');

    const launchingApp = new BlueApp();
    await expect(launchingApp.getItem('data')).resolves.toBe('previous-wallet-data');
  });

  it('falls back to the previous authenticated generation when the active ciphertext is corrupt', async () => {
    await app.setItem('data', 'previous-wallet-data');
    await app.setItem('data', 'latest-wallet-data');
    const active = activeWalletDataCredential();
    if (!active) throw new Error('Expected active wallet-data generation');
    active.password = `${active.password.slice(0, -2)}AA`;

    const launchingApp = new BlueApp();
    await expect(launchingApp.getItem('data')).resolves.toBe('previous-wallet-data');
  });

  it('recovers an authenticated generation when the commit manifest is corrupt', async () => {
    await app.setItem('data', 'recoverable-wallet-data');
    await Keychain.setGenericPassword('wallet-data-manifest', 'not-json', {
      service: BlueApp.WALLET_DATA_MANIFEST_SERVICE,
    });
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const launchingApp = new BlueApp();
    await expect(launchingApp.getItem('data')).resolves.toBe('recoverable-wallet-data');

    consoleWarn.mockRestore();
  });

  it('removes an orphaned data-key recovery copy before unlocking', async () => {
    await app.setItem('data', 'wallet-data');
    const dataKey = Keychain.__mockKeychainHelpers.store.get(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)?.password;
    if (!dataKey) throw new Error('Expected wallet data-encryption key');
    await Keychain.setGenericPassword('wallet-data-key', dataKey, { service: BlueApp.DATA_KEY_BACKUP_SERVICE });

    const launchingApp = new BlueApp();
    await expect(launchingApp.unlockKeychainDataWithBiometrics()).resolves.toBe(true);

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_KEY_BACKUP_SERVICE)).toBe(false);
  });

  it('restores wallet-data protection from the authentication marker after password storage is decrypted', async () => {
    await app.setItem('data', 'decrypted-wallet-data');
    await Keychain.setGenericPassword(BlueApp.BIOMETRIC_AUTH_SERVICE, 'authentication-required', {
      service: BlueApp.BIOMETRIC_AUTH_SERVICE,
    });
    Keychain.setGenericPassword.mockClear();

    await app.setItem('data', 'updated-decrypted-wallet-data');

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'wallet-data-key',
      expect.any(String),
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      }),
    );
  });

  it('refuses to save wallet data when authentication markers conflict', async () => {
    await Keychain.setGenericPassword(BlueApp.BIOMETRIC_AUTH_SERVICE, 'authentication-required', {
      service: BlueApp.BIOMETRIC_AUTH_SERVICE,
    });
    await Keychain.setGenericPassword(BlueApp.DEVICE_PASSCODE_AUTH_SERVICE, 'authentication-required', {
      service: BlueApp.DEVICE_PASSCODE_AUTH_SERVICE,
    });

    await expect(app.setItem('data', 'wallet-data')).rejects.toThrow('Conflicting authentication security policies');
  });

  it('uses wallet-data protection as the source of truth after an interrupted policy switch', async () => {
    await Keychain.setGenericPassword('data', 'system-protected', {
      service: BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE,
    });
    await Keychain.setGenericPassword(BlueApp.BIOMETRIC_AUTH_SERVICE, 'stale-policy-marker', {
      service: BlueApp.BIOMETRIC_AUTH_SERVICE,
    });

    await expect(app.getConfiguredKeychainSecurityOption()).resolves.toBe('devicePasscode');
  });

  it('rewraps and preserves wallet data with device-passcode-only access control', async () => {
    await app.setItem('data', 'wallet-data');
    const encryptedPayload = activeWalletDataCredential()?.password;

    await app.setKeychainDataProtection('devicePasscode');

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'wallet-data-key',
      expect.any(String),
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
      }),
    );
    expect(activeWalletDataCredential()?.password).toBe(encryptedPayload);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE)).toBe(true);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE)).toBe(false);

    await app.setItem('data', 'updated-wallet-data');

    const updatedPayload = activeWalletDataCredential()?.password;
    expect(isWalletDataEnvelope(updatedPayload)).toBe(true);
    expect(updatedPayload).not.toContain('updated-wallet-data');
  });

  it('unlocks the real wallet-data Keychain entry once for app startup', async () => {
    await app.setItem('data', 'wallet-data');
    await app.setKeychainDataBiometricProtection(true);
    const launchingApp = new BlueApp();
    Keychain.getGenericPassword.mockClear();

    await expect(launchingApp.unlockKeychainDataWithBiometrics()).resolves.toBe(true);
    expect(Keychain.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        authenticationPrompt: expect.any(Object),
      }),
    );

    Keychain.getGenericPassword.mockClear();
    await expect(launchingApp.getItem('data')).resolves.toBe('wallet-data');
    expect(Keychain.getGenericPassword).not.toHaveBeenCalledWith(
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
      }),
    );
  });

  it('migrates a legacy protected payload to an encrypted envelope after authenticating it', async () => {
    await Keychain.setGenericPassword('data', JSON.stringify({ version: 1, value: 'legacy-protected-wallet-data' }), {
      service: BlueApp.storageKeychainService('data'),
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    });
    await Keychain.setGenericPassword('data', 'system-protected', {
      service: BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE,
    });
    const launchingApp = new BlueApp();

    await expect(launchingApp.unlockKeychainDataWithBiometrics(true)).resolves.toBe(true);

    expect(isWalletDataEnvelope(activeWalletDataCredential()?.password)).toBe(true);
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)?.password).toEqual(expect.any(String));
    await expect(launchingApp.getItem('data')).resolves.toBe('legacy-protected-wallet-data');
  });

  it('requires native authentication again after a new app-lock session starts', async () => {
    await app.setItem('data', 'wallet-data');
    await app.setKeychainDataProtection('devicePasscode');
    Keychain.getGenericPassword.mockClear();

    // Rewrapping in Settings leaves data unlocked only for that session.
    await expect(app.unlockKeychainDataWithBiometrics()).resolves.toBe(true);
    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();

    app.lockKeychainData();
    await expect(app.unlockKeychainDataWithBiometrics()).resolves.toBe(true);

    expect(Keychain.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        authenticationPrompt: expect.any(Object),
      }),
    );
  });

  it('overwrites the cached wallet data-encryption key when the session locks', async () => {
    await app.setItem('data', 'wallet-data');
    const appInternals = app as unknown as { dataEncryptionKey?: Uint8Array };
    const cachedKey = appInternals.dataEncryptionKey;
    expect(cachedKey).toBeDefined();
    if (!cachedKey) throw new Error('Expected a cached wallet data-encryption key');
    expect(cachedKey.some(byte => byte !== 0)).toBe(true);

    app.lockKeychainData();

    expect(cachedKey.every(byte => byte === 0)).toBe(true);
    expect(appInternals.dataEncryptionKey).toBeUndefined();
  });

  it('forces a native data-key read for app unlock even when Settings left an unlocked cache', async () => {
    await app.setItem('data', 'wallet-data');
    await app.setKeychainDataProtection('devicePasscode');
    Keychain.getGenericPassword.mockClear();

    await expect(app.unlockKeychainDataWithBiometrics(true)).resolves.toBe(true);

    expect(Keychain.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        authenticationPrompt: expect.any(Object),
        requireFreshAuthentication: true,
      }),
    );
  });
});
