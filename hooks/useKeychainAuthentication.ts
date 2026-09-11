import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import Keychain, { AUTHENTICATION_TYPE, hasGenericPassword } from 'react-native-keychain';
import { BlueApp as BlueAppClass, KeychainSecurityOption } from '../class/blue-app';
import { getAndroidKeystoreOptions, getIosKeychainAccessibilityOptions, getKeychainAccessControl } from '../blue_modules/keychain-policy';
import loc from '../loc';
import * as NavigationService from '../NavigationService';
import presentAlert from '../components/Alert';
import { getBiometricAvailability, getBiometricAvailabilityMessage, getBiometricErrorMessage } from './useBiometrics';

const STORAGEKEY = 'Biometrics';
const BIOMETRIC_AUTH_SERVICE = BlueAppClass.BIOMETRIC_AUTH_SERVICE;
const DEVICE_PASSCODE_AUTH_SERVICE = BlueAppClass.DEVICE_PASSCODE_AUTH_SERVICE;
const SECURITY_TOGGLE_PROMPT_SERVICE = 'BlueWalletSecurityTogglePromptV1';
const SENSITIVE_ACTIONS_POLICY_SERVICE = BlueAppClass.SENSITIVE_ACTIONS_POLICY_SERVICE;
const SENSITIVE_ACTIONS_BIOMETRIC_SERVICE = BlueAppClass.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE;
const SENSITIVE_ACTIONS_PASSCODE_SERVICE = BlueAppClass.SENSITIVE_ACTIONS_PASSCODE_SERVICE;
const BlueApp = BlueAppClass.getInstance();

export type AuthenticationUseStatus = 'enabled' | 'disabled' | 'unavailable';
export type AppUnlockPolicy = KeychainSecurityOption | 'disabled';
export type SensitiveActionPolicy = KeychainSecurityOption | 'disabled';
type SecurityPolicy = AppUnlockPolicy | SensitiveActionPolicy;
export type SecurityStateStatus = 'loading' | 'loaded' | 'unavailable';

const securityOptionListeners = new Set<(option: AppUnlockPolicy) => void>();
const sensitiveActionsOptionListeners = new Set<(option: SensitiveActionPolicy) => void>();
let securityOptionRevision = 0;
let sensitiveActionsOptionRevision = 0;
let policyChangeQueue: Promise<void> = Promise.resolve();
let authenticationQueue: Promise<void> = Promise.resolve();

const runQueued = async <T>(queue: 'policy' | 'authentication', operation: () => Promise<T>): Promise<T> => {
  const previous = queue === 'policy' ? policyChangeQueue : authenticationQueue;
  let release = () => {};
  const next = new Promise<void>(resolve => {
    release = resolve;
  });
  if (queue === 'policy') policyChangeQueue = next;
  else authenticationQueue = next;

  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
};

const publishSecurityOption = (option: AppUnlockPolicy) => {
  securityOptionRevision += 1;
  for (const listener of securityOptionListeners) listener(option);
};

const publishSensitiveActionsOption = (option: SensitiveActionPolicy) => {
  sensitiveActionsOptionRevision += 1;
  for (const listener of sensitiveActionsOptionListeners) listener(option);
};

const isSecurityPolicy = (option: unknown): option is SecurityPolicy =>
  option === 'disabled' || option === 'biometricsOrPasscode' || option === 'devicePasscode';

const getAuthenticationOptions = (
  option: KeychainSecurityOption,
  service = option === 'devicePasscode' ? DEVICE_PASSCODE_AUTH_SERVICE : BIOMETRIC_AUTH_SERVICE,
): Parameters<typeof Keychain.setGenericPassword>[2] => {
  const biometricsOnly = service === SENSITIVE_ACTIONS_BIOMETRIC_SERVICE;
  return {
    service,
    ...getIosKeychainAccessibilityOptions(),
    accessControl: getKeychainAccessControl(option, biometricsOnly),
    ...(Platform.OS === 'ios' && biometricsOnly ? { authenticationType: AUTHENTICATION_TYPE.BIOMETRICS } : {}),
    authenticationPrompt: {
      title: loc.settings.biom_conf_identity,
    },
    ...getAndroidKeystoreOptions(),
  };
};

