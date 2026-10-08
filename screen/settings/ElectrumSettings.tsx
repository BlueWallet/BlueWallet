import { useFocusEffect, useNavigation, RouteProp, usePreventRemove, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from '@react-native-vector-icons/ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import DeviceInfo from 'react-native-device-info';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { presentResetToDefaultsAlert, suggestedServers } from '../../blue_modules/BlueElectrum';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import {
  ElectrumServerItem,
  createElectrumServerHistoryDeepLink,
  electrumServerKey,
  formatElectrumServer,
  inferElectrumServerSsl,
  parseElectrumServer,
  parseElectrumServerDocumentResult,
  serializeElectrumServerDocument,
  uniqueElectrumServers,
} from '../../blue_modules/electrumServer';
import { showFilePickerAndReadFile, writeFileAndExport } from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes, triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import AddressInput from '../../components/AddressInput';
import presentAlert from '../../components/Alert';
import HandOffComponent from '../../components/HandOffComponent';
import ToolTipMenu from '../../components/TooltipMenu';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import { createEllipsisHeaderMenuOptions } from '../../components/headerMenuOptions';
import SegmentedControl from '../../components/SegmentedControl';
import { SettingsSection, SettingsListItem, SettingsFootnote } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import { Action, HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import useElectrumServerDiscovery from '../../hooks/useElectrumServerDiscovery';
import { useKeyboard } from '../../hooks/useKeyboard';
import useScreenMenuActions from '../../hooks/useScreenMenuActions';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

type RouteProps = RouteProp<DetailViewStackParamList, 'ElectrumSettings'>;

export type { ElectrumServerItem } from '../../blue_modules/electrumServer';

type ServerListEntry =
  | { type: 'header'; id: string; title: string; description?: string }
  | { type: 'discoveryStatus'; id: string; status: 'scanning' | 'empty' }
  | {
      type: 'server';
      id: string;
      server: ElectrumServerItem;
      isFirst: boolean;
      isLast: boolean;
      isHistory: boolean;
      isDiscovered?: boolean;
    };

const IMPORT_SERVERS_ACTION_ID = 'import_electrum_servers';
const EXPORT_SERVERS_ACTION_ID = 'export_electrum_servers';
const ADD_SERVER_ACTION_ID = 'add_electrum_server';
const DISCOVER_SERVERS_ACTION_ID = 'discover_electrum_servers';
const SHOW_SUGGESTED_SERVERS_ACTION_ID = 'show_suggested_electrum_servers';
const HANDOFF_SERVER_HISTORY_ACTION_ID = 'handoff_electrum_server_history';
const SHOW_SUGGESTED_SERVERS_STORAGE_KEY = 'electrum_show_suggested_servers';
const SERVER_LIST_FILE_NAME = 'bluewallet-server-history.electrumservers';
const IS_IOS_SIMULATOR = (() => {
  if (!__DEV__ || Platform.OS !== 'ios') return false;
  try {
    return DeviceInfo.isEmulatorSync();
  } catch {
    return false;
  }
})();

const serverKey = electrumServerKey;

const SwipeableServerRow: React.FC<{
  children: React.ReactNode;
  onTest?: () => void;
  testID: string;
  isLast?: boolean;
  onDelete?: () => void;
  onCopy?: () => void;
  deleteTestID?: string;
  menuTitle: string;
}> = ({ children, onTest, onDelete, onCopy, testID, isLast, deleteTestID, menuTitle }) => {
  const swipeableRef = useRef<Swipeable>(null);
  const performAction = (action?: () => void) => {
    swipeableRef.current?.close();
    action?.();
  };

  const menuActions: Action[] = [
    ...(onTest
      ? [
          {
            id: 'test',
            text: loc.settings.electrum_test_connection,
            image: Platform.OS === 'ios' ? 'waveform.path.ecg' : undefined,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            id: 'delete',
            text: loc.wallets.details_delete,
            image: Platform.OS === 'ios' ? 'trash' : undefined,
            destructive: true,
          },
        ]
      : []),
    ...(onCopy
      ? [
          {
            id: 'copy',
            text: loc.settings.electrum_copy_server,
            image: Platform.OS === 'ios' ? 'doc.on.doc' : undefined,
          },
        ]
      : []),
  ];
  const menuActionGroups = menuActions.map(action => [action]);

  const renderRightActions = () => (
    <View style={styles.swipeActionsContainer}>
      {onTest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.settings.electrum_test_connection}
          accessibilityHint={loc.settings.electrum_testing_server}
          testID={testID}
          onPress={() => performAction(onTest)}
          style={styles.testAction}
        >
          <Ionicons accessible={false} name="pulse-outline" color="#FFFFFF" size={21} />
          <Text accessible={false} style={styles.swipeActionText}>
            {loc.settings.electrum_test}
          </Text>
        </Pressable>
      ) : null}
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.wallets.details_delete}
          testID={deleteTestID}
          onPress={() => performAction(onDelete)}
          style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}
        >
          <Ionicons accessible={false} name="trash-outline" color="#FFFFFF" size={21} />
          <Text accessible={false} style={styles.swipeActionText}>
            {loc.wallets.details_delete}
          </Text>
        </Pressable>
      ) : null}
      {onCopy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.settings.electrum_copy_server}
          onPress={() => performAction(onCopy)}
          style={styles.copyAction}
        >
          <Ionicons accessible={false} name="copy-outline" color="#FFFFFF" size={21} />
          <Text accessible={false} style={styles.swipeActionText}>
            {loc.settings.electrum_copy}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (menuActions.length === 0) {
    return <View style={isLast && styles.serverRowGroupLast}>{children}</View>;
  }

  return (
    <View style={isLast && styles.serverRowGroupLast}>
      <Swipeable ref={swipeableRef} friction={2} rightThreshold={40} overshootRight={false} renderRightActions={renderRightActions}>
        <ToolTipMenu
          title={menuTitle}
          actions={menuActionGroups}
          onPressMenuItem={id => performAction(id === 'delete' ? onDelete : id === 'copy' ? onCopy : onTest)}
          shouldOpenOnLongPress
          style={styles.serverContextMenu}
        >
          {children}
        </ToolTipMenu>
      </Swipeable>
    </View>
  );
};

