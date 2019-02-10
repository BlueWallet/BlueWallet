import React, { Component } from 'react';
import { Linking, View } from 'react-native';
import {
  BlueNavigationStyle,
  BlueCopyTextToClipboard,
  BlueLoading,
  SafeBlueArea,
  BlueButton,
  BlueText,
  BlueSpacing40,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class BuyBitcoin extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.buyBitcoin.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address;
    let secret = props.navigation.state.params.secret;

    this.state = {
      isLoading: true,
      address: address,
      secret: secret,
      addressText: '',
    };
  }

  async componentDidMount() {
    console.log('buyBitcoin/details - componentDidMount');

    /**  @type {AbstractWallet}   */
    let wallet;
    let address = this.state.address;
    for (let w of BlueApp.getWallets()) {
      if ((address && w.getAddress() === this.state.address) || w.getSecret() === this.state.secret) {
        // found our wallet
        wallet = w;
      }
    }

    if (wallet && wallet.getAddressAsync) {
      setTimeout(async () => {
        address = await wallet.getAddressAsync();
        BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
        this.setState({
          address: address,
          addressText: address,
          isLoading: false,
        });
      }, 1);
    } else {
      this.setState({
        isLoading: false,
        address,
        addressText: address,
      });
    }
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            <BlueText>{loc.buyBitcoin.tap_your_address}</BlueText>

            <BlueCopyTextToClipboard text={this.state.addressText} />

            <BlueButton
              icon={{
                name: 'shopping-cart',
                type: 'font-awesome',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={() => {
                Linking.openURL('https://old.changelly.com/?ref_id=rtagfcvnwiwvhm99');
              }}
              title="Buy from Changelly"
            />

            <BlueSpacing40 />
            <BlueSpacing40 />
            <BlueSpacing40 />
            <BlueSpacing40 />
            <BlueSpacing40 />
            <BlueSpacing40 />
          </View>
        </View>
      </SafeBlueArea>
    );
  }
}

BuyBitcoin.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        secret: PropTypes.string,
      }),
    }),
  }),
};