const getSecurityPromptOptions = (option: KeychainSecurityOption, biometricsOnly = false) => ({
  service: SECURITY_TOGGLE_PROMPT_SERVICE,
  ...getIosKeychainAccessibilityOptions(),
  accessControl: getKeychainAccessControl(option, biometricsOnly),
  ...(Platform.OS === 'ios' && option === 'biometricsOrPasscode'
    ? {
        authenticationType: biometricsOnly ? AUTHENTICATION_TYPE.BIOMETRICS : AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      }
    : {}),
  authenticationPrompt: {
    title: loc.settings.biom_conf_identity,
    cancel: loc._.cancel,
  },
  ...getAndroidKeystoreOptions(),
});

const isAuthenticationAvailable = async () =>
  Boolean(await Keychain.getSupportedBiometryType()) || (await Keychain.isPasscodeAuthAvailable());

const getConfiguredSecurityOption = async (): Promise<AppUnlockPolicy> => {
  const option = await BlueApp.getConfiguredKeychainSecurityOption();
  if (option) {
    console.debug('[useKeychainAuthentication] Configured Keychain security option:', option);
    return option;
  }
  console.debug('[useKeychainAuthentication] No configured security option');
  return 'disabled';
};

const sensitiveActionsAuthenticationService = (option: KeychainSecurityOption) =>
  option === 'devicePasscode' ? SENSITIVE_ACTIONS_PASSCODE_SERVICE : SENSITIVE_ACTIONS_BIOMETRIC_SERVICE;

const setSensitiveActionsAuthenticationMarker = async (option: KeychainSecurityOption): Promise<void> => {
  const service = sensitiveActionsAuthenticationService(option);
  const stored = await Keychain.setGenericPassword(service, 'authentication-required', getAuthenticationOptions(option, service));
  if (!stored) throw new Error(loc.settings.biometrics_fail);
};

const resetSensitiveActionsAuthenticationMarker = async (option: KeychainSecurityOption): Promise<void> => {
  await Keychain.resetGenericPassword({ service: sensitiveActionsAuthenticationService(option) });
};

const persistSensitiveActionsSecurityOption = async (option: SensitiveActionPolicy): Promise<void> => {
  if (option !== 'disabled') await setSensitiveActionsAuthenticationMarker(option);

  const stored = await Keychain.setGenericPassword('sensitive-actions', option, {
    service: SENSITIVE_ACTIONS_POLICY_SERVICE,
    ...getIosKeychainAccessibilityOptions(),
  });
  if (!stored) throw new Error(loc.settings.biometrics_fail);

  if (option === 'disabled') {
    await resetSensitiveActionsAuthenticationMarker('biometricsOrPasscode');
    await resetSensitiveActionsAuthenticationMarker('devicePasscode');
  } else {
    await resetSensitiveActionsAuthenticationMarker(option === 'devicePasscode' ? 'biometricsOrPasscode' : 'devicePasscode');
  }
};

/**
 * Reads the configured sensitive-action policy without changing Keychain.
 * A missing V1 record falls back to the legacy app-unlock policy so callers
 * remain fail-closed even if they run before startup migration completes.
 */
const getSensitiveActionsSecurityOption = async (): Promise<SensitiveActionPolicy> => {
  const credentials = await Keychain.getGenericPassword({ service: SENSITIVE_ACTIONS_POLICY_SERVICE });
  if (credentials) {
    if (!isSecurityPolicy(credentials.password)) throw new Error('Invalid sensitive-actions security policy');
    return credentials.password;
  }

  return await getConfiguredSecurityOption();
};

