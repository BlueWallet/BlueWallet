import React, { Component } from 'react';
import { BlueNavigationStyle, BlueLoading } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
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

    const { safelloStateToken } = this.props.navigation.state.params;

    let uri = 'https://bluewallet.io/buy-bitcoin-redirect.html?address=' + this.state.address;

    if (safelloStateToken) {
      uri += '&safelloStateToken=' + safelloStateToken;
    }

    return (
      <WebView
        source={{
          uri,
        }}
      />
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
        safelloStateToken: PropTypes.string,
      }),
    }),
  }),
};
