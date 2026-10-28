import { useFocusEffect, useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useReducer, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  AlertButton,
  findNodeHandle,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { suggestedServers } from '../../blue_modules/BlueElectrum';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import NativeLocalNetworkPermission from '../../codegen/NativeLocalNetworkPermission';
import {
  ElectrumServerItem,
  electrumServerKey,
  parseElectrumServerDocumentResult,
  uniqueElectrumServers,
  inferElectrumServerFromHost,
  inferElectrumServerSsl,
  isLocalElectrumHost,
  parseElectrumServer,
} from '../../blue_modules/electrumServer';
import triggerHapticFeedback, { HapticFeedbackTypes, triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import AddressInput from '../../components/AddressInput';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import SegmentedControl from '../../components/SegmentedControl';
import { SettingsListItem, SettingsSection } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddElectrumServerStackParamList } from '../../navigation/AddElectrumServerStackParamList';
import useScreenMenuActions from '../../hooks/useScreenMenuActions';
import ActionSheet from '../ActionSheet';

const serverKey = electrumServerKey;

type AddElectrumServerState = {
  host: string;
  portText: string;
  useSsl: boolean;
  portWasAutofilled: boolean;
  inferredConnectionType: boolean;
  serverHistory: ElectrumServerItem[];
  setAsFavorite: boolean;
  isLoading: boolean;
  loadFailed: boolean;
  isValidating: boolean;
  validationError?: string;
  showLocalNetworkSettings: boolean;
  didSave: boolean;
  focusedField: 'host' | 'port';
};
export const initialAddElectrumServerState: AddElectrumServerState = {
  host: '',
  portText: '',
  useSsl: false,
  portWasAutofilled: false,
  inferredConnectionType: false,
  serverHistory: [],
  setAsFavorite: true,
  isLoading: true,
  loadFailed: false,
  isValidating: false,
  showLocalNetworkSettings: false,
  didSave: false,
  focusedField: 'host',
};
type AddElectrumServerAction =
  | { type: 'loaded'; history?: ElectrumServerItem[] }
  | { type: 'loadFailed'; error: string }
  | { type: 'applyServer'; server: ElectrumServerItem }
  | { type: 'hostChanged' | 'portChanged'; text: string }
  | { type: 'protocolChanged'; useSsl: boolean }
  | { type: 'favoriteChanged'; value: boolean }
  | { type: 'focused'; field: 'host' | 'port' }
  | { type: 'validationStarted' | 'validationFinished' | 'saved' }
  | { type: 'validationFailed'; error: string; showSettings?: boolean };
export function addElectrumServerReducer(state: AddElectrumServerState, action: AddElectrumServerAction): AddElectrumServerState {
  if (state.isValidating && ['applyServer', 'hostChanged', 'portChanged', 'protocolChanged', 'favoriteChanged'].includes(action.type))
    return state;
  const edited = {
    ...state,
    validationError: state.loadFailed ? state.validationError : undefined,
    showLocalNetworkSettings: false,
  };
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        isLoading: false,
        serverHistory: action.history ?? [],
      };
    case 'loadFailed':
      return {
        ...state,
        isLoading: false,
        loadFailed: true,
        validationError: action.error,
      };
    case 'focused':
      return { ...state, focusedField: action.field };
    case 'applyServer':
      return {
        ...edited,
        host: action.server.host,
        portText: String(action.server.ssl ?? action.server.tcp ?? ''),
        useSsl: action.server.ssl !== undefined,
        portWasAutofilled: false,
        inferredConnectionType: true,
      };
    case 'hostChanged': {
      const host = action.text.trim();
      const inferred = !state.portText || state.portWasAutofilled ? inferElectrumServerFromHost(host) : undefined;
      return {
        ...edited,
        host,
        ...(inferred
          ? {
              portText: String(inferred.ssl ?? inferred.tcp),
              useSsl: inferred.ssl !== undefined,
              portWasAutofilled: true,
              inferredConnectionType: true,
            }
          : {}),
      };
    }
    case 'portChanged': {
      const text = action.text.trim();
      const inferred = !state.inferredConnectionType && /^\d+$/.test(text) ? inferElectrumServerSsl(Number(text)) : undefined;
      return {
        ...edited,
        portText: text,
        portWasAutofilled: false,
        ...(inferred !== undefined ? { useSsl: inferred, inferredConnectionType: true } : {}),
      };
    }
    case 'protocolChanged':
      return { ...edited, useSsl: action.useSsl, inferredConnectionType: true };
    case 'favoriteChanged':
      return { ...state, setAsFavorite: action.value };
    case 'validationStarted':
      return { ...edited, isValidating: true };
    case 'validationFailed':
      return {
        ...state,
        validationError: action.error,
        showLocalNetworkSettings: action.showSettings ?? false,
      };
    case 'validationFinished':
      return { ...state, isValidating: false };
    case 'saved':
      return { ...state, didSave: true, isValidating: false };
  }
}