/** Performs the one-time, write-capable migration outside ordinary reads. */
const migrateSensitiveActionsSecurityOption = async (): Promise<SensitiveActionPolicy> => {
  const credentials = await Keychain.getGenericPassword({ service: SENSITIVE_ACTIONS_POLICY_SERVICE });
  if (credentials) {
    if (!isSecurityPolicy(credentials.password)) throw new Error('Invalid sensitive-actions security policy');
    const option = credentials.password;
    if (option !== 'disabled' && !(await hasGenericPassword({ service: sensitiveActionsAuthenticationService(option) }))) {
      await setSensitiveActionsAuthenticationMarker(option);
    }
    return option;
  }

  // Existing users had one policy for app unlock and sensitive actions. Copy
  // it once so the new settings remain independent after migration.
  const legacyOption = await getConfiguredSecurityOption();
  await persistSensitiveActionsSecurityOption(legacyOption);
  return legacyOption;
};

const authenticationService = (option: KeychainSecurityOption) =>
  option === 'devicePasscode' ? DEVICE_PASSCODE_AUTH_SERVICE : BIOMETRIC_AUTH_SERVICE;

const setAuthenticationMarker = async (option: KeychainSecurityOption): Promise<void> => {
  const service = authenticationService(option);
  const stored = await Keychain.setGenericPassword(service, 'authentication-required', getAuthenticationOptions(option, service));
  if (!stored) throw new Error(loc.settings.biometrics_fail);
};

const resetAuthenticationMarker = async (option: KeychainSecurityOption): Promise<void> => {
  await Keychain.resetGenericPassword({ service: authenticationService(option) });
};

const restoreSecurityOption = async (option: AppUnlockPolicy): Promise<void> => {
  let rollbackError: unknown;
  try {
    await BlueApp.setKeychainDataProtection(option === 'disabled' ? undefined : option);
  } catch (error) {
    rollbackError = error;
  }
  if (option === 'disabled') {
    try {
      await resetAuthenticationMarker('biometricsOrPasscode');
      await resetAuthenticationMarker('devicePasscode');
    } catch (error) {
      rollbackError ??= error;
    }
  } else {
    try {
      await setAuthenticationMarker(option);
      await resetAuthenticationMarker(option === 'devicePasscode' ? 'biometricsOrPasscode' : 'devicePasscode');
    } catch (error) {
      rollbackError ??= error;
    }
  }

  if (rollbackError) throw rollbackError;
};

const clearKeychain = async () => {
  try {
    console.debug('Wiping keychain');
    console.debug('Removing key: data');
    await BlueApp.removeItem('data');
    console.debug('Removed key: data');
    console.debug('Removing key: data_encrypted');
    await BlueApp.removeItem(BlueAppClass.LEGACY_FLAG_ENCRYPTED);
    console.debug('Removed key: data_encrypted');
    console.debug('Removing key: STORAGEKEY');
    await BlueApp.removeItem(STORAGEKEY);
    console.debug('Removed key: STORAGEKEY');
    console.debug('Removing biometric password');
    await Keychain.resetGenericPassword({
      service: BlueAppClass.BIOMETRIC_PASSWORD_SERVICE,
    });
    console.debug('Removed biometric password');
    console.debug('Removing biometric authentication entry');
    await Keychain.resetGenericPassword({ service: BIOMETRIC_AUTH_SERVICE });
    await Keychain.resetGenericPassword({
      service: DEVICE_PASSCODE_AUTH_SERVICE,
    });
    await Keychain.resetGenericPassword({ service: SECURITY_TOGGLE_PROMPT_SERVICE });
    await Keychain.resetGenericPassword({ service: SENSITIVE_ACTIONS_POLICY_SERVICE });
    await Keychain.resetGenericPassword({ service: SENSITIVE_ACTIONS_BIOMETRIC_SERVICE });
    await Keychain.resetGenericPassword({ service: SENSITIVE_ACTIONS_PASSCODE_SERVICE });
    console.debug('Removed biometric authentication entry');
    await BlueApp.clearStoragePasswordsFromKeychain();
    BlueApp.clearInMemoryWalletData();
    publishSecurityOption('disabled');
    publishSensitiveActionsOption('disabled');
    NavigationService.reset();
  } catch (error: any) {
    console.warn(error);
    presentAlert({ message: error.message });
  }
};

