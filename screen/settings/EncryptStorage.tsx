import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import PromptPasswordConfirmationModal, {
  MODAL_TYPES,
  PromptPasswordConfirmationModalHandle,
} from '../../components/PromptPasswordConfirmationModal';
import presentAlert from '../../components/Alert';
import { StackActions } from '@react-navigation/native';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
// Update to use new theme directory
import { usePlatformTheme } from '../../theme';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import PlatformListItem from '../../components/PlatformListItem';

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

interface SettingItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  switchDisabled?: boolean;
  onPress?: () => void;
  testID?: string;
  chevron?: boolean;
  isLoading?: boolean;
  Component?: React.ElementType;
  section?: number;
  customContent?: React.ReactNode;
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
  const { layout } = usePlatformTheme();
  const { styles } = useSettingsStyles();
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
        id: 'biometricsHeader',
        title: loc.settings.biometrics,
        section: 1,
      });

      items.push({
        id: 'biometricUse',
        title: loc.formatString(loc.settings.encrypt_use, { type: deviceBiometricType! }),
        subtitle: (
          <>
            <Text style={styles.subtitleText}>{loc.formatString(loc.settings.encrypt_use_expl, { type: deviceBiometricType! })}</Text>
            {Platform.OS === 'android' && Platform.Version >= 30 && (
              <Text style={styles.subtitleText}>{loc.formatString(loc.settings.biometrics_fail, { type: deviceBiometricType! })}</Text>
            )}
          </>
        ),
        isSwitch: true,
        switchValue: biometricEnabled,
        onSwitchValueChange: onUseBiometricSwitch,
        switchDisabled: state.currentLoadingSwitch !== null,
        isLoading: state.currentLoadingSwitch === 'biometric' && state.isLoading,
        testID: 'BiometricUseSwitch',
        Component: View,
        section: 1,
      });

      // Add spacing between sections
      items.push({
        id: 'section1Spacing',
        title: '',
        customContent: <View style={styles.sectionSpacing} />,
        section: 1.5,
      });
    }

    // Encryption section
    items.push({
      id: 'encryptionHeader',
      title: loc.settings.encrypt_tstorage,
      section: 2,
    });

    items.push({
      id: 'encryptStorage',
      title: loc.settings.encrypt_enc_and_pass,
      isSwitch: true,
      switchValue: state.storageIsEncryptedSwitchEnabled,
      onSwitchValueChange: onEncryptStorageSwitch,
      switchDisabled: state.currentLoadingSwitch !== null,
      isLoading: state.currentLoadingSwitch === 'encrypt' && state.isLoading,
      testID: 'EncyptedAndPasswordProtectedSwitch',
      Component: View,
      section: 2,
    });

    // Only show plausible deniability when storage is encrypted
    if (state.storageIsEncryptedSwitchEnabled) {
      items.push({
        id: 'plausibleDeniability',
        title: loc.settings.plausible_deniability,
        onPress: navigateToPlausibleDeniability,
        chevron: true,
        testID: 'PlausibleDeniabilityButton',
        section: 2,
      });
    }

    return items;
  }, [
    state.deviceBiometricCapable,
    state.storageIsEncryptedSwitchEnabled,
    state.currentLoadingSwitch,
    state.isLoading,
    deviceBiometricType,
    biometricEnabled,
    onUseBiometricSwitch,
    onEncryptStorageSwitch,
    styles.subtitleText,
    styles.sectionSpacing,
    navigateToPlausibleDeniability,
  ]);

  const renderItem = useCallback(
    (props: { item: SettingItem }) => {
      const item = props.item;
      const items = settingsItems();

      if (item.customContent) {
        return <>{item.customContent}</>;
      }

      // Handle section headers
      if (item.title && !item.isSwitch && !item.onPress && item.section) {
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
          </View>
        );
      }

      // Determine section grouping
      const currentSectionItems = items.filter(i => i.section === item.section && (i.isSwitch || i.onPress || i.customContent));
      const indexInSection = currentSectionItems.indexOf(item);
      const isFirstInSection = indexInSection === 0;
      const isLastInSection = indexInSection === currentSectionItems.length - 1;

      if (item.isSwitch) {
        // Determine if this is the encrypt storage switch and if plausible deniability is visible
        const isEncryptSwitch = item.id === 'encryptStorage';
        const showPlausibleDeniability = state.storageIsEncryptedSwitchEnabled;

        // If this is the encrypt switch and plausible deniability is shown, adjust corner style
        const containerStyle =
          isEncryptSwitch && showPlausibleDeniability
            ? { ...styles.encryptListItemContainer, ...styles.topRoundedItem }
            : styles.encryptListItemContainer;

        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={containerStyle}
            Component={item.Component}
            switch={{
              value: item.switchValue || false,
              onValueChange: item.onSwitchValueChange,
              disabled: item.switchDisabled,
            }}
            isLoading={item.isLoading}
            testID={item.testID}
            isFirst={isFirstInSection}
            isLast={isLastInSection}
            bottomDivider={layout.showBorderBottom && !isLastInSection}
          />
        );
      }

      // For plausible deniability button, adjust corner style
      let containerStyle = styles.encryptListItemContainer;
      if (item.id === 'plausibleDeniability') {
        containerStyle = { ...styles.encryptListItemContainer, ...styles.bottomRoundedItem };
      }

      return (
        <PlatformListItem
          title={item.title}
          subtitle={item.subtitle}
          containerStyle={containerStyle}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          isFirst={isFirstInSection}
          isLast={isLastInSection}
          bottomDivider={layout.showBorderBottom && !isLastInSection}
        />
      );
    },
    [styles, layout.showBorderBottom, settingsItems, state.storageIsEncryptedSwitchEnabled],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <>
      <SafeAreaFlatList
        style={styles.container}
        data={settingsItems()}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={styles.contentContainer}
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
