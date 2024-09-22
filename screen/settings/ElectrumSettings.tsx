import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  Alert,
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert, { AlertType } from '../../components/Alert';
import Button from '../../components/Button';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { scanQrHelper } from '../../helpers/scan-qr';
import loc from '../../loc';
import { StorageContext } from '../../components/Context/StorageProvider';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import { getUserPreference, setUserPreference, clearUserPreference } from '../../helpers/userPreference';
import { useTheme } from '../../components/themes';
import { RouteProp, useRoute } from '@react-navigation/native';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import ToolTipMenu from '../../components/TooltipMenu';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { Icon } from '@rneui/themed';
import { Header } from '../../components/Header';

type RouteProps = RouteProp<DetailViewStackParamList, 'ElectrumSettings'>;

export interface ElectrumServerItem {
  host: string;
  port?: number;
  sslPort?: number;
}

const ElectrumSettings: React.FC = () => {
  const { colors } = useTheme();
  const { server } = useRoute<RouteProps>().params;
  const { setOptions } = useExtendedNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(true);
  const [serverHistory, setServerHistory] = useState<ElectrumServerItem[]>([]);
  const [config, setConfig] = useState<{ connected?: number; host?: string; port?: string }>({});
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<number | undefined>();
  const [sslPort, setSslPort] = useState<number | undefined>(undefined);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isAndroidNumericKeyboardFocused, setIsAndroidNumericKeyboardFocused] = useState(false);
  const [isAndroidAddressKeyboardVisible, setIsAndroidAddressKeyboardVisible] = useState(false);
  const { setIsElectrumDisabled } = useContext(StorageContext);

  const stylesHook = StyleSheet.create({
    inputWrap: {
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
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
    inputText: {
      color: colors.foregroundColor,
    },
    usePort: {
      color: colors.foregroundColor,
    },
    explain: {
      color: colors.feeText,
    },
    serverRow: {
      color: colors.foregroundColor,
    },
    bottomDivider: {
      backgroundColor: colors.inputBorderColor,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch preferences and electrum server config
      const savedHost = (await getUserPreference({ key: BlueElectrum.ELECTRUM_HOST, useGroupContainer: true })) as string;
      const savedPort = await getUserPreference({ key: BlueElectrum.ELECTRUM_TCP_PORT, useGroupContainer: true });
      const savedSslPort = await getUserPreference({ key: BlueElectrum.ELECTRUM_SSL_PORT, useGroupContainer: true });
      const serverHistoryStr = (await getUserPreference({ key: BlueElectrum.ELECTRUM_SERVER_HISTORY, useGroupContainer: true })) as string;
      const offlineMode = await BlueElectrum.isDisabled();
      const parsedServerHistory: ElectrumServerItem[] = serverHistoryStr ? JSON.parse(serverHistoryStr) : [];

      // Set state from preferences
      setHost(savedHost || '');
      setPort(savedPort ? Number(savedPort) : undefined);
      setSslPort(savedSslPort ? Number(savedSslPort) : undefined);
      setServerHistory(parsedServerHistory);
      setIsOfflineMode(offlineMode);
      setIsLoading(false);

      // Set electrum config periodically
      const configInterval = setInterval(async () => {
        setConfig(await BlueElectrum.getConfig());
      }, 500);

      setIntervalId(configInterval);

      setConfig(await BlueElectrum.getConfig());
    };

    // Initial data fetch
    fetchData();

    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Handle server separately to avoid reset on other state
    if (server) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
      Alert.alert(
        loc.formatString(loc.settings.set_electrum_server_as_default, { server: (server as ElectrumServerItem).host }),
        '',
        [
          {
            text: loc._.ok,
            onPress: () => {
              onBarScanned(JSON.stringify(server));
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    }
  }, [server]); // Only runs when server changes

  const clearHistory = async () => {
    setIsLoading(true);
    await setUserPreference({ key: BlueElectrum.ELECTRUM_SERVER_HISTORY, value: JSON.stringify([]), useGroupContainer: true });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setServerHistory([]);
    setIsLoading(false);
  };

  const serverExists = useCallback(
    (value: ElectrumServerItem) => {
      return serverHistory.some(s => `${s.host}${s.port}${s.sslPort}` === `${value.host}${value.port}${value.sslPort}`);
    },
    [serverHistory],
  );

  const save = useCallback(async () => {
    setIsLoading(true);

    try {
      if (!host && !port && !sslPort) {
        await clearUserPreference({ key: BlueElectrum.ELECTRUM_HOST, useGroupContainer: true });
        await clearUserPreference({ key: BlueElectrum.ELECTRUM_TCP_PORT, useGroupContainer: true });
        await clearUserPreference({ key: BlueElectrum.ELECTRUM_SSL_PORT, useGroupContainer: true });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ message: loc.settings.electrum_saved });
      } else if (!(await BlueElectrum.testConnection(host, port ?? undefined, sslPort ?? undefined))) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.settings.electrum_error_connect });
      } else {
        await setUserPreference({ key: BlueElectrum.ELECTRUM_HOST, value: host, useGroupContainer: true });
        await setUserPreference({ key: BlueElectrum.ELECTRUM_TCP_PORT, value: port?.toString() || '', useGroupContainer: true });
        await setUserPreference({ key: BlueElectrum.ELECTRUM_SSL_PORT, value: sslPort?.toString() || '', useGroupContainer: true });

        if (!serverExists({ host, port, sslPort })) {
          const newServerHistory = [...serverHistory, { host, port, sslPort }];
          setServerHistory(newServerHistory);
          await setUserPreference({
            key: BlueElectrum.ELECTRUM_SERVER_HISTORY,
            value: JSON.stringify(newServerHistory),
            useGroupContainer: true,
          });
        }

        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ message: loc.settings.electrum_saved });
      }
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (error as Error).message, type: AlertType.Toast });
    }
    setIsLoading(false);
  }, [host, port, sslPort, serverExists, serverHistory]);

  const resetToDefault = useCallback(() => {
    setPort(undefined);
    setHost('');
    setSslPort(undefined);
    save();
  }, [save]);

  const onPressMenuItem = useCallback(
    (id: string) => {
      switch (id) {
        case CommonToolTipActions.ResetToDefault.id:
          resetToDefault();
          break;
      }
    },
    [resetToDefault],
  );

  const toolTipActions = useMemo(() => [CommonToolTipActions.ResetToDefault], []);

  const HeaderRight = useMemo(
    () => (
      <ToolTipMenu isButton isMenuPrimaryAction onPressMenuItem={onPressMenuItem} actions={toolTipActions}>
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
      </ToolTipMenu>
    ),
    [colors.foregroundColor, onPressMenuItem, toolTipActions],
  );

  useEffect(() => {
    setOptions({
      headerRight: isOfflineMode ? null : () => HeaderRight,
    });
  }, [HeaderRight, isOfflineMode, setOptions]);

  const checkServer = async () => {
    setIsLoading(true);
    const features = await BlueElectrum.serverFeatures();
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    presentAlert({ message: JSON.stringify(features, null, 2) });
    setIsLoading(false);
  };

  const selectServer = (value: string) => {
    const parsedServer = JSON.parse(value) as ElectrumServerItem;
    setHost(parsedServer.host);
    setPort(parsedServer.port);
    setSslPort(parsedServer.sslPort);
    save();
  };

  const clearHistoryAlert = () => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
    Alert.alert(loc.settings.electrum_clear_alert_title, loc.settings.electrum_clear_alert_message, [
      { text: loc.settings.electrum_clear_alert_cancel, onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
      { text: loc.settings.electrum_clear_alert_ok, onPress: () => clearHistory() },
    ]);
  };

  const onBarScanned = (value: string) => {
    let v = value;
    if (value && DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(value)) {
      v = DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(value) as string;
    }
    const [scannedHost, scannedPort, type] = v?.split(':') ?? [];
    setHost(scannedHost);
    if (type === 's') {
      setSslPort(Number(scannedPort));
      setPort(undefined);
    } else {
      setPort(Number(scannedPort));
      setSslPort(undefined);
    }
  };

  const importScan = async () => {
    const scanned = await scanQrHelper('ElectrumSettings', true);
    if (scanned) {
      onBarScanned(scanned);
    }
  };

  const onSSLPortChange = (value: boolean) => {
    if (value) {
      setPort(undefined);
      setSslPort(port);
    } else {
      setPort(sslPort);
      setSslPort(undefined);
    }
  };

  const onElectrumConnectionEnabledSwitchChange = async (value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (value) {
      await BlueElectrum.setDisabled(true);
      setIsElectrumDisabled(true);
      BlueElectrum.forceDisconnect();
    } else {
      await BlueElectrum.setDisabled(false);
      setIsElectrumDisabled(false);
      BlueElectrum.connectMain();
    }
    setIsOfflineMode(value);
  };

  const renderElectrumSettings = () => {
    const ElectrumServerItems = serverHistory.map((value, i) => (
      <View key={i} style={styles.electrumServerItem}>
        <Text style={[styles.serverRow, stylesHook.serverRow]} numberOfLines={1} ellipsizeMode="middle">
          {`${value.host}:${value.port || value.sslPort}`}
        </Text>

        <TouchableOpacity accessibilityRole="button" style={styles.selectButton} onPress={() => selectServer(JSON.stringify(value))}>
          <BlueText>{loc.settings.electrum_select}</BlueText>
        </TouchableOpacity>
      </View>
    ));

    return (
      <>
        <View style={[styles.bottomDivider, stylesHook.bottomDivider]} />
        <Header leftText={loc.settings.electrum_status} />
        <BlueCard>
          <View style={styles.connectWrap}>
            <View style={[styles.container, config.connected === 1 ? stylesHook.containerConnected : stylesHook.containerDisconnected]}>
              <BlueText
                style={[styles.textConnectionStatus, config.connected === 1 ? stylesHook.textConnected : stylesHook.textDisconnected]}
              >
                {config.connected === 1 ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
              </BlueText>
            </View>
          </View>
          <BlueSpacing20 />
          <BlueText style={[styles.hostname, stylesHook.hostname]} onPress={checkServer}>
            {config.host}:{config.port}
          </BlueText>
        </BlueCard>
        <View style={[styles.bottomDivider, stylesHook.bottomDivider]} />

        <View style={styles.headerContainer}>
          <Header leftText={loc.settings.electrum_preferred_server} />
        </View>
        <BlueCard>
          <View style={[styles.inputWrap, stylesHook.inputWrap]}>
            <TextInput
              placeholder={loc.formatString(loc.settings.electrum_host, { example: '10.20.30.40' })}
              value={host}
              onChangeText={text => setHost(text.trim())}
              numberOfLines={1}
              style={[styles.inputText, stylesHook.inputText]}
              editable={!isLoading}
              placeholderTextColor="#81868e"
              autoCorrect={false}
              autoCapitalize="none"
              underlineColorAndroid="transparent"
              inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
              testID="HostInput"
              onFocus={() => setIsAndroidAddressKeyboardVisible(true)}
              onBlur={() => setIsAndroidAddressKeyboardVisible(false)}
            />
          </View>
          <BlueSpacing20 />
          <View style={styles.portWrap}>
            <View style={[styles.inputWrap, stylesHook.inputWrap]}>
              <TextInput
                placeholder={loc.formatString(loc.settings.electrum_port, { example: '50001' })}
                value={sslPort?.toString() === '' || sslPort === undefined ? port?.toString() || '' : sslPort?.toString() || ''}
                onChangeText={text => {
                  const parsed = Number(text.trim());
                  if (sslPort === undefined) {
                    setPort(parsed);
                    setSslPort(undefined);
                  } else {
                    setPort(undefined);
                    setSslPort(parsed);
                  }
                }}
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
                onFocus={() => setIsAndroidNumericKeyboardFocused(true)}
                onBlur={() => setIsAndroidNumericKeyboardFocused(false)}
              />
            </View>
            <BlueText style={[styles.usePort, stylesHook.usePort]}>{loc.settings.use_ssl}</BlueText>
            <Switch
              testID="SSLPortInput"
              value={sslPort !== undefined}
              onValueChange={onSSLPortChange}
              disabled={host?.endsWith('.onion') ?? false}
            />
          </View>
        </BlueCard>
        <BlueCard>
          <BlueText>{loc.settings.electrum_preferred_server_description}</BlueText>
          <BlueSpacing20 />
          {isLoading ? <BlueLoading /> : <Button testID="Save" onPress={save} title={loc.settings.save} />}
          <BlueSpacing40 />
          <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
        </BlueCard>

        {Platform.select({
          ios: <DismissKeyboardInputAccessory />,
          android: isAndroidNumericKeyboardFocused && <DismissKeyboardInputAccessory />,
        })}

        {Platform.select({
          ios: (
            <DoneAndDismissKeyboardInputAccessory
              onClearTapped={() => setHost('')}
              onPasteTapped={text => {
                setHost(text);
                Keyboard.dismiss();
              }}
            />
          ),
          android: isAndroidAddressKeyboardVisible && (
            <DoneAndDismissKeyboardInputAccessory
              onClearTapped={() => {
                setHost('');
                Keyboard.dismiss();
              }}
              onPasteTapped={text => {
                setHost(text);
                Keyboard.dismiss();
              }}
            />
          ),
        })}
        {ElectrumServerItems.length > 0 && !isLoading && (
          <BlueCard>
            <View style={styles.serverHistoryTitle}>
              <BlueText style={stylesHook.explain}>{loc.settings.electrum_history}</BlueText>
              <TouchableOpacity accessibilityRole="button" onPress={clearHistoryAlert}>
                <BlueText>{loc.settings.electrum_clear}</BlueText>
              </TouchableOpacity>
            </View>
            {ElectrumServerItems}
          </BlueCard>
        )}
      </>
    );
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
    >
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.electrum_offline_mode}
        switch={{
          onValueChange: onElectrumConnectionEnabledSwitchChange,
          value: isOfflineMode,
          testID: 'ElectrumConnectionEnabledSwitch',
        }}
        disabled={isLoading}
      />
      <BlueCard>
        <BlueText>{loc.settings.electrum_offline_description}</BlueText>
      </BlueCard>
      {!isOfflineMode && renderElectrumSettings()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  connectWrap: {
    width: 'auto',
    height: 34,
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  hostname: {
    textAlign: 'center',
  },
  bottomDivider: {
    borderBottomWidth: 0.5,
    marginVertical: 20,
    height: 1,
  },
  container: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 20,
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
    height: 36,
  },
  serverRow: {
    flexGrow: 2,
    maxWidth: '80%',
  },
  serverHistoryTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  electrumServerItem: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    flexWrap: 'nowrap',
  },
  textConnectionStatus: {
    fontWeight: 'bold',
  },
  usePort: {
    marginHorizontal: 16,
  },
  selectButton: {
    flexGrow: 1,
    marginLeft: 16,
    alignItems: 'flex-end',
  },
  headerContainer: {
    paddingVertical: 16,
  },
});

export default ElectrumSettings;
