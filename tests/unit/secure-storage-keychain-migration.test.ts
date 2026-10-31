import AsyncStorage from '@react-native-async-storage/async-storage';

import { BlueApp } from '../../class/blue-app';

const mockLegacyValues = new Map<string, string>();
const mockGetLegacySecureValue = jest.fn(async (key: string) => mockLegacyValues.get(key) ?? null);
const mockRemoveLegacySecureValue = jest.fn(async (key: string) => mockLegacyValues.delete(key));

jest.mock('../../blue_modules/legacy-secure-storage', () => ({
  getLegacySecureValue: (key: string) => mockGetLegacySecureValue(key),
  removeLegacySecureValue: (key: string) => mockRemoveLegacySecureValue(key),
}));

const Keychain = require('react-native-keychain');
const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

type MigrationAccess = {
  migrateSecureStorageKey(key: string): Promise<string | null>;
  migrateSecureStorageKeys(): Promise<void>;
  migratePreferenceKey(key: string): Promise<string | null>;
  migratePreferenceKeys(): Promise<void>;
  applyKeychainRetentionPolicy(): Promise<void>;
  setKeychainRetentionEnabled(enabled: boolean): Promise<void>;
};

const asMigrationAccess = (app = new BlueApp()): MigrationAccess => app as unknown as MigrationAccess;

const seedKeychainValue = async (key: string, value: string): Promise<void> => {
  await Keychain.setGenericPassword(BlueApp.storageKeychainUsername(key, value), value, {
    service: BlueApp.storageKeychainService(key),
  });
};

const resetKeychainMocks = (): void => {
  Keychain.__mockKeychainHelpers.reset();
  Keychain.setGenericPassword.mockReset().mockImplementation(async (username: string, password: string, options: { service?: string }) => {
    const service = options?.service ?? '__default__';
    Keychain.__mockKeychainHelpers.store.set(service, { username, password, service });
    return true;
  });
  Keychain.getGenericPassword.mockReset().mockImplementation(async (options: { service?: string }) => {
    const service = options?.service ?? '__default__';
    return Keychain.__mockKeychainHelpers.store.get(service) ?? false;
  });
  Keychain.resetGenericPassword.mockReset().mockImplementation(async (options: { service?: string }) => {
    const service = options?.service ?? '__default__';
    return Keychain.__mockKeychainHelpers.store.delete(service);
  });
  Keychain.getAllGenericPasswordServices.mockReset().mockImplementation(async () => [...Keychain.__mockKeychainHelpers.store.keys()]);
};

