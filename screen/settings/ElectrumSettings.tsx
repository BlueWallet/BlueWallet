import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes, triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
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

const ElectrumSettings: React.FC = () => {
  const { colors } = useTheme();
  const params = useRoute<RouteProps>().params;
  const { server } = params;
  const navigation = useExtendedNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [serverHistory, setServerHistory] = useState<Set<ElectrumServerItem>>(new Set());
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

  const fetchData = useCallback(async () => {
    console.log('Fetching data...');
    const preferredServer = await BlueElectrum.getPreferredServer();
    const savedHost = preferredServer?.host;
    const savedPort = preferredServer?.tcp;
    const savedSslPort = preferredServer?.ssl;
    const serverHistoryStr = (await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY)) as string;

    console.log('Preferred server:', preferredServer);
    console.log('Server history string:', serverHistoryStr);

    const parsedServerHistory: ElectrumServerItem[] = serverHistoryStr ? JSON.parse(serverHistoryStr) : [];

    // Allow duplicates for same host if ssl/tcp differs. Only skip if host, ssl, and tcp are all the same:
    const newServerHistoryArray: ElectrumServerItem[] = [];
    for (const item of parsedServerHistory) {
      const existing = newServerHistoryArray.find(s => s.host === item.host && s.tcp === item.tcp && s.ssl === item.ssl);
      if (!existing) {
        newServerHistoryArray.push(item);
      }
    }

    const filteredServerHistory = new Set(
      newServerHistoryArray.filter(
        v =>
          v.host &&
          (v.tcp || v.ssl) &&
          !suggestedServers.some(s => s.host === v.host && s.tcp === v.tcp && s.ssl === v.ssl) &&
          !hardcodedPeers.some(peer => peer.host === v.host),
      ),
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

          const serverExistsInHistory = Array.from(serverHistory).some(
            s => s.host === serverHost && s.tcp === Number(serverPort) && s.ssl === Number(serverSslPort),
          );

          if (!serverExistsInHistory && (serverPort || serverSslPort) && !hardcodedPeers.some(peer => peer.host === serverHost)) {
            const newServerHistory = new Set(serverHistory);
            newServerHistory.add({ host: serverHost, tcp: Number(serverPort), ssl: Number(serverSslPort) });
            await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(Array.from(newServerHistory)));
            setServerHistory(newServerHistory);
          }
        }

        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ message: loc.settings.electrum_saved });

        await fetchData();
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    },
    [host, port, sslPort, fetchData, serverHistory],
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
        loc.settings.electrum_preferred_server,
        loc.formatString(loc.settings.set_as_preferred_electrum, { host: value.host, port: String(value.ssl ?? value.tcp) }),
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

  const onPressMenuItem = useCallback(
    (id: string) => {
      if (id.startsWith(SET_PREFERRED_PREFIX)) {
        const rawServer = JSON.parse(id.replace(SET_PREFERRED_PREFIX, ''));
        presentSelectServerAlert(rawServer);
      } else {
        switch (id) {
          case CommonToolTipActions.ResetToDefault.id:
            presentResetToDefaultsAlert().then(reset => {
              if (reset) {
                triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
                presentAlert({ message: loc.settings.electrum_saved });
                fetchData();
              }
            });
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
    [presentSelectServerAlert, fetchData, selectServer],
  );

  const isPreferred = useCallback(
    (value: ElectrumServerItem) => {
      return host === value.host && ((sslPort !== undefined && value.ssl === sslPort) || (sslPort === undefined && port === value.tcp));
    },
    [host, port, sslPort],
  );

  type TCreateServerActionParameters = {
    value: ElectrumServerItem;
    seenHosts: Set<string>;
    isPreferred?: boolean;
    isConnectedTo?: boolean;
    isSuggested?: boolean;
  };
  const createServerAction = useCallback(
    ({ value, seenHosts, isPreferred: _unused, isConnectedTo = false, isSuggested = false }: TCreateServerActionParameters) => {
      const hostKey = `${value.host}:${value.ssl ?? value.tcp}`;
      if (seenHosts.has(hostKey)) return null;

      seenHosts.add(hostKey);
      return {
        id: `${SET_PREFERRED_PREFIX}${JSON.stringify(value)}`,
        text: Platform.OS === 'android' ? `${value.host}:${value.ssl ?? value.tcp}` : value.host,
        icon: isPreferred(value) ? { iconValue: Platform.OS === 'ios' ? 'star.fill' : 'star_off' } : undefined,
        menuState: isConnectedTo,
        disabled: isPreferred(value),
        subtitle: value.ssl ? `${loc._.ssl_port}: ${value.ssl}` : `${loc._.port}: ${value.tcp}`,
      } as Action;
    },
    [isPreferred],
  );

  const generateToolTipActions = useCallback(() => {
    const actions: Action[] = [];
    const seenHosts = new Set<string>();

    const suggestedServersAction: Action = {
      id: 'suggested_servers',
      text: loc._.suggested,
      displayInline: true,
      subtitle: loc.settings.electrum_suggested_description,
      subactions: suggestedServers
        .map(value =>
          createServerAction({
            value,
            seenHosts,
            isPreferred: isPreferred(value),
            isConnectedTo: config?.host === value.host && (config.port === value.tcp || config.port === value.ssl),
            isSuggested: true,
          }),
        )
        .filter((action): action is Action => action !== null),
    };

    actions.push(suggestedServersAction);

    if (serverHistory.size > 0) {
      const serverSubactions: Action[] = Array.from(serverHistory)
        .map(value =>
          createServerAction({
            value,
            seenHosts,
            isPreferred: isPreferred(value),
            isConnectedTo: config?.host === value.host && (config.port === value.tcp || config.port === value.ssl),
            isSuggested: false,
          }),
        )
        .filter((action): action is Action => action !== null);

      actions.push({
        id: 'server_history',
        text: loc.settings.electrum_history,
        displayInline: serverHistory.size <= 5 && serverHistory.size > 0,
        subactions: serverSubactions,
        hidden: serverHistory.size === 0,
      });
    }

    const resetToDefaults = { ...CommonToolTipActions.ResetToDefault };
    resetToDefaults.hidden = !host && serverHistory.size === 0;

    actions.push(resetToDefaults);

    return actions;
  }, [config?.host, config.port, createServerAction, host, isPreferred, serverHistory]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton actions={generateToolTipActions()} onPressMenuItem={onPressMenuItem} />,
    [onPressMenuItem, generateToolTipActions],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: isElectrumDisabled ? null : () => HeaderRight,
    });
  }, [HeaderRight, isElectrumDisabled, navigation]);

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
    navigation.navigate('ScanQRCode');
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
      // Move the current port to sslPort
      setSslPort(port);
      setPort(undefined);
    } else {
      // Move the current sslPort to port
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