const showAuthenticationUnavailableResetAlert = () => {
  Alert.alert(
    loc.settings.encrypt_tstorage,
    loc.settings.biom_remove_decrypt,
    [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc.receive.reset,
        style: 'destructive',
        onPress: async () => await clearKeychain(),
      },
    ],
    { cancelable: false },
  );
};

const performKeychainAuthentication = async (requestedOption?: KeychainSecurityOption, requestedService?: string) => {
  try {
    const configuredOption = requestedOption ?? (await getConfiguredSecurityOption());
    if (configuredOption === 'disabled') {
      console.debug('[useKeychainAuthentication] Refusing system authentication without a configured security policy');
      return false;
    }
    const securityOption = configuredOption;
    const availability = await getBiometricAvailability();
    const passcodeAvailable = await Keychain.isPasscodeAuthAvailable();
    console.debug('[useKeychainAuthentication] Starting system authentication:', { securityOption, availability, passcodeAvailable });
    if (securityOption === 'devicePasscode' && !passcodeAvailable) {
      console.debug('[useKeychainAuthentication] Device credential authentication unavailable');
      presentAlert({
        message: Platform.OS === 'android' ? loc.settings.device_screen_lock_required : loc.settings.device_passcode_required,
      });
      return false;
    }
    if (requestedService === SENSITIVE_ACTIONS_BIOMETRIC_SERVICE && availability !== 'available') {
      presentAlert({ message: getBiometricAvailabilityMessage(availability) });
      return false;
    }
    if (availability !== 'available' && !passcodeAvailable) {
      console.debug('[useKeychainAuthentication] No supported system authentication available');
      presentAlert({ message: getBiometricAvailabilityMessage(availability) });
      return false;
    }

    const service = requestedService ?? (securityOption === 'devicePasscode' ? DEVICE_PASSCODE_AUTH_SERVICE : BIOMETRIC_AUTH_SERVICE);
    const options = getAuthenticationOptions(securityOption, service);
    if (!(await hasGenericPassword({ service }))) {
      if (requestedService) {
        console.warn('[useKeychainAuthentication] Sensitive-actions Keychain entry is missing for the configured policy:', securityOption);
        return false;
      }
      console.debug('[useKeychainAuthentication] Creating missing authentication marker for:', securityOption);
      await Keychain.setGenericPassword(service, 'authentication-required', options);
    }

    // On iOS, app unlock with the biometric-or-passcode policy must have an
    // explicit fresh LocalAuthentication result. A Keychain item created by an
    // older/interrupted migration might not actually carry its expected ACL;
    // merely receiving credentials from it must never count as authentication.
    if (!requestedService && securityOption === 'biometricsOrPasscode' && Platform.OS === 'ios') {
      const authenticated = await Keychain.requestAuthentication({
        authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        authenticationPrompt: {
          title: loc.settings.biom_conf_identity,
          cancel: loc._.cancel,
        },
      });
      console.debug('[useKeychainAuthentication] Explicit app-unlock authentication result:', authenticated);
      return authenticated;
    }

    // Sensitive biometric markers use BIOMETRY_CURRENT_SET on iOS. Prompt
    // first so every action gets fresh system UI, then read the protected
    // marker to preserve enrollment-change invalidation. Either check failing
    // denies access.
    if (requestedService === SENSITIVE_ACTIONS_BIOMETRIC_SERVICE && Platform.OS === 'ios') {
      const authenticated = await Keychain.requestAuthentication({
        authenticationType: AUTHENTICATION_TYPE.BIOMETRICS,
        authenticationPrompt: {
          title: loc.settings.biom_conf_identity,
          cancel: loc._.cancel,
        },
      });
      console.debug('[useKeychainAuthentication] Fresh sensitive-action biometric result:', authenticated);
      if (!authenticated) return false;
    }

    const markerAuthenticated = Boolean(await Keychain.getGenericPassword({ ...options, requireFreshAuthentication: true }));
    if (!markerAuthenticated) {
      console.debug('[useKeychainAuthentication] Protected authentication marker was not accessible:', securityOption);
      return false;
    }

    console.debug('[useKeychainAuthentication] System authentication result:', { securityOption, authenticated: true });
    return true;
  } catch (e: Error | any) {
    console.debug('Keychain authentication error', e);
    const message = getBiometricErrorMessage(e);
    if (message) presentAlert({ message });
    return false;
  }
};

