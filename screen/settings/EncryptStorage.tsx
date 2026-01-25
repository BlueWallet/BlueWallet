import { StackActions } from '@react-navigation/native';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { Alert, ListRenderItemInfo, Platform, View } from 'react-native';

import presentAlert from '../../components/Alert';
import {
  SettingsFlatList,
  SettingsListItem,
  SettingsListItemProps,
  SettingsSectionHeader,
  SettingsSubtitle,
} from '../../components/platform';
import PromptPasswordConfirmationModal, {
  MODAL_TYPES,
  PromptPasswordConfirmationModalHandle,
} from '../../components/PromptPasswordConfirmationModal';
import { useStorage } from '../../hooks/context/useStorage';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';

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

interface SettingItem extends SettingsListItemProps {
  id: string;
  section?: string;
  showItem: boolean;
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
  const navigation = useExtendedNavigation();

  const promptRef = useRef<PromptPasswordConfirmationModalHandle>(null);

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
  // Present modal when modalType changes to CREATE_PASSWORD
  useEffect(() => {
    if (state.modalType === MODAL_TYPES.CREATE_PASSWORD && state.currentLoadingSwitch === 'encrypt') {
      // Small delay to ensure modal component has received the updated modalType prop
      const timer = setTimeout(() => {
        promptRef.current?.present();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [state.modalType, state.currentLoadingSwitch]);

  const handleDecryptStorage = useCallback(async () => {
    dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.ENTER_PASSWORD });
    promptRef.current?.present();
  }, []);

  const onEncryptStorageSwitch = useCallback(
    async (value: boolean) => {
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'encrypt' });
      dispatch({ type: ActionType.SetLoading, payload: true });

      if (value) {
        dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.CREATE_PASSWORD });
        // Modal will be presented by useEffect when modalType state updates
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
    },
    [handleDecryptStorage],
  );

  const onUseBiometricSwitch = useCallback(
    async (value: boolean) => {
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'biometric' });
      if (await unlockWithBiometrics()) {
        setBiometricUseEnabled(value);
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
      } else {
        dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
      }
    },
    [setBiometricUseEnabled],
  );

  const navigateToPlausibleDeniability = useCallback(() => {
    navigation.navigate('PlausibleDeniability');
  }, [navigation]);

  const popToTop = useCallback(() => {
    const action = StackActions.popToTop();
    navigation.dispatch(action);
  }, [navigation]);

  const settingsItems = useCallback((): SettingItem[] => {
    const items: SettingItem[] = [];

    // Biometric section
    if (state.deviceBiometricCapable) {
      items.push({
        id: 'biometricUse',
        title: loc.settings.biometrics,
        subtitle: (
          <>
            <SettingsSubtitle>{loc.formatString(loc.settings.encrypt_use_expl, { type: deviceBiometricType! })}</SettingsSubtitle>
            {Platform.OS === 'android' && Platform.Version >= 30 && (
              <SettingsSubtitle>{loc.formatString(loc.settings.biometrics_fail, { type: deviceBiometricType! })}</SettingsSubtitle>
            )}
          </>
        ),
        switch: {
          value: biometricEnabled,
          onValueChange: onUseBiometricSwitch,
          disabled: state.currentLoadingSwitch !== null,
        },
        isLoading: state.currentLoadingSwitch === 'biometric' && state.isLoading,
        testID: 'BiometricUseSwitch',
        Component: View,
        showItem: true,
      });
    }

    items.push({
      id: 'encryptStorage',
      title: loc.settings.encrypt_enc_and_pass,
      subtitle: <SettingsSubtitle>{loc.settings.encrypt_enc_and_pass_description}</SettingsSubtitle>,
      switch: {
        value: state.storageIsEncryptedSwitchEnabled,
        onValueChange: onEncryptStorageSwitch,
        disabled: state.currentLoadingSwitch !== null,
      },
      isLoading: state.currentLoadingSwitch === 'encrypt' && state.isLoading,
      testID: 'EncyptedAndPasswordProtectedSwitch',
      Component: View,
      showItem: true,
    });

    // Only show plausible deniability when storage is encrypted
    if (state.storageIsEncryptedSwitchEnabled) {
      items.push({
        id: 'plausibleDeniabilityHeader',
        title: '',
        subtitle: '',
        section: loc.settings.multiple_storages,
        showItem: true,
      });

      items.push({
        id: 'plausibleDeniability',
        title: loc.settings.plausible_deniability,
        subtitle: <SettingsSubtitle>{loc.settings.plausible_deniability_description}</SettingsSubtitle>,
        onPress: navigateToPlausibleDeniability,
        chevron: true,
        testID: 'PlausibleDeniabilityButton',
        showItem: true,
      });
    }

    return items.filter(item => item.showItem);
  }, [
    state.deviceBiometricCapable,
    state.storageIsEncryptedSwitchEnabled,
    state.currentLoadingSwitch,
    state.isLoading,
    deviceBiometricType,
    biometricEnabled,
    onUseBiometricSwitch,
    onEncryptStorageSwitch,
    navigateToPlausibleDeniability,
  ]);

  const renderItem = useCallback(
    (info: ListRenderItemInfo<SettingItem>) => {
      const { id, section, ...listItemProps } = info.item;
      const items = settingsItems();

      if (section) {
        return <SettingsSectionHeader title={section} />;
      }

      const itemIndex = items.findIndex(i => i.id === id);
      let nextRegularItemIndex = itemIndex + 1;
      while (nextRegularItemIndex < items.length && items[nextRegularItemIndex].section) {
        nextRegularItemIndex++;
      }

      const immediateNextItem = itemIndex + 1 < items.length ? items[itemIndex + 1] : null;
      const immediateNextIsSectionHeader = immediateNextItem?.section !== undefined;

      const isFirst = itemIndex === 0 || !!items[itemIndex - 1]?.section;
      const isLast = immediateNextIsSectionHeader || nextRegularItemIndex >= items.length;
      const position = isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle';

      return <SettingsListItem {...listItemProps} position={position} />;
    },
    [settingsItems],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  return (
    <>
      <SettingsFlatList
        testID="EncryptStorageScrollView"
        data={settingsItems()}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        removeClippedSubviews
      />
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
              return true;
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
    </>
  );
};

export default EncryptStorage;
