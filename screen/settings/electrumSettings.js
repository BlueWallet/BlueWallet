/* global alert */
import React, { Component } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import { ScrollView } from 'react-native-gesture-handler';
import { BlueLoading, BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
let loc = require('../../loc');
let BlueElectrum = require('../../BlueElectrum');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  status: {
    textAlign: 'center',
    color: '#9AA0AA',
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
  connectText: {
    fontWeight: '600',
  },
  containerConnected: {
    backgroundColor: '#D2F8D6',
  },
  containerDisconnected: {
    backgroundColor: '#F8D2D2',
  },
  textConnected: {
    color: '#37C0A1',
  },
  textDisconnected: {
    color: '#D0021B',
  },
  hostname: {
    textAlign: 'center',
    color: '#0C2550',
  },
  explain: {
    color: '#9AA0AA',
    marginBottom: -24,
  },
  inputWrap: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 36,
    height: 36,
  },
});

export default class ElectrumSettings extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.electrum_settings,
  });

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
    let host = await AsyncStorage.getItem(AppStorage.ELECTRUM_HOST);
    let port = await AsyncStorage.getItem(AppStorage.ELECTRUM_TCP_PORT);
    let sslPort = await AsyncStorage.getItem(AppStorage.ELECTRUM_SSL_PORT);

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
    }, 1000);

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
          alert('Your changes have been saved successfully. Restart may be required for changes to take effect.');
        } else if (!(await BlueElectrum.testConnection(host, port, sslPort))) {
          alert("Can't connect to provided Electrum server");
        } else {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, host);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, port);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_SSL_PORT, sslPort);
          alert('Your changes have been saved successfully. Restart may be required for changes to take effect.');
        }
      } catch (_) {}
      this.setState({ isLoading: false });
    });
  };

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        <ScrollView>
          <BlueCard>
            <BlueText style={styles.status}>Status</BlueText>
            <View style={styles.connectWrap}>
              <View style={[styles.container, this.state.config.status === 1 ? styles.containerConnected : styles.containerDisconnected]}>
                <BlueText style={[styles.connectText, this.state.config.status === 1 ? styles.textConnected : styles.textDisconnected]}>
                  {(this.state.config.status === 1 && 'Connected') || 'Not Connected'}
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
                placeholder={'host, for example 111.222.333.444'}
                value={this.state.host}
                onChangeText={text => this.setState({ host: text })}
                numberOfLines={1}
                style={styles.inputText}
                editable={!this.state.isLoading}
                underlineColorAndroid="transparent"
              />
            </View>
            <BlueSpacing20 />
            <View style={styles.inputWrap}>
              <TextInput
                placeholder={'TCP port, usually 50001'}
                value={this.state.port}
                onChangeText={text => this.setState({ port: text })}
                numberOfLines={1}
                style={styles.inputText}
                editable={!this.state.isLoading}
                underlineColorAndroid="transparent"
              />
            </View>
            <BlueSpacing20 />
            <View style={styles.inputWrap}>
              <TextInput
                placeholder={'SSL port, usually 50002'}
                value={this.state.sslPort}
                onChangeText={text => this.setState({ sslPort: text })}
                numberOfLines={1}
                style={styles.inputText}
                editable={!this.state.isLoading}
                underlineColorAndroid="transparent"
              />
            </View>

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
};
