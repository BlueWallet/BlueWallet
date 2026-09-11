import { Platform } from 'react-native';
import Keychain from 'react-native-keychain';

import { collectKeychainDiagnostics } from '../../blue_modules/keychain-diagnostics';
import { BlueApp } from '../../class/blue-app';

const keychainMock = Keychain as jest.Mocked<typeof Keychain> & {
  __mockKeychainHelpers: { reset: () => void };
};

describe('Keychain diagnostics', () => {
  beforeEach(() => {
    keychainMock.__mockKeychainHelpers.reset();
    jest.clearAllMocks();
  });

  it('reports native capabilities and an empty wallet envelope without reading protected wallet credentials', async () => {
    const diagnostics = await collectKeychainDiagnostics();

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Biometrics', value: 'FaceID', status: 'ok' }),
        expect.objectContaining({ label: 'Native security level', value: 'SECURE_HARDWARE', status: 'ok' }),
        expect.objectContaining({ label: 'Wallet envelope', value: 'No wallet data stored', status: 'ok' }),
        expect.objectContaining({ label: 'Legacy secure storage', value: 'Clean', status: 'ok' }),
      ]),
    );
    expect(keychainMock.getGenericPassword).toHaveBeenCalledTimes(1);
    expect(keychainMock.getGenericPassword).toHaveBeenCalledWith({ service: BlueApp.SENSITIVE_ACTIONS_POLICY_SERVICE });
    expect(keychainMock.getGenericPassword).not.toHaveBeenCalledWith({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE });
    expect(keychainMock.getGenericPassword).not.toHaveBeenCalledWith({ service: BlueApp.storageKeychainService('data') });
  });

  it('flags incomplete envelope and sensitive-action policy state', async () => {
    await Keychain.setGenericPassword('policy', 'biometricsOrPasscode', { service: BlueApp.SENSITIVE_ACTIONS_POLICY_SERVICE });
    await Keychain.setGenericPassword('manifest', 'metadata', { service: BlueApp.WALLET_DATA_MANIFEST_SERVICE });
    jest.clearAllMocks();

    const diagnostics = await collectKeychainDiagnostics();

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Sensitive actions', value: expect.stringContaining('marker missing'), status: 'error' }),
        expect.objectContaining({ label: 'Wallet envelope', value: expect.stringContaining('No data generation'), status: 'error' }),
      ]),
    );
  });

  it('uses platform-appropriate passcode terminology', async () => {
    const diagnostics = await collectKeychainDiagnostics();

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: Platform.OS === 'android' ? 'Screen lock' : 'Device passcode', value: 'Available' }),
      ]),
    );
  });
});
