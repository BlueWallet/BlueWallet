import React, { useCallback, useMemo, useReducer, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text } from 'react-native';
import { useBiometrics } from '../../hooks/useBiometrics';
import { AppUnlockPolicy, useKeychainAuthentication } from '../../hooks/useKeychainAuthentication';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { MODAL_TYPES } from '../PromptPasswordConfirmationSheet.types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';
import ToolTipMenu from '../../components/TooltipMenu';
import { Action as MenuAction } from '../../components/types';
import { useTheme } from '../../components/themes';

enum ActionType {
  StorageStateLoaded = 'STORAGE_STATE_LOADED',
  StorageStateFailed = 'STORAGE_STATE_FAILED',
  CapabilitiesLoaded = 'CAPABILITIES_LOADED',
  CapabilitiesFailed = 'CAPABILITIES_FAILED',
  SetLoading = 'SET_LOADING',
  SetCurrentLoadingSwitch = 'SET_CURRENT_LOADING_SWITCH',
}

type InitializationStatus = 'loading' | 'loaded' | 'unavailable';

type Action =
  | { type: ActionType.StorageStateLoaded; payload: boolean }
  | { type: ActionType.StorageStateFailed }
  | { type: ActionType.CapabilitiesLoaded; payload: Pick<State, 'deviceBiometricCapable' | 'devicePasscodeCapable'> }
  | { type: ActionType.CapabilitiesFailed }
  | { type: ActionType.SetLoading; payload: boolean }
  | { type: ActionType.SetCurrentLoadingSwitch; payload: string | null };

interface State {
  isLoading: boolean;
  storageIsEncryptedSwitchEnabled: boolean;
  deviceBiometricCapable: boolean;
  devicePasscodeCapable: boolean;
  currentLoadingSwitch: string | null;
  storageStatus: InitializationStatus;
  capabilitiesStatus: InitializationStatus;
}

const initialState: State = {
  isLoading: true,
  storageIsEncryptedSwitchEnabled: false,
  deviceBiometricCapable: false,
  devicePasscodeCapable: false,
  currentLoadingSwitch: null,
  storageStatus: 'loading',
  capabilitiesStatus: 'loading',
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.StorageStateLoaded:
      return {
        ...state,
        storageIsEncryptedSwitchEnabled: action.payload,
        isLoading: false,
        currentLoadingSwitch: null,
        storageStatus: 'loaded',
      };
    case ActionType.StorageStateFailed:
      return { ...state, isLoading: false, currentLoadingSwitch: null, storageStatus: 'unavailable' };
    case ActionType.CapabilitiesLoaded:
      return {
        ...state,
        deviceBiometricCapable: action.payload.deviceBiometricCapable,
        devicePasscodeCapable: action.payload.devicePasscodeCapable,
        capabilitiesStatus: 'loaded',
      };
    case ActionType.CapabilitiesFailed:
      return { ...state, capabilitiesStatus: 'unavailable' };
    case ActionType.SetLoading:
      return { ...state, isLoading: action.payload };
    case ActionType.SetCurrentLoadingSwitch:
      return { ...state, currentLoadingSwitch: action.payload };
    default:
      return state;
  }
};

