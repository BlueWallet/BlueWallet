import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  Animated,
  AppState,
  Dimensions,
  Easing,
  Image,
  InteractionManager,
  Keyboard,
  Linking,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import BlueTextCentered from '../components/BlueTextCentered';
import Button from '../components/Button';
import SafeArea from '../components/SafeArea';
import {
  BiometricType,
  BiometricAvailability,
  Biometrics as GenericBiometrics,
  getBiometricAvailabilityMessage,
  getBiometricErrorMessage,
  useBiometrics,
} from '../hooks/useBiometrics';
import {
  AuthenticationUseStatus,
  showAuthenticationUnavailableResetAlert,
  unlockAppWithAuthentication,
  useKeychainAuthentication,
} from '../hooks/useKeychainAuthentication';
import { BlueApp as BlueAppClass } from '../class/blue-app';
import type { KeychainSecurityOption } from '../class/blue-app';
import loc from '../loc';
import { useStorage } from '../hooks/context/useStorage';
import { PasswordInput, PasswordInputHandle } from '../components/PasswordInput';

export enum AuthType {
  Encrypted,
  Biometrics,
  None,
  BiometricsUnavailable,
  KeychainUnavailable,
}

export const Passcode = Platform.OS === 'android' ? 'Screen lock' : 'Passcode';
type AuthenticationDetail = BiometricType | typeof GenericBiometrics | typeof Passcode | undefined;

type ResolveAuthTypeOptions = {
  storageEncrypted: boolean;
  biometricUseStatus: AuthenticationUseStatus;
  authenticationAvailable: boolean;
};

export const resolveAuthType = ({ storageEncrypted, biometricUseStatus, authenticationAvailable }: ResolveAuthTypeOptions): AuthType => {
  // Encrypted Storage is password-only and takes precedence over biometrics.
  if (storageEncrypted) return AuthType.Encrypted;

  if (biometricUseStatus === 'unavailable') return AuthType.KeychainUnavailable;

  if (biometricUseStatus === 'enabled') {
    if (!authenticationAvailable) return AuthType.BiometricsUnavailable;
    return AuthType.Biometrics;
  }

  return AuthType.None;
};

type ResolveKeychainSecurityStateOptions = {
  dataProtection: KeychainSecurityOption | undefined;
  configuredOption: KeychainSecurityOption | 'disabled';
  configuredStatus: AuthenticationUseStatus;
};

export const resolveKeychainSecurityState = ({
  dataProtection,
  configuredOption,
  configuredStatus,
}: ResolveKeychainSecurityStateOptions): {
  option: KeychainSecurityOption | 'disabled';
  status: AuthenticationUseStatus;
} => {
  // The policy protecting the real wallet-data item is authoritative. An
  // auxiliary authentication marker must never be able to downgrade it to Off.
  if (dataProtection) return { option: dataProtection, status: 'enabled' };
  return { option: configuredOption, status: configuredStatus };
};

export const resolveUnlockStorageState = async (
  getDataProtection: () => Promise<KeychainSecurityOption | undefined>,
  isStorageEncrypted: () => Promise<boolean>,
): Promise<{ dataProtection: KeychainSecurityOption | undefined; storageEncrypted: boolean }> => {
  const dataProtection = await getDataProtection();
  return {
    dataProtection,
    storageEncrypted: dataProtection ? false : await isStorageEncrypted(),
  };
};

export const resolveUnlockButtonState = (isAuthenticating: boolean, isReady = true) => ({
  disabled: isAuthenticating || !isReady,
  showActivityIndicator: isAuthenticating,
});

type State = {
  auth: {
    type: AuthType;
    detail: AuthenticationDetail;
    availability?: BiometricAvailability;
    errorMessage?: string;
  };
  isAuthenticating: boolean;
  showPasswordInput: boolean;
  password: string;
  passwordError: boolean;
  isSuccess: boolean;
};

