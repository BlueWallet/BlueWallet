import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Realm from 'realm';
import { BlueApp } from '../../class/blue-app';
import { isWalletDataEnvelope } from '../../blue_modules/wallet-data-envelope';
import * as encryption from '../../blue_modules/encryption';

const mockLegacyValues = new Map<string, string>();
const mockGetLegacySecureValue = jest.fn(async (key: string) => mockLegacyValues.get(key) ?? null);
const mockRemoveLegacySecureValue = jest.fn(async (key: string) => {
  mockLegacyValues.delete(key);
});
const mockClearLegacySecureStorage = jest.fn(async () => mockLegacyValues.clear());

jest.mock('../../blue_modules/legacy-secure-storage', () => ({
  getLegacySecureValue: (key: string) => mockGetLegacySecureValue(key),
  removeLegacySecureValue: (key: string) => mockRemoveLegacySecureValue(key),
  clearLegacySecureStorage: () => mockClearLegacySecureStorage(),
}));

const Keychain = require('react-native-keychain');

describe('secure storage migration', () => {
  beforeEach(async () => {
    mockLegacyValues.clear();
    mockGetLegacySecureValue.mockClear();
    mockRemoveLegacySecureValue.mockClear();
    Keychain.__mockKeychainHelpers.reset();
    Keychain.setGenericPassword.mockClear();
    Keychain.getGenericPassword.mockClear();
    Keychain.resetGenericPassword.mockClear();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(BlueApp.IOS_INSTALLATION_MARKER, '1');
    await Keychain.setGenericPassword('installation', 'installed', { service: BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE });
    Keychain.setGenericPassword.mockClear();
    Keychain.resetGenericPassword.mockClear();
    mockClearLegacySecureStorage.mockClear();
  });

  it('moves legacy wallet data into a dedicated Keychain service', async () => {
    const app = new BlueApp();
    mockLegacyValues.set('data', 'legacy-wallet-data');

    await app.migrateKeys();

    expect(await app.getItem('data')).toBe('legacy-wallet-data');
    const manifest = JSON.parse(Keychain.__mockKeychainHelpers.store.get(BlueApp.WALLET_DATA_MANIFEST_SERVICE).password);
    const migrated = Keychain.__mockKeychainHelpers.store.get(
      manifest.active === 'secondary' ? BlueApp.WALLET_DATA_SECONDARY_SERVICE : BlueApp.storageKeychainService('data'),
    );
    expect(migrated?.username).toBe('data');
    expect(isWalletDataEnvelope(migrated?.password)).toBe(true);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)).toBe(true);
    expect(mockLegacyValues.has('data')).toBe(false);
    expect(await AsyncStorage.getItem('data')).toBeNull();
  });

  it('prefers untouched legacy wallet data over an AsyncStorage replacement', async () => {
    const app = new BlueApp();
    mockLegacyValues.set('data', 'original-wallet-data');
    await AsyncStorage.setItem('data', 'empty-replacement');

    await app.migrateKeys();

    expect(await app.getItem('data')).toBe('original-wallet-data');
    expect(await AsyncStorage.getItem('data')).toBeNull();
  });

  it('defers encrypted legacy migration until its password is validated and uses it as the Keychain application password', async () => {
    const app = new BlueApp();
    const password = 'correct horse battery staple';
    const plaintext = JSON.stringify({ wallets: [], tx_metadata: {}, counterparty_metadata: {} });
    const encryptedLegacyData = JSON.stringify([encryption.encrypt(plaintext, password)]);
    mockLegacyValues.set('data', encryptedLegacyData);

    await app.migrateKeys();

    expect(mockLegacyValues.get('data')).toBe(encryptedLegacyData);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)).toBe(false);
    await expect(app.storageIsEncrypted()).resolves.toBe(true);

    await expect(app.loadFromDisk(password)).resolves.toBe(true);

    expect(mockLegacyValues.has('data')).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)).toBe(true);
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX}`)),
      password,
      expect.objectContaining({
        accessControl: Keychain.ACCESS_CONTROL.APPLICATION_PASSWORD,
        applicationPassword: password,
      }),
    );

    const passwordServices = Array.from(Keychain.__mockKeychainHelpers.store.keys() as Iterable<string>).filter(service =>
      service.startsWith(BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX),
    );
    expect(passwordServices).toHaveLength(1);
    Keychain.getGenericPassword.mockClear();
    Keychain.setGenericPassword.mockClear();

    const relaunchedApp = new BlueApp();
    await expect(relaunchedApp.loadFromDisk(password)).resolves.toBe(true);

    expect(Keychain.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        service: passwordServices[0],
        accessControl: Keychain.ACCESS_CONTROL.APPLICATION_PASSWORD,
        applicationPassword: password,
      }),
    );
    expect(Keychain.setGenericPassword).not.toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX}`)),
      expect.anything(),
      expect.anything(),
    );
  });

  it('does not migrate or create a Keychain password item when the legacy storage password is incorrect', async () => {
    const app = new BlueApp();
    const plaintext = JSON.stringify({ wallets: [], tx_metadata: {}, counterparty_metadata: {} });
    const encryptedLegacyData = JSON.stringify([encryption.encrypt(plaintext, 'correct password')]);
    mockLegacyValues.set('data', encryptedLegacyData);

    await expect(app.loadFromDisk('incorrect password')).resolves.toBe(false);

    expect(mockLegacyValues.get('data')).toBe(encryptedLegacyData);
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)).toBe(false);
    expect(
      Array.from(Keychain.__mockKeychainHelpers.store.keys() as Iterable<string>).some(service =>
        service.startsWith(BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX),
      ),
    ).toBe(false);
  });

  it('removes the obsolete encrypted-storage flag', async () => {
    const app = new BlueApp();
    await AsyncStorage.setItem(BlueApp.LEGACY_FLAG_ENCRYPTED, '1');
    await app.setItem('data', JSON.stringify(['encrypted-wallet-data']));

    await expect(app.storageIsEncrypted()).resolves.toBe(true);

    expect(await app.getItem(BlueApp.LEGACY_FLAG_ENCRYPTED)).toBeNull();
    expect(await AsyncStorage.getItem(BlueApp.LEGACY_FLAG_ENCRYPTED)).toBeNull();
  });

  it('converts the legacy biometric boolean into a protected Keychain credential', async () => {
    const app = new BlueApp();
    mockLegacyValues.set('Biometrics', '1');
    await app.migrateKeys();

    expect(await Keychain.hasGenericPassword({ service: BlueApp.BIOMETRIC_AUTH_SERVICE })).toBe(true);
    expect(Keychain.__mockKeychainHelpers.store.get(BlueApp.BIOMETRIC_AUTH_SERVICE)).toEqual(
      expect.objectContaining({ password: 'authentication-required' }),
    );
    expect(await app.getItem('Biometrics')).toBeNull();
    expect(mockLegacyValues.has('Biometrics')).toBe(false);
  });

  it('keeps an existing Keychain value authoritative and removes its stale legacy duplicate', async () => {
    const app = new BlueApp();
    await app.setItem('data', 'current-wallet-data');
    mockLegacyValues.set('data', 'stale-wallet-data');

    await app.migrateKeys();

    expect(await app.getItem('data')).toBe('current-wallet-data');
    expect(mockLegacyValues.has('data')).toBe(false);
  });

  it('surfaces a failed legacy deletion and retries cleanup after the v2 write was committed', async () => {
    const app = new BlueApp();
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockLegacyValues.set('data', 'legacy-wallet-data');
    mockRemoveLegacySecureValue.mockRejectedValueOnce(new Error('Legacy removal was not committed'));

    await app.migrateKeys();

    expect(mockLegacyValues.get('data')).toBe('legacy-wallet-data');
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.DATA_ENCRYPTION_KEY_SERVICE)).toBe(true);
    expect(consoleWarn).toHaveBeenCalledWith('Failed to migrate secure-storage key data:', expect.any(Error));

    await app.migrateKeys();

    expect(mockLegacyValues.has('data')).toBe(false);
    await expect(app.getItem('data')).resolves.toBe('legacy-wallet-data');
    consoleWarn.mockRestore();
  });

  it('keeps the legacy value when the new Keychain write fails verification', async () => {
    const app = new BlueApp();
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockLegacyValues.set('data', 'recoverable-wallet-data');
    Keychain.setGenericPassword.mockRejectedValueOnce(new Error('Keychain unavailable'));

    await app.migrateKeys();

    expect(mockLegacyValues.get('data')).toBe('recoverable-wallet-data');
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalledWith('data');
    consoleWarn.mockRestore();
  });

  it('continues migrating legacy preference keys to AsyncStorage', async () => {
    const app = new BlueApp();
    mockLegacyValues.set(BlueApp.HANDOFF_STORAGE_KEY, '1');

    await app.migrateKeys();

    expect(await AsyncStorage.getItem(BlueApp.HANDOFF_STORAGE_KEY)).toBe('1');
    expect(mockLegacyValues.has(BlueApp.HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it('treats an undefined native legacy preference as missing', async () => {
    const app = new BlueApp();
    mockGetLegacySecureValue
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined as unknown as null);

    await expect(app.migrateKeys()).resolves.toBeUndefined();

    expect(await AsyncStorage.getItem(BlueApp.HANDOFF_STORAGE_KEY)).toBeNull();
    expect(mockRemoveLegacySecureValue).not.toHaveBeenCalledWith(BlueApp.HANDOFF_STORAGE_KEY);
  });

  it('deletes the old Realm wallet backup and its encryption key', async () => {
    const app = new BlueApp();
    await Keychain.setGenericPassword('realm', 'backup-key', { service: BlueApp.LEGACY_REALM_KEY_VALUE_SERVICE });
    const exists = jest.spyOn(RNFS, 'exists').mockResolvedValue(true);
    const readDir = jest.spyOn(RNFS, 'readDir').mockResolvedValue([]);
    const deleteFile = jest.spyOn(Realm, 'deleteFile');

    await app.migrateKeys();

    expect(deleteFile).toHaveBeenCalledWith({ path: `${RNFS.CachesDirectoryPath}/keyvalue.realm` });
    expect(deleteFile).toHaveBeenCalledWith({ path: `${RNFS.DocumentDirectoryPath}/keyvalue.realm` });
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.LEGACY_REALM_KEY_VALUE_SERVICE)).toBe(false);

    exists.mockRestore();
    readDir.mockRestore();
    deleteFile.mockRestore();
  });

  it('does not read wallet data from Realm when Keychain access fails', async () => {
    const app = new BlueApp();
    const error = new Error('Keychain unavailable');
    const getItem = jest.spyOn(app, 'getItem').mockRejectedValue(error);
    const realmOpen = jest.spyOn(Realm, 'open');
    realmOpen.mockClear();

    await expect(app.loadFromDisk()).rejects.toBe(error);

    expect(realmOpen).not.toHaveBeenCalled();
    getItem.mockRestore();
    realmOpen.mockRestore();
  });

  it('clears retained Keychain and legacy values after an iOS reinstall', async () => {
    const app = new BlueApp();
    await Keychain.setGenericPassword('data', 'retained-wallet-data', { service: BlueApp.storageKeychainService('data') });
    await Keychain.setGenericPassword('arkade', 'retained-arkade-key', { service: 'arkade_realm_wallet' });
    mockLegacyValues.set('data', 'retained-legacy-wallet-data');
    await AsyncStorage.removeItem(BlueApp.IOS_INSTALLATION_MARKER);

    await app.migrateKeys();

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.storageKeychainService('data'))).toBe(false);
    expect(Keychain.__mockKeychainHelpers.store.has('arkade_realm_wallet')).toBe(false);
    expect(mockClearLegacySecureStorage).toHaveBeenCalledTimes(1);
    expect(mockLegacyValues.size).toBe(0);
    expect(await AsyncStorage.getItem(BlueApp.IOS_INSTALLATION_MARKER)).toBe('1');
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE)).toBe(true);
  });

  it('does not wipe an existing installation during the rollout bootstrap', async () => {
    const app = new BlueApp();
    await Keychain.resetGenericPassword({ service: BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE });
    await AsyncStorage.removeItem(BlueApp.IOS_INSTALLATION_MARKER);
    await Keychain.setGenericPassword('data', 'existing-wallet-data', { service: BlueApp.storageKeychainService('data') });

    await app.migrateKeys();

    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.storageKeychainService('data'))).toBe(true);
    expect(mockClearLegacySecureStorage).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(BlueApp.IOS_INSTALLATION_MARKER)).toBe('1');
    expect(Keychain.__mockKeychainHelpers.store.has(BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE)).toBe(true);
  });

  it('fails closed when retained Keychain data cannot be removed', async () => {
    const app = new BlueApp();
    await AsyncStorage.removeItem(BlueApp.IOS_INSTALLATION_MARKER);
    Keychain.resetGenericPassword.mockRejectedValueOnce(new Error('Keychain deletion failed'));

    await expect(app.migrateKeys()).rejects.toThrow('Keychain deletion failed');

    expect(await AsyncStorage.getItem(BlueApp.IOS_INSTALLATION_MARKER)).toBeNull();
  });
});
