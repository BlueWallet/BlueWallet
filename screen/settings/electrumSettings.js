/* global alert */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Text,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import RNWidgetCenter from 'react-native-widget-center';
import AsyncStorage from '@react-native-async-storage/async-storage';

import loc from '../../loc';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import navigationStyle from '../../components/navigationStyle';
import {
  BlueButton,
  BlueButtonLink,
  BlueCard,
  BlueLoading,
  BlueSpacing20,
  BlueText,
  SafeBlueArea,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueDismissKeyboardInputAccessory,
} from '../../BlueComponents';
import { BlueCurrentTheme } from '../../components/themes';
import { isDesktop } from '../../blue_modules/environment';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const BlueElectrum = require('../../blue_modules/BlueElectrum');

export default class ElectrumSettings extends Component {
  constructor(props) {
    super(props);
    const server = props?.route?.params?.server;
    this.state = {
      isLoading: true,
      serverHistory: [],
      config: {},
      server,
    };
  }

  componentWillUnmount() {
    clearInterval(this.state.inverval);
  }

  async componentDidMount() {
    const host = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_HOST);
    const port = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_TCP_PORT);
    const sslPort = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_SSL_PORT);
    const serverHistoryStr = await AsyncStorage.getItem(BlueElectrum.ELECTRUM_SERVER_HISTORY);
    const serverHistory = JSON.parse(serverHistoryStr) || [];

    this.setState({
      isLoading: false,
      host,
      port,
      sslPort,
      serverHistory,
      isAndroidNumericKeyboardFocused: false,
      isAndroidAddressKeyboardVisible: false,
    });

    const inverval = setInterval(async () => {
      this.setState({
        config: await BlueElectrum.getConfig(),
      });
    }, 500);

    this.setState({
      config: await BlueElectrum.getConfig(),
      inverval,
    });

    if (this.state.server) {
      ReactNativeHapticFeedback.trigger('impactHeavy', { ignoreAndroidSystemSettings: false });
      Alert.alert(
        loc.formatString(loc.settings.set_electrum_server_as_default, { server: this.state.server }),
        '',
        [
          {
            text: loc._.ok,
            onPress: () => {
              this.onBarScanned(this.state.server);
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    }
  }

  checkServer = async () => {
    this.setState({ isLoading: true }, async () => {
      const features = await BlueElectrum.serverFeatures();
      ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
      alert(JSON.stringify(features, null, 2));
      this.setState({ isLoading: false });
    });
  };

  selectServer = async server => {
    this.setState({ host: server.host, port: server.port, sslPort: server.sslPort }, () => {
      this.save();
    });
  };

  clearHistoryAlert() {
    ReactNativeHapticFeedback.trigger('impactHeavy', { ignoreAndroidSystemSettings: false });
    Alert.alert(loc.settings.electrum_clear_alert_title, loc.settings.electrum_clear_alert_message, [
      { text: loc.settings.electrum_clear_alert_cancel, onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
      { text: loc.settings.electrum_clear_alert_ok, onPress: () => this.clearHistory() },
    ]);
  }

  clearHistory = async () => {
    this.setState({ isLoading: true }, async () => {
      await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify([]));
      this.setState({
        serverHistory: [],
        isLoading: false,
      });
    });
  };

  resetToDefault = async () => {
    this.setState({ port: '', host: '', sslPort: '' }, () => {
      this.save();
    });
  };

  serverExists = server => {
    const { serverHistory } = this.state;
    return serverHistory.some(s => {
      return `${s.host}${s.port}${s.sslPort}` === `${server.host}${server.port}${server.sslPort}`;
    });
  };

  save = () => {
    const host = this.state.host ? this.state.host : '';
    const port = this.state.port ? this.state.port : '';
    const sslPort = this.state.sslPort ? this.state.sslPort : '';
    const serverHistory = this.state.serverHistory || [];

    this.setState({ isLoading: true }, async () => {
      try {
        if (!host && !port && !sslPort) {
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_HOST, '');
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_TCP_PORT, '');
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SSL_PORT, '');
          try {
            await DefaultPreference.setName('group.io.bluewallet.bluewallet');
            await DefaultPreference.clear(BlueElectrum.ELECTRUM_HOST);
            await DefaultPreference.clear(BlueElectrum.ELECTRUM_SSL_PORT);
            await DefaultPreference.clear(BlueElectrum.ELECTRUM_TCP_PORT);
            RNWidgetCenter.reloadAllTimelines();
          } catch (e) {
            // Must be running on Android
            console.log(e);
          }
          ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
          alert(loc.settings.electrum_saved);
        } else if (!(await BlueElectrum.testConnection(host, port, sslPort))) {
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          alert(loc.settings.electrum_error_connect);
        } else {
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_HOST, host);
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_TCP_PORT, port);
          await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SSL_PORT, sslPort);

          if (!this.serverExists({ host, port, sslPort })) {
            serverHistory.push({
              host,
              port,
              sslPort,
            });
            await AsyncStorage.setItem(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify(serverHistory));
          }

          try {
            await DefaultPreference.setName('group.io.bluewallet.bluewallet');
            await DefaultPreference.set(BlueElectrum.ELECTRUM_HOST, host);
            await DefaultPreference.set(BlueElectrum.ELECTRUM_TCP_PORT, port);
            await DefaultPreference.set(BlueElectrum.ELECTRUM_SSL_PORT, sslPort);
            RNWidgetCenter.reloadAllTimelines();
          } catch (e) {
            // Must be running on Android
            console.log(e);
          }
          ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
          alert(loc.settings.electrum_saved);
        }
      } catch (error) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(error);
      }
      this.setState({ isLoading: false });
    });
  };

  onBarScanned = value => {
    if (DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(value)) {
      // in case user scans a QR with a deeplink like `bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As`
      value = DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(value);
    }
    const [host, port, type] = value.split(':');
    this.setState({ host: host });
    type === 's' ? this.setState({ sslPort: port }) : this.setState({ port: port });
  };

  importScan = () => {
    this.props.navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        launchedBy: this.props.route.name,
        onBarScanned: this.onBarScanned,
        showFileImportButton: true,
      },
    });
  };

  render() {
    const serverHistoryItems = this.state.serverHistory.map((server, i) => {
      return (
        <View key={i} style={styles.serverHistoryItem}>
          <Text style={styles.serverRow} numberOfLines={1} ellipsizeMode="middle">{`${server.host}:${server.port || server.sslPort}`}</Text>

          <TouchableOpacity style={styles.selectButton} onPress={() => this.selectServer(server)}>
            <BlueText>{loc.settings.electrum_select}</BlueText>
          </TouchableOpacity>
        </View>
      );
    });

    return (
      <SafeBlueArea>
        <ScrollView keyboardShouldPersistTaps="always">
          <BlueCard>
            <BlueText style={styles.status}>{loc.settings.electrum_status}</BlueText>
            <View style={styles.connectWrap}>
              <View
                style={[styles.container, this.state.config.connected === 1 ? styles.containerConnected : styles.containerDisconnected]}
              >
                <BlueText style={this.state.config.connected === 1 ? styles.textConnected : styles.textDisconnected}>
                  {this.state.config.connected === 1 ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
                </BlueText>
              </View>
            </View>
            <BlueSpacing20 />
            <BlueText style={styles.hostname} onPress={this.checkServer}>
              {this.state.config.host}:{this.state.config.port}
            </BlueText>
          </BlueCard>
          <KeyboardAvoidingView>
            <BlueCard>
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder={
                    loc.formatString(loc.settings.electrum_host, { example: '111.222.333.111' }) +
                    (!isDesktop ? ' (' + loc.settings.tor_supported + ')' : '')
                  }
                  value={this.state.host}
                  onChangeText={text => this.setState({ host: text.trim() })}
                  numberOfLines={1}
                  style={styles.inputText}
                  editable={!this.state.isLoading}
                  placeholderTextColor="#81868e"
                  autoCorrect={false}
                  autoCapitalize="none"
                  underlineColorAndroid="transparent"
                  inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
                  testID="HostInput"
                  onFocus={() => this.setState({ isAndroidAddressKeyboardVisible: true })}
                  onBlur={() => this.setState({ isAndroidAddressKeyboardVisible: false })}
                />
              </View>
              <BlueSpacing20 />
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder={loc.formatString(loc.settings.electrum_port, { example: '50001' })}
                  value={this.state.port}
                  onChangeText={text => this.setState({ port: text.trim() })}
                  numberOfLines={1}
                  style={styles.inputText}
                  editable={!this.state.isLoading}
                  placeholderTextColor="#81868e"
                  underlineColorAndroid="transparent"
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                  testID="PortInput"
                  onFocus={() => this.setState({ isAndroidNumericKeyboardFocused: true })}
                  onBlur={() => this.setState({ isAndroidNumericKeyboardFocused: false })}
                />
              </View>
              <BlueSpacing20 />
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder={loc.formatString(loc.settings.electrum_port_ssl, { example: '50002' })}
                  value={this.state.sslPort}
                  onChangeText={text => this.setState({ sslPort: text.trim() })}
                  numberOfLines={1}
                  style={styles.inputText}
                  editable={!this.state.isLoading}
                  autoCorrect={false}
                  placeholderTextColor="#81868e"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  underlineColorAndroid="transparent"
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                  testID="SSLPortInput"
                  onFocus={() => this.setState({ isAndroidNumericKeyboardFocused: true })}
                  onBlur={() => this.setState({ isAndroidNumericKeyboardFocused: false })}
                />
              </View>

              <View style={styles.serverAddTitle}>
                <BlueText style={styles.explain}>{loc.settings.electrum_settings_explain}</BlueText>
                <TouchableOpacity testID="ResetToDefault" onPress={() => this.resetToDefault()}>
                  <BlueText>{loc.settings.electrum_reset}</BlueText>
                </TouchableOpacity>
              </View>
              <BlueSpacing20 />
              {this.state.isLoading ? <BlueLoading /> : <BlueButton testID="Save" onPress={this.save} title={loc.settings.save} />}
              <BlueSpacing20 />
              <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={this.importScan} />
              <BlueSpacing20 />
            </BlueCard>
            {Platform.select({
              ios: <BlueDismissKeyboardInputAccessory />,
              android: this.state.isAndroidNumericKeyboardFocused && <BlueDismissKeyboardInputAccessory />,
            })}

            {Platform.select({
              ios: (
                <BlueDoneAndDismissKeyboardInputAccessory
                  onClearTapped={() => this.setState({ host: '' })}
                  onPasteTapped={text => {
                    this.setState({ host: text });
                    Keyboard.dismiss();
                  }}
                />
              ),
              android: this.state.isAndroidAddressKeyboardVisible && (
                <BlueDoneAndDismissKeyboardInputAccessory
                  onClearTapped={() => {
                    this.setState({ host: '' });
                    Keyboard.dismiss();
                  }}
                  onPasteTapped={text => {
                    this.setState({ host: text });
                    Keyboard.dismiss();
                  }}
                />
              ),
            })}
          </KeyboardAvoidingView>
          {serverHistoryItems.length > 0 && !this.state.isLoading && (
            <BlueCard>
              <View style={styles.serverHistoryTitle}>
                <BlueText style={styles.explain}>{loc.settings.electrum_history}</BlueText>
                <TouchableOpacity onPress={() => this.clearHistoryAlert()}>
                  <BlueText>{loc.settings.electrum_clear}</BlueText>
                </TouchableOpacity>
              </View>
              {serverHistoryItems}
            </BlueCard>
          )}
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

ElectrumSettings.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      server: PropTypes.string,
    }),
  }),
};

ElectrumSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.electrum_settings_server }));

const styles = StyleSheet.create({
  status: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.feeText,
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
  containerConnected: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
  },
  containerDisconnected: {
    backgroundColor: BlueCurrentTheme.colors.redBG,
  },
  textConnected: {
    color: BlueCurrentTheme.colors.feeValue,
    fontWeight: 'bold',
  },
  textDisconnected: {
    color: BlueCurrentTheme.colors.redText,
    fontWeight: 'bold',
  },
  hostname: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  explain: {
    color: BlueCurrentTheme.colors.feeText,
    marginBottom: -24,
    flexShrink: 1,
  },
  flexShrink: {
    flexShrink: 1,
    marginRight: 8,
    alignItems: 'flex-start',
  },
  inputWrap: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
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
  serverHistoryItem: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderBottomWidth: 0.5,
    flexWrap: 'nowrap',
  },
  serverRow: {
    flexGrow: 2,
    maxWidth: '80%',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  selectButton: {
    flexGrow: 1,
    marginLeft: 16,
    alignItems: 'flex-end',
  },
});
