import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ScrollView, Linking, Dimensions } from 'react-native';
import { getApplicationName, getVersion, getBundleId, getBuildNumber } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';

import {
  BlueTextCentered,
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
} from '../../BlueComponents';

const { width, height } = Dimensions.get('window');
const BlueApp = require('../../BlueApp');
const loc = require('../../loc/');

export default class About extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.about,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <ScrollView>
          <BlueCard>
            <BlueButton
              icon={{
                name: 'github',
                type: 'font-awesome',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                Linking.openURL('https://github.com/bitcoinvault/GoldWallet');
              }}
              title="GitHub"
            />
            <BlueSpacing20 />

            <BlueButton
              icon={{
                name: 'thumbs-up',
                type: 'font-awesome',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                const options = {
                  AppleAppID: '1376878040',
                  GooglePackageName: 'io.goldwallet.wallet',
                  preferredAndroidMarket: AndroidMarket.Google,
                  preferInApp: true,
                  openAppStoreIfInAppFails: true,
                  fallbackPlatformURL: 'https://bitcoinvault.global',
                };
                Rate.rate(options, success => {
                  if (success) {
                    console.log('User Rated.');
                  }
                });
              }}
              title="Rate GoldWallet"
            />

            <BlueButton
              onPress={() => {
                this.props.navigation.navigate('ReleaseNotes');
              }}
              title="Release notes"
            />
            <BlueSpacing20 />

            <BlueTextCentered />
            <BlueTextCentered>
              {getApplicationName()} ver {getVersion()} (build {getBuildNumber()})
            </BlueTextCentered>
            <BlueTextCentered>{new Date(getBuildNumber() * 1000).toGMTString()}</BlueTextCentered>
            <BlueTextCentered>{getBundleId()}</BlueTextCentered>
            <BlueTextCentered>
              w, h = {width}, {height}
            </BlueTextCentered>
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

About.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
