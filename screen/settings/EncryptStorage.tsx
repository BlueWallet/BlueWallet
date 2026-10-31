import React, { useCallback, useReducer } from 'react';
import { Alert, Platform, StyleSheet, Text } from 'react-native';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { MODAL_TYPES } from '../PromptPasswordConfirmationSheet.types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';
import { BlueApp as BlueAppClass } from '../../class/blue-app';
import { errorMessage } from '../../helpers/errorMessage';

const BlueApp = BlueAppClass.getInstance();

enum ActionType {
  SetLoading = 'SET_LOADING',
  SetStorageEncryptedSwitch = 'SET_STORAGE_ENCRYPTED_SWITCH',
  SetDeviceBiometricCapable = 'SET_DEVICE_BIOMETRIC_CAPABLE',
  SetKeychainRetentionEnabled = 'SET_KEYCHAIN_RETENTION_ENABLED',
  SetCurrentLoadingSwitch = 'SET_CURRENT_LOADING_SWITCH',
  SetModalType = 'SET_MODAL_TYPE',
}

type Action =
  | {
      type:
        | ActionType.SetLoading
        | ActionType.SetStorageEncryptedSwitch
        | ActionType.SetDeviceBiometricCapable
        | ActionType.SetKeychainRetentionEnabled;
      payload: boolean;
    }
  | { type: ActionType.SetCurrentLoadingSwitch; payload: string | null }
  | { type: ActionType.SetModalType; payload: keyof typeof MODAL_TYPES };

interface State {
  isLoading: boolean;
  storageIsEncryptedSwitchEnabled: boolean;
  deviceBiometricCapable: boolean;
  keychainRetentionEnabled: boolean;
  currentLoadingSwitch: string | null;
  modalType: keyof typeof MODAL_TYPES;
}

const initialState: State = {
  isLoading: true,
  storageIsEncryptedSwitchEnabled: false,
  deviceBiometricCapable: false,
  keychainRetentionEnabled: true,
  currentLoadingSwitch: null,
  modalType: MODAL_TYPES.ENTER_PASSWORD,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetLoading:
      return { ...state, isLoading: action.payload };
    case ActionType.SetStorageEncryptedSwitch:
      return { ...state, storageIsEncryptedSwitchEnabled: action.payload };
    case ActionType.SetDeviceBiometricCapable:
      return { ...state, deviceBiometricCapable: action.payload };
    case ActionType.SetKeychainRetentionEnabled:
      return { ...state, keychainRetentionEnabled: action.payload };
    case ActionType.SetCurrentLoadingSwitch:
      return { ...state, currentLoadingSwitch: action.payload };
    case ActionType.SetModalType:
      return { ...state, modalType: action.payload };
    default:
      return state;
  }
};

