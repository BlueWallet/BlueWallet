import React, { Component } from 'react';
import { ScrollView, Linking } from 'react-native';
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
let BlueApp = require('../BlueApp');

export default class Settings extends Component {
  static navigationOptions = {
    tabBarLabel: 'Settings',
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
              color="#fff"
              onPress={() => this.props.navigation.navigate('DrawerToggle')}
            />
          }
          centerComponent={{
            text: 'Settings',
            style: { color: '#fff', fontSize: 25 },
          }}
        />
        <BlueCard>
          <ScrollView maxHeight={450}>
            <BlueText h1>About</BlueText>
            <BlueSpacing20 />

            <BlueText h4>
              Blue Wallet is free and opensource Bitcoin wallet
            </BlueText>
            <BlueText>
              Warning: Alpha version, don't use to store large amouts!
            </BlueText>
            <BlueButton
              icon={{ name: 'octoface', type: 'octicon' }}
              onPress={() => {
                Linking.openURL('https://github.com/Overtorment/BlueWallet');
              }}
              title="github.com/Overtorment/BlueWallet"
            />

            <BlueSpacing20 />
            <BlueText h4>Licensed MIT</BlueText>
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
          </ScrollView>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Settings.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
