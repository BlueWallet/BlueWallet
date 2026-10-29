import { useFocusEffect, useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from '@react-native-vector-icons/ionicons';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useReducer } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  AlertButton,
  FlatList,
  findNodeHandle,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import NativeLocalNetworkPermission from '../../codegen/NativeLocalNetworkPermission';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { presentResetToDefaultsAlert, suggestedServers } from '../../blue_modules/BlueElectrum';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import {
  ElectrumServerItem,
  createElectrumServerHistoryDeepLink,
  electrumServersForHandoff,
  electrumServerKey,
  formatElectrumServer,
  isLocalElectrumHost,
  parseElectrumServer,
  parseElectrumServerDocumentResult,
  serializeElectrumServerDocument,
  uniqueElectrumServers,
} from '../../blue_modules/electrumServer';
import triggerHapticFeedback, { HapticFeedbackTypes, triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import HandOffComponent from '../../components/HandOffComponent';
import ToolTipMenu from '../../components/TooltipMenu';
import { createEllipsisHeaderMenuOptions } from '../../components/headerMenuOptions';
import { SettingsSection, SettingsListItem, SettingsFootnote } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import { Action, HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import useScreenMenuActions from '../../hooks/useScreenMenuActions';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import ActionSheet from '../ActionSheet';

type RouteProps = RouteProp<DetailViewStackParamList, 'ElectrumSettings'>;

export type { ElectrumServerItem } from '../../blue_modules/electrumServer';

type ServerListEntry =
  | { type: 'header'; id: string; title: string; description?: string }
  | {
      type: 'server';
      id: string;
      server: ElectrumServerItem;
      isFirst: boolean;
      isLast: boolean;
      isHistory: boolean;
    };

const ADD_SERVER_ACTION_ID = 'add_electrum_server';
const SHOW_SUGGESTED_SERVERS_ACTION_ID = 'show_suggested_electrum_servers';
const SHOW_SUGGESTED_SERVERS_STORAGE_KEY = 'electrum_show_suggested_servers';
const serverKey = electrumServerKey;

const copyServerText = (text: string) => {
  Clipboard.setString(text);
  AccessibilityInfo.announceForAccessibilityWithOptions(loc._.copied, { queue: true });
};

const SwipeableServerRow: React.FC<{
  children: React.ReactNode;
  onTest?: () => void;
  testID: string;
  isLast?: boolean;
  onDelete?: () => void;
  onRemoveFavorite?: () => void;
  onCopy?: () => void;
  deleteTestID?: string;
  removeFavoriteTestID?: string;
  copyTestID?: string;
  menuTitle: string;
}> = ({
  children,
  onTest,
  onDelete,
  onRemoveFavorite,
  onCopy,
  testID,
  isLast,
  deleteTestID,
  removeFavoriteTestID,
  copyTestID,
  menuTitle,
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const [actionsOpen, setActionsOpen] = useReducer((_current: boolean, next: boolean) => next, false);
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
    ...(onRemoveFavorite
      ? [
          {
            id: 'removeFavorite',
            text: loc.settings.electrum_remove_favorite_server,
            image: Platform.OS === 'ios' ? 'star.slash' : undefined,
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
  const menuActionGroups = [menuActions.filter(action => !action.destructive), menuActions.filter(action => action.destructive)].filter(
    group => group.length > 0,
  );

  const renderRightActions = () => (
    <View
      style={styles.swipeActionsContainer}
      accessibilityElementsHidden={!actionsOpen}
      importantForAccessibility={actionsOpen ? 'auto' : 'no-hide-descendants'}
    >
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
      {onRemoveFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.settings.electrum_remove_favorite_server}
          testID={removeFavoriteTestID}
          onPress={() => performAction(onRemoveFavorite)}
          style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}
        >
          <Ionicons accessible={false} name="star-outline" color="#FFFFFF" size={21} />
          <Text accessible={false} numberOfLines={1} style={styles.swipeActionText}>
            {loc.settings.electrum_remove_favorite_short}
          </Text>
        </Pressable>
      ) : null}
      {onCopy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.settings.electrum_copy_server}
          testID={copyTestID}
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
      <Swipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
        onSwipeableOpen={() => setActionsOpen(true)}
        onSwipeableClose={() => setActionsOpen(false)}
      >
        <ToolTipMenu
          title={menuTitle}
          actions={menuActionGroups}
          onPressMenuItem={id =>
            performAction(id === 'delete' ? onDelete : id === 'removeFavorite' ? onRemoveFavorite : id === 'copy' ? onCopy : onTest)
          }
          shouldOpenOnLongPress
          style={styles.serverContextMenu}
        >
          {children}
        </ToolTipMenu>
      </Swipeable>
    </View>
  );
};

type ElectrumSettingsState = {
  isLoading: boolean;
  serverHistory: ElectrumServerItem[];
  config: { connected?: number; host?: string; port?: string };
  host: string;
  port?: number;
  sslPort?: number;
  serverBanner: string;
  isSuggestedExpanded: boolean;
  showSuggestedServers: boolean;
  testingServerKey?: string;
  serverTestResults: Record<string, boolean>;
  searchQuery: string;
};
export const initialElectrumSettingsState: ElectrumSettingsState = {
  isLoading: true,
  serverHistory: [],
  config: {},
  host: '',
  serverBanner: '',
  isSuggestedExpanded: true,
  showSuggestedServers: true,
  serverTestResults: {},
  searchQuery: '',
};
type ElectrumSettingsAction =
  | { type: 'patch'; value: Partial<ElectrumSettingsState> }
  | {
      type: 'loaded';
      favorite?: ElectrumServerItem;
      history: ElectrumServerItem[];
      config: ElectrumSettingsState['config'];
      showSuggested: boolean;
    }
  | { type: 'toggleSuggested' }
  | { type: 'testStarted'; key: string }
  | { type: 'testFinished'; key: string; success: boolean }
  | { type: 'favoriteRemoved'; history: ElectrumServerItem[] };
export function electrumSettingsReducer(state: ElectrumSettingsState, action: ElectrumSettingsAction): ElectrumSettingsState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.value };
    case 'loaded':
      return {
        ...state,
        isLoading: false,
        host: action.favorite?.host ?? '',
        port: action.favorite?.tcp,
        sslPort: action.favorite?.ssl,
        serverHistory: action.history,
        config: action.config,
        showSuggestedServers: action.showSuggested,
        isSuggestedExpanded: action.favorite ? state.isSuggestedExpanded : true,
      };
    case 'toggleSuggested':
      return { ...state, isSuggestedExpanded: !state.isSuggestedExpanded };
    case 'favoriteRemoved':
      return {
        ...state,
        host: '',
        port: undefined,
        sslPort: undefined,
        serverHistory: action.history,
        showSuggestedServers: true,
        isSuggestedExpanded: true,
      };
    case 'testStarted': {
      const results = { ...state.serverTestResults };
      delete results[action.key];
      return {
        ...state,
        testingServerKey: action.key,
        serverTestResults: results,
      };
    }
    case 'testFinished':
      return {
        ...state,
        testingServerKey: undefined,
        serverTestResults: {
          ...state.serverTestResults,
          [action.key]: action.success,
        },
      };
  }
}

