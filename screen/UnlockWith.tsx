import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import Icon, { type MaterialIconName } from '../components/Icon';
import { SettingsButton, useSettingsPalette } from '../components/settings/SettingsUI';
import { BiometricType, unlockWithBiometrics, useBiometrics } from '../hooks/useBiometrics';
import loc from '../loc';
import presentAlert from '../components/Alert';
import { useStorage } from '../hooks/context/useStorage';
import { PasswordInput, PasswordInputHandle } from '../components/PasswordInput';
import { StorageRecoverableError, type RestoreChoice } from '../class/storage-errors';
import { getRestoreChoices, getRestoreScope } from '../blue_modules/start-and-decrypt';
import { appAlert } from '../components/AppDialog';

const NEURAI_LOGO = require('../img/addWallet/neurai.png');
const BRAND = 'Neurai Wallet';

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
  /** The last password was wrong; cleared when the user types again. */
  wrongPassword: boolean;
  /** A typed password is being checked (the key derivation takes a moment). */
  checking: boolean;
};

const SET_AUTH = 'SET_AUTH';
const SET_IS_AUTHENTICATING = 'SET_IS_AUTHENTICATING';
const SET_SHOW_PASSWORD_INPUT = 'SET_SHOW_PASSWORD_INPUT';
const SET_PASSWORD = 'SET_PASSWORD';
const SET_SUCCESS = 'SET_SUCCESS';
const SET_CAN_RESTORE_BACKUP = 'SET_CAN_RESTORE_BACKUP';
const SET_WRONG_PASSWORD = 'SET_WRONG_PASSWORD';
const SET_CHECKING = 'SET_CHECKING';

type Action =
  | { type: typeof SET_AUTH; payload: { type: AuthType; detail: keyof typeof BiometricType | undefined } }
  | { type: typeof SET_IS_AUTHENTICATING; payload: boolean }
  | { type: typeof SET_SHOW_PASSWORD_INPUT; payload: boolean }
  | { type: typeof SET_PASSWORD; payload: string }
  | { type: typeof SET_SUCCESS; payload: boolean }
  | { type: typeof SET_CAN_RESTORE_BACKUP; payload: RestoreChoice[] }
  | { type: typeof SET_WRONG_PASSWORD; payload: boolean }
  | { type: typeof SET_CHECKING; payload: boolean };

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
  wrongPassword: false,
  checking: false,
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
    case SET_WRONG_PASSWORD:
      return { ...state, wrongPassword: action.payload };
    case SET_CHECKING:
      return { ...state, checking: action.payload };
    default:
      return state;
  }
}

