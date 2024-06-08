import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useReducer } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import {
  BlueButtonLink,
  BlueCard,
  BlueDismissKeyboardInputAccessory,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueLoading,
  BlueSpacing20,
  BlueText,
} from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { scanQrHelper } from '../../helpers/scan-qr';
import loc from '../../loc';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import { RouteProp, useRoute } from '@react-navigation/native';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

interface Server {
  host: string;
  port?: number;
  sslPort?: number;
}

interface State {
  isLoading: boolean;
  isOfflineMode: boolean;
  serverHistory: Server[];
  config: any;
  server?: string;
  sslPort: string;
  port: string;
  host: string;
  isAndroidNumericKeyboardFocused: boolean;
  isAndroidAddressKeyboardVisible: boolean;
  interval?: NodeJS.Timeout;
}

const initialState: State = {
  isLoading: true,
  isOfflineMode: false,
  serverHistory: [],
  config: {},
  sslPort: '',
  port: '',
  host: '',
  isAndroidNumericKeyboardFocused: false,
  isAndroidAddressKeyboardVisible: false,
};

enum ActionType {
  SET_LOADING = 'SET_LOADING',
  SET_OFFLINE_MODE = 'SET_OFFLINE_MODE',
  SET_SERVER_HISTORY = 'SET_SERVER_HISTORY',
  SET_CONFIG = 'SET_CONFIG',
  SET_HOST = 'SET_HOST',
  SET_PORT = 'SET_PORT',
  SET_SSL_PORT = 'SET_SSL_PORT',
  SET_INTERVAL = 'SET_INTERVAL',
}

type Action =
  | { type: ActionType.SET_LOADING; payload: boolean }
  | { type: ActionType.SET_OFFLINE_MODE; payload: boolean }
  | { type: ActionType.SET_SERVER_HISTORY; payload: Server[] }
  | { type: ActionType.SET_CONFIG; payload: any }
  | { type: ActionType.SET_HOST; payload: string }
  | { type: ActionType.SET_PORT; payload: string }
  | { type: ActionType.SET_SSL_PORT; payload: string }
  | { type: ActionType.SET_INTERVAL; payload: NodeJS.Timeout | undefined };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionType.SET_OFFLINE_MODE:
      return { ...state, isOfflineMode: action.payload };
    case ActionType.SET_SERVER_HISTORY:
      return { ...state, serverHistory: action.payload };
    case ActionType.SET_CONFIG:
      return { ...state, config: action.payload };
    case ActionType.SET_HOST:
      return { ...state, host: action.payload };
    case ActionType.SET_PORT:
      return { ...state, port: action.payload };
    case ActionType.SET_SSL_PORT:
      return { ...state, sslPort: action.payload };
    case ActionType.SET_INTERVAL:
      return { ...state, interval: action.payload };
    default:
      return state;
  }
};

type RouteProps = RouteProp<DetailViewStackParamList, 'ElectrumSettings'>;