const EncryptStorage = () => {
  const { isStorageEncrypted } = useStorage();
  const { isDeviceBiometricCapable, deviceBiometricType } = useBiometrics();
  const {
    isDevicePasscodeCapable,
    securityUseOption,
    securityStateStatus,
    setSecurityUseOption,
    sensitiveActionsUseOption,
    sensitiveActionsStateStatus,
    setSensitiveActionsUseOption,
  } = useKeychainAuthentication();
  const [state, dispatch] = useReducer(reducer, initialState);
  const securityChangeInProgressRef = useRef(false);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const selectedSecurityTextStyle = useMemo(() => ({ color: colors.foregroundColor, marginStart: 16 }), [colors.foregroundColor]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      isStorageEncrypted()
        .then(storageIsEncrypted => {
          if (active) dispatch({ type: ActionType.StorageStateLoaded, payload: storageIsEncrypted });
        })
        .catch(error => {
          console.warn('[EncryptStorage] Unable to load storage password state:', error);
          if (active) dispatch({ type: ActionType.StorageStateFailed });
        });
      Promise.all([isDeviceBiometricCapable(), isDevicePasscodeCapable()])
        .then(([deviceBiometricCapable, devicePasscodeCapable]) => {
          if (active) dispatch({ type: ActionType.CapabilitiesLoaded, payload: { deviceBiometricCapable, devicePasscodeCapable } });
        })
        .catch(error => {
          console.warn('[EncryptStorage] Unable to load device authentication capabilities:', error);
          if (active) dispatch({ type: ActionType.CapabilitiesFailed });
        });
      return () => {
        active = false;
      };
    }, [isDeviceBiometricCapable, isDevicePasscodeCapable, isStorageEncrypted]),
  );

  const handleDecryptStorage = (securityOptionAfterDecryption?: AppUnlockPolicy) => {
    navigation.navigate('PromptPasswordConfirmationSheet', {
      modalType: MODAL_TYPES.ENTER_PASSWORD,
      returnTo: 'EncryptStorage',
      securityOptionAfterDecryption,
    });
  };

  const onEncryptStorageSwitch = (value: boolean) => {
    if (state.storageStatus !== 'loaded') return;
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'encrypt' });
    dispatch({ type: ActionType.SetLoading, payload: true });

    if (value) {
      navigation.navigate('PromptPasswordConfirmationSheet', {
        modalType: MODAL_TYPES.CREATE_PASSWORD,
        returnTo: 'EncryptStorage',
        ...(securityUseOption && securityUseOption !== 'disabled' ? { appUnlockSecurityOption: securityUseOption } : {}),
      });
      return;
    }

    Alert.alert(
      loc.settings.encrypt_decrypt,
      loc.settings.encrypt_decrypt_q,
      [
        {
          text: loc._.cancel,
          style: 'cancel',
          onPress: () => {
            dispatch({ type: ActionType.SetLoading, payload: false });
            dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
          },
        },
        {
          text: loc._.ok,
          style: 'destructive',
          onPress: () => handleDecryptStorage(),
        },
      ],
      { cancelable: false },
    );
  };

  const activeSecurityOption = state.storageIsEncryptedSwitchEnabled ? sensitiveActionsUseOption : securityUseOption;
  const activeSecurityStateStatus = state.storageIsEncryptedSwitchEnabled ? sensitiveActionsStateStatus : securityStateStatus;

  const onSecurityOptionSelected = async (option: AppUnlockPolicy) => {
    if (option === activeSecurityOption || securityChangeInProgressRef.current || configuredAuthenticationUnavailable) return;
    if (
      option !== 'disabled' &&
      ((option === 'biometricsOrPasscode' && !state.deviceBiometricCapable) ||
        (option === 'devicePasscode' && !state.devicePasscodeCapable))
    ) {
      return;
    }
    securityChangeInProgressRef.current = true;
    try {
      if (state.storageIsEncryptedSwitchEnabled) await setSensitiveActionsUseOption(option);
      else await setSecurityUseOption(option);
    } finally {
      securityChangeInProgressRef.current = false;
    }
  };

  const navigateToPlausibleDeniability = () => {
    navigation.navigate('PlausibleDeniability');
  };

  const configuredAuthenticationUnavailable =
    activeSecurityStateStatus === 'loaded' &&
    ((activeSecurityOption === 'biometricsOrPasscode' &&
      (state.storageIsEncryptedSwitchEnabled
        ? !state.deviceBiometricCapable
        : !state.deviceBiometricCapable && !state.devicePasscodeCapable)) ||
      (activeSecurityOption === 'devicePasscode' && !state.devicePasscodeCapable));
  const deviceCredentialLabel = Platform.OS === 'android' ? loc.settings.security_screen_lock : loc.settings.security_device_passcode;
  const biometricOrCredentialLabel = loc.formatString(loc.settings.security_biometrics_or_credential, {
    biometrics: deviceBiometricType ?? loc.settings.biometrics,
    credential: Platform.OS === 'android' ? loc.settings.security_screen_lock_short : loc.settings.security_passcode_short,
  });
  const biometricLabel = state.storageIsEncryptedSwitchEnabled
    ? (deviceBiometricType ?? loc.settings.biometrics)
    : biometricOrCredentialLabel;
  const authenticationSectionTitle = state.storageIsEncryptedSwitchEnabled
    ? loc.settings.security_sensitive_actions
    : loc.settings.security_wallet_access;
  const authenticationRowTitle = state.storageIsEncryptedSwitchEnabled
    ? loc.settings.security_confirmation_method
    : loc.settings.security_authentication_method;
  const selectedSecurityLabel =
    activeSecurityStateStatus !== 'loaded'
      ? loc.settings.security_unavailable_short
      : activeSecurityOption === 'biometricsOrPasscode'
        ? state.storageIsEncryptedSwitchEnabled
          ? (deviceBiometricType ?? loc.settings.biometrics)
          : biometricOrCredentialLabel
        : activeSecurityOption === 'devicePasscode'
          ? Platform.OS === 'android'
            ? loc.settings.security_screen_lock_short
            : loc.settings.security_passcode_short
          : loc.settings.security_disabled;
  const securityActions = useMemo<MenuAction[]>(
    () => [
      {
        id: 'disabled',
        text: loc.settings.security_disabled,
        menuState: activeSecurityOption === 'disabled',
        disabled: configuredAuthenticationUnavailable,
      },
      {
        id: 'biometricsOrPasscode',
        text: biometricLabel,
        menuState: activeSecurityOption === 'biometricsOrPasscode',
        hidden: !state.deviceBiometricCapable && activeSecurityOption !== 'biometricsOrPasscode',
        disabled: configuredAuthenticationUnavailable,
      },
      {
        id: 'devicePasscode',
        text: deviceCredentialLabel,
        menuState: activeSecurityOption === 'devicePasscode',
        hidden: !state.devicePasscodeCapable && activeSecurityOption !== 'devicePasscode',
        disabled: configuredAuthenticationUnavailable,
      },
    ],
    [
      biometricLabel,
      configuredAuthenticationUnavailable,
      deviceCredentialLabel,
      activeSecurityOption,
      state.deviceBiometricCapable,
      state.devicePasscodeCapable,
    ],
  );
  const authenticationReady =
    state.storageStatus === 'loaded' && activeSecurityStateStatus === 'loaded' && state.capabilitiesStatus === 'loaded';
  const authenticationUnavailable =
    state.storageStatus === 'loaded' && (activeSecurityStateStatus === 'unavailable' || state.capabilitiesStatus === 'unavailable');

  return (
    <SettingsScrollView>
      {authenticationReady && (
        <SettingsSection title={authenticationSectionTitle}>
          <ToolTipMenu
            testID="SecurityAuthenticationMenu"
            shouldOpenOnLongPress={false}
            actions={securityActions}
            onPressMenuItem={id => {
              const option =
                id === 'disabled' || id === loc.settings.security_disabled
                  ? 'disabled'
                  : id === 'biometricsOrPasscode' || id === biometricLabel
                    ? 'biometricsOrPasscode'
                    : id === 'devicePasscode' || id === deviceCredentialLabel
                      ? 'devicePasscode'
                      : undefined;
              if (option) onSecurityOptionSelected(option);
            }}
            accessibilityLabel={loc.settings.security_authentication_method}
            accessibilityHint={loc.settings.security_authentication_menu_hint}
            accessibilityRole="button"
          >
            <SettingsListItem
              testID="SecurityAuthenticationRow"
              title={authenticationRowTitle}
              rightTitle={selectedSecurityLabel}
              rightTitleStyle={selectedSecurityTextStyle}
              subtitle={
                configuredAuthenticationUnavailable ? (
                  <Text style={styles.subtitleText}>
                    {activeSecurityOption === 'devicePasscode'
                      ? Platform.OS === 'android'
                        ? loc.settings.device_screen_lock_required
                        : loc.settings.device_passcode_required
                      : loc.settings.biometrics_not_enrolled}
                  </Text>
                ) : state.storageIsEncryptedSwitchEnabled ? (
                  loc.settings.security_authentication_actions_explain
                ) : (
                  loc.settings.security_authentication_wallets_explain
                )
              }
              subtitleNumberOfLines={0}
              bottomDivider={false}
            />
          </ToolTipMenu>
        </SettingsSection>
      )}
      {authenticationUnavailable && (
        <SettingsSection title={authenticationSectionTitle}>
          <SettingsListItem
            testID="SecurityAuthenticationUnavailable"
            title={authenticationRowTitle}
            subtitle={loc.settings.keychain_unavailable}
            subtitleNumberOfLines={0}
            bottomDivider={false}
            disabled
          />
        </SettingsSection>
      )}
      <SettingsSection title={loc.settings.wallet_password}>
        <SettingsListItem
          testID="EncyptedAndPasswordProtected"
          title={loc.settings.encrypt_enc_and_pass}
          switch={{
            onValueChange: onEncryptStorageSwitch,
            value: state.storageIsEncryptedSwitchEnabled,
            disabled: state.storageStatus !== 'loaded' || state.currentLoadingSwitch !== null,
            testID: 'EncyptedAndPasswordProtectedSwitch',
          }}
          isLoading={state.currentLoadingSwitch === 'encrypt' && state.isLoading}
          bottomDivider={state.storageIsEncryptedSwitchEnabled}
          subtitle={state.storageStatus === 'unavailable' ? loc.settings.keychain_unavailable : loc.settings.wallet_password_explain}
          subtitleNumberOfLines={0}
        />
        {state.storageIsEncryptedSwitchEnabled && (
          <SettingsListItem
            onPress={navigateToPlausibleDeniability}
            title={loc.settings.plausible_deniability}
            chevron
            testID="PlausibleDeniabilityButton"
            bottomDivider={false}
          />
        )}
      </SettingsSection>
    </SettingsScrollView>
  );
};

const styles = StyleSheet.create({
  subtitleText: {
    fontSize: 14,
    marginTop: 5,
  },
});

export default EncryptStorage;
