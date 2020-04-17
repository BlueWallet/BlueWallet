import React, { Component } from 'react';
import { BlueNavigationStyle, BlueLoading } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { AppStorage, LightningCustodianWallet, WatchOnlyWallet } from '../../class';
let BlueApp: AppStorage = require('../../BlueApp');
let loc = require('../../loc');

export default class BuyBitcoin extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.buyBitcoin.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    let wallet = props.navigation.state.params.wallet;

    this.state = {
      isLoading: true,
      wallet,
      address: '',
    };
  }

  async componentDidMount() {
    console.log('buyBitcoin - componentDidMount');

    /**  @type {AbstractHDWallet|WatchOnlyWallet|LightningCustodianWallet}   */
    let wallet = this.state.wallet;

    let address = '';

    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      address = wallet.getAddress();
      this.setState({
        isLoading: false,
        address,
      });
      return;
    }

    // otherwise, lets call widely-used getAddressAsync()

    try {
      address = await Promise.race([wallet.getAddressAsync(), BlueApp.sleep(2000)]);
    } catch (_) {}

    if (!address) {
      // either sleep expired or getAddressAsync threw an exception
      if (LightningCustodianWallet.type === wallet.type) {
        // not much we can do, lets hope refill address was cached previously
        address = wallet.getAddress() || '';
      } else {
        // plain hd wallet (either HD or watchonly-wrapped). trying next free address
        address = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
      }
    }

    this.setState({
      isLoading: false,
      address,
    });
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
        wallet: PropTypes.object,
        safelloStateToken: PropTypes.string,
      }),
    }),
  }),
};
