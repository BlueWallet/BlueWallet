import { BlueApp } from '../../class/blue-app';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockLegacyValues = new Map<string, string>();
const mockRemoveLegacySecureValue = jest.fn(async (key: string) => mockLegacyValues.delete(key));

jest.mock('../../blue_modules/legacy-secure-storage', () => ({
  getLegacySecureValue: jest.fn(async (key: string) => mockLegacyValues.get(key) ?? null),
  removeLegacySecureValue: (key: string) => mockRemoveLegacySecureValue(key),
}));

const Keychain = require('react-native-keychain');

type MigrationAccess = {
  migrateSecureStorageKey(key: string): Promise<string | null>;
  applyKeychainRetentionPolicy(): Promise<void>;
  setKeychainRetentionEnabled(enabled: boolean): Promise<void>;
};

describe('secure storage Keychain migration', () => {
  beforeEach(async () => {
    mockLegacyValues.clear();
    mockRemoveLegacySecureValue.mockClear();
    await AsyncStorage.clear();
    Keychain.__mockKeychainHelpers.reset();
    Keychain.setGenericPassword.mockClear();
    Keychain.getGenericPassword.mockClear();
  });

  it('moves a legacy value into its dedicated Keychain service', async () => {
    mockLegacyValues.set('data', 'wallet-data');
    const app = new BlueApp() as unknown as MigrationAccess;

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('wallet-data');

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('data'))).toEqual({
      username: 'data',
      password: 'wallet-data',
      service: BlueApp.storageKeychainService('data'),
    });
    expect(mockLegacyValues.has('data')).toBe(false);
  });

  it('keeps legacy data when the Keychain write fails', async () => {
    mockLegacyValues.set('data', 'recoverable-wallet-data');
    Keychain.setGenericPassword.mockRejectedValueOnce(new Error('Keychain unavailable'));
    const app = new BlueApp() as unknown as MigrationAccess;

    await expect(app.migrateSecureStorageKey('data')).rejects.toThrow('Keychain unavailable');

    expect(mockLegacyValues.get('data')).toBe('recoverable-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalled();
  });

  it('keeps an existing Keychain value authoritative and removes a stale legacy duplicate', async () => {
    const service = BlueApp.storageKeychainService('data');
    await Keychain.setGenericPassword('data', 'current-wallet-data', {
      service,
    });
    mockLegacyValues.set('data', 'stale-wallet-data');
    const app = new BlueApp() as unknown as MigrationAccess;

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('current-wallet-data');

    expect(mockLegacyValues.has('data')).toBe(false);
    expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
  });

  it('keeps a verified Keychain value authoritative when legacy cleanup fails', async () => {
    const service = BlueApp.storageKeychainService('data');
    await Keychain.setGenericPassword('data', 'current-wallet-data', { service });
    mockLegacyValues.set('data', 'stale-wallet-data');
    mockRemoveLegacySecureValue.mockRejectedValueOnce(new Error('Legacy cleanup unavailable'));
    const app = new BlueApp() as unknown as MigrationAccess;

    await expect(app.migrateSecureStorageKey('data')).resolves.toBe('current-wallet-data');

    expect(mockLegacyValues.get('data')).toBe('stale-wallet-data');
  });

  it('uses isolated Keychain services for each secure-storage key', () => {
    expect(BlueApp.storageKeychainService('data')).not.toBe(BlueApp.storageKeychainService(BlueApp.FLAG_ENCRYPTED));
  });

  it('enables iOS Keychain retention by default', async () => {
    const app = new BlueApp();

    await expect(app.isKeychainRetentionEnabled()).resolves.toBe(true);
  });

  it('stores the iOS Keychain retention preference outside wallet services', async () => {
    const app = new BlueApp();

    await app.setKeychainRetentionEnabled(false);

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.keychainRetentionService())?.password).toBe('false');
    expect(BlueApp.keychainRetentionService()).not.toBe(BlueApp.storageKeychainService('data'));
  });

  it('keeps retained Keychain services on a fresh install by default', async () => {
    const app = new BlueApp() as unknown as MigrationAccess;
    await Keychain.setGenericPassword('data', 'wallet-data', { service: BlueApp.storageKeychainService('data') });

    await app.applyKeychainRetentionPolicy();

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('data'))?.password).toBe('wallet-data');
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBe('1');
  });

  it('clears retained Keychain services on a fresh install after opt-out', async () => {
    const app = new BlueApp() as unknown as MigrationAccess;
    await app.setKeychainRetentionEnabled(false);
    await Keychain.setGenericPassword('data', 'wallet-data', { service: BlueApp.storageKeychainService('data') });
    await Keychain.setGenericPassword('realm', 'realm-key', { service: 'realm_encryption_key' });

    await app.applyKeychainRetentionPolicy();

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.storageKeychainService('data'))).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has('realm_encryption_key')).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.keychainRetentionService())?.password).toBe('false');
    await expect(AsyncStorage.getItem(BlueApp.KEYCHAIN_INSTALL_MARKER)).resolves.toBe('1');
  });

  it('does not clear Keychain services during the same installation', async () => {
    const app = new BlueApp() as unknown as MigrationAccess;
    await app.setKeychainRetentionEnabled(false);
    await AsyncStorage.setItem(BlueApp.KEYCHAIN_INSTALL_MARKER, '1');
    await Keychain.setGenericPassword('data', 'wallet-data', { service: BlueApp.storageKeychainService('data') });

    await app.applyKeychainRetentionPolicy();

    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.storageKeychainService('data'))?.password).toBe('wallet-data');
  });
});