describe('secure storage Keychain migration', () => {
  beforeEach(async () => {
    mockLegacyValues.clear();
    mockGetLegacySecureValue.mockClear();
    mockRemoveLegacySecureValue.mockClear();
    await AsyncStorage.clear();
    AsyncStorageMock.getItem.mockClear();
    AsyncStorageMock.setItem.mockClear();
    AsyncStorageMock.removeItem.mockClear();
    resetKeychainMocks();
  });

  it.each([
    ['data', JSON.stringify({ wallets: [{ label: 'Main ₿ wallet', secret: 'sensitive-data' }] })],
    [BlueApp.FLAG_ENCRYPTED, '1'],
    ['Biometrics', ''],
  ])('moves the exact legacy %s value into its dedicated Keychain service', async (key, legacyValue) => {
    mockLegacyValues.set(key, legacyValue);
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey(key)).resolves.toBe(legacyValue);

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService(key))).toEqual({
      username: BlueApp.storageKeychainUsername(key, legacyValue),
      password: legacyValue,
      service: BlueApp.storageKeychainService(key),
    });
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(BlueApp.storageKeychainUsername(key, legacyValue), legacyValue, {
      service: BlueApp.storageKeychainService(key),
      accessible: 'AccessibleWhenUnlockedThisDeviceOnly',
    });
    expect(mockLegacyValues.has(key)).toBe(false);
  });

  it('keeps legacy data when the Keychain write fails', async () => {
    mockLegacyValues.set('data', 'recoverable-wallet-data');
    Keychain.setGenericPassword.mockRejectedValueOnce(new Error('Keychain unavailable'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain unavailable');

    expect(mockLegacyValues.get('data')).toBe('recoverable-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('does not touch legacy data when the initial Keychain read fails', async () => {
    mockLegacyValues.set('data', 'recoverable-wallet-data');
    Keychain.getGenericPassword.mockRejectedValueOnce(new Error('Keychain read unavailable'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain read unavailable');

    expect(mockGetLegacySecureValue).not.toHaveBeenCalled();
    expect(mockLegacyValues.get('data')).toBe('recoverable-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('does not write or delete anything when the native legacy read fails', async () => {
    mockGetLegacySecureValue.mockRejectedValueOnce(new Error('Legacy reader unavailable'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Legacy reader unavailable');

    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('keeps legacy data when the Keychain verification read fails after writing', async () => {
    mockLegacyValues.set('data', 'recoverable-wallet-data');
    Keychain.getGenericPassword.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('Keychain read unavailable'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain read unavailable');

    expect(mockLegacyValues.get('data')).toBe('recoverable-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('recoverable-wallet-data');
    expect(mockLegacyValues.has('data')).toBe(false);
  });

  it('keeps legacy data when the Keychain read-back value fails integrity verification', async () => {
    mockLegacyValues.set('data', 'recoverable-wallet-data');
    Keychain.getGenericPassword.mockResolvedValueOnce(false).mockResolvedValueOnce({
      username: BlueApp.storageKeychainUsername('data', 'recoverable-wallet-data'),
      password: 'corrupted-wallet-data',
    });
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain integrity verification failed');

    expect(mockLegacyValues.get('data')).toBe('recoverable-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('recoverable-wallet-data');
    expect(mockLegacyValues.has('data')).toBe(false);
  });

  it('never accepts a corrupt Keychain value on a later migration attempt', async () => {
    Keychain.__mockKeychainHelpers.store.set(BlueApp.storageKeychainService('data'), {
      username: BlueApp.storageKeychainUsername('data', 'original-wallet-data'),
      password: 'corrupted-wallet-data',
      service: BlueApp.storageKeychainService('data'),
    });
    mockLegacyValues.set('data', 'original-wallet-data');
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain integrity verification failed');

    expect(mockLegacyValues.get('data')).toBe('original-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('rejects corrupt Keychain data when no legacy recovery copy exists', async () => {
    Keychain.__mockKeychainHelpers.store.set(BlueApp.storageKeychainService('data'), {
      username: BlueApp.storageKeychainUsername('data', 'original-wallet-data'),
      password: 'corrupted-wallet-data',
      service: BlueApp.storageKeychainService('data'),
    });
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain integrity verification failed');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('keeps an existing verified Keychain value authoritative and removes a stale legacy duplicate', async () => {
    await seedKeychainValue('data', 'current-wallet-data');
    Keychain.setGenericPassword.mockClear();
    mockLegacyValues.set('data', 'stale-wallet-data');
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('current-wallet-data');

    expect(mockLegacyValues.has('data')).toBe(false);
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  it('keeps both verified Keychain and legacy copies when cleanup fails, then safely retries cleanup', async () => {
    mockLegacyValues.set('data', 'wallet-data');
    mockRemoveLegacySecureValue.mockRejectedValueOnce(new Error('Legacy cleanup unavailable'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('wallet-data');
    expect(mockLegacyValues.get('data')).toBe('wallet-data');

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('wallet-data');
    expect(mockLegacyValues.has('data')).toBe(false);
  });

  it('retries a failed Keychain migration without losing the legacy value', async () => {
    mockLegacyValues.set('data', 'wallet-data');
    Keychain.setGenericPassword.mockRejectedValueOnce(new Error('Temporary Keychain failure'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Temporary Keychain failure');
    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('wallet-data');

    expect(mockLegacyValues.has('data')).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('data'))?.password).toBe('wallet-data');
  });

  it('isolates secure keys and continues migrating later keys after one key fails', async () => {
    mockLegacyValues.set('data', 'wallet-data');
    mockLegacyValues.set(BlueApp.FLAG_ENCRYPTED, '1');
    mockLegacyValues.set('Biometrics', 'enabled');
    Keychain.setGenericPassword.mockRejectedValueOnce(new Error('Data migration failed'));
    const app = asMigrationAccess();

    await expect(app.migrateSecureStorageKeys()).resolves.toBeUndefined();

    expect(mockLegacyValues.get('data')).toBe('wallet-data');
    expect(mockLegacyValues.has(BlueApp.FLAG_ENCRYPTED)).toBe(false);
    expect(mockLegacyValues.has('Biometrics')).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService(BlueApp.FLAG_ENCRYPTED))?.password).toBe('1');
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('Biometrics'))?.password).toBe('enabled');
  });

  it('uses isolated Keychain services and integrity tags for every secure-storage key', () => {
    expect(BlueApp.storageKeychainService('data')).not.toBe(BlueApp.storageKeychainService(BlueApp.FLAG_ENCRYPTED));
    expect(BlueApp.storageKeychainUsername('data', 'value-a')).not.toBe(BlueApp.storageKeychainUsername('data', 'value-b'));
  });
});

describe('preference migration', () => {
  beforeEach(async () => {
    mockLegacyValues.clear();
    mockGetLegacySecureValue.mockClear();
    mockRemoveLegacySecureValue.mockClear();
    await AsyncStorage.clear();
    AsyncStorageMock.getItem.mockClear();
    AsyncStorageMock.setItem.mockClear();
  });

  it.each([BlueApp.HANDOFF_STORAGE_KEY, BlueApp.DO_NOT_TRACK])('verifies %s before removing its legacy copy', async key => {
    mockLegacyValues.set(key, '1');
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKey(key)).resolves.toBe('1');

    await expect(AsyncStorage.getItem(key)).resolves.toBe('1');
    expect(mockLegacyValues.has(key)).toBe(false);
    expect(AsyncStorageMock.getItem).toHaveBeenCalledTimes(3);
  });

  it('keeps the legacy preference when the AsyncStorage write fails', async () => {
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, '1');
    AsyncStorageMock.setItem.mockRejectedValueOnce(new Error('AsyncStorage unavailable'));
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKey(BlueApp.HANDOFF_STORAGE_KEY)).rejects.toThrow('AsyncStorage unavailable');

    expect(mockLegacyValues.get(BlueApp.HANDOFF_STORAGE_KEY)).toBe('1');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('keeps the legacy preference when AsyncStorage read-back verification mismatches', async () => {
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, '1');
    AsyncStorageMock.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce('unexpected-value');
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKey(BlueApp.HANDOFF_STORAGE_KEY)).rejects.toThrow('Unable to verify migrated preference');

    expect(mockLegacyValues.get(BlueApp.HANDOFF_STORAGE_KEY)).toBe('1');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();

    await expect(app.migratePreferenceKey(BlueApp.HANDOFF_STORAGE_KEY)).resolves.toBe('1');
    expect(mockLegacyValues.has(BlueApp.HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it('removes an identical legacy preference when AsyncStorage is already authoritative', async () => {
    await AsyncStorage.setItem(BlueApp.HANDOFF_STORAGE_KEY, '1');
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, '1');
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKey(BlueApp.HANDOFF_STORAGE_KEY)).resolves.toBe('1');

    expect(mockLegacyValues.has(BlueApp.HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it('preserves both copies when existing and legacy preference values conflict', async () => {
    await AsyncStorage.setItem(BlueApp.HANDOFF_STORAGE_KEY, 'current-value');
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, 'legacy-value');
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKey(BlueApp.HANDOFF_STORAGE_KEY)).resolves.toBe('current-value');

    await expect(AsyncStorage.getItem(BlueApp.HANDOFF_STORAGE_KEY)).resolves.toBe('current-value');
    expect(mockLegacyValues.get(BlueApp.HANDOFF_STORAGE_KEY)).toBe('legacy-value');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('keeps the verified AsyncStorage copy when legacy cleanup fails', async () => {
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, '1');
    mockRemoveLegacySecureValue.mockRejectedValueOnce(new Error('Legacy cleanup unavailable'));
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKey(BlueApp.HANDOFF_STORAGE_KEY)).resolves.toBe('1');

    await expect(AsyncStorage.getItem(BlueApp.HANDOFF_STORAGE_KEY)).resolves.toBe('1');
    expect(mockLegacyValues.get(BlueApp.HANDOFF_STORAGE_KEY)).toBe('1');
  });

  it('continues migrating later preferences after one preference write fails', async () => {
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, '1');
    mockLegacyValues.set(BlueApp.DO_NOT_TRACK, '1');
    AsyncStorageMock.setItem.mockRejectedValueOnce(new Error('Handoff write failed'));
    const app = asMigrationAccess();

    await expect(app.migratePreferenceKeys()).resolves.toBeUndefined();

    expect(mockLegacyValues.get(BlueApp.HANDOFF_STORAGE_KEY)).toBe('1');
    expect(mockLegacyValues.has(BlueApp.DO_NOT_TRACK)).toBe(false);
    await expect(AsyncStorage.getItem(BlueApp.DO_NOT_TRACK)).resolves.toBe('1');
  });
});

describe('iOS Keychain retention policy', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetKeychainMocks();
  });

  it('enables iOS Keychain retention by default', async () => {
    const app = new BlueApp();

    await expect(app.isKeychainRetentionEnabled()).resolves.toBe(true);
  });

  it('stores and integrity-protects the retention preference outside wallet services', async () => {
    const app = new BlueApp();

    await app.setKeychainRetentionEnabled(false);

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.keychainRetentionService())).toEqual({
      username: BlueApp.storageKeychainUsername(BlueApp.KEYCHAIN_RETENTION_KEY, 'false'),
      password: 'false',
      service: BlueApp.keychainRetentionService(),
    });
    expect(BlueApp.keychainRetentionService()).not.toBe(BlueApp.storageKeychainService('data'));
  });

  it('rejects a corrupt retention preference instead of silently choosing a destructive policy', async () => {
    Keychain.__mockKeychainHelpers.store.set(BlueApp.keychainRetentionService(), {
      username: BlueApp.storageKeychainUsername(BlueApp.KEYCHAIN_RETENTION_KEY, 'false'),
      password: 'true',
      service: BlueApp.keychainRetentionService(),
    });
    const app = new BlueApp();

    await expect(app.isKeychainRetentionEnabled()).rejects.toThrow('Keychain integrity verification failed');
  });

  it('keeps retained Keychain services on a fresh install by default', async () => {
    const app = asMigrationAccess();
    await seedKeychainValue('data', 'wallet-data');

    await app.applyKeychainRetentionPolicy();

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('data'))?.password).toBe('wallet-data');
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBe('1');
  });

  it('clears every retained Keychain service except the opt-out control on a fresh install', async () => {
    const app = asMigrationAccess();
    await app.setKeychainRetentionEnabled(false);
    await seedKeychainValue('data', 'wallet-data');
    await Keychain.setGenericPassword('realm', 'realm-key', { service: 'realm_encryption_key' });

    await app.applyKeychainRetentionPolicy();

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.storageKeychainService('data'))).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has('realm_encryption_key')).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.keychainRetentionService())?.password).toBe('false');
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBe('1');
  });

  it('does not mark installation complete when clearing a retained service fails', async () => {
    const app = asMigrationAccess();
    await app.setKeychainRetentionEnabled(false);
    await seedKeychainValue('data', 'wallet-data');
    Keychain.resetGenericPassword.mockRejectedValueOnce(new Error('Keychain deletion failed'));

    await expect(app.applyKeychainRetentionPolicy()).rejects.toThrow('Keychain deletion failed');

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.storageKeychainService('data'))).toBe(true);
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBeNull();
  });

  it('retries safely after a partial retained-service cleanup', async () => {
    const app = asMigrationAccess();
    await app.setKeychainRetentionEnabled(false);
    await seedKeychainValue('data', 'wallet-data');
    await Keychain.setGenericPassword('realm', 'realm-key', { service: 'realm_encryption_key' });
    // Consume the one-time failure on the second deletion, after data is removed.
    Keychain.resetGenericPassword.mockImplementationOnce(async (options: { service?: string }) => {
      const service = options?.service ?? '__default__';
      return Keychain.__mockKeychainHelpers.store.delete(service);
    });
    Keychain.resetGenericPassword.mockRejectedValueOnce(new Error('Second deletion failed'));

    await expect(app.applyKeychainRetentionPolicy()).rejects.toThrow('Second deletion failed');
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.storageKeychainService('data'))).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has('realm_encryption_key')).toBe(true);
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBeNull();

    await expect(app.applyKeychainRetentionPolicy()).resolves.toBeUndefined();
    expect(Keychain.__mockKeychainHelpers.store.has('realm_encryption_key')).toBe(false);
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBe('1');
  });

  it('does not clear Keychain services during the same installation', async () => {
    const app = asMigrationAccess();
    await app.setKeychainRetentionEnabled(false);
    await AsyncStorage.setItem(BlueApp.KEYCHAIN_INSTALL_MARKER, '1');
    await seedKeychainValue('data', 'wallet-data');

    await app.applyKeychainRetentionPolicy();

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('data'))?.password).toBe('wallet-data');
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
  });
});
