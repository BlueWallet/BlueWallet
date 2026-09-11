import { ACCESSIBLE, ACCESS_CONTROL, SECURITY_LEVEL } from 'react-native-keychain';

import {
  getAndroidKeystoreOptions,
  getIosKeychainAccessibilityOptions,
  getKeychainAccessControl,
} from '../../blue_modules/keychain-policy';

describe('platform Keychain policy mapping', () => {
  it('uses enrollment-bound biometric policies on iOS', () => {
    expect(getKeychainAccessControl('biometricsOrPasscode', true, 'ios')).toBe(ACCESS_CONTROL.BIOMETRY_CURRENT_SET);
    expect(getKeychainAccessControl('biometricsOrPasscode', false, 'ios')).toBe(ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE);
    expect(getKeychainAccessControl('devicePasscode', false, 'ios')).toBe(ACCESS_CONTROL.DEVICE_PASSCODE);
  });

  it('uses the policies implemented by the Android v10 Keystore cipher', () => {
    expect(getKeychainAccessControl('biometricsOrPasscode', true, 'android')).toBe(ACCESS_CONTROL.BIOMETRY_ANY);
    expect(getKeychainAccessControl('biometricsOrPasscode', false, 'android')).toBe(ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE);
    expect(getKeychainAccessControl('devicePasscode', false, 'android')).toBe(ACCESS_CONTROL.DEVICE_PASSCODE);
  });

  it('requires an Android Keystore-backed cipher without requiring hardware-only devices', () => {
    expect(getAndroidKeystoreOptions('android')).toEqual({ securityLevel: SECURITY_LEVEL.SECURE_SOFTWARE });
    expect(getAndroidKeystoreOptions('ios')).toEqual({});
  });

  it('only applies Apple Keychain accessibility on iOS', () => {
    expect(getIosKeychainAccessibilityOptions('ios')).toEqual({ accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    expect(getIosKeychainAccessibilityOptions('android')).toEqual({});
  });

  it('does not silently apply iOS biometric rules to unsupported platforms', () => {
    expect(() => getKeychainAccessControl('biometricsOrPasscode', true, 'windows')).toThrow('Unsupported Keychain security platform');
  });
});