const SET_AUTH = 'SET_AUTH';
const SET_IS_AUTHENTICATING = 'SET_IS_AUTHENTICATING';
const SET_SHOW_PASSWORD_INPUT = 'SET_SHOW_PASSWORD_INPUT';
const SET_PASSWORD = 'SET_PASSWORD';
const SET_PASSWORD_ERROR = 'SET_PASSWORD_ERROR';
const SET_SUCCESS = 'SET_SUCCESS';

type Action =
  | {
      type: typeof SET_AUTH;
      payload: {
        type: AuthType;
        detail: AuthenticationDetail;
        availability?: BiometricAvailability;
        errorMessage?: string;
      };
    }
  | { type: typeof SET_IS_AUTHENTICATING; payload: boolean }
  | { type: typeof SET_SHOW_PASSWORD_INPUT; payload: boolean }
  | { type: typeof SET_PASSWORD; payload: string }
  | { type: typeof SET_PASSWORD_ERROR; payload: boolean }
  | { type: typeof SET_SUCCESS; payload: boolean };

const initialState: State = {
  auth: {
    type: AuthType.None,
    detail: undefined,
  },
  isAuthenticating: false,
  showPasswordInput: false,
  password: '',
  passwordError: false,
  isSuccess: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case SET_AUTH:
      return { ...state, auth: action.payload };
    case SET_IS_AUTHENTICATING:
      return { ...state, isAuthenticating: action.payload };
    case SET_SHOW_PASSWORD_INPUT:
      return { ...state, showPasswordInput: action.payload };
    case SET_PASSWORD:
      return { ...state, password: action.payload };
    case SET_PASSWORD_ERROR:
      return { ...state, passwordError: action.payload };
    case SET_SUCCESS:
      return { ...state, isSuccess: action.payload };
    default:
      return state;
  }
}

