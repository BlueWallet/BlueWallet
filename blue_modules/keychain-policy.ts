import { Platform } from 'react-native';
import { ACCESSIBLE, ACCESS_CONTROL, SECURITY_LEVEL } from 'react-native-keychain';

export type NativeSecurityPolicy = 'biometricsOrPasscode' | 'devicePasscode';

/**
 * Maps BlueWallet's policies to guarantees implemented by each native backend.
 * Android v10 does not distinguish BIOMETRY_CURRENT_SET from BIOMETRY_ANY in
 * its Keystore cipher, so do not advertise or request iOS enrollment-set
 * invalidation there.
 */
export const getKeychainAccessControl = (policy: NativeSecurityPolicy, biometricsOnly = false, platform = Platform.OS): ACCESS_CONTROL => {
  if (platform !== 'ios' && platform !== 'android') throw new Error(`Unsupported Keychain security platform: ${platform}`);
  if (policy === 'devicePasscode') return ACCESS_CONTROL.DEVICE_PASSCODE;
  if (platform === 'android') {
    return biometricsOnly ? ACCESS_CONTROL.BIOMETRY_ANY : ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;
  }
  return biometricsOnly ? ACCESS_CONTROL.BIOMETRY_CURRENT_SET : ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE;
};

/** Accessibility classes are Apple Keychain policy and are omitted on Android. */
export const getIosKeychainAccessibilityOptions = (platform = Platform.OS) =>
  platform === 'ios' ? { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY } : {};

/**
 * Require an Android Keystore-backed cipher without forcing Keychain's
 * authentication-only AES-GCM backend. Keychain selects its authenticated or
 * non-authenticated AES-GCM implementation from ACCESS_CONTROL.
 */
export const getAndroidKeystoreOptions = (platform = Platform.OS) =>
  platform === 'android'
    ? {
        securityLevel: SECURITY_LEVEL.SECURE_SOFTWARE,
      }
    : {};
