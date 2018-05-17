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
              color="#fff"
              onPress={() => this.props.navigation.navigate('DrawerToggle')}
            />
          }
          centerComponent={{
            text: 'About',
            style: { color: '#fff', fontSize: 23 },
          }}
        />

        <BlueCard>
          <ScrollView maxHeight={height - 150}>
            <BlueText h4>
              Blue Wallet is free and opensource Bitcoin wallet
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

            <BlueButton
              onPress={() => {
                this.props.navigation.navigate('Selftest');
              }}
              title="Run self test"
            />
            <BlueButton
              icon={{ name: 'arrow-left', type: 'octicon' }}
              title="Go Back"
              onPress={() => {
                this.props.navigation.goBack();
              }}
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