const unlockAppWithAuthentication = async (): Promise<boolean> =>
  await runQueued('authentication', async () => await performKeychainAuthentication());

const performSecurityAuthentication = async (option: KeychainSecurityOption, biometricsOnly = false): Promise<boolean> => {
  const options = getSecurityPromptOptions(option, biometricsOnly);
  try {
    console.debug('[useKeychainAuthentication] Requesting fresh policy-change authentication:', option);
    const availability = await getBiometricAvailability();
    const passcodeAvailable = await Keychain.isPasscodeAuthAvailable();
    if (option === 'biometricsOrPasscode' && biometricsOnly && availability !== 'available') {
      console.debug('[useKeychainAuthentication] Biometric policy-change authentication unavailable:', availability);
      presentAlert({ message: getBiometricAvailabilityMessage(availability) });
      return false;
    }
    if (option === 'biometricsOrPasscode' && availability !== 'available' && !passcodeAvailable) {
      console.debug('[useKeychainAuthentication] Biometric-or-passcode policy-change authentication unavailable:', availability);
      presentAlert({ message: getBiometricAvailabilityMessage(availability) });
      return false;
    }
    if (option === 'devicePasscode' && !passcodeAvailable) {
      console.debug('[useKeychainAuthentication] Device credential policy-change authentication unavailable');
      presentAlert({
        message: Platform.OS === 'android' ? loc.settings.device_screen_lock_required : loc.settings.device_passcode_required,
      });
      return false;
    }

    if (option === 'biometricsOrPasscode' && Platform.OS === 'ios') {
      const authenticationType = biometricsOnly ? AUTHENTICATION_TYPE.BIOMETRICS : AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS;
      console.debug('[useKeychainAuthentication] Presenting explicit native security confirmation:', { authenticationType });
      const authenticated = await Keychain.requestAuthentication({
        authenticationType,
        authenticationPrompt: {
          title: loc.settings.biom_conf_identity,
          cancel: loc._.cancel,
        },
      });
      console.debug('[useKeychainAuthentication] Explicit native security confirmation result:', authenticated);
      return authenticated;
    }

    // Always create a new protected challenge. Reading it is the operation
    // that asks the OS for fresh biometric authentication.
    await Keychain.resetGenericPassword({
      service: SECURITY_TOGGLE_PROMPT_SERVICE,
    });
    const stored = await Keychain.setGenericPassword(SECURITY_TOGGLE_PROMPT_SERVICE, 'authentication-required', options);
    if (!stored) {
      console.debug('[useKeychainAuthentication] Could not create policy-change authentication challenge:', option);
      return false;
    }

    const authenticated = Boolean(await Keychain.getGenericPassword({ ...options, requireFreshAuthentication: true }));
    console.debug('[useKeychainAuthentication] Policy-change authentication result:', { option, authenticated });
    return authenticated;
  } catch (error: any) {
    console.debug('Keychain policy authentication error', error);
    const message = getBiometricErrorMessage(error);
    if (message) presentAlert({ message });
    return false;
  } finally {
    try {
      await Keychain.resetGenericPassword({
        service: SECURITY_TOGGLE_PROMPT_SERVICE,
      });
    } catch (_) {}
  }
};

const requestSecurityAuthentication = async (option: KeychainSecurityOption, biometricsOnly = false): Promise<boolean> =>
  await runQueued('authentication', async () => await performSecurityAuthentication(option, biometricsOnly));

