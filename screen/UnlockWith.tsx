import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueTextCentered } from '../BlueComponents';
import Button from '../components/Button';
import SafeArea from '../components/SafeArea';
import { BiometricType, unlockWithBiometrics, useBiometrics } from '../hooks/useBiometrics';
import loc from '../loc';
import presentAlert from '../components/Alert';
import { useStorage } from '../hooks/context/useStorage';
import { PasswordInput, PasswordInputHandle } from '../components/PasswordInput';
import { StorageRecoverableError, type RestoreChoice } from '../class/storage-errors';
import { getRestoreChoices, getRestoreScope } from '../blue_modules/start-and-decrypt';

enum AuthType {
  Encrypted,
  Biometrics,
  None,
  BiometricsUnavailable,
  /** The store could not be read: stay locked, offer retry or an explicit reset (H04). */
  StorageUnavailable,
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
  /** The backup copies the user can restore while the store is unreadable (none, one, or several that differ). */
  restoreChoices: RestoreChoice[];
};

const SET_AUTH = 'SET_AUTH';
const SET_IS_AUTHENTICATING = 'SET_IS_AUTHENTICATING';
const SET_SHOW_PASSWORD_INPUT = 'SET_SHOW_PASSWORD_INPUT';
const SET_PASSWORD = 'SET_PASSWORD';
const SET_SUCCESS = 'SET_SUCCESS';
const SET_CAN_RESTORE_BACKUP = 'SET_CAN_RESTORE_BACKUP';

type Action =
  | { type: typeof SET_AUTH; payload: { type: AuthType; detail: keyof typeof BiometricType | undefined } }
  | { type: typeof SET_IS_AUTHENTICATING; payload: boolean }
  | { type: typeof SET_SHOW_PASSWORD_INPUT; payload: boolean }
  | { type: typeof SET_PASSWORD; payload: string }
  | { type: typeof SET_SUCCESS; payload: boolean }
  | { type: typeof SET_CAN_RESTORE_BACKUP; payload: RestoreChoice[] };