const ElectrumSettings: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useRoute<RouteProps>().params as DetailViewStackParamList['ElectrumSettings'];
  const { server, serverHistoryImport } = params;
  const customOnly = false;
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidatingServer, setIsValidatingServer] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const [shouldDismissAfterSave, setShouldDismissAfterSave] = useState(false);
  const [serverHistory, setServerHistory] = useState<Set<ElectrumServerItem>>(new Set());
  const [config, setConfig] = useState<{
    connected?: number;
    host?: string;
    port?: string;
  }>({});
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<number | undefined>();
  const [sslPort, setSslPort] = useState<number | undefined>(undefined);
  const [serverBanner, setServerBanner] = useState<string>('');
  const [setNewServerAsFavorite, setSetNewServerAsFavorite] = useState(true);
  const [isSuggestedExpanded, setIsSuggestedExpanded] = useState(false);
  const [isNearbyExpanded, setIsNearbyExpanded] = useState(true);
  const [showSuggestedServers, setShowSuggestedServers] = useState(true);
  const [isHandoffExportEnabled, setIsHandoffExportEnabled] = useState(false);
  const [testingServerKey, setTestingServerKey] = useState<string>();
  const { setIsElectrumDisabled, isElectrumDisabled, isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage } = useSettings();
  const { discoveredServers, isDiscoveringServers, hasStartedDiscovery, discoverServers, retryDiscovery } = useElectrumServerDiscovery();
  const handoffServerHistoryDocument = useMemo(
    () => (serverHistory.size > 0 ? serializeElectrumServerDocument(Array.from(serverHistory)) : ''),
    [serverHistory],
  );
  const handoffServerHistoryDeepLink = useMemo(
    () => (serverHistory.size > 0 ? createElectrumServerHistoryDeepLink(Array.from(serverHistory)) : ''),
    [serverHistory],
  );
  const [serverTestResults, setServerTestResults] = useState<Record<string, boolean>>({});
  const [isAndroidNumericKeyboardFocused, setIsAndroidNumericKeyboardFocused] = useState(false);
  const [isAndroidAddressKeyboardVisible, setIsAndroidAddressKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<ServerListEntry>>(null);
  const hostInputRef = useRef<View>(null);
  const portInputRef = useRef<View>(null);
  const focusedFieldRef = useRef<'host' | 'port' | null>(null);
  const scrollYRef = useRef<number>(0);
  const hasInferredConnectionTypeRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const releaseSuppression = BlueElectrum.suppressNetworkErrorAlerts();
      return releaseSuppression;
    }, []),
  );

  const wasHandoffExportEligible = useRef(false);
  useEffect(() => {
    const isEligible = Platform.OS === 'ios' && isHandOffUseEnabled && serverHistory.size > 0;
    if (isEligible && !wasHandoffExportEligible.current) setIsHandoffExportEnabled(true);
    if (!isEligible) setIsHandoffExportEnabled(false);
    wasHandoffExportEligible.current = isEligible;
  }, [isHandOffUseEnabled, serverHistory.size]);

  const { height: keyboardHeight, isVisible: isKeyboardVisible } = useKeyboard();
  const androidKeyboardInset = Platform.OS === 'android' && !customOnly && isKeyboardVisible ? keyboardHeight + 24 : 0;
  const hasUnsavedServerChanges =
    customOnly && !shouldDismissAfterSave && (host !== '' || port !== undefined || sslPort !== undefined || !setNewServerAsFavorite);

  usePreventRemove(hasUnsavedServerChanges, ({ data }) => {
    Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc._.ok,
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  useEffect(() => {
    if (isDiscoveringServers) setIsNearbyExpanded(true);
  }, [isDiscoveringServers]);

  useEffect(() => {
    if (shouldDismissAfterSave) navigation.goBack();
  }, [navigation, shouldDismissAfterSave]);

  const scrollFocusedFieldIntoView = useCallback(
    (field?: 'host' | 'port') => {
      if (Platform.OS !== 'android' || customOnly) return;
      if (field) {
        focusedFieldRef.current = field;
      }
      const targetField = focusedFieldRef.current;
      if (!targetField || keyboardHeight <= 0) return;

      const targetRef = targetField === 'host' ? hostInputRef : portInputRef;
      if (!targetRef.current) return;

      const onMeasure = (pageY: number, height: number) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardTop = windowHeight - keyboardHeight;
        const inputBottom = pageY + height;
        if (inputBottom > keyboardTop) {
          const overlap = inputBottom - keyboardTop;
          const targetScrollY = scrollYRef.current + overlap;
          listRef.current?.scrollToOffset({ offset: targetScrollY, animated: true });
        } else if (pageY < 0) {
          const targetScrollY = Math.max(0, scrollYRef.current + pageY);
          listRef.current?.scrollToOffset({ offset: targetScrollY, animated: true });
        }
      };

      if (targetRef.current.measureInWindow) {
        targetRef.current.measureInWindow((_x, y, _width, height) => {
          onMeasure(y, height);
        });
      } else if (targetRef.current.measure) {
        targetRef.current.measure((_x, _y, _width, height, _pageX, pageY) => {
          onMeasure(pageY, height);
        });
      }
    },
    [customOnly, keyboardHeight],
  );

  useEffect(() => {
    if (Platform.OS === 'android' && !customOnly && isKeyboardVisible && keyboardHeight > 0) {
      scrollFocusedFieldIntoView();
    }
  }, [customOnly, isKeyboardVisible, keyboardHeight, scrollFocusedFieldIntoView]);
  const [savedServer, setSavedServer] = useState<{
    host: string;
    tcp: string;
    ssl: string;
  }>({
    host: '',
    tcp: '',
    ssl: '',
  });

  const stylesHook = StyleSheet.create({
    inputWrap: {
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    inputText: {
      color: colors.foregroundColor,
    },
    bannerText: {
      color: colors.foregroundColor,
    },
    statusIcon: {
      backgroundColor: config.connected === 1 ? colors.receiveBackground : colors.redBG,
    },
    statusIconGlyph: {
      color: config.connected === 1 ? colors.receiveText : colors.redText,
    },
    fieldLabel: {
      color: colors.alternativeTextColor,
    },
    fieldSurface: {
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    serverRow: {
      backgroundColor: colors.cardSectionBackground,
    },
    preferredServerTitle: {
      color: colors.alternativeTextColor2,
    },
    selectedServerRow: {
      backgroundColor: Platform.OS === 'android' ? colors.buttonBackgroundColor : colors.cardSectionBackground,
    },
    validationErrorContainer: {
      backgroundColor: colors.redBG,
    },
    validationErrorTitle: {
      color: colors.redText,
    },
    validationErrorMessage: {
      color: colors.foregroundColor,
    },
    duplicateNoticeContainer: {
      backgroundColor: colors.buttonBackgroundColor,
    },
    duplicateNoticeTitle: {
      color: colors.alternativeTextColor2,
    },
    list: {
      backgroundColor: colors.background,
    },
  });

  const configIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setValidationError(undefined);
  }, [host, port, sslPort]);

  const fetchData = useCallback(async () => {
    const preferredServer = await BlueElectrum.getPreferredServer();
    const savedHost = preferredServer?.host;
    const savedPort = preferredServer?.tcp ? Number(preferredServer.tcp) : undefined;
    const savedSslPort = preferredServer?.ssl ? Number(preferredServer.ssl) : undefined;
    const hasSavedFavorite = Boolean(savedHost && (savedPort || savedSslPort));
    const serverHistoryStr = (await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY)) as string;

    if (hasSavedFavorite) {
      setShowSuggestedServers((await AsyncStorage.getItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY)) !== 'false');
    } else {
      await AsyncStorage.removeItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY);
      setShowSuggestedServers(true);
      setIsSuggestedExpanded(true);
    }

    const parsedServerHistory: ElectrumServerItem[] = serverHistoryStr ? JSON.parse(serverHistoryStr) : [];

    const filteredServerHistory = new Set(uniqueElectrumServers(parsedServerHistory.filter(v => v.host && (v.tcp || v.ssl))));

    setHost(customOnly ? '' : savedHost || '');
    setPort(customOnly ? undefined : savedPort);
    setSslPort(customOnly ? undefined : savedSslPort);
    setServerHistory(filteredServerHistory);

    setConfig(await BlueElectrum.getConfig());
    if (configIntervalRef.current) clearInterval(configIntervalRef.current);
    configIntervalRef.current = setInterval(async () => {
      setConfig(await BlueElectrum.getConfig());
    }, 500);

    setSavedServer({
      host: savedHost || '',
      tcp: savedPort ? savedPort.toString() : '',
      ssl: savedSslPort ? savedSslPort.toString() : '',
    });

    setIsLoading(false);
  }, [customOnly]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        if (configIntervalRef.current) clearInterval(configIntervalRef.current);
      };
    }, [fetchData]),
  );

  // Fetch banner when connected
  useEffect(() => {
    if (config.connected === 1 && config.host && !isElectrumDisabled) {
      BlueElectrum.getServerBanner()
        .then(setServerBanner)
        .catch(() => setServerBanner(''));
    } else {
      setServerBanner('');
    }
  }, [config.connected, config.host, config.port, isElectrumDisabled]);

  useEffect(() => {
    if (server) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
      Alert.alert(
        loc.formatString(loc.settings.set_electrum_server_as_default, {
          server: (server as ElectrumServerItem).host,
        }),
        '',
        [
          {
            text: loc._.ok,
            onPress: () => {
              setHost(server.host);
              setPort(server.tcp);
              setSslPort(server.ssl);
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    }
  }, [server]);

  const save = useCallback(
    async (v?: ElectrumServerItem) => {
      Keyboard.dismiss();
      setIsLoading(true);
      setIsValidatingServer(true);
      setValidationError(undefined);

      try {
        const rawHost = v?.host || host;
        const rawPort = v?.ssl ?? v?.tcp ?? sslPort ?? port;
        const connectionType = v?.ssl !== undefined || sslPort !== undefined ? 'ssl' : 'tcp';
        const normalizedServer = rawPort === undefined ? undefined : parseElectrumServer(`${rawHost} ${rawPort} ${connectionType}`);
        const serverHost = normalizedServer?.host ?? '';
        const serverPort = normalizedServer?.tcp?.toString() ?? '';
        const serverSslPort = normalizedServer?.ssl?.toString() ?? '';
        const shouldSetAsFavorite = v !== undefined || setNewServerAsFavorite;

        if (serverHost && (serverPort || serverSslPort)) {
          const validation = await BlueElectrum.validateConnection(serverHost, Number(serverPort), Number(serverSslPort));
          if (!validation.success) {
            const message = serverHost.endsWith('.onion')
              ? `${loc.settings.electrum_error_connect_tor}\n\n${validation.error ?? ''}`.trim()
              : validation.error || loc.settings.electrum_error_connect;
            if (customOnly) {
              setValidationError(message);
            } else {
              presentAlert({ message });
            }
            return;
          }
          await DefaultPreference.setName(GROUP_IO_BLUEWALLET);

          if (shouldSetAsFavorite) {
            await DefaultPreference.clear(BlueElectrum.ELECTRUM_HOST);
            await DefaultPreference.clear(BlueElectrum.ELECTRUM_TCP_PORT);
            await DefaultPreference.clear(BlueElectrum.ELECTRUM_SSL_PORT);

            await DefaultPreference.set(BlueElectrum.ELECTRUM_HOST, serverHost);
            await DefaultPreference.set(BlueElectrum.ELECTRUM_TCP_PORT, serverPort);
            await DefaultPreference.set(BlueElectrum.ELECTRUM_SSL_PORT, serverSslPort);
          }

          const nextFavorite: ElectrumServerItem = {
            host: serverHost,
            ...(serverPort ? { tcp: Number(serverPort) } : {}),
            ...(serverSslPort ? { ssl: Number(serverSslPort) } : {}),
          };
          const previousFavorite: ElectrumServerItem | undefined = savedServer.host
            ? {
                host: savedServer.host,
                ...(savedServer.tcp ? { tcp: Number(savedServer.tcp) } : {}),
                ...(savedServer.ssl ? { ssl: Number(savedServer.ssl) } : {}),
              }
            : undefined;
          const historyCandidates = [...Array.from(serverHistory), ...(previousFavorite ? [previousFavorite] : []), nextFavorite];
          const newServerHistory = new Set(uniqueElectrumServers(historyCandidates));

          await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(Array.from(newServerHistory)));
          setServerHistory(newServerHistory);
        } else {
          throw new Error(loc.settings.electrum_error_connect);
        }

        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        await fetchData();
        if (customOnly) {
          setShouldDismissAfterSave(true);
        } else {
          presentAlert({ message: loc.settings.electrum_saved });
        }
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        if (customOnly) {
          setValidationError((error as Error).message);
        } else {
          presentAlert({ message: (error as Error).message });
        }
      } finally {
        setIsValidatingServer(false);
        setIsLoading(false);
      }
    },
    [customOnly, host, port, sslPort, fetchData, savedServer, serverHistory, setNewServerAsFavorite],
  );

  const selectServer = useCallback(
    (value: string) => {
      const parsedServer = JSON.parse(value) as ElectrumServerItem;
      setHost(parsedServer.host);
      setPort(parsedServer.tcp);
      setSslPort(parsedServer.ssl);
      save(parsedServer);
    },
    [save],
  );

  const presentSelectServerAlert = useCallback(
    (value: ElectrumServerItem) => {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
      Alert.alert(
        loc.settings.electrum_favorite_server,
        loc.formatString(loc.settings.set_as_favorite_electrum, {
          host: value.host,
          port: String(value.ssl ?? value.tcp),
        }),
        [
          {
            text: loc._.ok,
            onPress: () => {
              selectServer(JSON.stringify(value));
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    },
    [selectServer],
  );

  const importServerHistoryData = useCallback(
    async (data: string) => {
      try {
        const result = parseElectrumServerDocumentResult(data);
        if (result.tooLarge) throw new Error(loc.settings.electrum_import_too_large);
        if (result.incompatibleVersion !== undefined) {
          throw new Error(loc.formatString(loc.settings.electrum_import_incompatible, { version: String(result.incompatibleVersion) }));
        }
        if (result.servers.length === 0) throw new Error(loc.settings.electrum_import_no_valid_servers);

        const existingKeys = new Set([...Array.from(serverHistory), ...suggestedServers].map(electrumServerKey));
        const newServers = result.servers.filter(importedServer => !existingKeys.has(electrumServerKey(importedServer)));
        if (newServers.length === 0) {
          presentAlert({ message: loc.settings.electrum_import_no_changes });
          return;
        }
        const mergedServers = uniqueElectrumServers([...Array.from(serverHistory), ...newServers]);

        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
        await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(mergedServers));
        await fetchData();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        const skippedEntries = result.rejectedEntries + result.duplicateEntries + (result.servers.length - newServers.length);
        const importedMessage = loc.formatString(loc.settings.electrum_import_success, { count: String(newServers.length) });
        presentAlert({
          message:
            skippedEntries > 0 || result.truncated || result.recoveredFromCorruption
              ? `${importedMessage}\n\n${loc.settings.electrum_import_partial}`
              : importedMessage,
        });
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: (error as Error).message });
      }
    },
    [fetchData, serverHistory],
  );

  const importServerList = useCallback(async () => {
    const { data } = await showFilePickerAndReadFile();
    if (typeof data === 'string') await importServerHistoryData(data);
  }, [importServerHistoryData]);

  const handledServerHistoryImport = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (Platform.OS !== 'ios' || isLoading || !serverHistoryImport || handledServerHistoryImport.current === serverHistoryImport) return;
    handledServerHistoryImport.current = serverHistoryImport;
    Alert.alert(loc.settings.electrum_handoff_import_title, loc.settings.electrum_handoff_import_description, [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc.settings.electrum_import_server_history,
        onPress: () => importServerHistoryData(serverHistoryImport),
      },
    ]);
  }, [importServerHistoryData, isLoading, serverHistoryImport]);

  const exportServerList = useCallback(async () => {
    if (serverHistory.size === 0) return;
    const contents = serializeElectrumServerDocument(Array.from(serverHistory));
    await writeFileAndExport(SERVER_LIST_FILE_NAME, contents, true);
  }, [serverHistory]);

  const onPressMenuItem = useCallback(
    async (id: string) => {
      if (id === ADD_SERVER_ACTION_ID) {
        navigation.navigate('AddElectrumServerRoot');
      } else if (id === IMPORT_SERVERS_ACTION_ID) {
        await importServerList();
      } else if (id === EXPORT_SERVERS_ACTION_ID) {
        await exportServerList();
      } else if (id === DISCOVER_SERVERS_ACTION_ID) {
        await discoverServers();
      } else if (id === HANDOFF_SERVER_HISTORY_ACTION_ID) {
        if (isHandOffUseEnabled) {
          setIsHandoffExportEnabled(value => !value);
        } else {
          Alert.alert(loc.settings.electrum_handoff_opt_in_title, loc.settings.electrum_handoff_opt_in_description, [
            { text: loc._.cancel, style: 'cancel' },
            {
              text: loc.settings.electrum_handoff_opt_in_action,
              onPress: async () => {
                await setIsHandOffUseEnabledAsyncStorage(true);
                setIsHandoffExportEnabled(true);
              },
            },
          ]);
        }
      } else if (id === SHOW_SUGGESTED_SERVERS_ACTION_ID) {
        const nextValue = !showSuggestedServers;
        setShowSuggestedServers(nextValue);
        await AsyncStorage.setItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY, String(nextValue));
      } else if (id === CommonToolTipActions.ResetToDefault.id) {
        presentResetToDefaultsAlert().then(async reset => {
          if (reset) {
            setHost('');
            setPort(undefined);
            setSslPort(undefined);
            setIsSuggestedExpanded(true);
            setShowSuggestedServers(true);
            await AsyncStorage.removeItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY);
            triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
            presentAlert({ message: loc.settings.electrum_saved });
            await fetchData();
            await BlueElectrum.connectToRandomSuggestedServer();
          }
        });
      }
    },
    [
      discoverServers,
      exportServerList,
      fetchData,
      importServerList,
      isHandOffUseEnabled,
      navigation,
      setIsHandOffUseEnabledAsyncStorage,
      showSuggestedServers,
    ],
  );

  useScreenMenuActions({
    addElectrumServer: () => navigation.navigate('AddElectrumServerRoot'),
    importElectrumServerHistory: importServerList,
    exportElectrumServerHistory: serverHistory.size > 0 ? exportServerList : undefined,
    discoverElectrumServers: Platform.OS === 'ios' && !isElectrumDisabled && !isDiscoveringServers ? discoverServers : undefined,
  });

  const isFavorite = useCallback(
    (value: ElectrumServerItem) => {
      return value.host === host && ((sslPort !== undefined && value.ssl === sslPort) || (sslPort === undefined && value.tcp === port));
    },
    [host, port, sslPort],
  );

  const generateToolTipActions = useCallback(() => {
    const resetToDefaults = { ...CommonToolTipActions.ResetToDefault };
    resetToDefaults.hidden = !host && serverHistory.size === 0;
    return [
      [
        {
          id: ADD_SERVER_ACTION_ID,
          text: loc.settings.electrum_add_server,
          icon: { iconValue: Platform.OS === 'ios' ? 'plus' : 'ic_input_add' },
        },
      ],
      [
        {
          id: DISCOVER_SERVERS_ACTION_ID,
          text: loc.settings.electrum_discover_servers,
          subtitle: loc.settings.electrum_discover_servers_description,
          icon: { iconValue: Platform.OS === 'ios' ? 'dot.radiowaves.left.and.right' : 'ic_menu_search' },
          disabled: isDiscoveringServers || isElectrumDisabled,
        },
      ],
      [
        {
          id: IMPORT_SERVERS_ACTION_ID,
          text: loc.settings.electrum_import_server_history,
          icon: CommonToolTipActions.ImportFile.icon,
        },
        {
          id: EXPORT_SERVERS_ACTION_ID,
          text: loc.settings.electrum_export_server_history,
          icon: CommonToolTipActions.Share.icon,
          disabled: serverHistory.size === 0,
        },
        ...(Platform.OS === 'ios'
          ? [
              {
                id: HANDOFF_SERVER_HISTORY_ACTION_ID,
                text: loc.settings.electrum_handoff_export,
                subtitle: loc.settings.electrum_handoff_export_description,
                image: 'icloud.and.arrow.up',
                menuState: isHandoffExportEnabled,
                disabled: serverHistory.size === 0,
              },
            ]
          : []),
      ],
      [resetToDefaults],
      ...(host && (port || sslPort)
        ? [
            [
              {
                id: SHOW_SUGGESTED_SERVERS_ACTION_ID,
                text: loc.settings.electrum_show_suggested_servers,
                image: Platform.OS === 'ios' ? 'server.rack' : undefined,
                menuState: showSuggestedServers,
              },
            ],
          ]
        : []),
    ] as Action[][];
  }, [host, isDiscoveringServers, isElectrumDisabled, isHandoffExportEnabled, port, serverHistory.size, showSuggestedServers, sslPort]);

  const serverList = useMemo<ServerListEntry[]>(() => {
    const hasFavorite = Boolean(host && (port || sslPort));
    const isConnectedServer = (candidate: ElectrumServerItem) =>
      config.connected === 1 && config.host === candidate.host && String(config.port) === String(candidate.ssl ?? candidate.tcp);
    const orderedSuggestedServers = [...suggestedServers].sort(
      (first, second) => Number(isConnectedServer(second)) - Number(isConnectedServer(first)),
    );
    const entries: ServerListEntry[] = [];
    const favoriteServer: ElectrumServerItem | undefined = hasFavorite
      ? { host, ...(port ? { tcp: port } : {}), ...(sslPort ? { ssl: sslPort } : {}) }
      : undefined;

    if (favoriteServer) {
      entries.push({ type: 'header', id: 'favorite-header', title: loc.settings.electrum_favorite_server });
      entries.push({
        type: 'server',
        id: `favorite-${serverKey(favoriteServer)}`,
        server: favoriteServer,
        isFirst: true,
        isLast: true,
        isHistory: false,
      });
    }

    if (!hasFavorite || showSuggestedServers) {
      entries.push({
        type: 'header',
        id: 'suggested-header',
        title: loc._.suggested,
        description: loc.settings.electrum_suggested_description,
      });
      if (!hasFavorite || isSuggestedExpanded) {
        entries.push(
          ...orderedSuggestedServers
            .filter(suggestedServer => !favoriteServer || serverKey(suggestedServer) !== serverKey(favoriteServer))
            .map((suggestedServer, index, visibleServers) => ({
              type: 'server' as const,
              id: `suggested-${suggestedServer.host}-${suggestedServer.ssl ?? suggestedServer.tcp}`,
              server: suggestedServer,
              isFirst: index === 0,
              isLast: index === visibleServers.length - 1,
              isHistory: false,
            })),
        );
      }
    }

    const history = Array.from(serverHistory).filter(
      historyServer => !favoriteServer || serverKey(historyServer) !== serverKey(favoriteServer),
    );
    if (history.length > 0) {
      entries.push({ type: 'header', id: 'history-header', title: loc.settings.electrum_server_history });
      entries.push(
        ...history.map((historyServer, index) => ({
          type: 'server' as const,
          id: `history-${historyServer.host}-${historyServer.ssl ?? historyServer.tcp}`,
          server: historyServer,
          isFirst: index === 0,
          isLast: index === history.length - 1,
          isHistory: true,
        })),
      );
    }

    const visibleDiscoveredServers = discoveredServers.filter(
      discoveredServer => !favoriteServer || serverKey(discoveredServer) !== serverKey(favoriteServer),
    );
    if (hasStartedDiscovery || visibleDiscoveredServers.length > 0) {
      entries.push({
        type: 'header',
        id: 'discovered-header',
        title: loc.settings.electrum_nearby_servers,
      });
      if (isNearbyExpanded) {
        if (visibleDiscoveredServers.length === 0) {
          entries.push({ type: 'discoveryStatus', id: 'discovery-status', status: isDiscoveringServers ? 'scanning' : 'empty' });
        }
        entries.push(
          ...visibleDiscoveredServers.map((discoveredServer, index) => ({
            type: 'server' as const,
            id: `discovered-${serverKey(discoveredServer)}`,
            server: discoveredServer,
            isFirst: index === 0,
            isLast: index === visibleDiscoveredServers.length - 1,
            isHistory: false,
            isDiscovered: true,
          })),
        );
      }
    }

    return entries;
  }, [
    config.connected,
    config.host,
    config.port,
    discoveredServers,
    hasStartedDiscovery,
    host,
    isDiscoveringServers,
    isNearbyExpanded,
    isSuggestedExpanded,
    port,
    serverHistory,
    showSuggestedServers,
    sslPort,
  ]);

  const headerMenuOptions = useMemo(
    () =>
      createEllipsisHeaderMenuOptions({
        actions: generateToolTipActions(),
        onPressMenuItem,
        preserveGroups: true,
        title: loc.receive.details_more_options,
      }),
    [generateToolTipActions, onPressMenuItem],
  );

  useEffect(() => {
    if (customOnly) return;
    navigation.setParams({
      headerRight: headerMenuOptions.headerRight,
      unstable_headerRightItems: headerMenuOptions.unstable_headerRightItems,
    });
  }, [customOnly, headerMenuOptions, navigation]);

  const checkServer = async () => {
    setIsLoading(true);
    try {
      const features = await BlueElectrum.serverFeatures();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      presentAlert({ message: JSON.stringify(features, null, 2) });
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (error as Error).message });
    }
    setIsLoading(false);
  };

  const onBarScanned = (value: string) => {
    const scannedServer = parseElectrumServer(value);
    if (!scannedServer) return;
    setHost(scannedServer.host);
    hasInferredConnectionTypeRef.current = true;
    setPort(scannedServer.tcp);
    setSslPort(scannedServer.ssl);
  };

  useEffect(() => {
    const data = params.onBarScanned;
    if (data) {
      onBarScanned(data);
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [navigation, params.onBarScanned]);

  const onSSLPortChange = (value: boolean) => {
    Keyboard.dismiss();
    if (value) {
      setSslPort(port);
      setPort(undefined);
    } else {
      setPort(sslPort);
      setSslPort(undefined);
    }
  };

  const onElectrumConnectionEnabledSwitchChange = async (value: boolean) => {
    try {
      triggerSelectionHapticFeedback();
      await BlueElectrum.setDisabled(value);
      setIsElectrumDisabled(value);
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (error as Error).message });
    }
  };

  const preferredServerIsEmpty = !host || (!port && !sslPort);
  const draftServer = preferredServerIsEmpty
    ? undefined
    : parseElectrumServer(`${host} ${sslPort ?? port} ${sslPort !== undefined ? 'ssl' : 'tcp'}`);
  const serverMatchesDraft = (candidate: ElectrumServerItem) =>
    draftServer !== undefined && serverKey(candidate) === serverKey(draftServer);
  const duplicateServerSource = draftServer
    ? Array.from(serverHistory).some(serverMatchesDraft)
      ? 'history'
      : suggestedServers.some(serverMatchesDraft)
        ? 'hardcoded'
        : undefined
    : undefined;
  const saveDisabled: boolean =
    preferredServerIsEmpty ||
    duplicateServerSource !== undefined ||
    (host === savedServer.host &&
      ((savedServer.tcp !== '' && port?.toString() === savedServer.tcp) ||
        (savedServer.ssl !== '' && sslPort?.toString() === savedServer.ssl)));

  const applyServerText = useCallback((text: string): boolean => {
    const parsedServer = parseElectrumServer(text);
    if (!parsedServer) return false;

    hasInferredConnectionTypeRef.current = true;
    setHost(parsedServer.host);
    setPort(parsedServer.tcp);
    setSslPort(parsedServer.ssl);
    focusedFieldRef.current = null;
    setIsAndroidAddressKeyboardVisible(false);
    setIsAndroidNumericKeyboardFocused(false);
    Keyboard.dismiss();
    return true;
  }, []);

  const onHostChange = useCallback(
    (text: string) => {
      if (!applyServerText(text)) setHost(text.trim());
    },
    [applyServerText],
  );

  const onPortChange = useCallback(
    (text: string) => {
      if (applyServerText(text)) return;

      const trimmed = text.trim();
      const parsed = Number(trimmed);
      if (trimmed === '' || Number.isNaN(parsed)) {
        sslPort === undefined ? setPort(undefined) : setSslPort(undefined);
        return;
      }

      if (!hasInferredConnectionTypeRef.current) {
        const inferredSsl = inferElectrumServerSsl(parsed);
        if (inferredSsl !== undefined) {
          hasInferredConnectionTypeRef.current = true;
          if (inferredSsl) {
            setSslPort(parsed);
            setPort(undefined);
          } else {
            setPort(parsed);
            setSslPort(undefined);
          }
          return;
        }
      }

      sslPort === undefined ? setPort(parsed) : setSslPort(parsed);
    },
    [applyServerText, sslPort],
  );

  const renderSaveHeaderRight = useCallback(
    () => (
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.settings.save}
          testID="Save"
          disabled={saveDisabled || isLoading}
          onPress={() => save()}
          hitSlop={8}
          style={({ pressed }) => [styles.headerSaveButton, (saveDisabled || isLoading) && styles.disabled, pressed && styles.pressed]}
        >
          {isValidatingServer ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="checkmark" size={26} color={saveDisabled || isLoading ? colors.buttonDisabledTextColor : colors.primary} />
          )}
        </Pressable>
      </View>
    ),
    [colors.buttonDisabledTextColor, colors.primary, isLoading, isValidatingServer, save, saveDisabled],
  );

  const unstableSaveHeaderRightItems = useCallback(
    () => [
      ...(isValidatingServer
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
              icon: { type: 'sfSymbol' as const, name: 'checkmark' },
              tintColor: colors.primary,
              identifier: 'Save',
              accessibilityLabel: loc.settings.save,
              disabled: saveDisabled || isLoading,
              onPress: () => save(),
            },
          ]),
    ],
    [colors.primary, isLoading, isValidatingServer, save, saveDisabled],
  );

  useEffect(() => {
    if (!customOnly) return;
    navigation.setParams({
      headerRight: renderSaveHeaderRight,
      unstable_headerRightItems: unstableSaveHeaderRightItems,
    });
  }, [customOnly, navigation, renderSaveHeaderRight, unstableSaveHeaderRightItems]);

  const renderElectrumSettings = (includePreferredServerForm: boolean, includeStatus: boolean) => {
    const isConnected = config.connected === 1;
    const connectedEndpoint = config.host && config.port ? `${config.host}:${config.port}` : undefined;

    return (
      <>
        {includeStatus && (
          <SettingsSection title={loc.settings.electrum_status}>
            <SettingsListItem
              title={isConnected ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
              subtitle={connectedEndpoint}
              subtitleSelectable
              onPress={checkServer}
              disabled={isLoading}
              accessibilityLabel={`${loc.settings.electrum_status}: ${isConnected ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}${connectedEndpoint ? `. ${connectedEndpoint}` : ''}`}
              accessibilityHint={loc.settings.electrum_status_hint}
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
              isLoading={isLoading}
              bottomDivider={serverBanner.length > 0}
              leftAvatar={
                <View importantForAccessibility="no" style={[styles.statusIcon, stylesHook.statusIcon]}>
                  <Ionicons name={isConnected ? 'checkmark-circle' : 'alert-circle'} size={22} style={stylesHook.statusIconGlyph} />
                </View>
              }
            />
            {serverBanner.length > 0 && (
              <View style={styles.bannerContainer}>
                <Text style={[styles.bannerText, stylesHook.bannerText]} selectable>
                  {serverBanner}
                </Text>
              </View>
            )}
          </SettingsSection>
        )}

        {includePreferredServerForm && (
          <>
            <SettingsSection title={loc.settings.electrum_add_server} iconName="electrum" containerStyle={styles.formSection}>
              {isValidatingServer ? (
                <View accessible accessibilityRole="progressbar" style={styles.validationStatus}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.validationText, stylesHook.fieldLabel]}>{loc.settings.electrum_validating_server}</Text>
                </View>
              ) : null}
              {validationError ? (
                <View
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel={`${loc.settings.electrum_validation_failed}. ${validationError}`}
                  style={[styles.validationErrorContainer, stylesHook.validationErrorContainer]}
                >
                  <Ionicons name="alert-circle" size={24} color={colors.redText} />
                  <View style={styles.validationErrorContent}>
                    <Text style={[styles.validationErrorTitle, stylesHook.validationErrorTitle]}>
                      {loc.settings.electrum_validation_failed}
                    </Text>
                    <Text selectable style={[styles.validationErrorMessage, stylesHook.validationErrorMessage]}>
                      {validationError}
                    </Text>
                  </View>
                </View>
              ) : null}
              {duplicateServerSource ? (
                <View
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel={`${loc.settings.electrum_server_already_added}. ${
                    duplicateServerSource === 'history'
                      ? loc.settings.electrum_server_already_in_history
                      : loc.settings.electrum_server_already_suggested
                  }`}
                  style={[styles.validationErrorContainer, stylesHook.duplicateNoticeContainer]}
                >
                  <Ionicons name="information-circle" size={24} color={colors.alternativeTextColor2} />
                  <View style={styles.validationErrorContent}>
                    <Text style={[styles.validationErrorTitle, stylesHook.duplicateNoticeTitle]}>
                      {loc.settings.electrum_server_already_added}
                    </Text>
                    <Text style={[styles.validationErrorMessage, stylesHook.validationErrorMessage]}>
                      {duplicateServerSource === 'history'
                        ? loc.settings.electrum_server_already_in_history
                        : loc.settings.electrum_server_already_suggested}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.formIntro}>
                <SettingsFootnote>{loc.settings.electrum_add_server_description}</SettingsFootnote>
              </View>

              <View style={styles.fieldsContainer}>
                <Text style={[styles.fieldLabel, stylesHook.fieldLabel]}>{loc.settings.electrum_server_address}</Text>
                <View ref={hostInputRef}>
                  <AddressInput
                    testID="HostInput"
                    placeholder={loc.formatString(loc.settings.electrum_host, {
                      example: '10.20.30.40',
                    })}
                    address={host}
                    onChangeText={onHostChange}
                    editable={!isLoading}
                    keyboardType="default"
                    onBlur={() => {
                      if (focusedFieldRef.current === 'host') {
                        focusedFieldRef.current = null;
                      }
                      setIsAndroidAddressKeyboardVisible(false);
                    }}
                    onFocus={() => {
                      focusedFieldRef.current = 'host';
                      setIsAndroidAddressKeyboardVisible(true);
                      if (Platform.OS === 'android' && isKeyboardVisible && keyboardHeight > 0) {
                        scrollFocusedFieldIntoView('host');
                      }
                    }}
                    inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
                    isLoading={isLoading}
                    style={styles.nativeInput}
                  />
                </View>

                <Text style={[styles.fieldLabel, stylesHook.fieldLabel]}>
                  {loc.formatString(loc.settings.electrum_port, {
                    example: sslPort !== undefined ? '50002' : '50001',
                  })}
                </Text>
                <View ref={portInputRef} style={[styles.inputWrap, styles.nativeInput, stylesHook.inputWrap, stylesHook.fieldSurface]}>
                  <TextInput
                    placeholder={sslPort !== undefined ? '50002' : '50001'}
                    value={sslPort?.toString() === '' || sslPort === undefined ? port?.toString() || '' : sslPort?.toString() || ''}
                    onChangeText={onPortChange}
                    numberOfLines={1}
                    style={[styles.inputText, stylesHook.inputText]}
                    editable={!isLoading}
                    placeholderTextColor="#81868e"
                    underlineColorAndroid="transparent"
                    autoCorrect={false}
                    autoCapitalize="none"
                    keyboardType="number-pad"
                    inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
                    testID="PortInput"
                    onFocus={() => {
                      focusedFieldRef.current = 'port';
                      setIsAndroidNumericKeyboardFocused(true);
                      if (Platform.OS === 'android' && isKeyboardVisible && keyboardHeight > 0) {
                        scrollFocusedFieldIntoView('port');
                      }
                    }}
                    onBlur={() => {
                      if (focusedFieldRef.current === 'port') {
                        focusedFieldRef.current = null;
                      }
                      setIsAndroidNumericKeyboardFocused(false);
                    }}
                  />
                </View>
              </View>
            </SettingsSection>

            <SettingsSection title={loc.settings.electrum_connection_type} iconName="network" containerStyle={styles.formSection}>
              <View style={styles.protocolContainer}>
                <SegmentedControl
                  testID="SSLPortInput"
                  values={['TCP', 'SSL']}
                  selectedIndex={sslPort === undefined ? 0 : 1}
                  enabled={!isLoading && host !== '' && (port !== undefined || sslPort !== undefined) && !host.endsWith('.onion')}
                  onChange={index => {
                    hasInferredConnectionTypeRef.current = true;
                    const useSsl = index === 1;
                    if (useSsl !== (sslPort !== undefined)) onSSLPortChange(useSsl);
                  }}
                  usePlatformStyle
                />
              </View>
            </SettingsSection>

            <SettingsSection title={loc.settings.electrum_favorite_server} iconName="favorite" containerStyle={styles.favoriteSection}>
              <SettingsListItem
                title={loc.settings.electrum_set_as_favorite}
                subtitle={loc.settings.electrum_set_as_favorite_description}
                switch={{
                  testID: 'SetServerAsFavoriteSwitch',
                  value: setNewServerAsFavorite,
                  onValueChange: setSetNewServerAsFavorite,
                  disabled: isLoading,
                }}
                bottomDivider={false}
              />
            </SettingsSection>

            {Platform.select({
              ios: <DismissKeyboardInputAccessory />,
              android: !customOnly && (isAndroidNumericKeyboardFocused || isAndroidAddressKeyboardVisible) && (
                <DismissKeyboardInputAccessory />
              ),
            })}
          </>
        )}
      </>
    );
  };

  const deleteServerFromHistory = useCallback(
    async (serverToDelete: ElectrumServerItem) => {
      const remainingServers = Array.from(serverHistory).filter(
        candidate => candidate.host !== serverToDelete.host || candidate.tcp !== serverToDelete.tcp || candidate.ssl !== serverToDelete.ssl,
      );

      try {
        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
        await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(remainingServers));
        setServerHistory(new Set(remainingServers));
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: (error as Error).message });
      }
    },
    [serverHistory],
  );

  const testServerConnection = useCallback(async (serverToTest: ElectrumServerItem) => {
    const key = serverKey(serverToTest);
    const serverPort = serverToTest.ssl ?? serverToTest.tcp;
    const endpoint = `${serverToTest.host}:${serverPort}`;
    setTestingServerKey(key);
    setServerTestResults(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    const result = await BlueElectrum.validateConnection(serverToTest.host, serverToTest.tcp, serverToTest.ssl);
    setServerTestResults(current => ({ ...current, [key]: result.success }));
    setTestingServerKey(undefined);
    triggerHapticFeedback(result.success ? HapticFeedbackTypes.NotificationSuccess : HapticFeedbackTypes.NotificationError);
    Alert.alert(
      result.success ? loc.settings.electrum_connection_successful : loc.settings.electrum_validation_failed,
      result.success ? endpoint : result.error || loc.settings.electrum_error_connect,
    );
  }, []);

  const renderServerEntry = useCallback(
    ({ item }: ListRenderItemInfo<ServerListEntry>) => {
      if (item.type === 'header') {
        const isSuggestedHeader = item.id === 'suggested-header';
        const isNearbyHeader = item.id === 'discovered-header';
        const isCollapsible = isSuggestedHeader && Boolean(host && (port || sslPort));
        const iconName = item.id === 'favorite-header' ? 'favorite' : item.id === 'discovered-header' ? 'search' : 'electrum';
        return (
          <SettingsSection
            title={item.title}
            iconName={iconName}
            onHeaderPress={isNearbyHeader ? () => setIsNearbyExpanded(current => !current) : undefined}
            headerAccessibilityLabel={
              isNearbyHeader
                ? isNearbyExpanded
                  ? loc.settings.electrum_collapse_nearby_servers
                  : loc.settings.electrum_expand_nearby_servers
                : undefined
            }
            headerAccessibilityState={isNearbyHeader ? { expanded: isNearbyExpanded } : undefined}
            containerStyle={[
              styles.serverSectionHeader,
              ((isCollapsible && !isSuggestedExpanded) || (isNearbyHeader && !isNearbyExpanded)) && styles.collapsedSectionHeader,
            ]}
            headerRight={
              isNearbyHeader ? (
                <View accessible={false} style={styles.disclosureButton}>
                  <Ionicons name={isNearbyExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.alternativeTextColor} />
                </View>
              ) : isCollapsible ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSuggestedExpanded ? loc.settings.electrum_collapse_suggested_servers : loc.settings.electrum_expand_suggested_servers
                  }
                  accessibilityState={{ expanded: isSuggestedExpanded }}
                  hitSlop={12}
                  testID="ToggleSuggestedServers"
                  onPress={() => setIsSuggestedExpanded(current => !current)}
                  style={({ pressed }) => [styles.disclosureButton, pressed && styles.pressed]}
                >
                  <Ionicons
                    accessible={false}
                    name={isSuggestedExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.alternativeTextColor}
                  />
                </Pressable>
              ) : null
            }
          >
            {item.description && (!isCollapsible || isSuggestedExpanded) ? (
              <View style={styles.serverSectionDescription}>
                <SettingsFootnote>{item.description}</SettingsFootnote>
              </View>
            ) : null}
          </SettingsSection>
        );
      }

      if (item.type === 'discoveryStatus') {
        const scanning = item.status === 'scanning';
        return (
          <View style={[styles.discoveryStatus, stylesHook.serverRow]} accessibilityLiveRegion="polite">
            {scanning ? (
              <View style={styles.discoveryScanningContent}>
                <View style={styles.discoveryScanningRow}>
                  <ActivityIndicator accessibilityLabel={loc.settings.electrum_discovery_looking} color={colors.primary} />
                  <Text style={[styles.discoveryStatusTitle, { color: colors.foregroundColor }]}>
                    {loc.settings.electrum_discovery_looking}
                  </Text>
                </View>
                {IS_IOS_SIMULATOR ? <SettingsFootnote>{loc.settings.electrum_discovery_simulator_note}</SettingsFootnote> : null}
              </View>
            ) : (
              <View style={styles.discoveryEmptyContent}>
                <Text accessibilityRole="header" style={[styles.discoveryStatusTitle, { color: colors.foregroundColor }]}>
                  {loc.settings.electrum_discovery_empty_title}
                </Text>
                <SettingsFootnote>{loc.settings.electrum_discovery_empty_message}</SettingsFootnote>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={loc.settings.electrum_discovery_try_again}
                  onPress={retryDiscovery}
                  style={({ pressed }) => [
                    styles.discoveryRetryButton,
                    { backgroundColor: colors.buttonBackgroundColor },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.discoveryRetryText, { color: colors.buttonTextColor }]}>
                    {loc.settings.electrum_discovery_try_again}
                  </Text>
                </Pressable>
                {IS_IOS_SIMULATOR ? <SettingsFootnote>{loc.settings.electrum_discovery_simulator_note}</SettingsFootnote> : null}
              </View>
            )}
          </View>
        );
      }

      const serverPort = item.server.ssl ?? item.server.tcp;
      const itemServerKey = serverKey(item.server);
      const favorite = isFavorite(item.server);
      const connected = config.connected === 1 && config.host === item.server.host && String(config.port) === String(serverPort);
      const isTesting = testingServerKey === itemServerKey;
      const testResult = serverTestResults[itemServerKey];
      const protocol = item.server.ssl ? 'SSL' : 'TCP';
      const openDiscoveredServer = () =>
        navigation.navigate('AddElectrumServerRoot', { screen: 'AddElectrumServer', params: { server: item.server } });
      const serverAccessibilityLabel = `${item.server.host}, ${protocol} ${serverPort}${favorite ? `, ${loc.settings.electrum_favorite_server}` : ''}${connected ? `, ${loc.settings.electrum_connected}` : ''}${testResult === true ? `, ${loc.settings.electrum_connection_successful}` : ''}${testResult === false ? `, ${loc.settings.electrum_validation_failed}` : ''}`;

      const row = (
        <SettingsListItem
          testID={`${favorite ? 'FavoriteElectrumServer' : 'ElectrumServer'}-${item.server.host}-${serverPort}`}
          title={item.server.host}
          titleStyle={favorite ? stylesHook.preferredServerTitle : undefined}
          titleSelectable={!item.isHistory}
          subtitle={item.server.ssl ? `${loc._.ssl_port}: ${item.server.ssl}` : `${loc._.port}: ${item.server.tcp}`}
          subtitleSelectable={!item.isHistory}
          accessibilityLabel={serverAccessibilityLabel}
          accessibilityHint={
            item.isDiscovered
              ? loc.settings.electrum_discovered_server_hint
              : favorite
                ? loc.settings.electrum_favorite_server
                : loc.settings.electrum_server_row_hint
          }
          accessibilityState={{ selected: favorite, disabled: favorite || isLoading, busy: isTesting }}
          accessibilityActions={[
            ...(!isElectrumDisabled && !favorite ? [{ name: 'test', label: loc.settings.electrum_test_connection }] : []),
            ...(item.isHistory ? [{ name: 'delete', label: loc.wallets.details_delete }] : []),
            ...(item.isDiscovered ? [{ name: 'copy', label: loc.settings.electrum_copy_server }] : []),
          ]}
          onAccessibilityAction={event => {
            if (event.nativeEvent.actionName === 'test' && !isElectrumDisabled && !favorite) {
              testServerConnection(item.server);
            } else if (event.nativeEvent.actionName === 'delete' && item.isHistory) {
              deleteServerFromHistory(item.server);
            } else if (event.nativeEvent.actionName === 'copy' && item.isDiscovered) {
              Clipboard.setString(formatElectrumServer(item.server));
            }
          }}
          rightElement={
            item.isDiscovered ? (
              <View style={styles.discoveredRowActions}>
                {isTesting ? (
                  <ActivityIndicator accessibilityLabel={loc.settings.electrum_testing_server} color={colors.primary} />
                ) : testResult !== undefined ? (
                  <Ionicons
                    accessible={false}
                    name={testResult ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={testResult ? colors.receiveText : colors.redText}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={loc.settings.electrum_add_server_result}
                  onPress={openDiscoveredServer}
                  style={({ pressed }) => [
                    styles.discoveryAddButton,
                    { backgroundColor: colors.buttonBackgroundColor },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.discoveryAddText, { color: colors.buttonTextColor }]}>{loc.settings.electrum_add}</Text>
                </Pressable>
              </View>
            ) : isTesting ? (
              <ActivityIndicator accessibilityLabel={loc.settings.electrum_testing_server} color={colors.primary} />
            ) : testResult !== undefined ? (
              <View importantForAccessibility="no" style={styles.connectedIcon}>
                <Ionicons
                  name={testResult ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={testResult ? colors.receiveText : colors.redText}
                />
              </View>
            ) : connected ? (
              <View importantForAccessibility="no" style={styles.connectedIcon}>
                <Ionicons name="checkmark-circle" size={20} color={colors.receiveText} />
              </View>
            ) : undefined
          }
          leftAvatar={
            Platform.OS === 'android' ? (
              <Ionicons
                name={favorite ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={favorite ? colors.alternativeTextColor2 : colors.alternativeTextColor}
              />
            ) : undefined
          }
          onPress={
            isLoading || favorite ? undefined : item.isDiscovered ? openDiscoveredServer : () => presentSelectServerAlert(item.server)
          }
          bottomDivider={!item.isLast}
          containerStyle={[
            styles.serverRow,
            stylesHook.serverRow,
            favorite && stylesHook.selectedServerRow,
            item.isFirst && styles.serverRowFirst,
            item.isLast && styles.serverRowLast,
          ]}
        />
      );

      return (
        <SwipeableServerRow
          testID={`TestElectrumServer-${item.server.host}-${serverPort}`}
          menuTitle={`${item.server.host}:${serverPort}`}
          onTest={isElectrumDisabled || favorite ? undefined : () => testServerConnection(item.server)}
          isLast={item.isLast}
          deleteTestID={item.isHistory ? `DeleteElectrumServer-${item.server.host}-${serverPort}` : undefined}
          onDelete={item.isHistory ? () => deleteServerFromHistory(item.server) : undefined}
          onCopy={item.isDiscovered ? () => Clipboard.setString(formatElectrumServer(item.server)) : undefined}
        >
          {row}
        </SwipeableServerRow>
      );
    },
    [
      colors.alternativeTextColor,
      colors.alternativeTextColor2,
      colors.buttonBackgroundColor,
      colors.buttonTextColor,
      colors.foregroundColor,
      colors.primary,
      colors.redText,
      colors.receiveText,
      config.connected,
      config.host,
      config.port,
      deleteServerFromHistory,
      isLoading,
      isFavorite,
      isElectrumDisabled,
      isNearbyExpanded,
      isSuggestedExpanded,
      navigation,
      host,
      port,
      presentSelectServerAlert,
      serverTestResults,
      sslPort,
      stylesHook,
      testServerConnection,
      testingServerKey,
      retryDiscovery,
    ],
  );

  return (
    <>
      {Platform.OS === 'ios' && isHandOffUseEnabled && isHandoffExportEnabled && handoffServerHistoryDocument ? (
        <HandOffComponent
          title={loc.settings.electrum_handoff_export}
          type={HandOffActivityType.ElectrumServerHistory}
          userInfo={{ serverHistory: handoffServerHistoryDocument, deepLink: handoffServerHistoryDeepLink }}
        />
      ) : null}
      <FlatList
        ref={listRef}
        data={isElectrumDisabled || customOnly ? [] : serverList}
        renderItem={renderServerEntry}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="always"
        automaticallyAdjustContentInsets
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios' && !customOnly}
        style={stylesHook.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + androidKeyboardInset }]}
        onScroll={event => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        testID="ElectrumSettingsScrollView"
        accessibilityLabel={loc.settings.electrum_settings_server}
        ListHeaderComponent={
          customOnly ? (
            renderElectrumSettings(true, false)
          ) : (
            <>
              <SettingsSection title={loc.settings.electrum_offline_mode} iconName="offline">
                <SettingsListItem
                  title={loc.settings.electrum_work_offline}
                  subtitle={loc.settings.electrum_offline_description}
                  switch={{
                    onValueChange: onElectrumConnectionEnabledSwitchChange,
                    value: isElectrumDisabled,
                    testID: 'ElectrumConnectionEnabledSwitch',
                  }}
                  bottomDivider={false}
                />
              </SettingsSection>
              {!isElectrumDisabled && renderElectrumSettings(false, true)}
            </>
          )
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingTop: Platform.select({ ios: 20, default: 16 }),
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    minHeight: Platform.select({ ios: 44, default: 48 }),
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    paddingHorizontal: 12,
    minHeight: Platform.select({ ios: 42, default: 46 }),
    fontSize: 16,
  },
  nativeInput: {
    minHeight: Platform.select({ ios: 44, default: 48 }),
    height: Platform.select({ ios: 44, default: 48 }),
    borderRadius: Platform.select({ ios: 10, default: 8 }),
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSaveButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
  formIntro: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  validationStatus: {
    minHeight: Platform.select({ ios: 44, default: 48 }),
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationText: {
    fontSize: 15,
    fontWeight: '500',
  },
  validationErrorContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: Platform.select({ ios: 12, default: 10 }),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  validationErrorContent: {
    flex: 1,
    gap: 3,
  },
  validationErrorTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  validationErrorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldsContainer: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  protocolContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 20,
  },
  favoriteSection: {
    marginBottom: 24,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bannerText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  serverSectionHeader: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  collapsedSectionHeader: {
    marginBottom: 24,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  disclosureButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverSectionDescription: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  serverRow: {
    marginHorizontal: 16,
    minHeight: Platform.select({ ios: 44, default: 56 }),
  },
  connectedIcon: {
    marginLeft: 10,
  },
  discoveryStatus: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: Platform.select({ ios: 32, default: 24 }),
  },
  discoveryStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  discoveryScanningContent: {
    flex: 1,
    gap: 10,
  },
  discoveryScanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  discoveryEmptyContent: {
    flex: 1,
    gap: 8,
  },
  discoveryRetryButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  discoveryRetryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  discoveredRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  discoveryAddButton: {
    minHeight: 34,
    minWidth: 54,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryAddText: {
    fontSize: 15,
    fontWeight: '600',
  },
  serverRowFirst: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  serverRowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  serverRowGroupLast: {
    marginBottom: Platform.select({ ios: 32, default: 24 }),
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    marginRight: 16,
    marginBottom: 0,
  },
  serverContextMenu: {
    width: '100%',
  },
  testAction: {
    width: Platform.select({ ios: 88, default: 96 }),
    height: '100%',
    backgroundColor: Platform.select({ ios: '#007AFF', default: '#0061A4' }),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteAction: {
    width: Platform.select({ ios: 88, default: 96 }),
    height: '100%',
    backgroundColor: Platform.select({ ios: '#FF3B30', default: '#B3261E' }),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  copyAction: {
    width: Platform.select({ ios: 88, default: 96 }),
    height: '100%',
    backgroundColor: Platform.select({ ios: '#5856D6', default: '#6750A4' }),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteActionPressed: {
    opacity: 0.78,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: Platform.select({ ios: 13, default: 14 }),
    fontWeight: '600',
  },
});

export default ElectrumSettings;