const authenticateSensitiveAction = async (): Promise<boolean> => {
  try {
    const option = await getSensitiveActionsSecurityOption();
    // This is an authorization API: when the policy is Off there is no native
    // challenge to present, so the sensitive action is authorized immediately.
    // Callers must not read policy state separately, which avoids check/use
    // races and keeps unreadable Keychain state fail-closed in this function.
    if (option === 'disabled') return true;
    const service = option === 'devicePasscode' ? SENSITIVE_ACTIONS_PASSCODE_SERVICE : SENSITIVE_ACTIONS_BIOMETRIC_SERVICE;
    return await runQueued('authentication', async () => await performKeychainAuthentication(option, service));
  } catch (error) {
    console.warn('[useKeychainAuthentication] Unable to authenticate a sensitive action:', error);
    return false;
  }
};

const confirmSecurityOptionChange = async (
  currentOption: SecurityPolicy,
  nextOption: SecurityPolicy,
  biometricPolicyIsBiometricOnly = false,
): Promise<boolean> => {
  console.debug('[useKeychainAuthentication] Confirming security option change:', { currentOption, nextOption });
  if (currentOption === nextOption) {
    console.debug('[useKeychainAuthentication] Security option is unchanged');
    return true;
  }

  // The app-unlock biometric policy already accepts the device passcode as
  // its fallback. When changing it to passcode-only, a DEVICE_PASSCODE
  // Keychain read therefore proves both the current and requested policies.
  // Avoid authenticating the current policy separately: iOS would otherwise
  // present Face ID first, making the passcode-only selection appear to use
  // the wrong authentication method.
  if (currentOption === 'biometricsOrPasscode' && nextOption === 'devicePasscode' && !biometricPolicyIsBiometricOnly) {
    const authenticated = await requestSecurityAuthentication('devicePasscode');
    console.debug('[useKeychainAuthentication] Passcode-only transition confirmation result:', authenticated);
    return authenticated;
  }

  // Disabling or switching away must be approved with the method that is
  // currently protecting the app. This prevents possession of only the new
  // credential from replacing an existing policy.
  if (currentOption !== 'disabled' && !(await requestSecurityAuthentication(currentOption, biometricPolicyIsBiometricOnly))) {
    console.debug('[useKeychainAuthentication] Current security option confirmation failed:', currentOption);
    return false;
  }

  // Enabling or switching to a new method must prove that the new method works
  // before any Keychain entries are rewritten.
  // A newly selected biometric policy must prove that biometrics themselves
  // work. For an existing app-unlock policy, however, its documented device-
  // passcode fallback remains a valid way to authorize disabling or switching.
  const nextOptionRequiresBiometrics = biometricPolicyIsBiometricOnly || nextOption === 'biometricsOrPasscode';
  if (nextOption !== 'disabled' && !(await requestSecurityAuthentication(nextOption, nextOptionRequiresBiometrics))) {
    console.debug('[useKeychainAuthentication] New security option confirmation failed:', nextOption);
    return false;
  }

  console.debug('[useKeychainAuthentication] Security option change confirmed:', { currentOption, nextOption });
  return true;
};

const showKeychainWipeAlert = () => {
  if (Platform.OS === 'ios') {
    Alert.alert(
      loc.settings.encrypt_tstorage,
      loc.settings.biom_10times,
      [
        {
          text: loc._.cancel,
          onPress: () => {
            console.debug('Cancel Pressed');
          },
          style: 'cancel',
        },
        {
          text: loc._.ok,
          onPress: async () => {
            if (!(await isAuthenticationAvailable())) {
              presentAlert({ message: loc.settings.biom_no_passcode });
              return;
            }
            // A destructive reset always requires an explicit system check,
            // regardless of the user's sensitive-action policy.
            const isAuthenticated = await requestSecurityAuthentication('biometricsOrPasscode');
            if (isAuthenticated) {
              Alert.alert(
                loc.settings.encrypt_tstorage,
                loc.settings.biom_remove_decrypt,
                [
                  { text: loc._.cancel, style: 'cancel' },
                  {
                    text: loc._.ok,
                    style: 'destructive',
                    onPress: async () => await clearKeychain(),
                  },
                ],
                { cancelable: false },
              );
            }
          },
          style: 'default',
        },
      ],
      { cancelable: false },
    );
  }
};

