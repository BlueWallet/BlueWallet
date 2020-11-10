/* global alert */
import React, { Component } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueNavigationStyle,
  BlueButtonLink,
} from '../../BlueComponents';
import { BlueCurrentTheme } from '../../components/themes';
import PropTypes from 'prop-types';
import loc from '../../loc';
import DefaultPreference from 'react-native-default-preference';
import RNWidgetCenter from 'react-native-widget-center';
const BlueElectrum = require('../../blue_modules/BlueElectrum');

export default class ElectrumSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      config: {},
    };
  }

  componentWillUnmount() {
    clearInterval(this.state.inverval);
  }

  async componentDidMount() {
    const host = await AsyncStorage.getItem(AppStorage.ELECTRUM_HOST);
    const port = await AsyncStorage.getItem(AppStorage.ELECTRUM_TCP_PORT);
    const sslPort = await AsyncStorage.getItem(AppStorage.ELECTRUM_SSL_PORT);

    this.setState({
      isLoading: false,
      host,
      port,
      sslPort,
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
  }

  checkServer = async () => {
    this.setState({ isLoading: true }, async () => {
      const features = await BlueElectrum.serverFeatures();
      alert(JSON.stringify(features, null, 2));
      this.setState({ isLoading: false });
    });
  };

  save = () => {
    const host = this.state.host ? this.state.host : '';
    const port = this.state.port ? this.state.port : '';
    const sslPort = this.state.sslPort ? this.state.sslPort : '';

    this.setState({ isLoading: true }, async () => {
      try {
        if (!host && !port && !sslPort) {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, '');
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, '');
          await AsyncStorage.setItem(AppStorage.ELECTRUM_SSL_PORT, '');
          try {
            await DefaultPreference.setName('group.io.bluewallet.bluewallet');
            await DefaultPreference.clear(AppStorage.ELECTRUM_HOST);
            await DefaultPreference.clear(AppStorage.ELECTRUM_SSL_PORT);
            await DefaultPreference.clear(AppStorage.ELECTRUM_TCP_PORT);
            RNWidgetCenter.reloadAllTimelines();
          } catch (e) {
            // Must be running on Android
            console.log(e);
          }
          alert(loc.settings.electrum_saved);
        } else if (!(await BlueElectrum.testConnection(host, port, sslPort))) {
          alert(loc.settings.electrum_error_connect);
        } else {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, host);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, port);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_SSL_PORT, sslPort);
          try {
            await DefaultPreference.setName('group.io.bluewallet.bluewallet');
            await DefaultPreference.set(AppStorage.ELECTRUM_HOST, host);
            await DefaultPreference.set(AppStorage.ELECTRUM_TCP_PORT, port);
            await DefaultPreference.set(AppStorage.ELECTRUM_SSL_PORT, sslPort);
            RNWidgetCenter.reloadAllTimelines();
          } catch (e) {
            // Must be running on Android
            console.log(e);
          }

          alert(loc.settings.electrum_saved);
        }
      } catch (error) {
        alert(error);
      }
      this.setState({ isLoading: false });
    });
  };

  onBarScanned = value => {
    var [host, port, type] = value.split(':');
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
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        <ScrollView>
          <BlueCard>
            <BlueText style={styles.status}>{loc.settings.electrum_status}</BlueText>
            <View style={styles.connectWrap}>
              <View style={[styles.container, this.state.config.status === 1 ? styles.containerConnected : styles.containerDisconnected]}>
                <BlueText style={this.state.config.status === 1 ? styles.textConnected : styles.textDisconnected}>
                  {this.state.config.status === 1 ? loc.settings.electrum_connected : loc.settings.electrum_connected_not}
                </BlueText>
              </View>
            </View>
            <BlueSpacing20 />
            <BlueText style={styles.hostname} onPress={this.checkServer}>
              {this.state.config.host}:{this.state.config.port}
            </BlueText>
            <BlueSpacing20 />
          </BlueCard>
          <BlueCard>
            <BlueText style={styles.explain}>{loc.settings.electrum_settings_explain}</BlueText>
          </BlueCard>
          <BlueCard>
            <View style={styles.inputWrap}>
              <TextInput
                placeholder={loc.formatString(loc.settings.electrum_host, { example: '111.222.333.111' })}
                value={this.state.host}
                onChangeText={text => this.setState({ host: text.trim() })}
                numberOfLines={1}
                style={styles.inputText}
                editable={!this.state.isLoading}
                placeholderTextColor="#81868e"
                autoCorrect={false}
                autoCapitalize="none"
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
              />
            </View>
            <BlueSpacing20 />
            <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={this.importScan} />
            <BlueSpacing20 />
            {this.state.isLoading ? <BlueLoading /> : <BlueButton onPress={this.save} title={loc.settings.save} />}
          </BlueCard>
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
  }),
};

ElectrumSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.electrum_settings,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
    backgroundColor: '#F8D2D2',
  },
  textConnected: {
    color: BlueCurrentTheme.colors.feeValue,
    fontWeight: 'bold',
  },
  textDisconnected: {
    color: '#D0021B',
    fontWeight: 'bold',
  },
  hostname: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  explain: {
    color: BlueCurrentTheme.colors.feeText,
    marginBottom: -24,
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
});
