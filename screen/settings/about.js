import React, { Component } from 'react';
import { ScrollView, Linking, Dimensions, Platform } from 'react-native';
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
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const { width, height } = Dimensions.get('window');
const loc = require('../../loc/');
const pkg = require('../../package.json');
const appjson = require('../../app.json');

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

  platformSpecificInformation() {
    if (Platform.OS === 'android') {
      return (
        <React.Fragment>
          <BlueTextCentered>Version code: {DeviceInfo.getSystemName()}</BlueTextCentered>
          <BlueSpacing20 />
        </React.Fragment>
      );
    } else if (Platform.OS === 'ios') {
      return (
        <React.Fragment>
          <BlueTextCentered>
            {DeviceInfo.getModel()} ({DeviceInfo.getDeviceId()})
          </BlueTextCentered>
          <BlueSpacing20 />
        </React.Fragment>
      );
    }
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <ScrollView>
          <BlueCard>
            <BlueText h4>BlueWallet is a free and open source Bitcoin wallet. Licensed MIT.</BlueText>
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
                Linking.openURL('https://itunes.apple.com/us/app/bluewallet-bitcoin-wallet/id1376878040?l=ru&ls=1&mt=8');
              }}
              title="Leave us a review on Appstore"
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
                this.props.navigation.navigate('Selftest');
              }}
              title="Run self test"
            />
            <BlueTextCentered />
            <BlueTextCentered>
              w, h = {width}, {height}
            </BlueTextCentered>
            {this.platformSpecificInformation()}
            <BlueTextCentered>
              {pkg.name} v{pkg.version} (build {appjson.buildNumber})
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
