import { useFocusEffect, useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

const serverKey = (server: ElectrumServerItem) => `${server.host}:${server.tcp ?? ''}:${server.ssl ?? ''}`;

const AddElectrumServer: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AddElectrumServerStackParamList, 'AddElectrumServer'>>();
  const route = useRoute();
  const params = route.params as AddElectrumServerStackParamList['AddElectrumServer'];
  const [host, setHost] = useState('');
  const [port, setPort] = useState<number>();
  const [sslPort, setSslPort] = useState<number>();
  const [portWasAutofilled, setPortWasAutofilled] = useState(false);
  const [serverHistory, setServerHistory] = useState<Set<ElectrumServerItem>>(new Set());
  const [currentFavorite, setCurrentFavorite] = useState<ElectrumServerItem>();
  const [setAsFavorite, setSetAsFavorite] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const [showLocalNetworkSettings, setShowLocalNetworkSettings] = useState(false);
  const [didSave, setDidSave] = useState(false);
  const inferredConnectionType = useRef(false);
  const hostInput = useRef<TextInput>(null);
  const portInput = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [focusedField, setFocusedField] = useState<'host' | 'port'>('host');

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
  });

  const hasChanges = !didSave && (host !== '' || port !== undefined || sslPort !== undefined || !setAsFavorite);
  usePreventRemove(hasChanges, ({ data }) => {
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
    const load = async () => {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      const [favorite, historyValue] = await Promise.all([
        BlueElectrum.getPreferredServer(),
        DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY) as Promise<string>,
      ]);
      const history: ElectrumServerItem[] = historyValue ? JSON.parse(historyValue) : [];
      setCurrentFavorite(favorite);
      setServerHistory(new Set(history.filter(server => server.host && (server.tcp || server.ssl))));
      setIsLoading(false);
    };
    load().catch(error => {
      setValidationError((error as Error).message);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setValidationError(undefined);
    setShowLocalNetworkSettings(false);
  }, [host, port, sslPort]);

  const applyServerText = useCallback((text: string) => {
    const server = parseElectrumServer(text);
    if (!server) return false;
    inferredConnectionType.current = true;
    setPortWasAutofilled(false);
    setHost(server.host);
    setPort(server.tcp);
    setSslPort(server.ssl);
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
    if (!params?.server) return;
    inferredConnectionType.current = true;
    setHost(params.server.host);
    setPort(params.server.tcp);
    setSslPort(params.server.ssl);
  }, [params?.server]);

  const onPortChange = useCallback(
    (text: string) => {
      setPortWasAutofilled(false);
      if (applyServerText(text)) return;
      const value = text.trim();
      const numericPort = Number(value);
      if (!value || Number.isNaN(numericPort)) {
        sslPort === undefined ? setPort(undefined) : setSslPort(undefined);
        return;
      }
      if (!inferredConnectionType.current) {
        const inferredSsl = inferElectrumServerSsl(numericPort);
        if (inferredSsl !== undefined) {
          inferredConnectionType.current = true;
          setPort(inferredSsl ? undefined : numericPort);
          setSslPort(inferredSsl ? numericPort : undefined);
          return;
        }
      }
      sslPort === undefined ? setPort(numericPort) : setSslPort(numericPort);
    },
    [applyServerText, sslPort],
  );

  const onHostChange = useCallback(
    (text: string) => {
      if (applyServerText(text)) return;
      const value = text.trim();
      setHost(value);
      if (port !== undefined || sslPort !== undefined) return;

      const inferredServer = inferElectrumServerFromHost(value);
      if (!inferredServer) return;
      inferredConnectionType.current = true;
      setPortWasAutofilled(true);
      setPort(inferredServer.tcp);
      setSslPort(inferredServer.ssl);
    },
    [applyServerText, port, sslPort],
  );

  const draftServer = useMemo(() => {
    const draftPort = sslPort ?? port;
    return draftPort ? parseElectrumServer(`${host} ${draftPort} ${sslPort !== undefined ? 'ssl' : 'tcp'}`) : undefined;
  }, [host, port, sslPort]);
  const duplicateSource = draftServer
    ? Array.from(serverHistory).some(server => serverKey(server) === serverKey(draftServer))
      ? 'history'
      : suggestedServers.some(server => serverKey(server) === serverKey(draftServer))
        ? 'suggested'
        : undefined
    : undefined;
  const saveDisabled = !draftServer || duplicateSource !== undefined || isLoading || isValidating;

  const save = useCallback(async () => {
    if (!draftServer || saveDisabled) return;
    Keyboard.dismiss();
    setIsValidating(true);
    setValidationError(undefined);
    try {
      if (Platform.OS === 'ios' && isLocalElectrumHost(draftServer.host)) {
        const hasLocalNetworkAccess = (await NativeLocalNetworkPermission?.requestLocalNetworkAccess()) ?? false;
        if (!hasLocalNetworkAccess) {
          setShowLocalNetworkSettings(true);
          setValidationError(loc.settings.electrum_local_server_unavailable);
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          return;
        }
      }

      const validation = await BlueElectrum.validateConnection(draftServer.host, draftServer.tcp, draftServer.ssl);
      if (!validation.success) {
        const isLocalNetworkFailure = Platform.OS === 'ios' && isLocalElectrumHost(draftServer.host);
        setShowLocalNetworkSettings(isLocalNetworkFailure);
        setValidationError(
          isLocalNetworkFailure
            ? loc.settings.electrum_local_server_unavailable
            : draftServer.host.endsWith('.onion')
              ? `${loc.settings.electrum_error_connect_tor}\n\n${validation.error ?? ''}`.trim()
              : validation.error || loc.settings.electrum_error_connect,
        );
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return;
      }

      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      if (setAsFavorite) {
        await DefaultPreference.clear(BlueElectrum.ELECTRUM_HOST);
        await DefaultPreference.clear(BlueElectrum.ELECTRUM_TCP_PORT);
        await DefaultPreference.clear(BlueElectrum.ELECTRUM_SSL_PORT);
        await DefaultPreference.set(BlueElectrum.ELECTRUM_HOST, draftServer.host);
        await DefaultPreference.set(BlueElectrum.ELECTRUM_TCP_PORT, draftServer.tcp?.toString() ?? '');
        await DefaultPreference.set(BlueElectrum.ELECTRUM_SSL_PORT, draftServer.ssl?.toString() ?? '');
        BlueElectrum.forceDisconnect();
        await BlueElectrum.ensureConnected();
      }

      const candidates = [...Array.from(serverHistory), ...(currentFavorite ? [currentFavorite] : []), draftServer];
      const history = candidates.filter(
        (candidate, index, all) => all.findIndex(existing => serverKey(existing) === serverKey(candidate)) === index,
      );
      await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(history));
      setDidSave(true);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    } catch (error) {
      setValidationError((error as Error).message);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    } finally {
      setIsValidating(false);
    }
  }, [currentFavorite, draftServer, saveDisabled, serverHistory, setAsFavorite]);

  const renderHeaderRight = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loc.settings.save}
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

  useScreenMenuActions({
    saveElectrumServer: saveDisabled ? undefined : save,
  });

  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
      unstable_headerRightItems: unstableHeaderRightItems,
    });
  }, [navigation, renderHeaderRight, unstableHeaderRightItems]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={stylesHook.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardShouldPersistTaps="handled"
      testID="AddElectrumServerScrollView"
      accessibilityLabel={loc.settings.electrum_add_server}
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
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${loc.settings.electrum_validation_failed}. ${validationError}`}
            style={[styles.notice, stylesHook.validationErrorContainer]}
          >
            <Ionicons accessible={false} name="alert-circle" size={24} color={colors.redText} />
            <View style={styles.noticeText}>
              <Text style={[styles.noticeTitle, stylesHook.validationErrorTitle]}>{loc.settings.electrum_validation_failed}</Text>
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
          <Text style={[styles.label, stylesHook.fieldLabel]}>{loc.settings.electrum_server_address}</Text>
          <AddressInput
            testID="HostInput"
            placeholder={loc.formatString(loc.settings.electrum_host, {
              example: '10.20.30.40',
            })}
            address={host}
            onChangeText={onHostChange}
            editable={!isLoading}
            keyboardType="default"
            inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            isLoading={isLoading}
            style={styles.nativeInput}
            accessibilityLabel={loc.settings.electrum_server_address}
            accessibilityHint={loc.settings.electrum_server_address_hint}
            inputRef={hostInput}
            returnKeyType="next"
            onFocus={() => setFocusedField('host')}
            onSubmitEditing={() => portInput.current?.focus()}
          />
          <Text style={[styles.label, stylesHook.fieldLabel]}>
            {loc.formatString(loc.settings.electrum_port, {
              example: sslPort !== undefined ? '50002' : '50001',
            })}
          </Text>
          <View style={[styles.inputWrap, styles.nativeInput, stylesHook.inputWrap]}>
            <TextInput
              ref={portInput}
              testID="PortInput"
              placeholder={sslPort !== undefined ? '50002' : '50001'}
              value={(sslPort ?? port)?.toString() ?? ''}
              onChangeText={onPortChange}
              style={[styles.inputText, stylesHook.inputText]}
              editable={!isLoading}
              placeholderTextColor="#81868e"
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="number-pad"
              selectTextOnFocus={portWasAutofilled}
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
              accessibilityLabel={loc.settings.electrum_port_accessibility_label}
              accessibilityHint={loc.settings.electrum_port_accessibility_hint}
              returnKeyType="done"
              onFocus={() => setFocusedField('port')}
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
          <Text style={[styles.label, stylesHook.fieldLabel]}>{loc.settings.electrum_connection_type}</Text>
          <SegmentedControl
            testID="SSLPortInput"
            values={['TCP', 'SSL']}
            selectedIndex={sslPort === undefined ? 0 : 1}
            enabled={!isLoading && Boolean(draftServer) && !host.endsWith('.onion')}
            onChange={index => {
              triggerSelectionHapticFeedback();
              inferredConnectionType.current = true;
              if (index === 1 && sslPort === undefined) {
                setSslPort(port);
                setPort(undefined);
              }
              if (index === 0 && sslPort !== undefined) {
                setPort(sslPort);
                setSslPort(undefined);
              }
            }}
            usePlatformStyle
            accessibilityLabel={loc.settings.electrum_connection_type}
            accessibilityHint={loc.settings.electrum_connection_type_hint}
          />
        </View>
        <SettingsListItem
          title={loc.settings.electrum_set_as_favorite}
          switch={{
            testID: 'SetServerAsFavoriteSwitch',
            value: setAsFavorite,
            onValueChange: value => {
              triggerSelectionHapticFeedback();
              setSetAsFavorite(value);
            },
            disabled: isLoading || !draftServer,
          }}
          bottomDivider={false}
          containerStyle={styles.favoriteRow}
        />
      </SettingsSection>
      {Platform.OS === 'ios' ? (
        <DismissKeyboardInputAccessory
          onPrevious={() => hostInput.current?.focus()}
          onNext={() => portInput.current?.focus()}
          previousDisabled={focusedField === 'host'}
          nextDisabled={focusedField === 'port'}
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
    height: Platform.select({ ios: 44, default: 48 }),
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
    minHeight: 36,
    justifyContent: 'center',
    marginTop: 5,
  },
  settingsButtonText: { fontSize: 15, fontWeight: '600' },
});

export default AddElectrumServer;
