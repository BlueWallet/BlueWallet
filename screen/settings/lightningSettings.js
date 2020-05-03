/* global alert */
import React, { Component } from 'react';
import { View, TextInput, Linking } from 'react-native';
import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import { BlueLoading, BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Button } from 'react-native-elements';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class LightningSettings extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.lightning_settings,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    let URI = await AsyncStorage.getItem(AppStorage.LNDHUB);

    this.setState({
      isLoading: false,
      URI,
    });
  }

  save = () => {
    this.setState({ isLoading: true }, async () => {
      this.state.URI = this.state.URI ? this.state.URI : '';
      try {
        if (this.state.URI) {
          await LightningCustodianWallet.isValidNodeAddress(this.state.URI);
          // validating only if its not empty. empty means use default
        }
        await AsyncStorage.setItem(AppStorage.LNDHUB, this.state.URI);
        alert('Your changes have been saved successfully');
      } catch (error) {
        alert('Not a valid LndHub URI');
        console.log(error);
      }
      this.setState({ isLoading: false });
    });
  };

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueCard>
          <BlueText>{loc.settings.lightning_settings_explain}</BlueText>
        </BlueCard>

        <Button
          icon={{
            name: 'github',
            type: 'font-awesome',
            color: BlueApp.settings.buttonTextColor,
            backgroundColor: '#FFFFFF',
          }}
          onPress={() => {
            Linking.openURL('https://github.com/BlueWallet/LndHub');
          }}
          titleStyle={{ color: BlueApp.settings.buttonAlternativeTextColor }}
          title="github.com/BlueWallet/LndHub"
          color={BlueApp.settings.buttonTextColor}
          buttonStyle={{
            backgroundColor: 'transparent',
          }}
        />

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
              placeholder={LightningCustodianWallet.defaultBaseUri}
              value={this.state.URI}
              onChangeText={text => this.setState({ URI: text })}
              numberOfLines={1}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 36, height: 36 }}
              editable={!this.state.isLoading}
              underlineColorAndroid="transparent"
            />
          </View>

          <BlueSpacing20 />
          {this.state.isLoading ? <BlueLoading /> : <BlueButton onPress={this.save} title={loc.settings.save} />}
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

LightningSettings.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
