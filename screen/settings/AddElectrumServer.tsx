import { useFocusEffect, useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { suggestedServers } from '../../blue_modules/BlueElectrum';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import { ElectrumServerItem, inferElectrumServerSsl, parseElectrumServer } from '../../blue_modules/electrumServer';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import AddressInput from '../../components/AddressInput';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import SegmentedControl from '../../components/SegmentedControl';
import { SettingsFootnote, SettingsListItem, SettingsSection } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddElectrumServerStackParamList } from '../../navigation/AddElectrumServerStackParamList';

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
  const [serverHistory, setServerHistory] = useState<Set<ElectrumServerItem>>(new Set());
  const [currentFavorite, setCurrentFavorite] = useState<ElectrumServerItem>();
  const [setAsFavorite, setSetAsFavorite] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const [didSave, setDidSave] = useState(false);
  const inferredConnectionType = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const releaseSuppression = BlueElectrum.suppressNetworkErrorAlerts();
      return releaseSuppression;
    }, []),
  );

  const stylesHook = StyleSheet.create({
    screen: { backgroundColor: colors.background },
    inputWrap: { borderColor: colors.formBorder, backgroundColor: colors.inputBackgroundColor },
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
    Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
      { text: loc._.cancel, style: 'cancel' },
      { text: loc._.ok, style: 'destructive', onPress: () => navigation.dispatch(data.action) },
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
  }, [host, port, sslPort]);

  const applyServerText = useCallback((text: string) => {
    const server = parseElectrumServer(text);
    if (!server) return false;
    inferredConnectionType.current = true;
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
      const validation = await BlueElectrum.validateConnection(draftServer.host, draftServer.tcp, draftServer.ssl);
      if (!validation.success) {
        setValidationError(
          draftServer.host.endsWith('.onion')
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
              label: loc.settings.save,
              icon: { type: 'sfSymbol' as const, name: 'checkmark' as const },
              tintColor: colors.primary,
              identifier: 'Save',
              accessibilityLabel: loc.settings.save,
              disabled: saveDisabled,
              onPress: save,
            },
          ],
    [colors.primary, isValidating, save, saveDisabled],
  );

  useEffect(() => {
    navigation.setOptions({ headerRight: renderHeaderRight, unstable_headerRightItems: unstableHeaderRightItems });
  }, [navigation, renderHeaderRight, unstableHeaderRightItems]);

  return (
    <ScrollView
      style={stylesHook.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardShouldPersistTaps="handled"
      testID="AddElectrumServerScrollView"
      accessibilityLabel={loc.settings.electrum_add_server}
    >
      <SettingsSection title={loc.settings.electrum_add_server} iconName="electrum" containerStyle={styles.section}>
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
        <View style={styles.intro}>
          <SettingsFootnote>{loc.settings.electrum_add_server_description}</SettingsFootnote>
        </View>
        <View style={styles.fields}>
          <Text style={[styles.label, stylesHook.fieldLabel]}>{loc.settings.electrum_server_address}</Text>
          <AddressInput
            testID="HostInput"
            placeholder={loc.formatString(loc.settings.electrum_host, { example: '10.20.30.40' })}
            address={host}
            onChangeText={text => {
              if (!applyServerText(text)) setHost(text.trim());
            }}
            editable={!isLoading}
            keyboardType="default"
            inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            isLoading={isLoading}
            style={styles.nativeInput}
            accessibilityLabel={loc.settings.electrum_server_address}
            accessibilityHint={loc.settings.electrum_server_address_hint}
          />
          <Text style={[styles.label, stylesHook.fieldLabel]}>
            {loc.formatString(loc.settings.electrum_port, { example: sslPort !== undefined ? '50002' : '50001' })}
          </Text>
          <View style={[styles.inputWrap, styles.nativeInput, stylesHook.inputWrap]}>
            <TextInput
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
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
              accessibilityLabel={loc.settings.electrum_port_accessibility_label}
              accessibilityHint={loc.settings.electrum_port_accessibility_hint}
            />
          </View>
        </View>
      </SettingsSection>

      <SettingsSection title={loc.settings.electrum_connection_type} iconName="network" containerStyle={styles.section}>
        <View style={styles.protocol}>
          <SegmentedControl
            testID="SSLPortInput"
            values={['TCP', 'SSL']}
            selectedIndex={sslPort === undefined ? 0 : 1}
            enabled={!isLoading && Boolean(draftServer) && !host.endsWith('.onion')}
            onChange={index => {
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
      </SettingsSection>

      <SettingsSection title={loc.settings.electrum_favorite_server} iconName="favorite" containerStyle={styles.section}>
        <SettingsListItem
          title={loc.settings.electrum_set_as_favorite}
          subtitle={loc.settings.electrum_set_as_favorite_description}
          switch={{ testID: 'SetServerAsFavoriteSwitch', value: setAsFavorite, onValueChange: setSetAsFavorite, disabled: isLoading }}
          bottomDivider={false}
        />
      </SettingsSection>
      {Platform.OS === 'ios' ? <DismissKeyboardInputAccessory /> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingTop: Platform.select({ ios: 20, default: 16 }) },
  section: { marginBottom: 20 },
  intro: { paddingHorizontal: 16, paddingTop: 14 },
  fields: { gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 },
  label: { fontSize: 13, fontWeight: '600' },
  nativeInput: {
    minHeight: Platform.select({ ios: 44, default: 48 }),
    height: Platform.select({ ios: 44, default: 48 }),
    borderRadius: Platform.select({ ios: 10, default: 8 }),
    borderBottomWidth: 1,
  },
  inputWrap: { flexDirection: 'row', borderWidth: 1, alignItems: 'center' },
  inputText: { flex: 1, paddingHorizontal: 12, minHeight: Platform.select({ ios: 42, default: 46 }), fontSize: 16 },
  protocol: { paddingHorizontal: 16, paddingVertical: 14 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
  validationStatus: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
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
});

export default AddElectrumServer;
