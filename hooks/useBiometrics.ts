import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Keychain, { BIOMETRY_TYPE } from 'react-native-keychain';

import loc from '../loc';

const FaceID = 'Face ID';
const TouchID = 'Touch ID';
const Biometrics = 'Biometrics';

export type DeviceBiometricType = BIOMETRY_TYPE | typeof Biometrics;
export type BiometricAvailability = 'available' | 'notEnrolled' | 'passcodeRequired' | 'unavailable';

export const getDeviceBiometricType = async (): Promise<DeviceBiometricType | undefined> => {
  return (await Keychain.getSupportedBiometryType()) ?? undefined;
};

export const getBiometricAvailability = async (): Promise<BiometricAvailability> => {
  try {
    const availability = (await Keychain.getSupportedBiometryType())
      ? 'available'
      : (await Keychain.isPasscodeAuthAvailable())
        ? 'notEnrolled'
        : 'passcodeRequired';
    console.debug('[useBiometrics] Biometric availability:', availability);
    return availability;
  } catch (error) {
    console.debug('[useBiometrics] Biometric availability check failed:', error);
    return 'unavailable';
  }
};

export const getBiometricAvailabilityMessage = (availability: Exclude<BiometricAvailability, 'available'>): string => {
  switch (availability) {
    case 'notEnrolled':
      return loc.settings.biometrics_not_enrolled;
    case 'passcodeRequired':
      return Platform.OS === 'android' ? loc.settings.biometrics_screen_lock_required : loc.settings.biometrics_passcode_required;
    default:
      return loc.settings.biometrics_check_failed;
  }
};

const isBiometricCancellationError = (error: unknown): boolean => {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return (
    code === '-2' ||
    code === '-4' ||
    code === '-9' ||
    code === '-128' ||
    /code:\s*(10|13)\b/.test(message) ||
    message.includes('user cancel') ||
    message.includes('user canceled') ||
    message.includes('user cancelled') ||
    message.includes('negative button')
  );
};

export const getBiometricErrorMessage = (error: unknown): string | undefined => {
  if (isBiometricCancellationError(error)) return undefined;

  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  if (/code:\s*(7|9)\b/.test(message) || message.includes('lockout') || message.includes('locked out')) {
    return loc.settings.biometrics_locked_out;
  }
  if (
    code === '-25300' ||
    message.includes('key permanently invalidated') ||
    message.includes('permanently invalidated') ||
    message.includes('item could not be found')
  ) {
    return Platform.OS === 'android' ? loc.settings.android_keystore_key_invalidated : loc.settings.biometrics_enrollment_changed;
  }
  if (code === '-25308' || message.includes('interaction is not allowed') || message.includes('no current activity')) {
    return loc.settings.biometrics_interaction_unavailable;
  }
  if (code === '-25293' || message.includes('authentication failed') || message.includes('not recognized')) {
    return loc.settings.biometrics_auth_failed;
  }
  return loc.settings.keychain_unavailable;
};

const useBiometrics = () => {
  const [deviceBiometricType, setDeviceBiometricType] = useState<DeviceBiometricType | undefined>();

  useEffect(() => {
    let active = true;
    getDeviceBiometricType()
      .then(type => {
        if (active) setDeviceBiometricType(type);
      })
      .catch(error => console.debug('[useBiometrics] Biometric type check failed:', error));
    return () => {
      active = false;
    };
  }, []);

  const isDeviceBiometricCapable = useCallback(async () => {
    const capable = (await getBiometricAvailability()) === 'available';
    console.debug('[useBiometrics] Device biometric capable:', capable);
    return capable;
  }, []);

  return {
    deviceBiometricType,
    getBiometricAvailability,
    isDeviceBiometricCapable,
  };
};

export { FaceID, TouchID, Biometrics, BIOMETRY_TYPE as BiometricType, useBiometrics };
