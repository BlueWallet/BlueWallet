import { SegwitP2SHWallet } from '../../class';
import React, { Component } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  BlueSpacing,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
let BlueApp = require('../../BlueApp');

/*
  <Button
backgroundColor={BlueApp.settings.buttonBackground}
large icon={{name: 'qrcode', type: 'font-awesome'}} title='Scan QR WIF as Legacy Address (P2PKH)'
onPress={() => {
  this.props.navigation.navigate('ScanQrWifLegacyAddress')
}}
/> */

export default class WalletsAdd extends Component {
  static navigationOptions = {
    tabBarLabel: 'Wallets',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
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
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, paddingTop: 40 }}
      >
        <BlueSpacing />
        <BlueCard title="Add Wallet">
          <BlueText>
            You can either scan backup paper wallet (in WIF - Wallet Import
            Format), or create a new wallet. Segwit wallets supported by
            default.
          </BlueText>

          <BlueButton
            large
            icon={{ name: 'qrcode', type: 'font-awesome' }}
            title="Scan"
            onPress={() => {
              this.props.navigation.navigate('ScanQrWif');
            }}
          />

          <BlueButton
            large
            icon={{ name: 'bitcoin', type: 'font-awesome' }}
            title="Create"
            onPress={() => {
              this.props.navigation.goBack();
              setTimeout(async () => {
                let w = new SegwitP2SHWallet();
                w.setLabel('New SegWit');
                w.generate();
                BlueApp.wallets.push(w);
                await BlueApp.saveToDisk();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              }, 1);
            }}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

WalletsAdd.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
