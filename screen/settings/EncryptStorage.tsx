import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import ListItem, { TouchableOpacityWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import PromptPasswordConfirmationModal, {
  MODAL_TYPES,
  PromptPasswordConfirmationModalHandle,
} from '../../components/PromptPasswordConfirmationModal';
import { popToTop } from '../../NavigationService';
import presentAlert from '../../components/Alert';
import { Header } from '../../components/Header';
import { BlueSpacing20 } from '../../BlueComponents';

enum ActionType {
  SetLoading = 'SET_LOADING',
  SetStorageEncryptedSwitch = 'SET_STORAGE_ENCRYPTED_SWITCH',
  SetDeviceBiometricCapable = 'SET_DEVICE_BIOMETRIC_CAPABLE',
  SetCurrentLoadingSwitch = 'SET_CURRENT_LOADING_SWITCH',
  SetModalType = 'SET_MODAL_TYPE',
}

interface Action {
  type: ActionType;
  payload?: any;
}

interface State {
  isLoading: boolean;
  storageIsEncryptedSwitchEnabled: boolean;
  deviceBiometricCapable: boolean;
  currentLoadingSwitch: string | null;
  modalType: keyof typeof MODAL_TYPES;
}

const initialState: State = {
  isLoading: true,
  storageIsEncryptedSwitchEnabled: false,
  deviceBiometricCapable: false,
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
    case ActionType.SetCurrentLoadingSwitch:
      return { ...state, currentLoadingSwitch: action.payload };
    case ActionType.SetModalType:
      return { ...state, modalType: action.payload };
    default:
      return state;
  }
};

const EncryptStorage = () => {
  const { isStorageEncrypted, encryptStorage, decryptStorage, saveToDisk } = useStorage();
  const { isDeviceBiometricCapable, biometricEnabled, setBiometricUseEnabled, deviceBiometricType } = useBiometrics();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { navigate } = useExtendedNavigation();
  const { colors } = useTheme();
  const promptRef = useRef<PromptPasswordConfirmationModalHandle>(null);

  const styleHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
  });

  const initializeState = useCallback(async () => {
    const isStorageEncryptedSwitchEnabled = await isStorageEncrypted();
    const isDeviceBiometricCapableSync = await isDeviceBiometricCapable();
    dispatch({ type: ActionType.SetStorageEncryptedSwitch, payload: isStorageEncryptedSwitchEnabled });
    dispatch({ type: ActionType.SetDeviceBiometricCapable, payload: isDeviceBiometricCapableSync });
    dispatch({ type: ActionType.SetLoading, payload: false });
  }, [isStorageEncrypted, isDeviceBiometricCapable]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  const handleDecryptStorage = async () => {
    dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.ENTER_PASSWORD });
    promptRef.current?.present();
  };

  const onEncryptStorageSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'encrypt' });
    dispatch({ type: ActionType.SetLoading, payload: true });

    if (value) {
      dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.CREATE_PASSWORD });
      promptRef.current?.present();
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
    navigate('PlausibleDeniability');
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.root, styleHooks.root]}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.paddingTop} />
      {state.deviceBiometricCapable && (
        <>
          <Header leftText={loc.settings.biometrics} />
          <ListItem
            title={loc.formatString(loc.settings.encrypt_use, { type: deviceBiometricType! })}
            Component={TouchableWithoutFeedback}
            switch={{
              value: biometricEnabled,
              onValueChange: onUseBiometricSwitch,
              disabled: state.currentLoadingSwitch !== null,
            }}
            isLoading={state.currentLoadingSwitch === 'biometric' && state.isLoading}
            containerStyle={[styles.row, styleHooks.root]}
            subtitle={
              <>
                <Text style={styles.subtitleText}>{loc.formatString(loc.settings.encrypt_use_expl, { type: deviceBiometricType! })}</Text>
                {Platform.OS === 'android' && Platform.Version >= 30 && (
                  <Text style={styles.subtitleText}>{loc.formatString(loc.settings.biometrics_fail, { type: deviceBiometricType! })}</Text>
                )}
              </>
            }
          />
        </>
      )}
      <BlueSpacing20 />
      <Header leftText={loc.settings.encrypt_tstorage} />
      <ListItem
        testID="EncyptedAndPasswordProtected"
        title={loc.settings.encrypt_enc_and_pass}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: onEncryptStorageSwitch,
          value: state.storageIsEncryptedSwitchEnabled,
          disabled: state.currentLoadingSwitch !== null,
        }}
        isLoading={state.currentLoadingSwitch === 'encrypt' && state.isLoading}
        containerStyle={[styles.row, styleHooks.root]}
      />
      {state.storageIsEncryptedSwitchEnabled && (
        <ListItem
          onPress={navigateToPlausibleDeniability}
          title={loc.settings.plausible_deniability}
          chevron
          testID="PlausibleDeniabilityButton"
          Component={TouchableOpacityWrapper}
          containerStyle={[styles.row, styleHooks.root]}
        />
      )}
      <PromptPasswordConfirmationModal
        ref={promptRef}
        modalType={state.modalType}
        onConfirmationSuccess={async (password: string) => {
          let success = false;
          if (state.modalType === MODAL_TYPES.CREATE_PASSWORD) {
            try {
              await encryptStorage(password);
              await saveToDisk();
              dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.SUCCESS });
              success = true;
            } catch (error) {
              presentAlert({ message: (error as Error).message });
              success = false;
            }
          } else if (state.modalType === MODAL_TYPES.ENTER_PASSWORD) {
            try {
              await decryptStorage(password);
              await saveToDisk();
              popToTop();
              success = true;
            } catch (error) {
              success = false;
            }
          }
          dispatch({ type: ActionType.SetLoading, payload: false });
          dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
          initializeState();
          return success;
        }}
        onConfirmationFailure={() => {
          dispatch({ type: ActionType.SetLoading, payload: false });
          dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  paddingTop: { paddingTop: 19 },
  row: { minHeight: 60 },
  subtitleText: {
    fontSize: 14,
    marginTop: 5,
  },
});

export default EncryptStorage;
