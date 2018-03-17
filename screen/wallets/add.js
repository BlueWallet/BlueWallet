let BlueApp = require('../../BlueApp');
import {
  AppStorage,
  LegacyWallet,
  SegwitBech32Wallet,
  SegwitP2SHWallet,
} from '../../class';
import React, { Component } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-navigation';
import { Button } from 'react-native-elements';
import { Icon, Card, Header } from 'react-native-elements';
import {
  BlueSpacing,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueListItem,
  BlueHeader,
} from '../../BlueComponents';
let EV = require('../../events');

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
    const { navigate } = this.props.navigation;

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
              this.props.navigation.navigate('ScanQrWifSegwitP2SHAddress');
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

        <BlueButton
          icon={{ name: 'arrow-left', type: 'octicon' }}
          title="Go Back"
          onPress={() => {
            this.props.navigation.goBack();
          }}
        />
      </SafeBlueArea>
    );
  }
}
