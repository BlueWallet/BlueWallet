import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes, triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { scanQrHelper } from '../../helpers/scan-qr';
import loc from '../../loc';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import DefaultPreference from 'react-native-default-preference';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import { useTheme } from '../../components/themes';
import { RouteProp, useRoute } from '@react-navigation/native';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { Divider } from '@rneui/themed';
import { Header } from '../../components/Header';
import AddressInput from '../../components/AddressInput';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import { Action } from '../../components/types';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import { useSettings } from '../../hooks/context/useSettings';
import { suggestedServers, hardcodedPeers, presentResetToDefaultsAlert } from '../../blue_modules/BlueElectrum';

type RouteProps = RouteProp<DetailViewStackParamList, 'ElectrumSettings'>;

export interface ElectrumServerItem {
  host: string;
  tcp?: number;
  ssl?: number;
}

const SET_PREFERRED_PREFIX = 'set_preferred_';
const DELETE_PREFIX = 'delete_';
const PREFERRED_SERVER_ROW = 'preferredserverrow';

const ElectrumSettings: React.FC = () => {
  const { colors } = useTheme();
  const { server } = useRoute<RouteProps>().params;
  const { setOptions } = useExtendedNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [serverHistory, setServerHistory] = useState<ElectrumServerItem[]>([]);
  const [config, setConfig] = useState<{ connected?: number; host?: string; port?: string }>({});
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<number | undefined>();
  const [sslPort, setSslPort] = useState<number | undefined>(undefined);
  const [isAndroidNumericKeyboardFocused, setIsAndroidNumericKeyboardFocused] = useState(false);
  const [isAndroidAddressKeyboardVisible, setIsAndroidAddressKeyboardVisible] = useState(false);
  const { setIsElectrumDisabled, isElectrumDisabled } = useSettings();

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
  });

  const configIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchData = React.useCallback(async () => {
    console.log('Fetching data...');
    const preferredServer = await BlueElectrum.getPreferredServer();
    const savedHost = preferredServer?.host;
    const savedPort = preferredServer?.tcp;
    const savedSslPort = preferredServer?.ssl;
    const serverHistoryStr = (await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY)) as string;

    console.log('Preferred server:', preferredServer);
    console.log('Server history string:', serverHistoryStr);

    const parsedServerHistory: ElectrumServerItem[] = serverHistoryStr ? JSON.parse(serverHistoryStr) : [];
    const filteredServerHistory = parsedServerHistory.filter(
      v =>
        v.host &&
        (v.tcp || v.ssl) &&
        !suggestedServers.some(suggested => suggested.host === v.host && suggested.tcp === v.tcp && suggested.ssl === v.ssl) &&
        !hardcodedPeers.some(peer => peer.host === v.host),
    );

    console.log('Filtered server history:', filteredServerHistory);

    setHost(savedHost || '');
    setPort(savedPort ? Number(savedPort) : undefined);
    setSslPort(savedSslPort ? Number(savedSslPort) : undefined);
    setServerHistory(filteredServerHistory);

    setConfig(await BlueElectrum.getConfig());
    configIntervalRef.current = setInterval(async () => {
      setConfig(await BlueElectrum.getConfig());
    }, 500);

    setIsLoading(false);

    return () => {
      if (configIntervalRef.current) clearInterval(configIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (configIntervalRef.current) clearInterval(configIntervalRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
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
  }, [server]);

  const clearHistory = useCallback(async () => {
    setIsLoading(true);
    await DefaultPreference.clear(BlueElectrum.ELECTRUM_SERVER_HISTORY);
    setServerHistory([]);
    setIsLoading(false);
  }, []);

  const serverExists = useCallback(
    (value: ElectrumServerItem) => {
      return serverHistory.some(s => `${s.host}:${s.tcp}:${s.ssl}` === `${value.host}:${value.tcp}:${value.ssl}`);
    },
    [serverHistory],
  );

  const save = useCallback(
    async (v?: ElectrumServerItem) => {
      Keyboard.dismiss();
      setIsLoading(true);

      try {
        const serverHost = v?.host || host;
        const serverPort = v?.tcp || port?.toString() || '';
        const serverSslPort = v?.ssl || sslPort?.toString() || '';

        if (serverHost && (serverPort || serverSslPort)) {
          await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
          await DefaultPreference.set(BlueElectrum.ELECTRUM_HOST, serverHost);
          await DefaultPreference.set(BlueElectrum.ELECTRUM_TCP_PORT, serverPort);
          await DefaultPreference.set(BlueElectrum.ELECTRUM_SSL_PORT, serverSslPort);

          if (
            !serverExists({ host: serverHost, tcp: Number(serverPort), ssl: Number(serverSslPort) }) &&
            serverHost &&
            (serverPort || serverSslPort) &&
            !hardcodedPeers.some(peer => peer.host === serverHost)
          ) {
            const newServerHistory = [...serverHistory, { host: serverHost, tcp: Number(serverPort), ssl: Number(serverSslPort) }];
            await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(newServerHistory));
            setServerHistory(newServerHistory);
          }
        }

        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ message: loc.settings.electrum_saved });
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    },
    [host, port, sslPort, serverExists, serverHistory],
  );

  const resetToDefault = useCallback(() => {
    Alert.alert(loc.settings.electrum_preferred_server, loc.settings.electrum_preferred_server_description, [
      {
        text: loc._.cancel,
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: loc._.ok,
        style: 'destructive',
        onPress: async () => {
          await BlueElectrum.removePreferredServer();
          setHost('');
          setPort(undefined);
          setSslPort(undefined);
        },
      },
    ]);
  }, []);

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

  const clearHistoryAlert = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
    Alert.alert(loc.settings.electrum_clear_alert_title, loc.settings.electrum_clear_alert_message, [
      { text: loc.settings.electrum_clear_alert_cancel, onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
      { text: loc._.ok, onPress: () => clearHistory() },
    ]);
  }, [clearHistory]);

  const onPressMenuItem = useCallback(
    (id: string) => {
      if (id.startsWith(SET_PREFERRED_PREFIX)) {
        const rawServer = JSON.parse(id.replace(SET_PREFERRED_PREFIX, ''));
        selectServer(JSON.stringify(rawServer));
      } else if (id.startsWith(DELETE_PREFIX)) {
        const rawServer = JSON.parse(id.replace(DELETE_PREFIX, ''));
        const newServerHistory = serverHistory
          .filter(s => !(s.host === rawServer.host && s.tcp === rawServer.tcp && s.ssl === rawServer.ssl))
          .filter(
            v => !suggestedServers.some(suggested => suggested.host === v.host && suggested.tcp === v.tcp && suggested.ssl === v.ssl),
          );
        setServerHistory(newServerHistory);
        DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(newServerHistory));
      } else if (id === PREFERRED_SERVER_ROW) {
        presentResetToDefaultsAlert().then(async result => {
          if (result) {
            await BlueElectrum.removePreferredServer();
            fetchData();
          }
        });
      } else {
        switch (id) {
          case CommonToolTipActions.ResetToDefault.id:
            resetToDefault();
            break;
          case CommonToolTipActions.ClearHistory.id:
            clearHistoryAlert();
            break;
          default:
            try {
              selectServer(id);
            } catch (error) {
              console.warn('Unknown menu item selected:', id);
            }
            break;
        }
      }
    },
    [selectServer, serverHistory, fetchData, resetToDefault, clearHistoryAlert],
  );

  const createServerAction = useCallback(
    (value: ElectrumServerItem, seenHosts: Set<string>) => {
      const hostKey = `${value.host}:${value.ssl ?? value.tcp}`;
      if (seenHosts.has(hostKey)) return null;

      seenHosts.add(hostKey);
      return {
        id: JSON.stringify(value),
        text: Platform.OS === 'android' ? `${value.host}:${value.ssl ?? value.tcp}` : value.host,
        subactions: [
          ...(host === value.host && (port === value.tcp || sslPort === value.ssl)
            ? []
            : [
                {
                  id: `${SET_PREFERRED_PREFIX}${JSON.stringify(value)}`,
                  text: loc.settings.set_as_preferred,
                  subtitle: `${loc._.port}: ${value.ssl ?? value.tcp}`,
                },
              ]),
          ...(hardcodedPeers.some(peer => peer.host === value.host)
            ? []
            : [
                {
                  id: `${DELETE_PREFIX}${JSON.stringify(value)}`,
                  text: loc.wallets.details_delete,
                },
              ]),
        ],
      } as Action;
    },
    [host, port, sslPort],
  );

  const generateToolTipActions = useCallback(() => {
    const actions: Action[] = [];
    const seenHosts = new Set<string>();

    if (host) {
      const preferred = {
        id: 'preferred',
        hidden: false,
        displayInline: true,
        text: loc.settings.electrum_preferred_server,
        subactions: [
          {
            id: PREFERRED_SERVER_ROW,
            text: Platform.OS === 'android' ? `${host} (${sslPort ?? port})` : host,
            subtitle: `${loc._.port}: ${sslPort ?? port}`,
            menuState: true,
          },
        ],
      };
      actions.push(preferred);
      seenHosts.add(`${host}:${sslPort ?? port}`);
    }

    const suggestedServersAction: Action = {
      id: 'suggested_servers',
      text: loc._.suggested,
      displayInline: true,
      subtitle: loc.settings.electrum_suggested_description,
      subactions: suggestedServers.map(value => createServerAction(value, seenHosts)).filter((action): action is Action => action !== null),
    };

    actions.push(suggestedServersAction);

    console.warn('serverHistory', serverHistory);
    if (serverHistory.length > 0) {
      const serverSubactions: Action[] = serverHistory
        .map(value => createServerAction(value, seenHosts))
        .filter((action): action is Action => action !== null);

      actions.push({
        id: 'server_history',
        text: loc.settings.electrum_history,
        displayInline: serverHistory.length <= 5 && serverHistory.length > 0,
        subactions: [CommonToolTipActions.ClearHistory, ...serverSubactions],
        hidden: serverHistory.length === 0,
      });
    }

    return actions;
  }, [createServerAction, host, port, serverHistory, sslPort]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton actions={generateToolTipActions()} onPressMenuItem={onPressMenuItem} />,
    [onPressMenuItem, generateToolTipActions],
  );

  useEffect(() => {
    setOptions({
      headerRight: isElectrumDisabled ? null : () => HeaderRight,
    });
  }, [HeaderRight, isElectrumDisabled, setOptions]);

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
    Keyboard.dismiss();
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

  const renderElectrumSettings = () => {
    return (
      <>
        <Divider />
        <BlueSpacing20 />
        <Header leftText={loc.settings.electrum_status} />
        <BlueSpacing20 />

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
          <BlueSpacing10 />
          <BlueText style={[styles.hostname, stylesHook.hostname]} onPress={checkServer} selectable>
            {config.host}:{config.port}
          </BlueText>
        </BlueCard>
        <BlueSpacing20 />

        <Divider />
        <BlueSpacing10 />
        <BlueSpacing20 />

        <Header leftText={loc.settings.electrum_preferred_server} />
        <BlueCard>
          <BlueText>{loc.settings.electrum_preferred_server_description}</BlueText>
          <BlueSpacing20 />
          <AddressInput
            testID="HostInput"
            placeholder={loc.formatString(loc.settings.electrum_host, { example: '10.20.30.40' })}
            address={host}
            onChangeText={text => setHost(text.trim())}
            editable={!isLoading}
            onBarScanned={importScan}
            keyboardType="default"
            onBlur={() => setIsAndroidAddressKeyboardVisible(false)}
            onFocus={() => setIsAndroidAddressKeyboardVisible(true)}
            inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
            isLoading={isLoading}
          />
          <BlueSpacing20 />
          <View style={styles.portWrap}>
            <View style={[styles.inputWrap, stylesHook.inputWrap]}>
              <TextInput
                placeholder={loc.formatString(loc.settings.electrum_port, { example: '50001' })}
                value={sslPort?.toString() === '' || sslPort === undefined ? port?.toString() || '' : sslPort?.toString() || ''}
                onChangeText={text => {
                  const parsed = Number(text.trim());
                  if (Number.isNaN(parsed)) {
                    // Handle invalid input
                    sslPort === undefined ? setPort(undefined) : setSslPort(undefined);
                    return;
                  }
                  sslPort === undefined ? setPort(parsed) : setSslPort(parsed);
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
              disabled={host?.endsWith('.onion') || isLoading || host === '' || (port === undefined && sslPort === undefined)}
            />
          </View>
        </BlueCard>
        <BlueCard>
          <BlueSpacing20 />
          <Button
            showActivityIndicator={isLoading}
            disabled={isLoading || preferredServerIsEmpty}
            testID="Save"
            onPress={save}
            title={loc.settings.save}
          />
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
      </>
    );
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      testID="ElectrumSettingsScrollView"
    >
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.electrum_offline_mode}
        switch={{
          onValueChange: onElectrumConnectionEnabledSwitchChange,
          value: isElectrumDisabled,
          testID: 'ElectrumConnectionEnabledSwitch',
        }}
        disabled={isLoading}
        bottomDivider={false}
        subtitle={loc.settings.electrum_offline_description}
      />

      {!isElectrumDisabled && renderElectrumSettings()}
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
  textConnectionStatus: {
    fontWeight: 'bold',
  },
  usePort: {
    marginHorizontal: 16,
  },
});

export default ElectrumSettings;
