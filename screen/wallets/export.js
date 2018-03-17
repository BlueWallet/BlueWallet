/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
import React, { Component } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-navigation';
import { Icon, Card, Header } from 'react-native-elements';
import { List, Button, ListItem } from 'react-native-elements';
import {
  Divider,
  FormLabel,
  FormInput,
  Text,
  FormValidationMessage,
} from 'react-native-elements';
import QRCode from 'react-native-qrcode';
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
let BigNumber = require('bignumber.js');

export default class WalletExport extends Component {
  static navigationOptions = {
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

    let address = props.navigation.state.params.address;
    let wallet;

    for (let w of BlueApp.getWallets()) {
      if (w.getAddress() === address) {
        // found our wallet
        wallet = w;
      }
    }

    this.state = {
      isLoading: true,
      wallet,
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

    /*

          <BlueText style={{marginBottom: 10}}>
            WIF stands for Wallet Import Format. Backup your WIF (also shown on QR) in a safe place.
          </BlueText>

          <Divider style={{ backgroundColor: '#ebebeb', marginBottom:20, }} />

    */

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacing />
        <BlueCard
          title={'Wallet Export'}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <BlueText>Address: {this.state.wallet.getAddress()}</BlueText>
          <BlueText>WIF: {this.state.wallet.getSecret()}</BlueText>

          <QRCode
            value={this.state.wallet.getSecret()}
            size={312}
            bgColor={'white'}
            fgColor={BlueApp.settings.brandingColor}
          />
        </BlueCard>

        <BlueButton
          icon={{ name: 'arrow-left', type: 'octicon' }}
          onPress={() => this.props.navigation.goBack()}
          title="Go back"
        />
      </SafeBlueArea>
    );
  }
}
