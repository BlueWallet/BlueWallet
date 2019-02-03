import React, { Component } from 'react';
import { ScrollView, Linking, Dimensions } from 'react-native';
import {
  BlueTextCentered,
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueNavigationStyle,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import DeviceInfo from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const { width, height } = Dimensions.get('window');
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
            <BlueTextCentered h4>BlueWallet is a free and open source Bitcoin wallet. Licensed MIT.</BlueTextCentered>
            <BlueSpacing20 />

            <BlueTextCentered h4>Always backup your keys</BlueTextCentered>
            <BlueSpacing20 />

            <BlueButton
              icon={{
                name: 'mark-github',
                type: 'octicon',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                Linking.openURL('https://github.com/BlueWallet/BlueWallet');
              }}
              title="github.com/BlueWallet/BlueWallet"
            />
            <BlueSpacing20 />

            <BlueButton
              icon={{
                name: 'twitter',
                type: 'font-awesome',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                Linking.openURL('https://twitter.com/bluewalletio');
              }}
              title="Follow us on Twitter"
            />
            <BlueSpacing20 />

            <BlueButton
              icon={{
                name: 'telegram',
                type: 'font-awesome',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                Linking.openURL('https://t.me/bluewallet');
              }}
              title="Join Telegram chat"
            />
            <BlueSpacing20 />

            <BlueButton
              icon={{
                name: 'thumbsup',
                type: 'octicon',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                let options = {
                  AppleAppID: '1376878040',
                  GooglePackageName: 'io.bluewallet.bluewallet',
                  preferredAndroidMarket: AndroidMarket.Google,
                  preferInApp: true,
                  openAppStoreIfInAppFails: true,
                  fallbackPlatformURL: 'https://bluewallet.io',
                };
                Rate.rate(options, success => {
                  if (success) {
                    console.log('User Rated.');
                  }
                });
              }}
              title="Rate BlueWallet"
            />

            <BlueSpacing20 />
            <BlueText h3>Built with awesome:</BlueText>
            <BlueSpacing20 />
            <BlueText h4>* React Native</BlueText>
            <BlueText h4>* Bitcoinjs-lib</BlueText>
            <BlueText h4>* blockcypher.com API</BlueText>
            <BlueText h4>* Nodejs</BlueText>
            <BlueText h4>* react-native-elements</BlueText>
            <BlueText h4>* rn-nodeify</BlueText>
            <BlueText h4>* bignumber.js</BlueText>
            <BlueSpacing20 />

            <BlueButton
              onPress={() => {
                this.props.navigation.navigate('ReleaseNotes');
              }}
              title="Release notes"
            />
            <BlueSpacing20 />

            <BlueButton
              onPress={() => {
                this.props.navigation.navigate('Selftest');
              }}
              title="Run self test"
            />
            <BlueTextCentered />
            <BlueTextCentered>
              {DeviceInfo.getApplicationName()} ver {DeviceInfo.getVersion()} (build {DeviceInfo.getBuildNumber()})
            </BlueTextCentered>
            <BlueTextCentered>{new Date(DeviceInfo.getBuildNumber() * 1000).toGMTString()}</BlueTextCentered>
            <BlueTextCentered>{DeviceInfo.getBundleId()}</BlueTextCentered>
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