const ElectrumSettings: React.FC = () => {
  const { setIsElectrumDisabled } = useStorage();
  const route = useRoute<RouteProps>();
  const server = route?.params?.server;
  const [state, dispatch] = useReducer(reducer, { ...initialState, server });
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    status: {
      color: colors.feeText,
    },
    containerConnected: {
      backgroundColor: colors.feeLabel,
    },
    containerDisconnected: {
      backgroundColor: colors.redBG,
    },
    textConnected: {
      color: colors.feeValue,
    },
    textDisconnected: {
      color: colors.redText,
    },
    hostname: {
      color: colors.foregroundColor,
    },
    usePort: {
      color: colors.foregroundColor,
      marginHorizontal: 8,
    },
    explain: {
      color: colors.feeText,
    },
    inputWrap: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    serverHistoryItem: {
      borderBottomColor: colors.formBorder,
    },
    serverRow: {
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    (async () => {
      const host = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_HOST);
      const port = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_TCP_PORT);
      const sslPort = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_SSL_PORT);
      const serverHistoryStr = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_SERVER_HISTORY);
      const isOfflineMode = await BlueElectrum.isDisabled();
      const serverHistory = JSON.parse(serverHistoryStr || '[]') as Server[];

      dispatch({ type: ActionType.SET_LOADING, payload: false });
      dispatch({ type: ActionType.SET_HOST, payload: host || '' });
      dispatch({ type: ActionType.SET_PORT, payload: port || '' });
      dispatch({ type: ActionType.SET_SSL_PORT, payload: sslPort || '' });
      dispatch({ type: ActionType.SET_SERVER_HISTORY, payload: serverHistory });
      dispatch({ type: ActionType.SET_OFFLINE_MODE, payload: isOfflineMode });

      const interval = setInterval(async () => {
        dispatch({ type: ActionType.SET_CONFIG, payload: await BlueElectrum.getConfig() });
      }, 500);

      dispatch({ type: ActionType.SET_CONFIG, payload: await BlueElectrum.getConfig() });
      dispatch({ type: ActionType.SET_INTERVAL, payload: interval });

      if (server) {
        triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
        Alert.alert(
          loc.formatString(loc.settings.set_electrum_server_as_default, { server }),
          '',
          [
            {
              text: loc._.ok,
              onPress: () => onBarScanned(server),
              style: 'default',
            },
            { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
          ],
          { cancelable: false },
        );
      }
    })();

    return () => {
      if (state.interval) clearInterval(state.interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkServer = async () => {
    dispatch({ type: ActionType.SET_LOADING, payload: true });
    const features = await BlueElectrum.serverFeatures();
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    presentAlert({ message: JSON.stringify(features, null, 2) });
    dispatch({ type: ActionType.SET_LOADING, payload: false });
  };

  const selectServer = (value: Server) => {
    dispatch({ type: ActionType.SET_HOST, payload: value.host });
    dispatch({ type: ActionType.SET_PORT, payload: value.port?.toString() || '' });
    dispatch({ type: ActionType.SET_SSL_PORT, payload: value.sslPort?.toString() || '' });
    save();
  };

  const clearHistoryAlert = () => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
    Alert.alert(loc.settings.electrum_clear_alert_title, loc.settings.electrum_clear_alert_message, [
      { text: loc.settings.electrum_clear_alert_cancel, onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
      { text: loc.settings.electrum_clear_alert_ok, onPress: () => clearHistory() },
    ]);
  };

  const clearHistory = async () => {
    dispatch({ type: ActionType.SET_LOADING, payload: true });
    await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify([]));
    dispatch({ type: ActionType.SET_SERVER_HISTORY, payload: [] });
    dispatch({ type: ActionType.SET_LOADING, payload: false });
  };

  const resetToDefault = () => {
    dispatch({ type: ActionType.SET_PORT, payload: '' });
    dispatch({ type: ActionType.SET_HOST, payload: '' });
    dispatch({ type: ActionType.SET_SSL_PORT, payload: '' });
    save();
  };

  const serverExists = (value: Server) => {
    return state.serverHistory.some(s => `${s.host}${s.port}${s.sslPort}` === `${value.host}${value.port}${value.sslPort}`);
  };

  const save = async () => {
    const host = state.host || '';
    const port = Number(state.port);
    const sslPort = Number(state.sslPort);
    const serverHistory = state.serverHistory || [];

    dispatch({ type: ActionType.SET_LOADING, payload: true });

    try {
      if (!host && !port && !sslPort) {
        await AsyncStorage.setItem(BlueElectrum.ELECTRUM_HOST, '');
        await AsyncStorage.setItem(BlueElectrum.ELECTRUM_TCP_PORT, '');
        await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SSL_PORT, '');
        try {
          await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
          await DefaultPreference.clear(BlueElectrum.ELECTRUM_HOST);
          await DefaultPreference.clear(BlueElectrum.ELECTRUM_SSL_PORT);
          await DefaultPreference.clear(BlueElectrum.ELECTRUM_TCP_PORT);
        } catch (e) {
          // Must be running on Android
          console.log(e);
        }
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ message: loc.settings.electrum_saved });
      } else if (!(await BlueElectrum.testConnection(host, port, sslPort))) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.settings.electrum_error_connect });
      } else {
        await AsyncStorage.setItem(BlueElectrum.ELECTRUM_HOST, host);
        await AsyncStorage.setItem(BlueElectrum.ELECTRUM_TCP_PORT, port.toString());
        await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SSL_PORT, sslPort.toString());

        if (!serverExists({ host, port, sslPort })) {
          serverHistory.push({ host, port, sslPort });
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(serverHistory));
        }

        try {
          await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
          await DefaultPreference.set(BlueElectrum.ELECTRUM_HOST, host);
          await DefaultPreference.set(BlueElectrum.ELECTRUM_TCP_PORT, port.toString());
          await DefaultPreference.set(BlueElectrum.ELECTRUM_SSL_PORT, sslPort.toString());
        } catch (e) {
          // Must be running on Android
          console.log(e);
        }
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ message: loc.settings.electrum_saved });
      }
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (error as Error).message });
    }
    dispatch({ type: ActionType.SET_LOADING, payload: false });
  };

  const onBarScanned = (value: string) => {
    if (DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(value)) {
      value = DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(value) as string;
    }
    const [host, port, type] = value.split(':');
    dispatch({ type: ActionType.SET_HOST, payload: host });
    dispatch({ type: ActionType.SET_SSL_PORT, payload: type === 's' ? port : '' });
    dispatch({ type: ActionType.SET_PORT, payload: type !== 's' ? port : '' });
  };

  const importScan = async () => {
    const scanned = await scanQrHelper('ElectrumSettings', true);
    if (!scanned) return;
    onBarScanned(scanned);
  };

  const sslPortToggled = (value: boolean) => {
    if (value) {
      dispatch({ type: ActionType.SET_PORT, payload: '' });
      dispatch({ type: ActionType.SET_SSL_PORT, payload: state.port });
    } else {
      dispatch({ type: ActionType.SET_PORT, payload: state.sslPort });
      dispatch({ type: ActionType.SET_SSL_PORT, payload: '' });
    }
  };

  const onElectrumConnectionEnabledSwitchValueChanged = async (value: boolean) => {
    if (value) {
      await BlueElectrum.setDisabled(true);
      setIsElectrumDisabled(true);
      BlueElectrum.forceDisconnect();
    } else {
      await BlueElectrum.setDisabled(false);
      setIsElectrumDisabled(false);
      BlueElectrum.connectMain();
    }
    dispatch({ type: ActionType.SET_OFFLINE_MODE, payload: value });
  };

  const renderElectrumSettings = () => {
    const serverHistoryItems = state.serverHistory.map((value, i) => (
      <View key={i} style={stylesHook.serverHistoryItem}>
        <Text
          style={[styles.serverRow, stylesHook.serverRow]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >{`${value.host}:${value.port ?? value.sslPort}`}</Text>

        <TouchableOpacity accessibilityRole="button" style={styles.selectButton} onPress={() => selectServer(value)}>
          <BlueText>{loc.settings.electrum_select}</BlueText>
        </TouchableOpacity>
      </View>
    ));

    return (
      <>
        <BlueCard>
          <BlueText style={[styles.status, stylesHook.status]}>{loc.settings.electrum_status}</BlueText>
          <View style={styles.connectWrap}>
            <View
              style={[
                styles.container,
                state.config.connected === 1 ? [stylesHook.containerConnected] : [stylesHook.containerDisconnected],
              ]}
            >
              <BlueText
                style={
                  state.config.connected === 1
                    ? [styles.textConnected, stylesHook.textConnected]
                    : [styles.textDisconnected, stylesHook.textDisconnected]
                }
              >
                {state.config.connected === 1 ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
              </BlueText>
            </View>
          </View>
          <BlueSpacing20 />
          <BlueText style={[styles.hostname, stylesHook.hostname]} onPress={checkServer}>
            {state.config.host}:{state.config.port}
          </BlueText>
        </BlueCard>
        <KeyboardAvoidingView>
          <BlueCard>
            <View style={[styles.inputWrap, stylesHook.inputWrap]}>
              <TextInput
                placeholder={loc.formatString(loc.settings.electrum_host, { example: '10.20.30.40' })}
                value={state.host}
                onChangeText={text => {
                  const host = text.trim();
                  dispatch({ type: ActionType.SET_HOST, payload: host });
                  if (host.endsWith('.onion')) {
                    sslPortToggled(false);
                  }
                }}
                numberOfLines={1}
                style={styles.inputText}
                editable={!state.isLoading}
                placeholderTextColor="#81868e"
                autoCorrect={false}
                autoCapitalize="none"
                underlineColorAndroid="transparent"
                // @ts-ignore: fix later
                inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
                testID="HostInput"
                onFocus={() => dispatch({ type: ActionType.SET_INTERVAL, payload: undefined })}
                onBlur={() => dispatch({ type: ActionType.SET_INTERVAL, payload: undefined })}
              />
            </View>
            <BlueSpacing20 />
            <View style={styles.portWrap}>
              <View style={[styles.inputWrap, stylesHook.inputWrap]}>
                <TextInput
                  placeholder={loc.formatString(loc.settings.electrum_port, { example: '50001' })}
                  value={state.sslPort.trim() === '' ? state.port : state.sslPort}
                  onChangeText={text => {
                    if (state.sslPort.trim() === '') {
                      dispatch({ type: ActionType.SET_PORT, payload: text.trim() });
                      dispatch({ type: ActionType.SET_SSL_PORT, payload: '' });
                    } else {
                      dispatch({ type: ActionType.SET_PORT, payload: '' });
                      dispatch({ type: ActionType.SET_SSL_PORT, payload: text.trim() });
                    }
                  }}
                  numberOfLines={1}
                  style={styles.inputText}
                  editable={!state.isLoading}
                  placeholderTextColor="#81868e"
                  underlineColorAndroid="transparent"
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  // @ts-ignore: fix later
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                  testID="PortInput"
                  onFocus={() => dispatch({ type: ActionType.SET_INTERVAL, payload: undefined })}
                  onBlur={() => dispatch({ type: ActionType.SET_INTERVAL, payload: undefined })}
                />
              </View>
              <BlueText style={[styles.usePort, stylesHook.usePort]}>{loc.settings.use_ssl}</BlueText>
              <Switch
                testID="SSLPortInput"
                value={state.sslPort.trim().length > 0}
                onValueChange={sslPortToggled}
                disabled={state.host.endsWith('.onion')}
              />
            </View>
            <BlueSpacing20 />
            <View style={styles.serverAddTitle}>
              <BlueText style={[styles.explain, stylesHook.explain]}>{loc.settings.electrum_settings_explain}</BlueText>
              <TouchableOpacity accessibilityRole="button" testID="ResetToDefault" onPress={resetToDefault}>
                <BlueText>{loc.settings.electrum_reset}</BlueText>
              </TouchableOpacity>
            </View>
            <BlueSpacing20 />
            {state.isLoading ? <BlueLoading /> : <Button testID="Save" onPress={save} title={loc.settings.save} />}
            <BlueSpacing20 />
            <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
            <BlueSpacing20 />
          </BlueCard>
          {Platform.select({
            ios: <BlueDismissKeyboardInputAccessory />,
            android: state.isAndroidNumericKeyboardFocused && <BlueDismissKeyboardInputAccessory />,
          })}
          {Platform.select({
            ios: (
              <BlueDoneAndDismissKeyboardInputAccessory
                onClearTapped={() => dispatch({ type: ActionType.SET_HOST, payload: '' })}
                onPasteTapped={(text: any) => {
                  dispatch({ type: ActionType.SET_HOST, payload: text });
                  Keyboard.dismiss();
                }}
              />
            ),
            android: state.isAndroidAddressKeyboardVisible && (
              <BlueDoneAndDismissKeyboardInputAccessory
                onClearTapped={() => {
                  dispatch({ type: ActionType.SET_HOST, payload: '' });
                  Keyboard.dismiss();
                }}
                onPasteTapped={(text: any) => {
                  dispatch({ type: ActionType.SET_HOST, payload: text });
                  Keyboard.dismiss();
                }}
              />
            ),
          })}
        </KeyboardAvoidingView>
        {serverHistoryItems.length > 0 && !state.isLoading && (
          <BlueCard>
            <View style={styles.serverHistoryTitle}>
              <BlueText style={[styles.explain, stylesHook.explain]}>{loc.settings.electrum_history}</BlueText>
              <TouchableOpacity accessibilityRole="button" onPress={clearHistoryAlert}>
                <BlueText>{loc.settings.electrum_clear}</BlueText>
              </TouchableOpacity>
            </View>
            {serverHistoryItems}
          </BlueCard>
        )}
      </>
    );
  };

  return (
    <ScrollView keyboardShouldPersistTaps="always" automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.electrum_offline_mode}
        switch={{
          onValueChange: onElectrumConnectionEnabledSwitchValueChanged,
          value: state.isOfflineMode,
          testID: 'ElectrumConnectionEnabledSwitch',
        }}
      />
      <BlueCard>
        <BlueText>{loc.settings.electrum_offline_description}</BlueText>
      </BlueCard>
      {!state.isOfflineMode && renderElectrumSettings()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  status: {
    textAlign: 'center',
    marginBottom: 4,
  },
  connectWrap: {
    width: 'auto',
    height: 34,
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  container: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 20,
  },
  textConnected: {
    fontWeight: 'bold',
  },
  textDisconnected: {
    fontWeight: 'bold',
  },
  hostname: {
    textAlign: 'center',
  },
  usePort: {
    textAlign: 'center',
    marginHorizontal: 8,
  },
  explain: {
    marginBottom: -24,
    flexShrink: 1,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  portWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 36,
    color: '#81868e',
    height: 36,
  },
  serverAddTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  serverHistoryTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  serverRow: {
    flexGrow: 2,
    maxWidth: '80%',
  },
  selectButton: {
    flexGrow: 1,
    marginLeft: 16,
    alignItems: 'flex-end',
  },
});

export default ElectrumSettings;
