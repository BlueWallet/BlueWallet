import Keychain, { BIOMETRY_TYPE } from 'react-native-keychain';

import { getBiometricAvailability, getDeviceBiometricType } from '../../hooks/useBiometrics';

const mockedKeychain = Keychain as jest.Mocked<typeof Keychain> & {
  __mockKeychainHelpers: { reset: () => void };
};

describe('useBiometrics device capabilities', () => {
  beforeEach(() => {
    mockedKeychain.__mockKeychainHelpers.reset();
    mockedKeychain.getSupportedBiometryType.mockReset().mockResolvedValue(BIOMETRY_TYPE.FACE_ID);
    mockedKeychain.isPasscodeAuthAvailable.mockReset().mockResolvedValue(true);
  });

  it('reports the enrolled biometric type', async () => {
    await expect(getDeviceBiometricType()).resolves.toBe(BIOMETRY_TYPE.FACE_ID);
    await expect(getBiometricAvailability()).resolves.toBe('available');
  });

  it('does not treat a device passcode as a biometric type', async () => {
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);

    await expect(getDeviceBiometricType()).resolves.toBeUndefined();
    await expect(getBiometricAvailability()).resolves.toBe('notEnrolled');
  });

  it('reports when biometrics require a device credential first', async () => {
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);
    mockedKeychain.isPasscodeAuthAvailable.mockResolvedValue(false);

    await expect(getBiometricAvailability()).resolves.toBe('passcodeRequired');
  });

  it('fails closed when biometric availability cannot be read', async () => {
    mockedKeychain.getSupportedBiometryType.mockRejectedValue(new Error('Keychain unavailable'));

    await expect(getBiometricAvailability()).resolves.toBe('unavailable');
  });
});
