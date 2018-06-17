import React, { Component } from 'react';
import { ScrollView, Linking, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Icon } from 'react-native-elements';
import {
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueHeader,
} from '../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../BlueApp');
const { height } = Dimensions.get('window');

export default class About extends Component {
  static navigationOptions = {
    tabBarLabel: 'About',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-settings' : 'ios-settings-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

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
        <BlueHeader
          backgroundColor={BlueApp.settings.brandingColor}
          leftComponent={
            <Icon
              name="menu"
              color={BlueApp.settings.foregroundColor}
              onPress={() => this.props.navigation.navigate('DrawerToggle')}
            />
          }
          centerComponent={{
            text: 'About',
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
          }}
        />

        <BlueCard>
          <ScrollView maxHeight={height - 150}>
            <BlueText h4>
              BlueWallet is free and opensource Bitcoin wallet. Licensed MIT.
            </BlueText>

            <BlueButton
              icon={{ name: 'mark-github', type: 'octicon', color: BlueApp.settings.buttonTextColor }}
              onPress={() => {
                Linking.openURL('https://github.com/Overtorment/BlueWallet');
              }}
              title="github.com/Overtorment/BlueWallet"
            />

            <BlueButton
              icon={{ name: 'twitter', type: 'font-awesome', color: BlueApp.settings.buttonTextColor }}
              onPress={() => {
                Linking.openURL('https://twitter.com/bluewalletio');
              }}
              title="Follow us on Twitter"
            />

            <BlueButton
              icon={{ name: 'thumbsup', type: 'octicon', color: BlueApp.settings.buttonTextColor }}
              onPress={() => {
                Linking.openURL(
                  'https://itunes.apple.com/us/app/bluewallet-bitcoin-wallet/id1376878040?l=ru&ls=1&mt=8',
                );
              }}
              title="Leave us a review on Appstore"
            />

            <BlueButton
              icon={{ name: 'arrow-left', type: 'octicon', color: BlueApp.settings.buttonTextColor }}
              title="Go Back"
              onPress={() => {
                this.props.navigation.goBack();
              }}
            />

            <BlueSpacing20 />

            <BlueText h3>Built with awesome:</BlueText>
            <BlueSpacing20 />
            <BlueText h4>* React Native</BlueText>
            <BlueText h4>* Bitcoinjs-lib</BlueText>
            <BlueText h4>* blockcypher.com API</BlueText>
            <BlueText h4>* Nodejs</BlueText>
            <BlueText h4>* Expo</BlueText>
            <BlueText h4>* react-native-elements</BlueText>
            <BlueText h4>* rn-nodeify</BlueText>
            <BlueText h4>* bignumber.js</BlueText>
            <BlueText h4>* https://github.com/StefanoBalocco/isaac.js</BlueText>
            <BlueText h4>
              * Design by https://dribbble.com/chrometaphore
            </BlueText>

            <BlueButton
              onPress={() => {
                this.props.navigation.navigate('Selftest');
              }}
              title="Run self test"
            />
          </ScrollView>
        </BlueCard>
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
