/* global alert */
import React, { Component } from 'react';
import { View, TextInput } from 'react-native';
import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import { BlueLoading, BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
let loc = require('../../loc');
let BlueElectrum = require('../../BlueElectrum');

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

    await this.setState({
      config: await BlueElectrum.getConfig(),
    });
  }

  save = () => {
    this.setState({ isLoading: true }, async () => {
      this.state.host = this.state.host ? this.state.host : '';
      this.state.port = this.state.port ? this.state.port : '';
      this.state.sslPort = this.state.sslPort ? this.state.sslPort : '';
      try {
        if (!this.state.host && !this.state.port && !this.state.sslPort) {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, '');
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, '');
          await AsyncStorage.setItem(AppStorage.ELECTRUM_SSL_PORT, '');
          alert('Your changes have been saved successfully. Restart may be required for changes to take effect.');
        } else if (!(await BlueElectrum.testConnection(this.state.host, this.state.port, this.state.sslPort))) {
          alert("Can't connect to provided Electrum server");
        } else {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, this.state.host);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, this.state.port);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_SSL_PORT, this.state.sslPort);
          alert('Your changes have been saved successfully. Restart may be required for changes to take effect.');
        }
      } catch (_) {}
      this.setState({ isLoading: false });
    });
  };

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueCard>
          <BlueText>{loc.settings.electrum_settings_explain}</BlueText>
        </BlueCard>
        <BlueCard>
          <View
            style={{
              flexDirection: 'row',
              borderColor: '#d2d2d2',
              borderBottomColor: '#d2d2d2',
              borderWidth: 1.0,
              borderBottomWidth: 0.5,
              backgroundColor: '#f5f5f5',
              minHeight: 44,
              height: 44,
              alignItems: 'center',
              borderRadius: 4,
            }}
          >
            <TextInput
              placeholder={'host, for example 111.222.333.444'}
              value={this.state.host}
              onChangeText={text => this.setState({ host: text })}
              numberOfLines={1}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 36, height: 36 }}
              editable={!this.state.isLoading}
              underlineColorAndroid="transparent"
            />
          </View>
          <BlueSpacing20 />
          <View
            style={{
              flexDirection: 'row',
              borderColor: '#d2d2d2',
              borderBottomColor: '#d2d2d2',
              borderWidth: 1.0,
              borderBottomWidth: 0.5,
              backgroundColor: '#f5f5f5',
              minHeight: 44,
              width: 200,
              height: 44,
              alignItems: 'center',
              borderRadius: 4,
            }}
          >
            <TextInput
              placeholder={'TCP port, usually 50001'}
              value={this.state.port}
              onChangeText={text => this.setState({ port: text })}
              numberOfLines={1}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 36, height: 36 }}
              editable={!this.state.isLoading}
              underlineColorAndroid="transparent"
            />
          </View>
          <BlueSpacing20 />
          <View
            style={{
              flexDirection: 'row',
              borderColor: '#d2d2d2',
              borderBottomColor: '#d2d2d2',
              borderWidth: 1.0,
              borderBottomWidth: 0.5,
              backgroundColor: '#f5f5f5',
              minHeight: 44,
              height: 44,
              width: 200,
              alignItems: 'center',
              borderRadius: 4,
            }}
          >
            <TextInput
              placeholder={'SSL port, usually 50002'}
              value={this.state.sslPort}
              onChangeText={text => this.setState({ sslPort: text })}
              numberOfLines={1}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 36, height: 36 }}
              editable={!this.state.isLoading}
              underlineColorAndroid="transparent"
            />
          </View>

          <BlueSpacing20 />
          {this.state.isLoading ? <BlueLoading /> : <BlueButton onPress={this.save} title={loc.settings.save} />}
        </BlueCard>

        <BlueCard>
          <BlueSpacing20 />
          <BlueText>Currently using:</BlueText>
          <BlueText>Host: {this.state.config.host}</BlueText>
          <BlueText>Port: {this.state.config.port}</BlueText>
          <BlueText>Connected: {(this.state.config.status === 1 && 'Yes') || 'No'}</BlueText>
        </BlueCard>
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