const ElectrumSettings: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useRoute<RouteProps>().params as DetailViewStackParamList['ElectrumSettings'];
  const { server, serverHistoryImport } = params ?? {};
  const navigation = useNavigation();
  const [state, dispatch] = useReducer(electrumSettingsReducer, initialElectrumSettingsState);
  const {
    isLoading,
    serverHistory,
    config,
    host,
    port,
    sslPort,
    serverBanner,
    isSuggestedExpanded,
    showSuggestedServers,
    testingServerKey,
    serverTestResults,
  } = state;
  const { setIsElectrumDisabled, isElectrumDisabled, isHandOffUseEnabled } = useSettings();
  const handoffServers = useMemo(() => {
    const favoriteServer = host && (port || sslPort) ? { host, ...(sslPort ? { ssl: sslPort } : { tcp: port }) } : undefined;
    return electrumServersForHandoff(Array.from(serverHistory), favoriteServer);
  }, [host, port, serverHistory, sslPort]);
  const handoffServerHistoryDocument = useMemo(
    () => (handoffServers.length > 0 ? serializeElectrumServerDocument(handoffServers) : ''),
    [handoffServers],
  );
  const handoffServerHistoryDeepLink = useMemo(
    () => (handoffServers.length > 0 ? createElectrumServerHistoryDeepLink(handoffServers) : ''),
    [handoffServers],
  );
  const listRef = useRef<FlatList<ServerListEntry>>(null);
  const operationInProgress = useRef(false);

  const onSearchTextChange = useCallback((text: string) => {
    dispatch({ type: 'patch', value: { searchQuery: text } });
  }, []);
  const onSearchCancel = useCallback(() => {
    dispatch({ type: 'patch', value: { searchQuery: '' } });
  }, []);
  useLayoutEffect(() => {
    navigation.setParams({ onSearchTextChange, onSearchCancel });
  }, [navigation, onSearchTextChange, onSearchCancel]);

  const presentAlert = useCallback(
    ({ title, message, buttons = [{ text: loc._.ok }] }: { title?: string; message: string; buttons?: AlertButton[] }) => {
      const anchor = findNodeHandle(listRef.current);
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
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const releaseSuppression = BlueElectrum.suppressNetworkErrorAlerts();
      return releaseSuppression;
    }, []),
  );

  const stylesHook = StyleSheet.create({
    bannerText: {
      color: colors.foregroundColor,
    },
    statusIcon: {
      backgroundColor: config.connected === 1 ? colors.receiveBackground : colors.redBG,
    },
    statusIconGlyph: {
      color: config.connected === 1 ? colors.receiveText : colors.redText,
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
    list: {
      backgroundColor: colors.background,
    },
  });

  const fetchGeneration = useRef(0);
  const focused = useRef(false);
  const fetchData = useCallback(async () => {
    const generation = ++fetchGeneration.current;
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const [favorite, historyValue, currentConfig] = await Promise.all([
      BlueElectrum.getPreferredServer(),
      DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY),
      BlueElectrum.getConfig(),
    ]);
    const history = typeof historyValue === 'string' ? parseElectrumServerDocumentResult(historyValue).servers : [];
    const showSuggested = favorite ? (await AsyncStorage.getItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY)) !== 'false' : true;
    if (!favorite) await AsyncStorage.removeItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY);
    if (!focused.current || generation !== fetchGeneration.current) return;
    dispatch({
      type: 'loaded',
      favorite,
      history,
      config: currentConfig,
      showSuggested,
    });
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      let active = true;
      let refreshGeneration = 0;
      const refreshConfig = async () => {
        const generation = ++refreshGeneration;
        try {
          const currentConfig = await BlueElectrum.getConfig();
          if (active && generation === refreshGeneration) dispatch({ type: 'patch', value: { config: currentConfig } });
        } catch (error) {
          console.warn('[electrum] Failed to refresh connection status:', error);
        }
      };
      const unsubscribe = BlueElectrum.subscribeConnectionState(() => {
        refreshConfig();
      });
      fetchData()
        .catch(error => {
          if (active) {
            dispatch({ type: 'patch', value: { isLoading: false } });
            presentAlert({
              message: error instanceof Error ? error.message : String(error),
            });
          }
        })
        .finally(() => {
          if (active) refreshConfig();
        });
      return () => {
        active = false;
        focused.current = false;
        fetchGeneration.current += 1;
        unsubscribe();
      };
    }, [fetchData, presentAlert]),
  );

  // Fetch banner when connected
  useEffect(() => {
    let active = true;
    dispatch({ type: 'patch', value: { serverBanner: '' } });
    if (config.connected === 1 && config.host && !isElectrumDisabled) {
      BlueElectrum.getServerBanner()
        .then(banner => {
          if (active) dispatch({ type: 'patch', value: { serverBanner: banner } });
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [config.connected, config.host, config.port, isElectrumDisabled]);

  const saveFavorite = useCallback(
    async (value: ElectrumServerItem) => {
      if (operationInProgress.current) return;
      operationInProgress.current = true;
      dispatch({ type: 'patch', value: { isLoading: true } });
      try {
        const candidate = parseElectrumServer(formatElectrumServer(value));
        if (!candidate) throw new Error(loc.settings.electrum_error_connect);
        if (Platform.OS === 'ios' && isLocalElectrumHost(candidate.host)) {
          const granted = await NativeLocalNetworkPermission?.requestLocalNetworkAccess();
          if (!granted) throw new Error(loc.settings.electrum_local_server_unavailable);
        }
        const validation = await BlueElectrum.validateConnection(candidate.host, candidate.tcp, candidate.ssl);
        if (!validation.success) throw new Error(validation.error || loc.settings.electrum_error_connect);
        if (!focused.current) return;
        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
        const historyValue = await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY);
        const previousFavorite = await BlueElectrum.getPreferredServer();
        const history = uniqueElectrumServers([
          ...parseElectrumServerDocumentResult(typeof historyValue === 'string' ? historyValue : '').servers,
          ...(previousFavorite ? [previousFavorite] : []),
          candidate,
        ]);
        await DefaultPreference.setMultiple({
          [BlueElectrum.ELECTRUM_SERVER_HISTORY]: JSON.stringify(history),
          [BlueElectrum.ELECTRUM_TCP_PORT]: candidate.tcp?.toString() ?? '',
          [BlueElectrum.ELECTRUM_SSL_PORT]: candidate.ssl?.toString() ?? '',
          [BlueElectrum.ELECTRUM_HOST]: candidate.host,
        });
        await fetchData();
        if (!(await BlueElectrum.isDisabled())) {
          BlueElectrum.forceDisconnect();
          BlueElectrum.ensureConnected().catch(error => console.warn('[electrum] Reconnect failed:', error));
        }
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      } catch (error) {
        presentAlert({
          message: error instanceof Error ? error.message : String(error),
        });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      } finally {
        operationInProgress.current = false;
        dispatch({ type: 'patch', value: { isLoading: false } });
      }
    },
    [fetchData, presentAlert],
  );

  const handledServer = useRef<ElectrumServerItem | undefined>(undefined);
  useEffect(() => {
    if (!server || isLoading || handledServer.current === server) return;
    handledServer.current = server;
    navigation.setParams({ server: undefined });
    presentAlert({
      title: loc.settings.electrum_favorite_server,
      message: loc.formatString(loc.settings.set_as_favorite_electrum, {
        host: server.host,
        port: String(server.ssl ?? server.tcp),
      }),
      buttons: [
        { text: loc._.cancel, style: 'cancel' },
        {
          text: loc._.ok,
          onPress: () => {
            saveFavorite(server);
          },
        },
      ],
    });
  }, [isLoading, navigation, presentAlert, saveFavorite, server]);

  useEffect(() => {
    if (!params?.onBarScanned) return;
    const scannedServer = parseElectrumServer(params.onBarScanned);
    navigation.setParams({ onBarScanned: undefined });
    if (scannedServer)
      navigation.navigate('AddElectrumServerRoot', {
        screen: 'AddElectrumServer',
        params: { server: scannedServer },
      });
  }, [navigation, params?.onBarScanned]);

  const presentSelectServerAlert = useCallback(
    (value: ElectrumServerItem) => {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
      presentAlert({
        title: loc.settings.electrum_favorite_server,
        message: loc.formatString(loc.settings.set_as_favorite_electrum, {
          host: value.host,
          port: String(value.ssl ?? value.tcp),
        }),
        buttons: [
          {
            text: loc._.ok,
            onPress: () => {
              saveFavorite(value);
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
      });
    },
    [presentAlert, saveFavorite],
  );

  const importServerHistoryData = useCallback(
    async (data: string) => {
      if (operationInProgress.current) return;
      operationInProgress.current = true;
      dispatch({ type: 'patch', value: { isLoading: true } });
      try {
        const result = parseElectrumServerDocumentResult(data);
        if (result.tooLarge) throw new Error(loc.settings.electrum_import_too_large);
        if (result.incompatibleVersion !== undefined) {
          throw new Error(
            loc.formatString(loc.settings.electrum_import_incompatible, {
              version: String(result.incompatibleVersion),
            }),
          );
        }
        if (result.servers.length === 0) throw new Error(loc.settings.electrum_import_no_valid_servers);

        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
        const historyValue = await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY);
        const currentHistory = parseElectrumServerDocumentResult(typeof historyValue === 'string' ? historyValue : '').servers;
        const favorite = await BlueElectrum.getPreferredServer();
        const existingKeys = new Set([...currentHistory, ...suggestedServers, ...(favorite ? [favorite] : [])].map(electrumServerKey));
        const newServers = result.servers.filter(importedServer => !existingKeys.has(electrumServerKey(importedServer)));
        if (newServers.length === 0) {
          presentAlert({ message: loc.settings.electrum_import_no_changes });
          return;
        }
        const mergedServers = uniqueElectrumServers([...currentHistory, ...newServers]);

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
      } finally {
        operationInProgress.current = false;
        dispatch({ type: 'patch', value: { isLoading: false } });
      }
    },
    [fetchData, presentAlert],
  );

  const handledServerHistoryImport = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      Platform.OS !== 'ios' ||
      !isHandOffUseEnabled ||
      isLoading ||
      !serverHistoryImport ||
      handledServerHistoryImport.current === serverHistoryImport
    )
      return;
    handledServerHistoryImport.current = serverHistoryImport;
    presentAlert({
      title: loc.settings.electrum_handoff_import_title,
      message: loc.settings.electrum_handoff_import_description,
      buttons: [
        { text: loc._.cancel, style: 'cancel' },
        {
          text: loc.settings.electrum_import_server_history,
          onPress: () => importServerHistoryData(serverHistoryImport),
        },
      ],
    });
  }, [importServerHistoryData, isHandOffUseEnabled, isLoading, presentAlert, serverHistoryImport]);

  const onPressMenuItem = useCallback(
    async (id: string) => {
      if (operationInProgress.current) return;
      try {
        if (id === ADD_SERVER_ACTION_ID) {
          navigation.navigate('AddElectrumServerRoot');
        } else if (id === SHOW_SUGGESTED_SERVERS_ACTION_ID) {
          const nextValue = !showSuggestedServers;
          await AsyncStorage.setItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY, String(nextValue));
          dispatch({
            type: 'patch',
            value: { showSuggestedServers: nextValue },
          });
        } else if (id === CommonToolTipActions.ResetToDefault.id) {
          const reset = await presentResetToDefaultsAlert(presentAlert);
          if (reset) {
            dispatch({ type: 'favoriteRemoved', history: serverHistory });
            await AsyncStorage.removeItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY);
            await BlueElectrum.setDisabled(false);
            setIsElectrumDisabled(false);
            triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
            presentAlert({ message: loc.settings.electrum_saved });
            await fetchData();
            await BlueElectrum.connectToRandomSuggestedServer();
          }
        }
      } catch (error) {
        presentAlert({
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [fetchData, navigation, presentAlert, serverHistory, setIsElectrumDisabled, showSuggestedServers],
  );

  const isFavorite = useCallback(
    (value: ElectrumServerItem) => {
      return Boolean(host && (port || sslPort)) && serverKey(value) === serverKey({ host, tcp: port, ssl: sslPort });
    },
    [host, port, sslPort],
  );

  const generateToolTipActions = useCallback(() => {
    const resetToDefaults = { ...CommonToolTipActions.ResetToDefault };
    resetToDefaults.hidden = !host || (!port && !sslPort);
    return [
      [
        {
          id: ADD_SERVER_ACTION_ID,
          text: loc.settings.electrum_add_server,
          icon: { iconValue: Platform.OS === 'ios' ? 'plus' : 'ic_input_add' },
        },
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
  }, [host, port, showSuggestedServers, sslPort]);

  const serverList = useMemo<ServerListEntry[]>(() => {
    const query = state.searchQuery.trim().toLowerCase();
    const matchesSearch = (candidate: ElectrumServerItem) => {
      const searchableText = `${formatElectrumServer(candidate)} ${candidate.ssl ? 'SSL' : 'TCP'}`.toLowerCase();
      return query.split(/\s+/).every(term => searchableText.includes(term));
    };
    const hasFavorite = Boolean(host && (port || sslPort));
    const isConnectedServer = (candidate: ElectrumServerItem) =>
      config.connected === 1 && config.host === candidate.host && String(config.port) === String(candidate.ssl ?? candidate.tcp);
    const historyKeys = new Set(serverHistory.map(serverKey));
    const orderedSuggestedServers = suggestedServers
      .filter(candidate => !historyKeys.has(serverKey(candidate)) && matchesSearch(candidate))
      .sort((first, second) => Number(isConnectedServer(second)) - Number(isConnectedServer(first)));
    const entries: ServerListEntry[] = [];
    const favoriteServer: ElectrumServerItem | undefined = hasFavorite
      ? {
          host,
          ...(port ? { tcp: port } : {}),
          ...(sslPort ? { ssl: sslPort } : {}),
        }
      : undefined;

    if (favoriteServer && matchesSearch(favoriteServer)) {
      entries.push({
        type: 'header',
        id: 'favorite-header',
        title: loc.settings.electrum_favorite_server,
      });
      entries.push({
        type: 'server',
        id: `favorite-${serverKey(favoriteServer)}`,
        server: favoriteServer,
        isFirst: true,
        isLast: true,
        isHistory: false,
      });
    }

    const visibleSuggestedServers = orderedSuggestedServers.filter(
      suggestedServer => !favoriteServer || serverKey(suggestedServer) !== serverKey(favoriteServer),
    );
    if (visibleSuggestedServers.length > 0 && (!hasFavorite || showSuggestedServers)) {
      entries.push({
        type: 'header',
        id: 'suggested-header',
        title: loc._.suggested,
        description: loc.settings.electrum_suggested_description,
      });
      if (!hasFavorite || isSuggestedExpanded || query) {
        entries.push(
          ...visibleSuggestedServers.map((suggestedServer, index, visibleServers) => ({
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

    const history = Array.from(serverHistory).filter(historyServer => {
      const key = serverKey(historyServer);
      return (!favoriteServer || key !== serverKey(favoriteServer)) && matchesSearch(historyServer);
    });
    if (history.length > 0) {
      entries.push({
        type: 'header',
        id: 'history-header',
        title: loc.settings.electrum_server_history,
      });
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

    return entries;
  }, [
    config.connected,
    config.host,
    config.port,
    host,
    isSuggestedExpanded,
    port,
    serverHistory,
    showSuggestedServers,
    sslPort,
    state.searchQuery,
  ]);

  const headerMenuOptions = useMemo(() => {
    const actions = generateToolTipActions();
    const visibleActions = actions.flat().filter(action => !action.hidden);

    if (visibleActions.length === 1) {
      const action = visibleActions[0];
      const actionId = String(action.id);
      return {
        // eslint-disable-next-line react/no-unstable-nested-components -- React Navigation headerRight expects a render function
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.text}
            accessibilityState={{ disabled: action.disabled }}
            testID={actionId}
            disabled={action.disabled}
            hitSlop={8}
            onPress={() => onPressMenuItem(actionId)}
            style={({ pressed }) => [styles.directHeaderAction, pressed && styles.pressed]}
          >
            <Ionicons accessible={false} name="add" size={26} color={colors.primary} />
          </Pressable>
        ),
        unstable_headerRightItems: () => [
          {
            type: 'button' as const,
            label: action.text,
            ...(Platform.OS === 'ios' ? { icon: { type: 'sfSymbol' as const, name: 'plus' as const } } : {}),
            identifier: actionId,
            accessibilityLabel: action.text,
            disabled: Boolean(action.disabled),
            onPress: () => onPressMenuItem(actionId),
          },
        ],
      };
    }

    const menuIdentifier = `ElectrumHeaderMenu-${visibleActions
      .map(action => `${String(action.id)}:${action.menuState === true ? 'on' : action.menuState === false ? 'off' : 'none'}`)
      .join('|')}`;

    return createEllipsisHeaderMenuOptions({
      actions,
      onPressMenuItem,
      preserveGroups: true,
      identifier: menuIdentifier,
    });
  }, [colors.primary, generateToolTipActions, onPressMenuItem]);

  useLayoutEffect(() => {
    navigation.setParams({
      headerRight: headerMenuOptions.headerRight,
      unstable_headerRightItems: headerMenuOptions.unstable_headerRightItems,
    });
  }, [headerMenuOptions, navigation]);

  const checkServer = async () => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    dispatch({ type: 'patch', value: { isLoading: true } });
    try {
      const features = await BlueElectrum.serverFeatures();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      presentAlert({ message: JSON.stringify(features, null, 2) });
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (error as Error).message });
    } finally {
      operationInProgress.current = false;
      dispatch({ type: 'patch', value: { isLoading: false } });
    }
  };

  const onElectrumConnectionEnabledSwitchChange = async (value: boolean) => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    dispatch({ type: 'patch', value: { isLoading: true } });
    try {
      triggerSelectionHapticFeedback();
      await BlueElectrum.setDisabled(value);
      setIsElectrumDisabled(value);
      AccessibilityInfo.announceForAccessibilityWithOptions(
        value ? loc.settings.electrum_offline_enabled : loc.settings.electrum_offline_disabled,
        { queue: true },
      );
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (error as Error).message });
    } finally {
      operationInProgress.current = false;
      dispatch({ type: 'patch', value: { isLoading: false } });
    }
  };

  const renderConnectionStatus = () => {
    const isConnected = config.connected === 1;
    const connectedEndpoint = isConnected && config.host && config.port ? `${config.host}:${config.port}` : undefined;

    return (
      <>
        <SettingsSection title={loc.settings.electrum_status}>
          <SettingsListItem
            accessible
            title={isConnected ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
            subtitle={connectedEndpoint}
            subtitleSelectable
            subtitleNumberOfLines={0}
            onPress={isConnected ? checkServer : undefined}
            disabled={isLoading || !isConnected}
            accessibilityLabel={`${loc.settings.electrum_status}: ${isConnected ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}${connectedEndpoint ? `. ${connectedEndpoint}` : ''}`}
            accessibilityHint={loc.settings.electrum_status_hint}
            accessibilityState={{
              disabled: isLoading || !isConnected,
              busy: isLoading,
            }}
            isLoading={isLoading}
            bottomDivider={serverBanner.length > 0}
            leftAvatar={
              <View importantForAccessibility="no" style={[styles.statusIcon, stylesHook.statusIcon]}>
                <Ionicons name={isConnected ? 'checkmark-circle' : 'alert-circle'} size={22} style={stylesHook.statusIconGlyph} />
              </View>
            }
            containerStyle={styles.statusRow}
          />
          {serverBanner.length > 0 && (
            <View style={styles.bannerContainer}>
              <Text style={[styles.bannerText, stylesHook.bannerText]} selectable>
                {serverBanner}
              </Text>
            </View>
          )}
        </SettingsSection>
      </>
    );
  };

  const deleteServerFromHistory = useCallback(
    async (serverToDelete: ElectrumServerItem) => {
      if (operationInProgress.current) return;
      operationInProgress.current = true;
      dispatch({ type: 'patch', value: { isLoading: true } });
      try {
        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
        const value = await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY);
        const remainingServers = parseElectrumServerDocumentResult(typeof value === 'string' ? value : '').servers.filter(
          candidate => serverKey(candidate) !== serverKey(serverToDelete),
        );
        await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(remainingServers));
        dispatch({ type: 'patch', value: { serverHistory: remainingServers } });
        AccessibilityInfo.announceForAccessibilityWithOptions(loc.settings.electrum_history_removed, { queue: true });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: (error as Error).message });
      } finally {
        operationInProgress.current = false;
        dispatch({ type: 'patch', value: { isLoading: false } });
      }
    },
    [presentAlert],
  );

  const removeFavoriteServer = useCallback(
    async (favoriteServer: ElectrumServerItem) => {
      if (operationInProgress.current) return;
      operationInProgress.current = true;
      dispatch({ type: 'patch', value: { isLoading: true } });
      try {
        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
        const value = await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY);
        const history = parseElectrumServerDocumentResult(typeof value === 'string' ? value : '').servers;
        const updatedHistory = uniqueElectrumServers([...history, favoriteServer]);
        await DefaultPreference.setMultiple({
          [BlueElectrum.ELECTRUM_SERVER_HISTORY]: JSON.stringify(updatedHistory),
          [BlueElectrum.ELECTRUM_HOST]: '',
          [BlueElectrum.ELECTRUM_TCP_PORT]: '',
          [BlueElectrum.ELECTRUM_SSL_PORT]: '',
        });
        await AsyncStorage.removeItem(SHOW_SUGGESTED_SERVERS_STORAGE_KEY);

        dispatch({ type: 'favoriteRemoved', history: updatedHistory });
        AccessibilityInfo.announceForAccessibilityWithOptions(loc.settings.electrum_favorite_removed, { queue: true });
        await fetchData();
        if (!(await BlueElectrum.isDisabled()))
          BlueElectrum.connectToRandomSuggestedServer().catch(error => console.warn('[electrum] Reconnect failed:', error));
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: (error as Error).message });
      } finally {
        operationInProgress.current = false;
        dispatch({ type: 'patch', value: { isLoading: false } });
      }
    },
    [fetchData, presentAlert],
  );

  const testServerConnection = useCallback(
    async (serverToTest: ElectrumServerItem) => {
      const key = serverKey(serverToTest);
      const serverPort = serverToTest.ssl ?? serverToTest.tcp;
      const endpoint = `${serverToTest.host}:${serverPort}`;
      if (operationInProgress.current) return;
      operationInProgress.current = true;
      dispatch({ type: 'testStarted', key });
      AccessibilityInfo.announceForAccessibilityWithOptions(`${loc.settings.electrum_testing_server}. ${serverToTest.host}`, {
        queue: true,
      });
      let success = false;
      try {
        if (Platform.OS === 'ios' && isLocalElectrumHost(serverToTest.host)) {
          if (!(await NativeLocalNetworkPermission?.requestLocalNetworkAccess()))
            throw new Error(loc.settings.electrum_local_server_unavailable);
        }
        const result = await BlueElectrum.validateConnection(serverToTest.host, serverToTest.tcp, serverToTest.ssl);
        success = result.success;
        if (focused.current)
          presentAlert({
            title: success ? loc.settings.electrum_connection_successful : loc.settings.electrum_validation_failed,
            message: success ? endpoint : result.error || loc.settings.electrum_error_connect,
          });
      } catch (error) {
        if (focused.current)
          presentAlert({
            message: error instanceof Error ? error.message : String(error),
          });
      } finally {
        operationInProgress.current = false;
        dispatch({ type: 'testFinished', key, success });
        triggerHapticFeedback(success ? HapticFeedbackTypes.NotificationSuccess : HapticFeedbackTypes.NotificationError);
      }
    },
    [presentAlert],
  );

  const menuBusy = isLoading || Boolean(testingServerKey);
  const hasFavorite = Boolean(host && (port || sslPort));
  useScreenMenuActions(
    {
      addElectrumServer: () => {
        if (!menuBusy) navigation.navigate('AddElectrumServerRoot');
      },
      resetElectrumSettings: hasFavorite ? () => onPressMenuItem(CommonToolTipActions.ResetToDefault.id) : undefined,
      toggleSuggestedElectrumServers: hasFavorite ? () => onPressMenuItem(SHOW_SUGGESTED_SERVERS_ACTION_ID) : undefined,
      toggleElectrumOffline: () => onElectrumConnectionEnabledSwitchChange(!isElectrumDisabled),
      copyConnectedElectrumServer: () => {
        if (isElectrumDisabled || config.connected !== 1 || !config.host || !config.port) return;
        const matchingServer = [...serverHistory, ...suggestedServers, ...(hasFavorite ? [{ host, tcp: port, ssl: sslPort }] : [])].find(
          candidate => candidate.host === config.host && String(candidate.ssl ?? candidate.tcp) === String(config.port),
        );
        copyServerText(matchingServer ? formatElectrumServer(matchingServer) : `${config.host}:${config.port}`);
      },
      removeFavoriteElectrumServer: hasFavorite ? () => removeFavoriteServer({ host, tcp: port, ssl: sslPort }) : undefined,
    },
    undefined,
    {
      addElectrumServer: { disabled: menuBusy },
      resetElectrumSettings: { disabled: menuBusy },
      toggleSuggestedElectrumServers: { checked: showSuggestedServers, disabled: menuBusy },
      toggleElectrumOffline: { checked: isElectrumDisabled, disabled: menuBusy },
      copyConnectedElectrumServer: { disabled: isElectrumDisabled || config.connected !== 1 || !config.host || !config.port },
      removeFavoriteElectrumServer: { disabled: menuBusy },
    },
  );

  const previousConnection = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      focused.current &&
      !isLoading &&
      !isElectrumDisabled &&
      previousConnection.current !== undefined &&
      config.connected !== previousConnection.current
    ) {
      AccessibilityInfo.announceForAccessibilityWithOptions(
        config.connected === 1 ? loc.settings.electrum_connected : loc.settings.electrum_connected_not,
        { queue: true },
      );
    }
    previousConnection.current = config.connected;
  }, [config.connected, isElectrumDisabled, isLoading]);

  const renderServerEntry = useCallback(
    ({ item }: ListRenderItemInfo<ServerListEntry>) => {
      if (item.type === 'header') {
        const isSuggestedHeader = item.id === 'suggested-header';
        const isCollapsible = isSuggestedHeader && Boolean(host && (port || sslPort)) && !state.searchQuery.trim();
        const iconName = item.id === 'favorite-header' ? 'favorite' : 'electrum';
        return (
          <SettingsSection
            title={item.title}
            iconName={iconName}
            onHeaderPress={isCollapsible ? () => dispatch({ type: 'toggleSuggested' }) : undefined}
            headerAccessibilityLabel={
              isCollapsible
                ? `${item.title}. ${isSuggestedExpanded ? loc.settings.electrum_collapse_suggested_servers : loc.settings.electrum_expand_suggested_servers}`
                : undefined
            }
            headerAccessibilityState={isCollapsible ? { expanded: isSuggestedExpanded } : undefined}
            containerStyle={[styles.serverSectionHeader, isCollapsible && !isSuggestedExpanded && styles.collapsedSectionHeader]}
            headerRight={
              isCollapsible ? (
                <View accessible={false} testID="ToggleSuggestedServers" style={styles.disclosureButton}>
                  <Ionicons
                    accessible={false}
                    name={isSuggestedExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.alternativeTextColor}
                  />
                </View>
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

      const serverPort = item.server.ssl ?? item.server.tcp;
      const itemServerKey = serverKey(item.server);
      const favorite = isFavorite(item.server);
      const connected =
        !isElectrumDisabled && config.connected === 1 && config.host === item.server.host && String(config.port) === String(serverPort);
      const isTesting = testingServerKey === itemServerKey;
      const testResult = serverTestResults[itemServerKey];
      const canTest = !isLoading && !testingServerKey && (!favorite || isElectrumDisabled);
      const rowDisabled = isLoading || Boolean(testingServerKey);
      const protocol = item.server.ssl ? 'SSL' : 'TCP';
      const serverAccessibilityLabel = `${item.server.host}, ${protocol} ${serverPort}${favorite ? `, ${loc.settings.electrum_favorite_server}` : ''}${connected ? `, ${loc.settings.electrum_connected}` : ''}${testResult === true ? `, ${loc.settings.electrum_connection_successful}` : ''}${testResult === false ? `, ${loc.settings.electrum_validation_failed}` : ''}`;

      const row = (
        <SettingsListItem
          accessible
          accessibilityRole={favorite ? 'text' : 'button'}
          testID={`${favorite ? 'FavoriteElectrumServer' : 'ElectrumServer'}-${item.server.host}-${serverPort}`}
          title={item.server.host}
          titleStyle={favorite ? stylesHook.preferredServerTitle : undefined}
          titleSelectable={!item.isHistory}
          subtitle={`${protocol}: ${serverPort}`}
          subtitleSelectable={!item.isHistory}
          subtitleNumberOfLines={0}
          accessibilityLabel={serverAccessibilityLabel}
          accessibilityHint={
            favorite
              ? loc.settings.electrum_row_actions_hint
              : Platform.OS === 'ios' && Platform.isMacCatalyst
                ? loc.settings.electrum_server_row_hint_mac
                : loc.settings.electrum_server_row_hint
          }
          disabled={rowDisabled}
          accessibilityState={{
            selected: favorite,
            disabled: rowDisabled,
            busy: isTesting,
          }}
          accessibilityActions={[
            { name: 'copy', label: loc.settings.electrum_copy_server },
            ...(favorite && !rowDisabled
              ? [
                  {
                    name: 'removeFavorite',
                    label: loc.settings.electrum_remove_favorite_server,
                  },
                ]
              : []),
            ...(canTest ? [{ name: 'test', label: loc.settings.electrum_test_connection }] : []),
            ...(item.isHistory && !rowDisabled ? [{ name: 'delete', label: loc.wallets.details_delete }] : []),
          ]}
          onAccessibilityAction={event => {
            if (event.nativeEvent.actionName === 'copy') {
              copyServerText(formatElectrumServer(item.server));
              return;
            }
            if (rowDisabled) return;
            if (event.nativeEvent.actionName === 'removeFavorite' && favorite) {
              removeFavoriteServer(item.server);
            } else if (event.nativeEvent.actionName === 'test' && canTest) {
              testServerConnection(item.server);
            } else if (event.nativeEvent.actionName === 'delete' && item.isHistory) {
              deleteServerFromHistory(item.server);
            }
          }}
          rightElement={
            isTesting ? (
              <ActivityIndicator accessibilityLabel={loc.settings.electrum_testing_server} color={colors.primary} />
            ) : connected ? (
              <View importantForAccessibility="no" style={styles.connectedIcon}>
                <Ionicons name="link" size={20} color={colors.receiveText} />
              </View>
            ) : testResult !== undefined ? (
              <View importantForAccessibility="no" style={styles.connectedIcon}>
                <Ionicons
                  name={testResult ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={testResult ? colors.receiveText : colors.redText}
                />
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
          onPress={rowDisabled || favorite ? undefined : () => presentSelectServerAlert(item.server)}
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
          copyTestID={`CopyElectrumServer-${item.server.host}-${serverPort}`}
          menuTitle={`${item.server.host}:${serverPort}`}
          onTest={canTest ? () => testServerConnection(item.server) : undefined}
          onCopy={() => copyServerText(formatElectrumServer(item.server))}
          onRemoveFavorite={favorite && !rowDisabled ? () => removeFavoriteServer(item.server) : undefined}
          isLast={item.isLast}
          removeFavoriteTestID={favorite ? `RemoveFavoriteElectrumServer-${item.server.host}-${serverPort}` : undefined}
          deleteTestID={item.isHistory ? `DeleteElectrumServer-${item.server.host}-${serverPort}` : undefined}
          onDelete={item.isHistory && !rowDisabled ? () => deleteServerFromHistory(item.server) : undefined}
        >
          {row}
        </SwipeableServerRow>
      );
    },
    [
      colors.alternativeTextColor,
      colors.alternativeTextColor2,
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
      isSuggestedExpanded,
      host,
      port,
      presentSelectServerAlert,
      removeFavoriteServer,
      serverTestResults,
      state.searchQuery,
      sslPort,
      stylesHook,
      testServerConnection,
      testingServerKey,
    ],
  );

  return (
    <>
      {Platform.OS === 'ios' && isHandOffUseEnabled && handoffServerHistoryDocument ? (
        <HandOffComponent
          title={loc.settings.electrum_handoff_export}
          type={HandOffActivityType.ElectrumServerHistory}
          userInfo={{
            serverHistory: handoffServerHistoryDocument,
            deepLink: handoffServerHistoryDeepLink,
          }}
        />
      ) : null}
      <FlatList
        ref={listRef}
        data={serverList}
        renderItem={renderServerEntry}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="always"
        automaticallyAdjustContentInsets
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        style={stylesHook.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        testID="ElectrumSettingsScrollView"
        accessibilityLabel={loc.settings.electrum_settings_server}
        accessibilityState={{ busy: isLoading }}
        ListEmptyComponent={
          !isLoading && state.searchQuery.trim() ? (
            <SettingsSection>
              <SettingsFootnote>{loc.wallets.no_results_found}</SettingsFootnote>
            </SettingsSection>
          ) : null
        }
        onAccessibilityEscape={() => navigation.goBack()}
        ListHeaderComponent={
          <>
            <SettingsSection title={loc.settings.electrum_offline_mode} iconName="offline">
              <SettingsListItem
                title={loc.settings.electrum_work_offline}
                subtitle={loc.settings.electrum_offline_description}
                switch={{
                  onValueChange: onElectrumConnectionEnabledSwitchChange,
                  value: isElectrumDisabled,
                  disabled: isLoading || Boolean(testingServerKey),
                  testID: 'ElectrumConnectionEnabledSwitch',
                }}
                bottomDivider={false}
              />
            </SettingsSection>
            {!isElectrumDisabled && renderConnectionStatus()}
          </>
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
  statusRow: {
    minHeight: Platform.select({ ios: 60, default: 64 }),
  },

  directHeaderAction: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.6,
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
    paddingTop: 2,
    paddingBottom: 16,
  },
  serverRow: {
    marginHorizontal: 16,
    minHeight: Platform.select({ ios: 44, default: 56 }),
  },
  connectedIcon: {
    marginLeft: 10,
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