const UnlockWith: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isUnlockingWallets = useRef(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const passwordInputRef = useRef<PasswordInputHandle>(null);
  const passwordResolveRef = useRef<((password: string | undefined) => void) | null>(null);
  const storageEncryptedRef = useRef(false);
  const shouldRestartOnForegroundRef = useRef(false);
  const autoUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoUnlockInteractionRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const startUnlockRef = useRef<() => Promise<void>>(async () => {});
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useStorage();
  const { deviceBiometricType, getBiometricAvailability } = useBiometrics();
  const { getAuthenticationUseStatus, getSecurityUseOption, isDevicePasscodeCapable } = useKeychainAuthentication();
  const deviceCredentialRequiredMessage =
    Platform.OS === 'android' ? loc.settings.device_screen_lock_required : loc.settings.device_passcode_required;

  useEffect(() => {
    // Entering the lock screen starts a new authentication session. Never
    // reuse wallet data unlocked by an earlier foreground session.
    BlueAppClass.getInstance().lockKeychainData();
    setWalletsInitialized(false);
  }, [setWalletsInitialized]);

  useEffect(() => {
    const windowHeight = Dimensions.get('window').height;

    const animateToKeyboardPosition = (event: any, fallbackDuration = 220) => {
      const keyboardTop = event?.endCoordinates?.screenY ?? windowHeight;
      const keyboardHeight = Math.max(0, windowHeight - keyboardTop);
      const target = -Math.min(Math.max(keyboardHeight * 0.28, 0), 96);

      Animated.timing(keyboardOffset, {
        toValue: target,
        duration: event?.duration ?? fallbackDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const resetPosition = (event?: any) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: event?.duration ?? 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', animateToKeyboardPosition),
            Keyboard.addListener('keyboardWillHide', resetPosition),
          ]
        : [Keyboard.addListener('keyboardDidShow', animateToKeyboardPosition), Keyboard.addListener('keyboardDidHide', resetPosition)];

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, [keyboardOffset]);

  const successfullyAuthenticated = useCallback(() => {
    setWalletsInitialized(true);
    isUnlockingWallets.current = false;
  }, [setWalletsInitialized]);

  const unlockUsingAuthentication = useCallback(async () => {
    if (isUnlockingWallets.current) return;
    isUnlockingWallets.current = true;
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    try {
      const refreshAuthTypeAfterFailure = async () => {
        const configuredStatus = await getAuthenticationUseStatus();
        const configuredOption = await getSecurityUseOption();
        const dataProtection = await BlueAppClass.getInstance().getKeychainDataProtection();
        const { status: biometricUseStatus, option: selectedSecurityOption } = resolveKeychainSecurityState({
          dataProtection,
          configuredOption,
          configuredStatus,
        });
        const availability = await getBiometricAvailability();
        const passcodeAvailable = await isDevicePasscodeCapable();
        const authenticationAvailable =
          selectedSecurityOption === 'devicePasscode' ? passcodeAvailable : availability === 'available' || passcodeAvailable;
        const authType = resolveAuthType({
          storageEncrypted: storageEncryptedRef.current,
          biometricUseStatus,
          authenticationAvailable,
        });
        if (authType === AuthType.BiometricsUnavailable || authType === AuthType.KeychainUnavailable) {
          dispatch({
            type: SET_AUTH,
            payload: {
              type: authType,
              detail: undefined,
              availability,
              errorMessage: selectedSecurityOption === 'devicePasscode' ? deviceCredentialRequiredMessage : undefined,
            },
          });
        }
      };

      const blueApp = BlueAppClass.getInstance();
      const dataIsBiometricProtected = await blueApp.hasKeychainDataBiometricProtection();
      let authenticated: boolean;

      if (dataIsBiometricProtected) {
        // This is the single authentication operation for protected app data.
        // Requiring a fresh read of the real item avoids a second independent
        // Face ID challenge and keeps its Keychain ACL authoritative.
        authenticated = await blueApp.unlockKeychainDataWithBiometrics(true);
      } else {
        // One-time upgrade path for users whose biometric setting predates
        // wallet-data access control. Authenticate the real protected marker,
        // then atomically rewrap the existing data before loading it.
        authenticated = await unlockAppWithAuthentication();
        if (authenticated) {
          const selectedSecurityOption = await getSecurityUseOption();
          await blueApp.setKeychainDataProtection(selectedSecurityOption === 'devicePasscode' ? 'devicePasscode' : 'biometricsOrPasscode');
        }
      }
      if (!authenticated) {
        await refreshAuthTypeAfterFailure();
        return;
      }

      const unlocked = await startAndDecrypt(false, undefined, undefined, false, true);
      if (unlocked) {
        successfullyAuthenticated();
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);

        // A cancelled prompt leaves the biometric state valid and retryable;
        // capability or preference-read changes fail closed.
        await refreshAuthTypeAfterFailure();
      }
    } catch (error) {
      console.warn('Unable to unlock from Keychain:', error);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      dispatch({
        type: SET_AUTH,
        payload: {
          type: AuthType.KeychainUnavailable,
          detail: undefined,
          errorMessage: getBiometricErrorMessage(error),
        },
      });
    } finally {
      dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
      isUnlockingWallets.current = false;
    }
  }, [
    deviceCredentialRequiredMessage,
    getBiometricAvailability,
    getAuthenticationUseStatus,
    getSecurityUseOption,
    isDevicePasscodeCapable,
    startAndDecrypt,
    successfullyAuthenticated,
  ]);

  const promptForPassword = useCallback(async (): Promise<string | undefined> => {
    return new Promise(resolve => {
      passwordResolveRef.current = resolve;
      dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
      dispatch({ type: SET_SHOW_PASSWORD_INPUT, payload: true });
      // Focus the input after a delay to ensure it's fully rendered
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 300);
    });
  }, []);

  const handlePasswordSubmit = useCallback(async (password: string) => {
    if (!passwordResolveRef.current) return;

    const resolve = passwordResolveRef.current;
    passwordResolveRef.current = null;
    passwordInputRef.current?.blur();
    Keyboard.dismiss();
    dispatch({ type: SET_PASSWORD_ERROR, payload: false });
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    // Let startAndDecrypt try the password
    resolve(password);

    // We'll get the result through the unlockWithKey callback
  }, []);

  const unlockWithKey = useCallback(
    async (isRetry = false) => {
      if (isUnlockingWallets.current) return;
      isUnlockingWallets.current = true;
      dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

      let result: boolean;
      try {
        result = await startAndDecrypt(isRetry, promptForPassword, undefined, storageEncryptedRef.current);
      } catch (error) {
        console.warn('Unable to load data from Keychain:', error);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        dispatch({
          type: SET_AUTH,
          payload: { type: AuthType.KeychainUnavailable, detail: undefined },
        });
        dispatch({ type: SET_SHOW_PASSWORD_INPUT, payload: false });
        dispatch({ type: SET_PASSWORD, payload: '' });
        dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
        isUnlockingWallets.current = false;
        return;
      }

      if (result) {
        if (storageEncryptedRef.current) {
          // Older builds may have retained the encryption password behind a
          // biometric Keychain entry. Remove it only after the real password
          // has successfully decrypted storage, avoiding an upgrade lockout.
          try {
            await BlueAppClass.getInstance().removeBiometricPassword();
          } catch (error) {
            console.warn('Unable to remove obsolete biometric password:', error);
            dispatch({
              type: SET_AUTH,
              payload: {
                type: AuthType.KeychainUnavailable,
                detail: undefined,
              },
            });
            dispatch({ type: SET_SHOW_PASSWORD_INPUT, payload: false });
            dispatch({ type: SET_PASSWORD, payload: '' });
            dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
            isUnlockingWallets.current = false;
            return;
          }
        }
        dispatch({ type: SET_SUCCESS, payload: true });
        passwordInputRef.current?.showSuccess();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        // Wait a bit to show success animation
        setTimeout(() => {
          successfullyAuthenticated();
        }, 800);
      } else {
        // Wrong password - show error and retry
        dispatch({ type: SET_PASSWORD_ERROR, payload: true });
        passwordInputRef.current?.showError();
        dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
        isUnlockingWallets.current = false;
        // Wait for shake animation to complete, then retry
        setTimeout(() => {
          unlockWithKey(true);
        }, 500); // After shake animation completes (320ms) + small delay
      }
    },
    [startAndDecrypt, successfullyAuthenticated, promptForPassword],
  );

  const startUnlock = useCallback(async () => {
    try {
      dispatch({ type: SET_SHOW_PASSWORD_INPUT, payload: false });
      dispatch({ type: SET_PASSWORD, payload: '' });
      dispatch({ type: SET_PASSWORD_ERROR, payload: false });
      dispatch({ type: SET_SUCCESS, payload: false });

      // A protected wallet-data entry is necessarily system-authenticated, so
      // do not read it merely to determine whether password storage is active.
      // Reading that entry would display a Keychain prompt before this screen
      // has selected and presented the correct unlock mode.
      const { dataProtection, storageEncrypted } = await resolveUnlockStorageState(
        () => BlueAppClass.getInstance().getKeychainDataProtection(),
        isStorageEncrypted,
      );
      storageEncryptedRef.current = storageEncrypted;

      if (storageEncrypted) {
        dispatch({
          type: SET_AUTH,
          payload: { type: AuthType.Encrypted, detail: undefined },
        });
        unlockWithKey();
        return;
      }

      const configuredStatus = await getAuthenticationUseStatus();
      const configuredOption = await getSecurityUseOption();
      const { status: biometricUseStatus, option: selectedSecurityOption } = resolveKeychainSecurityState({
        dataProtection,
        configuredOption,
        configuredStatus,
      });
      console.debug('[UnlockWith] Resolved Keychain app-unlock policy:', {
        dataProtection,
        configuredOption,
        configuredStatus,
        selectedSecurityOption,
        biometricUseStatus,
      });
      const availability = biometricUseStatus === 'enabled' ? await getBiometricAvailability() : undefined;
      const passcodeAvailable = biometricUseStatus === 'enabled' ? await isDevicePasscodeCapable() : false;
      const authenticationAvailable =
        selectedSecurityOption === 'devicePasscode' ? passcodeAvailable : availability === 'available' || passcodeAvailable;
      const authType = resolveAuthType({
        storageEncrypted,
        biometricUseStatus,
        authenticationAvailable,
      });
      const authenticationDetail =
        authType === AuthType.Biometrics ? (selectedSecurityOption === 'devicePasscode' ? Passcode : deviceBiometricType) : undefined;

      dispatch({
        type: SET_AUTH,
        payload: {
          type: authType,
          detail: authenticationDetail,
          availability,
          errorMessage:
            authType === AuthType.BiometricsUnavailable && selectedSecurityOption === 'devicePasscode'
              ? deviceCredentialRequiredMessage
              : undefined,
        },
      });
      if (authType === AuthType.Biometrics) {
        unlockUsingAuthentication();
      } else if (authType === AuthType.Encrypted || authType === AuthType.None) {
        unlockWithKey();
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      }
    } catch (error) {
      console.warn('Unable to determine Keychain unlock state:', error);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      dispatch({
        type: SET_AUTH,
        payload: {
          type: AuthType.KeychainUnavailable,
          detail: undefined,
          errorMessage: getBiometricErrorMessage(error),
        },
      });
    }
  }, [
    deviceBiometricType,
    deviceCredentialRequiredMessage,
    getBiometricAvailability,
    getAuthenticationUseStatus,
    getSecurityUseOption,
    isStorageEncrypted,
    isDevicePasscodeCapable,
    unlockUsingAuthentication,
    unlockWithKey,
  ]);

  useEffect(() => {
    startUnlockRef.current = startUnlock;
  }, [startUnlock]);

  const cancelScheduledAutoUnlock = useCallback(() => {
    autoUnlockInteractionRef.current?.cancel();
    autoUnlockInteractionRef.current = null;
    if (autoUnlockTimeoutRef.current) clearTimeout(autoUnlockTimeoutRef.current);
    autoUnlockTimeoutRef.current = null;
  }, []);

  const scheduleAutoUnlock = useCallback(() => {
    cancelScheduledAutoUnlock();
    autoUnlockInteractionRef.current = InteractionManager.runAfterInteractions(() => {
      autoUnlockInteractionRef.current = null;
      // LocalAuthentication requests issued while the native-stack transition
      // is still settling can fail without presenting Face ID. Give the active
      // screen one short, deterministic window after interactions complete.
      autoUnlockTimeoutRef.current = setTimeout(() => {
        autoUnlockTimeoutRef.current = null;
        if (AppState.currentState === 'active') startUnlockRef.current();
        else shouldRestartOnForegroundRef.current = true;
      }, 350);
    });
  }, [cancelScheduledAutoUnlock]);

  useEffect(() => {
    if (AppState.currentState === 'active') scheduleAutoUnlock();
    else shouldRestartOnForegroundRef.current = true;

    return cancelScheduledAutoUnlock;
  }, [cancelScheduledAutoUnlock, scheduleAutoUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && (shouldRestartOnForegroundRef.current || state.auth.type === AuthType.BiometricsUnavailable)) {
        shouldRestartOnForegroundRef.current = false;
        scheduleAutoUnlock();
      }
    });

    return () => subscription.remove();
  }, [scheduleAutoUnlock, state.auth.type]);

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      dispatch({
        type: SET_AUTH,
        payload: {
          type: AuthType.KeychainUnavailable,
          detail: undefined,
          errorMessage: getBiometricErrorMessage(error),
        },
      });
    }
  };

  const onUnlockPressed = () => {
    if (state.isAuthenticating) return;

    if (state.auth.type === AuthType.Biometrics) {
      unlockUsingAuthentication();
    } else {
      unlockWithKey();
    }
  };

  const renderUnlockOptions = () => {
    if (state.showPasswordInput) {
      return (
        <View style={styles.passwordContainer}>
          {state.auth.type === AuthType.Encrypted && <BlueTextCentered>{loc._.storage_is_encrypted}</BlueTextCentered>}
          {state.auth.type === AuthType.Encrypted && <View style={styles.passwordMessageSpacing} />}
          <PasswordInput
            ref={passwordInputRef}
            onSubmit={handlePasswordSubmit}
            placeholder={loc._.enter_password}
            disabled={state.isAuthenticating}
            onChangeText={text => {
              dispatch({ type: SET_PASSWORD, payload: text });
            }}
          />
          {state.passwordError && (
            <>
              <View style={styles.passwordErrorSpacing} />
              <BlueTextCentered>{loc._.bad_password}</BlueTextCentered>
            </>
          )}
          {!state.isSuccess && (
            <>
              <View style={styles.buttonSpacing} />
              <Button
                onPress={() => {
                  const password = passwordInputRef.current?.getValue() || '';
                  handlePasswordSubmit(password);
                }}
                title={loc._.unlock}
                testID="PasswordUnlockButton"
                {...resolveUnlockButtonState(state.isAuthenticating, state.password.length > 0)}
              />
            </>
          )}
        </View>
      );
    }

    switch (state.auth.type) {
      case AuthType.Biometrics:
        return (
          <Button
            onPress={onUnlockPressed}
            title={loc._.unlock}
            testID="SystemAuthenticationUnlockButton"
            {...resolveUnlockButtonState(state.isAuthenticating)}
          />
        );
      case AuthType.Encrypted:
        return (
          <Button
            onPress={onUnlockPressed}
            title={loc._.unlock}
            testID="PasswordUnlockButton"
            {...resolveUnlockButtonState(state.isAuthenticating)}
          />
        );
      case AuthType.BiometricsUnavailable:
        return (
          <View style={styles.biometricsUnavailableContainer}>
            <BlueTextCentered>
              {state.auth.errorMessage ??
                getBiometricAvailabilityMessage(
                  state.auth.availability && state.auth.availability !== 'available' ? state.auth.availability : 'unavailable',
                )}
            </BlueTextCentered>
            <View style={styles.buttonSpacing} />
            <Button onPress={openSystemSettings} title={loc.send.open_settings} testID="OpenBiometricSettings" />
            <View style={styles.buttonSpacing} />
            <Button onPress={showAuthenticationUnavailableResetAlert} title={loc.receive.reset} />
          </View>
        );
      case AuthType.KeychainUnavailable:
        return (
          <View style={styles.biometricsUnavailableContainer}>
            <BlueTextCentered>{state.auth.errorMessage ?? loc.settings.keychain_unavailable}</BlueTextCentered>
            <View style={styles.buttonSpacing} />
            <Button onPress={startUnlock} title={loc._.refresh} />
            <View style={styles.buttonSpacing} />
            <Button onPress={showAuthenticationUnavailableResetAlert} title={loc.receive.reset} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeArea style={styles.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.keyboardAvoidingView}>
          <Animated.View style={[styles.contentContainer, { transform: [{ translateY: keyboardOffset }] }]}>
            <View style={styles.logoContainer}>
              <Image source={require('../img/icon.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.biometricRow}>{renderUnlockOptions()}</View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  biometricRow: {
    justifyContent: 'center',
    flexDirection: 'row',
    width: 300,
    minHeight: 60,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  biometricsUnavailableContainer: {
    width: '100%',
  },
  logoImage: {
    width: 100,
    height: 75,
  },
  passwordContainer: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  buttonSpacing: {
    height: 16,
  },
  passwordMessageSpacing: {
    height: 12,
  },
  passwordErrorSpacing: {
    height: 8,
  },
});

export default UnlockWith;