const initialState: State = {
  auth: {
    type: AuthType.None,
    detail: undefined,
  },
  isAuthenticating: false,
  showPasswordInput: false,
  password: '',
  isSuccess: false,
  restoreChoices: [],
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
    case SET_CAN_RESTORE_BACKUP:
      return { ...state, restoreChoices: action.payload };
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
  /** The ordinary unlock, for a restore that found the store readable again (defined below). */
  const startUnlockRef = useRef<() => void>(() => {});
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useStorage();
  const { deviceBiometricType, isBiometricUseCapableAndEnabled, isBiometricUseEnabled, clearKeychain } = useBiometrics();

  useEffect(() => {
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

  /** What restoring the offered copies replaces: the whole store, or only the damaged bucket. */
  const restoreScope = useRef<'store' | 'bucket'>('store');

  const showStorageUnavailable = useCallback((restoreChoices: RestoreChoice[] = [], scope: 'store' | 'bucket' = 'store') => {
    restoreScope.current = scope;
    triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    dispatch({ type: SET_SHOW_PASSWORD_INPUT, payload: false });
    dispatch({ type: SET_CAN_RESTORE_BACKUP, payload: restoreChoices });
    dispatch({ type: SET_AUTH, payload: { type: AuthType.StorageUnavailable, detail: undefined } });
  }, []);

  const unlockUsingBiometrics = useCallback(async () => {
    if (isUnlockingWallets.current || state.isAuthenticating) return;
    isUnlockingWallets.current = true;
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    if (await unlockWithBiometrics()) {
      const result = await startAndDecrypt();
      if (result === 'unlocked') successfullyAuthenticated();
      else showStorageUnavailable(result === 'backup_available' ? getRestoreChoices() : [], getRestoreScope());
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

  /** `restoreChoice`: the id of the backup copy the user chose to restore (it may ask for its password or biometrics). */
  const unlockWithKey = useCallback(
    async (isRetry = false, restoreChoice?: string) => {
      if (isUnlockingWallets.current || state.isAuthenticating) return;
      isUnlockingWallets.current = true;
      dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

      const result = await startAndDecrypt(isRetry, promptForPassword, { fromBackup: restoreChoice });

      if (result === 'readable_again') {
        // The store reads again while the user was choosing: nothing was
        // restored, and it opens the usual way, with its own checks.
        presentAlert({ message: loc.settings.storage_readable_again });
        dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
        isUnlockingWallets.current = false;
        startUnlockRef.current();
        return;
      }

      if (result === 'not_authorized') {
        // The restore was not authorized: stay on the same choices, nothing was opened.
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
        isUnlockingWallets.current = false;
        return;
      }

      if (result === 'unavailable' || result === 'backup_available') {
        // The chosen copy is no longer what the user saw: nothing was restored,
        // the copies there are now are shown again.
        if (restoreChoice !== undefined && result === 'backup_available') presentAlert({ message: loc.settings.storage_restore_changed });
        showStorageUnavailable(result === 'backup_available' ? getRestoreChoices() : [], getRestoreScope());
        dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
        isUnlockingWallets.current = false;
        return;
      }

      if (result === 'unlocked') {
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
          unlockWithKey(true, restoreChoice);
        }, 500); // After shake animation completes (320ms) + small delay
      }
    },
    [state.isAuthenticating, startAndDecrypt, successfullyAuthenticated, promptForPassword, showStorageUnavailable],
  );

  const startUnlock = useCallback(async () => {
    let storageIsEncrypted: boolean;
    try {
      storageIsEncrypted = await isStorageEncrypted();
    } catch (error) {
      console.warn('[UnlockWith] storage cannot be read:', (error as Error).message);
      if (error instanceof StorageRecoverableError) showStorageUnavailable(error.choices, error.scope);
      else showStorageUnavailable();
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  startUnlockRef.current = startUnlock;

  useEffect(() => {
    startUnlock();
  }, [startUnlock]);

  const onUnlockPressed = () => {
    if (state.auth.type === AuthType.StorageUnavailable) {
      startUnlock();
    } else if (state.auth.type === AuthType.Biometrics) {
      unlockUsingBiometrics();
    } else {
      unlockWithKey();
    }
  };

  const confirmStartFresh = useCallback(() => {
    Alert.alert(
      loc.settings.reset_storage_title,
      loc.settings.reset_storage_message,
      [
        { text: loc._.cancel, style: 'cancel' },
        {
          text: loc.settings.reset_storage_confirm,
          style: 'destructive',
          onPress: async () => {
            // Stays locked when the reset did not reach the disk (H04).
            if (await clearKeychain()) successfullyAuthenticated();
          },
        },
      ],
      { cancelable: true },
    );
  }, [clearKeychain, successfullyAuthenticated]);

  const confirmRestoreBackup = useCallback(
    (choice: RestoreChoice, several: boolean) => {
      // Say what is replaced, and with which protection (sixth review).
      const message =
        restoreScope.current === 'bucket' ? loc.settings.storage_restore_bucket_message : loc.settings.storage_restore_backup_message;
      Alert.alert(
        loc.settings.storage_restore_backup_title,
        several ? `${message} ${loc.settings.storage_restore_backup_several}` : message,
        [
          { text: loc._.cancel, style: 'cancel' },
          { text: loc.settings.storage_restore_backup, onPress: () => unlockWithKey(false, choice.id) },
        ],
        { cancelable: true },
      );
    },
    [unlockWithKey],
  );

  /** One copy: "Restore the backup copy". Several that differ: one button each, with the date it was saved. */
  const restoreLabel = (choice: RestoreChoice, several: boolean) =>
    several && choice.savedAt
      ? String(loc.formatString(loc.settings.storage_restore_backup_dated, { date: new Date(choice.savedAt).toLocaleString() }))
      : loc.settings.storage_restore_backup;

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
              <View style={styles.linkSpacing} />
              <BlueButtonLink testID="StartFreshButton" title={loc.settings.reset_storage_button} onPress={confirmStartFresh} />
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
      case AuthType.StorageUnavailable:
        return (
          <View style={styles.passwordContainer} testID="StorageUnavailable">
            <BlueTextCentered>{loc.settings.storage_unavailable_title}</BlueTextCentered>
            <View style={styles.linkSpacing} />
            <BlueTextCentered>{loc.settings.storage_unavailable_message}</BlueTextCentered>
            <View style={styles.buttonSpacing} />
            <Button onPress={onUnlockPressed} title={loc.settings.storage_retry} testID="StorageRetryButton" />
            {state.restoreChoices.map((choice, index) => (
              <React.Fragment key={choice.id}>
                <View style={styles.linkSpacing} />
                <BlueButtonLink
                  testID={`StorageRestoreBackupButton-${index}`}
                  title={restoreLabel(choice, state.restoreChoices.length > 1)}
                  onPress={() => confirmRestoreBackup(choice, state.restoreChoices.length > 1)}
                />
              </React.Fragment>
            ))}
            <View style={styles.linkSpacing} />
            <BlueButtonLink testID="StartFreshButton" title={loc.settings.reset_storage_button} onPress={confirmStartFresh} />
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
  linkSpacing: {
    height: 10,
  },
});

export default UnlockWith;
