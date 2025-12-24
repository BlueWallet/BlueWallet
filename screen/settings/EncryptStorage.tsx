import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import PlatformListItem from '../../components/PlatformListItem';
import { usePlatformStyles } from '../../theme/platformStyles';

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
  const { colors, sizing, layout } = usePlatformStyles();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  // For older Android versions, use a fallback if StatusBar.currentHeight is not available
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listItemContainer: {
      backgroundColor: colors.cardBackground,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    subtitleText: {
      fontSize: 14,
      color: colors.subtitleColor,
      marginTop: 5,
    },
    sectionHeaderContainer: {
      marginTop: 32,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.titleColor,
    },
  });
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
        showItem: true,
      });
    }

    items.push({
      id: 'encryptStorage',
      title: loc.settings.encrypt_enc_and_pass,
      subtitle: <Text style={styles.subtitleText}>{loc.settings.encrypt_enc_and_pass_description}</Text>,
      isSwitch: true,
      switchValue: state.storageIsEncryptedSwitchEnabled,
      onSwitchValueChange: onEncryptStorageSwitch,
      switchDisabled: state.currentLoadingSwitch !== null,
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
        subtitle: <Text style={styles.subtitleText}>{loc.settings.plausible_deniability_description}</Text>,
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
    styles.subtitleText,
    navigateToPlausibleDeniability,
  ]);

  const renderItem = useCallback(
    (props: { item: SettingItem }) => {
      const { item } = props;
      const items = settingsItems();

      // Handle section headers
      if (item.section) {
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{item.section}</Text>
          </View>
        );
      }

      // Find next non-section item to determine isLast
      const itemIndex: number = items.findIndex(i => i.id === item.id);
      let nextRegularItemIndex = itemIndex + 1;
      while (nextRegularItemIndex < items.length && items[nextRegularItemIndex].section) {
        nextRegularItemIndex++;
      }

      // Check if immediate next item is a section header (means current item is last in its section)
      const immediateNextItem = itemIndex + 1 < items.length ? items[itemIndex + 1] : null;
      const immediateNextIsSectionHeader = immediateNextItem?.section !== undefined;

      const isFirst: boolean = itemIndex === 0 || !!items[itemIndex - 1]?.section;
      const isLast: boolean = immediateNextIsSectionHeader || nextRegularItemIndex >= items.length;

      // Apply greater corner radius to first and last items
      const containerStyle = {
        ...styles.listItemContainer,
        ...(layout.showBorderRadius && {
          borderTopLeftRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderTopRightRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomLeftRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomRightRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
        }),
      };

      if (item.isSwitch) {
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
            isFirst={isFirst}
            isLast={isLast}
            bottomDivider={layout.showBorderBottom && !isLast}
          />
        );
      }

      return (
        <PlatformListItem
          title={item.title}
          subtitle={item.subtitle}
          containerStyle={containerStyle}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          isFirst={isFirst}
          isLast={isLast}
          bottomDivider={layout.showBorderBottom && !isLast}
        />
      );
    },
    [styles, layout.showBorderBottom, layout.showBorderRadius, settingsItems, sizing.containerBorderRadius],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <>
      <SafeAreaFlatList
        testID="EncryptStorageScrollView"
        headerHeight={headerHeight}
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