const UnlockWith: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isUnlockingWallets = useRef(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const [keyboardShown, setKeyboardShown] = useState(false);
  const passwordInputRef = useRef<PasswordInputHandle>(null);
  const passwordResolveRef = useRef<((password: string | undefined) => void) | null>(null);
  /** The ordinary unlock, for a restore that found the store readable again (defined below). */
  const startUnlockRef = useRef<() => void>(() => {});
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useStorage();
  const { deviceBiometricType, isBiometricUseCapableAndEnabled, isBiometricUseEnabled, clearKeychain } = useBiometrics();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setWalletsInitialized(false);
  }, [setWalletsInitialized]);

  useEffect(() => {
    const windowHeight = Dimensions.get('window').height;

    const animateToKeyboardPosition = (event: any, fallbackDuration = 220) => {
      const keyboardTop = event?.endCoordinates?.screenY ?? windowHeight;
      const keyboardHeight = Math.max(0, windowHeight - keyboardTop);
      const target = -Math.min(Math.max(keyboardHeight * 0.28, 0), 96);
      setKeyboardShown(keyboardHeight > 0);

      Animated.timing(keyboardOffset, {
        toValue: target,
        duration: event?.duration ?? fallbackDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const resetPosition = (event?: any) => {
      setKeyboardShown(false);
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
    dispatch({ type: SET_CHECKING, payload: true });

    // The key derivation holds the JS thread for a moment: let the spinner
    // draw first. The result comes back through unlockWithKey.
    setTimeout(() => resolve(password), 50);
  }, []);

  /** `restoreChoice`: the id of the backup copy the user chose to restore (it may ask for its password or biometrics). */
  const unlockWithKey = useCallback(
    async (isRetry = false, restoreChoice?: string) => {
      if (isUnlockingWallets.current || state.isAuthenticating) return;
      isUnlockingWallets.current = true;
      dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

      const result = await startAndDecrypt(isRetry, promptForPassword, { fromBackup: restoreChoice });
      if (result !== 'unlocked') dispatch({ type: SET_CHECKING, payload: false });

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
        dispatch({ type: SET_WRONG_PASSWORD, payload: true });
        dispatch({ type: SET_PASSWORD, payload: '' });
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
    appAlert(
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
      appAlert(
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

  /** Round icon above a message in the card. */
  const cardIcon = (name: MaterialIconName, tone: 'accent' | 'warn' = 'accent') => (
    <View style={[styles.cardIcon, { backgroundColor: tone === 'warn' ? p.warnIconBg : p.accentSoft }]}>
      <Icon name={name} type="material" size={30} color={p.accentText} />
    </View>
  );

  const renderUnlockOptions = () => {
    if (state.isAuthenticating && !state.showPasswordInput) {
      return <ActivityIndicator color={p.accent} style={styles.spinner} />;
    }

    if (state.showPasswordInput) {
      return (
        <View style={styles.form}>
          <PasswordInput
            ref={passwordInputRef}
            onSubmit={handlePasswordSubmit}
            placeholder={loc._.enter_password}
            disabled={state.checking}
            error={state.wrongPassword}
            onChangeText={text => {
              dispatch({ type: SET_PASSWORD, payload: text });
              if (state.wrongPassword) dispatch({ type: SET_WRONG_PASSWORD, payload: false });
            }}
          />
          {state.wrongPassword ? (
            <View style={styles.errorRow} accessibilityLiveRegion="polite" testID="UnlockWrongPassword">
              <Icon name="error-outline" type="material" size={18} color={p.fail.dot} />
              <Text style={[styles.errorText, { color: p.fail.fg }]}>{loc._.bad_password}</Text>
            </View>
          ) : null}
          {!state.isSuccess && (
            <SettingsButton
              title={loc._.unlock}
              icon="lock-open"
              onPress={() => handlePasswordSubmit(passwordInputRef.current?.getValue() || '')}
              disabled={state.password.length === 0}
              loading={state.checking}
              testID="UnlockButton"
            />
          )}
        </View>
      );
    }

    switch (state.auth.type) {
      case AuthType.Biometrics:
        return (
          <View style={styles.centered}>
            <Pressable
              onPress={onUnlockPressed}
              accessibilityRole="button"
              accessibilityLabel={loc._.unlock}
              style={({ pressed }) => [styles.bioButton, { backgroundColor: p.accentSoft }, pressed && styles.pressed]}
            >
              <Icon name="fingerprint" type="material" size={44} color={p.accentText} />
            </Pressable>
            <View style={styles.buttons}>
              <SettingsButton title={loc._.unlock} onPress={onUnlockPressed} testID="UnlockButton" />
            </View>
          </View>
        );
      case AuthType.Encrypted:
        return <SettingsButton title={loc._.unlock} icon="lock-open" onPress={onUnlockPressed} testID="UnlockButton" />;
      case AuthType.BiometricsUnavailable:
        return (
          <View style={styles.centered}>
            {cardIcon('fingerprint', 'warn')}
            <Text style={[styles.message, { color: p.mutedOnCard }]}>{loc.settings.biometrics_no_longer_available}</Text>
          </View>
        );
      case AuthType.StorageUnavailable:
        return (
          <View style={styles.centered} testID="StorageUnavailable">
            {cardIcon('report-problem', 'warn')}
            <Text style={[styles.cardTitle, { color: p.ink }]}>{loc.settings.storage_unavailable_title}</Text>
            <Text style={[styles.message, { color: p.mutedOnCard }]}>{loc.settings.storage_unavailable_message}</Text>
            <View style={styles.buttons}>
              <SettingsButton title={loc.settings.storage_retry} icon="refresh" onPress={onUnlockPressed} testID="StorageRetryButton" />
              {state.restoreChoices.map((choice, index) => (
                <SettingsButton
                  key={choice.id}
                  variant="secondary"
                  icon="restore"
                  testID={`StorageRestoreBackupButton-${index}`}
                  title={restoreLabel(choice, state.restoreChoices.length > 1)}
                  onPress={() => confirmRestoreBackup(choice, state.restoreChoices.length > 1)}
                />
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const options = renderUnlockOptions();
  const subtitle = state.showPasswordInput
    ? loc._.unlock_subtitle_password
    : state.auth.type === AuthType.Biometrics
      ? loc._.unlock_subtitle_biometrics
      : null;
  // The way out when the password is lost or the store cannot be read: deletes everything, after a
  // confirmation. Not while typing: it would sit on the keyboard's edge.
  const showStartFresh =
    !keyboardShown && ((state.showPasswordInput && !state.isSuccess) || state.auth.type === AuthType.StorageUnavailable);

  return (
    <View style={[styles.root, { backgroundColor: p.ground, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <Animated.View style={[styles.content, { transform: [{ translateY: keyboardOffset }] }]}>
            <View style={styles.brand}>
              <View style={[styles.logoRing, { backgroundColor: p.card, shadowColor: p.shadow }]}>
                <Image source={NEURAI_LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
              <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
                {BRAND}
              </Text>
              {subtitle ? <Text style={[styles.subtitle, { color: p.muted }]}>{subtitle}</Text> : null}
            </View>
            {options ? <View style={[styles.card, { backgroundColor: p.card }]}>{options}</View> : null}
            {showStartFresh ? (
              <Pressable
                onPress={confirmStartFresh}
                hitSlop={8}
                accessibilityRole="button"
                testID="StartFreshButton"
                style={({ pressed }) => [styles.startFresh, pressed && styles.pressed]}
              >
                <Text style={[styles.startFreshText, { color: p.muted }]}>{loc.settings.reset_storage_button}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, rowGap: 24 },
  brand: { alignItems: 'center', rowGap: 10 },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: { width: 88, height: 88 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  card: { borderRadius: 24, padding: 20, width: '100%', maxWidth: 420, alignSelf: 'center' },
  form: { rowGap: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6, marginTop: -4 },
  errorText: { fontSize: 14, lineHeight: 19, flexShrink: 1 },
  centered: { alignItems: 'center', rowGap: 14 },
  cardIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  buttons: { rowGap: 10, alignSelf: 'stretch', marginTop: 4 },
  bioButton: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  spinner: { paddingVertical: 24 },
  startFresh: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  startFreshText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});

export default UnlockWith;