const AddElectrumServer: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const isMac = Platform.OS === 'ios' && Platform.isMacCatalyst;
  const navigation = useNavigation<NativeStackNavigationProp<AddElectrumServerStackParamList, 'AddElectrumServer'>>();
  const route = useRoute();
  const params = route.params as AddElectrumServerStackParamList['AddElectrumServer'];
  const [state, dispatch] = useReducer(addElectrumServerReducer, initialAddElectrumServerState);
  const {
    host,
    portText,
    useSsl,
    portWasAutofilled,
    setAsFavorite,
    isLoading,
    isValidating,
    validationError,
    showLocalNetworkSettings,
    didSave,
    focusedField,
    loadFailed,
  } = state;
  const numericPort = /^\d+$/.test(portText) ? Number(portText) : undefined;
  const port = useSsl ? undefined : numericPort;
  const sslPort = useSsl ? numericPort : undefined;
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const hostInput = useRef<TextInput>(null);
  const portInput = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const presentAlert = useCallback((title: string, message: string, buttons: AlertButton[]) => {
    const anchor = findNodeHandle(scrollViewRef.current);
    if (anchor === null) return;
    const cancelButtonIndex = buttons.findIndex(button => button.style === 'cancel');
    const destructiveButtonIndex = buttons.findIndex(button => button.style === 'destructive');
    ActionSheet.showActionSheetWithOptions(
      {
        anchor,
        title,
        message,
        options: buttons.map(button => button.text ?? ''),
        cancelButtonIndex: cancelButtonIndex >= 0 ? cancelButtonIndex : undefined,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      buttonIndex => buttons[buttonIndex]?.onPress?.(),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      const releaseSuppression = BlueElectrum.suppressNetworkErrorAlerts();
      return releaseSuppression;
    }, []),
  );

  const stylesHook = StyleSheet.create({
    screen: { backgroundColor: colors.background },
    inputWrap: {
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    inputText: { color: colors.foregroundColor },
    fieldLabel: { color: colors.alternativeTextColor },
    validationErrorContainer: { backgroundColor: colors.redBG },
    validationErrorTitle: { color: colors.redText },
    validationErrorMessage: { color: colors.foregroundColor },
    duplicateNoticeContainer: { backgroundColor: colors.buttonBackgroundColor },
    duplicateNoticeTitle: { color: colors.alternativeTextColor2 },
    nativeInput: { height: Math.max(48, Math.ceil(44 * fontScale)) },
    content: isMac ? { width: '100%', maxWidth: 720, alignSelf: 'center' } : {},
  });

  const hasChanges = !didSave && (host !== '' || portText !== '' || !setAsFavorite);
  usePreventRemove(hasChanges || isValidating, ({ data }) => {
    if (saving.current) return;
    presentAlert(loc._.discard_changes, loc._.discard_changes_explain, [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc._.ok,
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  useEffect(() => {
    if (didSave) navigation.goBack();
  }, [didSave, navigation]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      const [historyValue, favorite] = await Promise.all([
        DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY),
        BlueElectrum.getPreferredServer(),
      ]);
      const history = parseElectrumServerDocumentResult(typeof historyValue === 'string' ? historyValue : '').servers;
      if (active)
        dispatch({
          type: 'loaded',
          history: uniqueElectrumServers([...history, ...(favorite ? [favorite] : [])]),
        });
    };
    load().catch(error => {
      if (active)
        dispatch({
          type: 'loadFailed',
          error: error instanceof Error ? error.message : String(error),
        });
    });
    return () => {
      active = false;
    };
  }, []);

  const applyServerText = useCallback((text: string) => {
    const server = parseElectrumServer(text);
    if (!server) return false;
    dispatch({ type: 'applyServer', server });
    Keyboard.dismiss();
    return true;
  }, []);
  useEffect(() => {
    if (params?.onBarScanned) {
      applyServerText(params.onBarScanned);
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [applyServerText, navigation, params?.onBarScanned]);
  useEffect(() => {
    if (params?.server) dispatch({ type: 'applyServer', server: params.server });
  }, [params?.server]);
  const onPortChange = useCallback(
    (text: string) => {
      if (!applyServerText(text)) dispatch({ type: 'portChanged', text });
    },
    [applyServerText],
  );
  const onHostChange = useCallback(
    (text: string) => {
      if (!applyServerText(text)) dispatch({ type: 'hostChanged', text });
    },
    [applyServerText],
  );

  const draftServer = useMemo(() => {
    const draftPort = sslPort ?? port;
    return draftPort ? parseElectrumServer(`${host} ${draftPort} ${useSsl ? 'ssl' : 'tcp'}`) : undefined;
  }, [host, port, sslPort, useSsl]);
  const duplicateSource = draftServer
    ? state.serverHistory.some(server => serverKey(server) === serverKey(draftServer))
      ? 'history'
      : suggestedServers.some(server => serverKey(server) === serverKey(draftServer))
        ? 'suggested'
        : undefined
    : undefined;
  const saveDisabled = !draftServer || duplicateSource !== undefined || isLoading || isValidating || loadFailed;

  useEffect(() => {
    if (duplicateSource && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(loc.settings.electrum_server_already_added, { queue: true });
    }
  }, [duplicateSource]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const message = isValidating
      ? loc.settings.electrum_validating_server
      : validationError
        ? `${loc.settings.electrum_validation_failed}. ${validationError}`
        : didSave
          ? loc.settings.electrum_saved
          : undefined;
    if (message) AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, [didSave, isValidating, validationError]);

  const save = useCallback(async () => {
    if (!draftServer || saveDisabled || saving.current) return;
    saving.current = true;
    Keyboard.dismiss();
    dispatch({ type: 'validationStarted' });
    try {
      if (Platform.OS === 'ios' && isLocalElectrumHost(draftServer.host)) {
        const hasLocalNetworkAccess = (await NativeLocalNetworkPermission?.requestLocalNetworkAccess()) ?? false;
        if (!hasLocalNetworkAccess) {
          dispatch({
            type: 'validationFailed',
            error: loc.settings.electrum_local_server_unavailable,
            showSettings: true,
          });
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          return;
        }
      }

      const validation = await BlueElectrum.validateConnection(draftServer.host, draftServer.tcp, draftServer.ssl);
      if (!validation.success) {
        const isLocalNetworkFailure = Platform.OS === 'ios' && isLocalElectrumHost(draftServer.host);
        dispatch({
          type: 'validationFailed',
          showSettings: isLocalNetworkFailure,
          error: isLocalNetworkFailure
            ? `${loc.settings.electrum_local_server_unavailable}\n\n${validation.error || loc.settings.electrum_error_connect}`
            : draftServer.host.endsWith('.onion')
              ? `${loc.settings.electrum_error_connect_tor}\n\n${validation.error ?? ''}`.trim()
              : validation.error || loc.settings.electrum_error_connect,
        });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return;
      }

      if (!mounted.current) return;
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      // Re-read immediately before writing so an import or connection update is preserved.
      const [historyValue, currentFavorite] = await Promise.all([
        DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY),
        BlueElectrum.getPreferredServer(),
      ]);
      const savedHistory = parseElectrumServerDocumentResult(typeof historyValue === 'string' ? historyValue : '').servers;
      if (
        [...savedHistory, ...suggestedServers, ...(currentFavorite ? [currentFavorite] : [])].some(
          server => serverKey(server) === serverKey(draftServer),
        )
      ) {
        dispatch({
          type: 'validationFailed',
          error: loc.settings.electrum_server_already_added,
        });
        return;
      }
      const history = uniqueElectrumServers([...savedHistory, ...(currentFavorite ? [currentFavorite] : []), draftServer]);
      await DefaultPreference.setMultiple({
        [BlueElectrum.ELECTRUM_SERVER_HISTORY]: JSON.stringify(history),
        ...(setAsFavorite
          ? {
              [BlueElectrum.ELECTRUM_TCP_PORT]: draftServer.tcp?.toString() ?? '',
              [BlueElectrum.ELECTRUM_SSL_PORT]: draftServer.ssl?.toString() ?? '',
              [BlueElectrum.ELECTRUM_HOST]: draftServer.host,
            }
          : {}),
      });
      if (setAsFavorite) {
        BlueElectrum.isDisabled()
          .then(disabled => {
            if (disabled) return;
            BlueElectrum.forceDisconnect();
            return BlueElectrum.ensureConnected();
          })
          .catch(error => console.warn('[electrum] Reconnect failed:', error));
      }
      dispatch({ type: 'saved' });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    } catch (error) {
      dispatch({
        type: 'validationFailed',
        error: error instanceof Error ? error.message : String(error),
      });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    } finally {
      saving.current = false;
      dispatch({ type: 'validationFinished' });
    }
  }, [draftServer, saveDisabled, setAsFavorite]);

  const renderHeaderRight = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loc.settings.electrum_confirm}
        accessibilityHint={loc.settings.electrum_save_server_hint}
        accessibilityState={{ disabled: saveDisabled, busy: isValidating }}
        testID="Save"
        disabled={saveDisabled}
        onPress={save}
        hitSlop={8}
        style={({ pressed }) => [styles.headerButton, saveDisabled && styles.disabled, pressed && styles.pressed]}
      >
        {isValidating ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="checkmark" size={26} color={saveDisabled ? colors.buttonDisabledTextColor : colors.primary} />
        )}
      </Pressable>
    ),
    [colors.buttonDisabledTextColor, colors.primary, isValidating, save, saveDisabled],
  );

  const unstableHeaderRightItems = useCallback(
    () =>
      isValidating
        ? [
            {
              type: 'custom' as const,
              element: <ActivityIndicator accessibilityLabel={loc.settings.electrum_validating_server} color={colors.primary} />,
            },
          ]
        : [
            {
              type: 'button' as const,
              label: loc.settings.electrum_confirm,
              identifier: 'Confirm',
              accessibilityLabel: loc.settings.electrum_confirm,
              disabled: saveDisabled,
              onPress: save,
            },
          ],
    [colors.primary, isValidating, save, saveDisabled],
  );

  useScreenMenuActions(
    {
      saveElectrumServer: save,
      focusElectrumHost: () => {
        if (!isLoading && !isValidating) hostInput.current?.focus();
      },
      focusElectrumPort: () => {
        if (!isLoading && !isValidating) portInput.current?.focus();
      },
    },
    undefined,
    {
      saveElectrumServer: { disabled: saveDisabled },
      focusElectrumHost: { disabled: isLoading || isValidating },
      focusElectrumPort: { disabled: isLoading || isValidating },
    },
  );

  useLayoutEffect(() => {
    navigation.setParams({
      headerRight: renderHeaderRight,
      unstable_headerRightItems: unstableHeaderRightItems,
    });
  }, [navigation, renderHeaderRight, unstableHeaderRightItems]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={stylesHook.screen}
      contentContainerStyle={[styles.content, stylesHook.content, { paddingBottom: insets.bottom + 24 }]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardShouldPersistTaps="handled"
      testID="AddElectrumServerScrollView"
      accessibilityLabel={loc.settings.electrum_add_server}
      accessibilityState={{ busy: isLoading || isValidating }}
      onAccessibilityEscape={() => navigation.goBack()}
    >
      <SettingsSection containerStyle={styles.section}>
        {isValidating ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={loc.settings.electrum_validating_server}
            accessibilityLiveRegion="polite"
            style={styles.validationStatus}
          >
            <ActivityIndicator accessible={false} color={colors.primary} />
            <Text style={[styles.validationText, stylesHook.fieldLabel]}>{loc.settings.electrum_validating_server}</Text>
          </View>
        ) : null}
        {validationError ? (
          <View
            accessible={false}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.notice, stylesHook.validationErrorContainer]}
          >
            <Ionicons accessible={false} name="alert-circle" size={24} color={colors.redText} />
            <View style={styles.noticeText}>
              <Text accessibilityRole="header" style={[styles.noticeTitle, stylesHook.validationErrorTitle]}>
                {loc.settings.electrum_validation_failed}
              </Text>
              <Text selectable style={[styles.noticeMessage, stylesHook.validationErrorMessage]}>
                {validationError}
              </Text>
              {showLocalNetworkSettings ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={loc.send.open_settings}
                  onPress={() => Linking.openSettings().catch(() => undefined)}
                  style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
                >
                  <Text style={[styles.settingsButtonText, { color: colors.primary }]}>{loc.send.open_settings}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {duplicateSource ? (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${loc.settings.electrum_server_already_added}. ${
              duplicateSource === 'history'
                ? loc.settings.electrum_server_already_in_history
                : loc.settings.electrum_server_already_suggested
            }`}
            accessibilityLiveRegion="polite"
            style={[styles.notice, stylesHook.duplicateNoticeContainer]}
          >
            <Ionicons accessible={false} name="information-circle" size={24} color={colors.alternativeTextColor2} />
            <View style={styles.noticeText}>
              <Text style={[styles.noticeTitle, stylesHook.duplicateNoticeTitle]}>{loc.settings.electrum_server_already_added}</Text>
              <Text style={[styles.noticeMessage, stylesHook.validationErrorMessage]}>
                {duplicateSource === 'history'
                  ? loc.settings.electrum_server_already_in_history
                  : loc.settings.electrum_server_already_suggested}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.fields}>
          <Text nativeID="ElectrumHostLabel" style={[styles.label, stylesHook.fieldLabel]}>
            {loc.settings.electrum_server_address}
          </Text>
          <AddressInput
            testID="HostInput"
            placeholder={loc.formatString(loc.settings.electrum_host, {
              example: '10.20.30.40',
            })}
            address={host}
            onChangeText={onHostChange}
            editable={!isLoading && !isValidating}
            keyboardType="default"
            inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            isLoading={isLoading}
            style={[styles.nativeInput, stylesHook.nativeInput]}
            showScanButton={!isMac && !isValidating}
            accessibilityLabel={loc.settings.electrum_server_address}
            accessibilityHint={loc.settings.electrum_server_address_hint}
            accessibilityState={{ disabled: isLoading || isValidating }}
            inputRef={hostInput}
            returnKeyType="next"
            onFocus={() => dispatch({ type: 'focused', field: 'host' })}
            onSubmitEditing={() => portInput.current?.focus()}
          />
          <Text style={[styles.label, stylesHook.fieldLabel]}>
            {loc.formatString(loc.settings.electrum_port, {
              example: useSsl ? '50002' : '50001',
            })}
          </Text>
          <View style={[styles.inputWrap, styles.nativeInput, stylesHook.nativeInput, stylesHook.inputWrap]}>
            <TextInput
              ref={portInput}
              testID="PortInput"
              placeholder={useSsl ? '50002' : '50001'}
              value={portText}
              onChangeText={onPortChange}
              style={[styles.inputText, stylesHook.inputText]}
              editable={!isLoading && !isValidating}
              placeholderTextColor="#81868e"
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="number-pad"
              selectTextOnFocus={portWasAutofilled}
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
              accessibilityLabel={loc.settings.electrum_port_accessibility_label}
              accessibilityHint={loc.settings.electrum_port_accessibility_hint}
              accessibilityState={{ disabled: isLoading || isValidating }}
              returnKeyType="done"
              onFocus={() => dispatch({ type: 'focused', field: 'port' })}
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
          <Text style={[styles.label, stylesHook.fieldLabel]}>{loc.settings.electrum_connection_type}</Text>
          <SegmentedControl
            testID="SSLPortInput"
            values={['TCP', 'SSL']}
            selectedIndex={useSsl ? 1 : 0}
            enabled={!isLoading && !isValidating && !host.toLowerCase().endsWith('.onion')}
            onChange={index => {
              triggerSelectionHapticFeedback();
              dispatch({ type: 'protocolChanged', useSsl: index === 1 });
            }}
            usePlatformStyle
            accessibilityLabel={loc.settings.electrum_connection_type}
            accessibilityHint={loc.settings.electrum_connection_type_hint}
          />
        </View>
        <SettingsListItem
          title={loc.settings.electrum_set_as_favorite}
          subtitle={loc.settings.electrum_favorite_description}
          switch={{
            testID: 'SetServerAsFavoriteSwitch',
            value: setAsFavorite,
            onValueChange: value => {
              triggerSelectionHapticFeedback();
              dispatch({ type: 'favoriteChanged', value });
            },
            disabled: isLoading || isValidating || !draftServer,
          }}
          bottomDivider={false}
          containerStyle={styles.favoriteRow}
        />
      </SettingsSection>
      {Platform.OS === 'ios' && !isMac ? (
        <DismissKeyboardInputAccessory
          onPrevious={() => hostInput.current?.focus()}
          onNext={() => portInput.current?.focus()}
          previousDisabled={focusedField === 'host' || isLoading || isValidating}
          nextDisabled={focusedField === 'port' || isLoading || isValidating}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingTop: Platform.select({ ios: 20, default: 16 }) },
  section: { marginBottom: 20 },
  fields: { gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: '600' },
  nativeInput: {
    minHeight: Platform.select({ ios: 44, default: 48 }),
    borderRadius: Platform.select({ ios: 10, default: 8 }),
    borderBottomWidth: 1,
  },
  inputWrap: { flexDirection: 'row', borderWidth: 1, alignItems: 'center' },
  inputText: {
    flex: 1,
    paddingHorizontal: 12,
    minHeight: Platform.select({ ios: 42, default: 46 }),
    fontSize: 16,
  },
  favoriteRow: { minHeight: Platform.select({ ios: 50, default: 56 }) },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
  validationStatus: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationText: { fontSize: 15, fontWeight: '500' },
  notice: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: Platform.select({ ios: 12, default: 10 }),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noticeText: { flex: 1, gap: 3 },
  noticeTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  noticeMessage: { fontSize: 14, lineHeight: 20 },
  settingsButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 5,
  },
  settingsButtonText: { fontSize: 15, fontWeight: '600' },
});

export default AddElectrumServer;
