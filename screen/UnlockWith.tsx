import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueTextCentered } from '../BlueComponents';
import Button from '../components/Button';
import SafeArea from '../components/SafeArea';
import { BiometricType, unlockWithBiometrics, useBiometrics } from '../hooks/useBiometrics';
import loc from '../loc';
import { useStorage } from '../hooks/context/useStorage';
import { PasswordInput, PasswordInputHandle } from '../components/PasswordInput';

enum AuthType {
  Encrypted,
  Biometrics,
  None,
  BiometricsUnavailable,
}

type State = {
  auth: {
    type: AuthType;
    detail: keyof typeof BiometricType | undefined;
  };
  isAuthenticating: boolean;
  showPasswordInput: boolean;
  password: string;
  isSuccess: boolean;
};

const SET_AUTH = 'SET_AUTH';
const SET_IS_AUTHENTICATING = 'SET_IS_AUTHENTICATING';
const SET_SHOW_PASSWORD_INPUT = 'SET_SHOW_PASSWORD_INPUT';
const SET_PASSWORD = 'SET_PASSWORD';
const SET_SUCCESS = 'SET_SUCCESS';

type Action =
  | { type: typeof SET_AUTH; payload: { type: AuthType; detail: keyof typeof BiometricType | undefined } }
  | { type: typeof SET_IS_AUTHENTICATING; payload: boolean }
  | { type: typeof SET_SHOW_PASSWORD_INPUT; payload: boolean }
  | { type: typeof SET_PASSWORD; payload: string }
  | { type: typeof SET_SUCCESS; payload: boolean };

const initialState: State = {
  auth: {
    type: AuthType.None,
    detail: undefined,
  },
  isAuthenticating: false,
  showPasswordInput: false,
  password: '',
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
    case SET_SUCCESS:
      return { ...state, isSuccess: action.payload };
    default:
      return state;
  }
}

const UnlockWith: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isUnlockingWallets = useRef(false);
  const passwordInputRef = useRef<PasswordInputHandle>(null);
  const passwordResolveRef = useRef<((password: string | undefined) => void) | null>(null);
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useStorage();
  const { deviceBiometricType, isBiometricUseCapableAndEnabled, isBiometricUseEnabled } = useBiometrics();

  useEffect(() => {
    setWalletsInitialized(false);
  }, [setWalletsInitialized]);

  const successfullyAuthenticated = useCallback(() => {
    setWalletsInitialized(true);
    isUnlockingWallets.current = false;
  }, [setWalletsInitialized]);

  const unlockUsingBiometrics = useCallback(async () => {
    if (isUnlockingWallets.current || state.isAuthenticating) return;
    isUnlockingWallets.current = true;
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    if (await unlockWithBiometrics()) {
      await startAndDecrypt();
      successfullyAuthenticated();
    }

    dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
    isUnlockingWallets.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticating]);

  const promptForPassword = useCallback(async (): Promise<string | undefined> => {
    return new Promise(resolve => {
      passwordResolveRef.current = resolve;
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

    // Let startAndDecrypt try the password
    resolve(password);

    // We'll get the result through the unlockWithKey callback
  }, []);

  const unlockWithKey = useCallback(
    async (isRetry = false) => {
      if (isUnlockingWallets.current || state.isAuthenticating) return;
      isUnlockingWallets.current = true;
      dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

      const result = await startAndDecrypt(isRetry, promptForPassword);

      if (result) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch({ type: SET_SUCCESS, payload: true });
        passwordInputRef.current?.showSuccess();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        // Wait a bit to show success animation
        setTimeout(() => {
          successfullyAuthenticated();
        }, 800);
      } else {
        // Wrong password - show error and retry
        passwordInputRef.current?.showError();
        dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
        isUnlockingWallets.current = false;
        // Wait for shake animation to complete, then retry
        setTimeout(() => {
          unlockWithKey(true);
        }, 500); // After shake animation completes (320ms) + small delay
      }
    },
    [state.isAuthenticating, startAndDecrypt, successfullyAuthenticated, promptForPassword],
  );

  useEffect(() => {
    const startUnlock = async () => {
      const storageIsEncrypted = await isStorageEncrypted();
      const biometricUseCapableAndEnabled = await isBiometricUseCapableAndEnabled();
      const biometricsUseEnabled = await isBiometricUseEnabled();
      const biometricType = biometricUseCapableAndEnabled ? deviceBiometricType : undefined;

      if (storageIsEncrypted) {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.Encrypted, detail: undefined } });
        unlockWithKey();
      } else if (biometricUseCapableAndEnabled) {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.Biometrics, detail: biometricType } });
        unlockUsingBiometrics();
      } else if (biometricsUseEnabled && biometricType === undefined) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        dispatch({ type: SET_AUTH, payload: { type: AuthType.BiometricsUnavailable, detail: undefined } });
      } else {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.None, detail: undefined } });
        unlockWithKey();
      }
    };

    startUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUnlockPressed = () => {
    if (state.auth.type === AuthType.Biometrics) {
      unlockUsingBiometrics();
    } else {
      unlockWithKey();
    }
  };

  const renderUnlockOptions = () => {
    if (state.isAuthenticating && !state.showPasswordInput) {
      return <ActivityIndicator />;
    }

    if (state.showPasswordInput) {
      return (
        <View style={styles.passwordContainer}>
          <PasswordInput
            ref={passwordInputRef}
            onSubmit={handlePasswordSubmit}
            placeholder={loc._.enter_password}
            disabled={state.isAuthenticating}
            onChangeText={text => {
              dispatch({ type: SET_PASSWORD, payload: text });
            }}
          />
          {!state.isSuccess && (
            <>
              <View style={styles.buttonSpacing} />
              <Button
                onPress={() => {
                  const password = passwordInputRef.current?.getValue() || '';
                  handlePasswordSubmit(password);
                }}
                title={loc._.unlock}
                disabled={state.password.length === 0}
              />
            </>
          )}
        </View>
      );
    }

    switch (state.auth.type) {
      case AuthType.Biometrics:
      case AuthType.Encrypted:
        return <Button onPress={onUnlockPressed} title={loc._.unlock} />;
      case AuthType.BiometricsUnavailable:
        return <BlueTextCentered>{loc.settings.biometrics_no_longer_available}</BlueTextCentered>;
      default:
        return null;
    }
  };

  return (
    <SafeArea style={styles.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.contentContainer}>
            <View style={styles.logoContainer}>
              <Image source={require('../img/icon.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.biometricRow}>{renderUnlockOptions()}</View>
          </View>
        </KeyboardAvoidingView>
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
});

export default UnlockWith;
