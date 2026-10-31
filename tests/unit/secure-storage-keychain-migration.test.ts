import { BlueApp } from '../../class/blue-app';

const mockLegacyValues = new Map<string, string>();
const mockRemoveLegacySecureValue = jest.fn(async (key: string) => mockLegacyValues.delete(key));

jest.mock('../../blue_modules/legacy-secure-storage', () => ({
  getLegacySecureValue: jest.fn(async (key: string) => mockLegacyValues.get(key) ?? null),
  removeLegacySecureValue: (key: string) => mockRemoveLegacySecureValue(key),
}));

const Keychain = require('react-native-keychain');

type MigrationAccess = {
  migrateSecureStorageKey(key: string): Promise<string | null>;
};

describe('secure storage Keychain migration', () => {
  beforeEach(() => {
    mockLegacyValues.clear();
    mockRemoveLegacySecureValue.mockClear();
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
});