const EncryptStorage = () => {
  const { isStorageEncrypted } = useStorage();
  const { isDeviceBiometricCapable, biometricEnabled, setBiometricUseEnabled, deviceBiometricType } = useBiometrics();
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      dispatch({ type: ActionType.SetLoading, payload: true });
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });

      const initializeState = async () => {
        try {
          const [isStorageEncryptedSwitchEnabled, isDeviceBiometricCapableSync, keychainRetentionEnabled] = await Promise.all([
            isStorageEncrypted(),
            isDeviceBiometricCapable(),
            BlueApp.isKeychainRetentionEnabled(),
          ]);
          if (!isActive) return;

          dispatch({ type: ActionType.SetStorageEncryptedSwitch, payload: isStorageEncryptedSwitchEnabled });
          dispatch({ type: ActionType.SetDeviceBiometricCapable, payload: isDeviceBiometricCapableSync });
          dispatch({ type: ActionType.SetKeychainRetentionEnabled, payload: keychainRetentionEnabled });
        } catch (error) {
          if (isActive) Alert.alert(loc.errors.error, errorMessage(error));
        } finally {
          if (isActive) dispatch({ type: ActionType.SetLoading, payload: false });
        }
      };

      initializeState();

      return () => {
        isActive = false;
      };
    }, [isStorageEncrypted, isDeviceBiometricCapable]),
  );

  const handleDecryptStorage = async () => {
    dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.ENTER_PASSWORD });
    navigation.navigate('PromptPasswordConfirmationSheet', {
      modalType: MODAL_TYPES.ENTER_PASSWORD,
      returnTo: 'EncryptStorage',
    });
  };

  const onEncryptStorageSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'encrypt' });
    dispatch({ type: ActionType.SetLoading, payload: true });

    if (value) {
      dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.CREATE_PASSWORD });
      navigation.navigate('PromptPasswordConfirmationSheet', {
        modalType: MODAL_TYPES.CREATE_PASSWORD,
        returnTo: 'EncryptStorage',
      });
    } else {
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
            onPress: handleDecryptStorage,
          },
        ],
        { cancelable: false },
      );
    }
  };

  const onUseBiometricSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'biometric' });
    if (await unlockWithBiometrics()) {
      setBiometricUseEnabled(value);
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    } else {
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    }
  };

  const navigateToPlausibleDeniability = () => {
    navigation.navigate('PlausibleDeniability');
  };

  const onKeychainRetentionSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'keychainRetention' });
    try {
      await BlueApp.setKeychainRetentionEnabled(value);
      dispatch({ type: ActionType.SetKeychainRetentionEnabled, payload: value });
    } catch (error) {
      Alert.alert(loc.errors.error, errorMessage(error));
    } finally {
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    }
  };

  return (
    <SettingsScrollView>
      {state.deviceBiometricCapable && (
        <SettingsSection title={loc.settings.biometrics}>
          <SettingsListItem
            title={loc.formatString(loc.settings.encrypt_use, { type: deviceBiometricType! })}
            switch={{
              value: biometricEnabled,
              onValueChange: onUseBiometricSwitch,
              disabled: state.currentLoadingSwitch !== null,
            }}
            isLoading={state.currentLoadingSwitch === 'biometric' && state.isLoading}
            bottomDivider={false}
            subtitle={
              <>
                <Text style={styles.subtitleText}>{loc.formatString(loc.settings.encrypt_use_expl, { type: deviceBiometricType! })}</Text>
                {Platform.OS === 'android' && Platform.Version >= 30 && (
                  <Text style={styles.subtitleText}>{loc.formatString(loc.settings.biometrics_fail, { type: deviceBiometricType! })}</Text>
                )}
              </>
            }
          />
        </SettingsSection>
      )}
      <SettingsSection title={loc.settings.encrypt_tstorage}>
        <SettingsListItem
          testID="EncyptedAndPasswordProtected"
          title={loc.settings.encrypt_enc_and_pass}
          switch={{
            onValueChange: onEncryptStorageSwitch,
            value: state.storageIsEncryptedSwitchEnabled,
            disabled: state.currentLoadingSwitch !== null,
            testID: 'EncyptedAndPasswordProtectedSwitch',
          }}
          isLoading={state.currentLoadingSwitch === 'encrypt' && state.isLoading}
          bottomDivider={state.storageIsEncryptedSwitchEnabled || Platform.OS === 'ios'}
        />
        {state.storageIsEncryptedSwitchEnabled && (
          <SettingsListItem
            onPress={navigateToPlausibleDeniability}
            title={loc.settings.plausible_deniability}
            chevron
            testID="PlausibleDeniabilityButton"
            bottomDivider={Platform.OS === 'ios'}
          />
        )}
        {Platform.OS === 'ios' && (
          <SettingsListItem
            title={loc.settings.keychain_retention}
            subtitle={loc.settings.keychain_retention_expl}
            switch={{
              value: state.keychainRetentionEnabled,
              onValueChange: onKeychainRetentionSwitch,
              disabled: state.isLoading || state.currentLoadingSwitch !== null,
              testID: 'KeychainRetentionSwitch',
            }}
            isLoading={state.isLoading}
            testID="KeychainRetention"
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