const setAppUnlockSecurityOption = async (option: AppUnlockPolicy): Promise<boolean> =>
  await runQueued('policy', async () => {
    if (!isSecurityPolicy(option)) {
      console.debug('[useKeychainAuthentication] Rejecting unknown security option:', option);
      return false;
    }
    let previousOption: AppUnlockPolicy;
    try {
      previousOption = await getConfiguredSecurityOption();
    } catch (error) {
      console.warn('[useKeychainAuthentication] Refusing policy change because the current policy is unreadable:', error);
      presentAlert({ message: loc.settings.keychain_unavailable });
      return false;
    }

    console.debug('[useKeychainAuthentication] Security option change requested:', { previousOption, option });
    if (!(await confirmSecurityOptionChange(previousOption, option))) {
      console.debug('[useKeychainAuthentication] Security option change cancelled or rejected:', { previousOption, option });
      return false;
    }

    try {
      await BlueApp.removeBiometricPassword();
      if (option === 'disabled') {
        // Remove policy markers first. If unprotecting wallet data fails,
        // its authoritative data-protection marker remains enabled.
        await resetAuthenticationMarker('biometricsOrPasscode');
        await resetAuthenticationMarker('devicePasscode');
        await BlueApp.setKeychainDataProtection(undefined);
      } else {
        // Reprotect the real wallet-data entry first. It is the source of truth
        // if the app terminates before auxiliary markers are updated.
        await BlueApp.setKeychainDataProtection(option);
        await setAuthenticationMarker(option);
        await resetAuthenticationMarker(option === 'devicePasscode' ? 'biometricsOrPasscode' : 'devicePasscode');
      }
    } catch (error: any) {
      console.warn('[useKeychainAuthentication] Security option commit failed; restoring previous policy:', error);
      try {
        await restoreSecurityOption(previousOption);
      } catch (rollbackError) {
        console.error('[useKeychainAuthentication] Failed to restore previous security policy:', rollbackError);
      }
      presentAlert({ message: error?.message ?? loc.settings.biometrics_fail });
      return false;
    }

    // Legacy cleanup is not part of the security commit. A cleanup failure
    // must not roll back a policy that has already been written and verified.
    try {
      await BlueApp.removeItem(STORAGEKEY);
    } catch (error) {
      console.warn('[useKeychainAuthentication] Failed to remove legacy biometric preference:', error);
    }
    publishSecurityOption(option);
    console.debug('[useKeychainAuthentication] Security option persisted:', option);
    return true;
  });

