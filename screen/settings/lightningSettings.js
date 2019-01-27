import React, { Component } from 'react';
import { AsyncStorage, View, TextInput, Linking } from 'react-native';
import { AppStorage } from '../../class';
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
      defaultURI: new LightningCustodianWallet().getBaseURI(),
    });
  }

  async save() {
    this.state.URI = this.state.URI ? this.state.URI : '';
    await AsyncStorage.setItem(AppStorage.LNDHUB, this.state.URI);

    // set each lnd wallets and re-init api
    for (/** @type {LightningCustodianWallet} */ let w of BlueApp.getWallets()) {
      if (w.type === LightningCustodianWallet.type) {
        w.setBaseURI(this.state.URI);
        w.init();
        console.log('inited', w.baseURI);
      }
    }
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueCard>
          <BlueText>{loc.settings.lightning_settings_explain}</BlueText>
        </BlueCard>

        <Button
          icon={{
            name: 'mark-github',
            type: 'octicon',
            color: BlueApp.settings.buttonTextColor,
            backgroundColor: '#FFFFFF',
          }}
          onPress={() => {
            Linking.openURL('https://github.com/BlueWallet/LndHub');
          }}
          title="github.com/BlueWallet/LndHub"
          color={BlueApp.settings.buttonTextColor}
          buttonStyle={{
            backgroundColor: '#FFFFFF',
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
              placeholder={this.state.defaultURI}
              value={this.state.URI}
              onChangeText={text => this.setState({ URI: text })}
              numberOfLines={1}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 36, height: 36 }}
              editable={!this.state.isLoading}
              underlineColorAndroid="transparent"
            />
          </View>

          <BlueSpacing20 />
          <BlueButton
            onPress={() => {
              this.save();
            }}
            title={loc.settings.save}
          />
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
