import React, { useCallback, useEffect, useReducer } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueSpacing20, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import { popToTop } from '../../NavigationService';

enum ActionType {
  SetLoading = 'SET_LOADING',
  SetStorageEncryptedSwitch = 'SET_STORAGE_ENCRYPTED_SWITCH',
  SetDeviceBiometricCapable = 'SET_DEVICE_BIOMETRIC_CAPABLE',
  SetCurrentLoadingSwitch = 'SET_CURRENT_LOADING_SWITCH',
}

interface State {
  isLoading: boolean;
  storageIsEncryptedSwitchEnabled: boolean;
  deviceBiometricCapable: boolean;
  currentLoadingSwitch: string | null;
}

interface Action {
  type: ActionType;
  payload?: any;
}

const initialState: State = {
  isLoading: true,
  storageIsEncryptedSwitchEnabled: false,
  deviceBiometricCapable: false,
  currentLoadingSwitch: null,
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

  const styleHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    headerText: {
      color: colors.foregroundColor,
    },
  });

  const initializeState = useCallback(async () => {
    const isStorageEncryptedSwitchEnabled = await isStorageEncrypted();
    const isDeviceBiometricCapableSync = await isDeviceBiometricCapable();
    dispatch({ type: ActionType.SetStorageEncryptedSwitch, payload: isStorageEncryptedSwitchEnabled });
    dispatch({ type: ActionType.SetDeviceBiometricCapable, payload: isDeviceBiometricCapableSync });
    dispatch({ type: ActionType.SetLoading, payload: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initializeState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecryptStorage = async () => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'decrypt' });
    const password = await prompt(loc.settings.password, loc._.storage_is_encrypted).catch(() => {
      dispatch({ type: ActionType.SetLoading, payload: false });
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    });
    if (!password) {
      dispatch({ type: ActionType.SetLoading, payload: false });
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
      return;
    }
    try {
      await decryptStorage(password);
      await saveToDisk();
      popToTop();
    } catch (e) {
      if (password) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc._.bad_password });
      }

      dispatch({ type: ActionType.SetLoading, payload: false });
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
      dispatch({ type: ActionType.SetStorageEncryptedSwitch, payload: await isStorageEncrypted() });
    }
  };

  const onEncryptStorageSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'encrypt' });
    dispatch({ type: ActionType.SetLoading, payload: true });
    if (value) {
      let p1 = await prompt(loc.settings.password, loc.settings.password_explain).catch(() => {
        dispatch({ type: ActionType.SetLoading, payload: false });
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
        p1 = undefined;
      });
      if (!p1) {
        dispatch({ type: ActionType.SetLoading, payload: false });
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
        return;
      }
      const p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
        dispatch({ type: ActionType.SetLoading, payload: false });
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
      });
      if (p1 === p2) {
        await encryptStorage(p1);
        dispatch({ type: ActionType.SetLoading, payload: false });
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
        dispatch({ type: ActionType.SetStorageEncryptedSwitch, payload: await isStorageEncrypted() });
        saveToDisk();
      } else {
        dispatch({ type: ActionType.SetLoading, payload: false });
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.settings.passwords_do_not_match });
      }
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

  const renderPasscodeExplanation = () => {
    let isCapable = true;

    if (Platform.OS === 'android') {
      if (Platform.Version < 30) {
        isCapable = false;
      }
    }

    return isCapable ? (
      <>
        <BlueText />
        <BlueText>{loc.formatString(loc.settings.biometrics_fail, { type: deviceBiometricType! })}</BlueText>
      </>
    ) : null;
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
          <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
            {loc.settings.biometrics}
          </Text>
          <ListItem
            title={loc.formatString(loc.settings.encrypt_use, { type: deviceBiometricType! })}
            Component={TouchableWithoutFeedback}
            switch={{ value: biometricEnabled, onValueChange: onUseBiometricSwitch, disabled: state.currentLoadingSwitch !== null }}
            isLoading={state.currentLoadingSwitch === 'biometric' && state.isLoading}
            containerStyle={[styles.row, styleHooks.root]}
          />
          <BlueCard>
            <BlueText>{loc.formatString(loc.settings.encrypt_use_expl, { type: deviceBiometricType! })}</BlueText>
            {renderPasscodeExplanation()}
          </BlueCard>
          <BlueSpacing20 />
        </>
      )}
      <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
        {loc.settings.encrypt_tstorage}
      </Text>
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
          Component={TouchableOpacity}
          containerStyle={[styles.row, styleHooks.root]}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  paddingTop: { paddingTop: 19 },
  headerText: {
    fontWeight: 'bold',
    fontSize: 30,
    marginLeft: 17,
  },
  row: { minHeight: 60 },
});

export default EncryptStorage;