const useKeychainAuthentication = () => {
  const [securityUseOption, setSecurityUseOptionState] = useState<AppUnlockPolicy | undefined>();
  const [securityStateStatus, setSecurityStateStatus] = useState<SecurityStateStatus>('loading');
  const [sensitiveActionsUseOption, setSensitiveActionsUseOptionState] = useState<SensitiveActionPolicy | undefined>();
  const [sensitiveActionsStateStatus, setSensitiveActionsStateStatus] = useState<SecurityStateStatus>('loading');

  useEffect(() => {
    let active = true;
    const fetchAuthenticationState = async () => {
      console.debug('[useKeychainAuthentication] Loading security state');
      const revisionAtStart = securityOptionRevision;
      const sensitiveRevisionAtStart = sensitiveActionsOptionRevision;
      const [securityResult, sensitiveResult] = await Promise.allSettled([
        getConfiguredSecurityOption(),
        migrateSensitiveActionsSecurityOption(),
      ]);
      if (!active) return;

      if (revisionAtStart === securityOptionRevision) {
        if (securityResult.status === 'fulfilled') {
          setSecurityUseOptionState(securityResult.value);
          setSecurityStateStatus('loaded');
        } else {
          console.warn('[useKeychainAuthentication] Unable to load app-unlock state:', securityResult.reason);
          setSecurityUseOptionState(undefined);
          setSecurityStateStatus('unavailable');
        }
      }

      if (sensitiveRevisionAtStart === sensitiveActionsOptionRevision) {
        if (sensitiveResult.status === 'fulfilled') {
          setSensitiveActionsUseOptionState(sensitiveResult.value);
          setSensitiveActionsStateStatus('loaded');
        } else {
          console.warn('[useKeychainAuthentication] Unable to load sensitive-actions state:', sensitiveResult.reason);
          setSensitiveActionsUseOptionState(undefined);
          setSensitiveActionsStateStatus('unavailable');
        }
      }
      console.debug('[useKeychainAuthentication] Security state loaded independently:', {
        securityStatus: securityResult.status,
        sensitiveStatus: sensitiveResult.status,
      });
    };

    fetchAuthenticationState();
    const listener = (option: AppUnlockPolicy) => {
      setSecurityUseOptionState(option);
      setSecurityStateStatus('loaded');
    };
    securityOptionListeners.add(listener);
    const sensitiveListener = (option: SensitiveActionPolicy) => {
      setSensitiveActionsUseOptionState(option);
      setSensitiveActionsStateStatus('loaded');
    };
    sensitiveActionsOptionListeners.add(sensitiveListener);
    return () => {
      active = false;
      securityOptionListeners.delete(listener);
      sensitiveActionsOptionListeners.delete(sensitiveListener);
    };
  }, []);

  const setSecurityUseOption = useCallback(setAppUnlockSecurityOption, []);

  const setSensitiveActionsUseOption = useCallback(
    async (option: SensitiveActionPolicy): Promise<boolean> =>
      await runQueued('policy', async () => {
        if (!isSecurityPolicy(option)) return false;

        let previousOption: SensitiveActionPolicy;
        try {
          previousOption = await migrateSensitiveActionsSecurityOption();
        } catch (error) {
          console.warn('[useKeychainAuthentication] Unable to read the sensitive-actions policy:', error);
          presentAlert({ message: loc.settings.keychain_unavailable });
          return false;
        }

        if (!(await confirmSecurityOptionChange(previousOption, option, true))) return false;

        try {
          await persistSensitiveActionsSecurityOption(option);
        } catch (error: any) {
          console.warn('[useKeychainAuthentication] Unable to save the sensitive-actions policy:', error);
          try {
            await persistSensitiveActionsSecurityOption(previousOption);
          } catch (rollbackError) {
            console.error('[useKeychainAuthentication] Failed to restore the previous sensitive-actions policy:', rollbackError);
          }
          presentAlert({ message: error?.message ?? loc.settings.biometrics_fail });
          return false;
        }

        publishSensitiveActionsOption(option);
        return true;
      }),
    [],
  );

  const isDevicePasscodeCapable = useCallback(async () => {
    const capable = await Keychain.isPasscodeAuthAvailable();
    console.debug('[useKeychainAuthentication] Device passcode capable:', capable);
    return capable;
  }, []);

  const getAuthenticationUseStatus = useCallback(async (): Promise<AuthenticationUseStatus> => {
    try {
      return (await getConfiguredSecurityOption()) === 'disabled' ? 'disabled' : 'enabled';
    } catch (error) {
      console.warn('[useKeychainAuthentication] Unable to read authentication preference:', error);
      return 'unavailable';
    }
  }, []);

  const getSecurityUseOption = useCallback(async (): Promise<AppUnlockPolicy> => await getConfiguredSecurityOption(), []);

  return {
    isDevicePasscodeCapable,
    getAuthenticationUseStatus,
    getSecurityUseOption,
    setSecurityUseOption,
    setSensitiveActionsUseOption,
    securityUseOption,
    securityStateStatus,
    sensitiveActionsUseOption,
    sensitiveActionsStateStatus,
    securityStateLoaded: securityStateStatus === 'loaded',
    clearKeychain,
    authenticationEnabled: securityUseOption !== undefined && securityUseOption !== 'disabled',
  };
};

export {
  useKeychainAuthentication,
  showKeychainWipeAlert,
  showAuthenticationUnavailableResetAlert,
  requestSecurityAuthentication,
  confirmSecurityOptionChange,
  authenticateSensitiveAction,
  unlockAppWithAuthentication,
  setAppUnlockSecurityOption,
};
