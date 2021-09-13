import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlueLoading, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import * as NavigationService from '../../NavigationService';

const currency = require('../../blue_modules/currency');

export default class BuyBitcoin extends Component {
  static contextType = BlueStorageContext;
  constructor(props, context) {
    super(props);
    const wallet = context.wallets.find(w => w.getID() === props.route.params.walletID);
    if (!wallet) console.warn('wallet was not passed to buyBitcoin');

    this.state = {
      isLoading: true,
      wallet,
      uri: '',
    };
  }

  static async generateURL(wallet) {
    let preferredCurrency = await currency.getPreferredCurrency();
    preferredCurrency = preferredCurrency.endPointKey;

    /**  @type {AbstractHDWallet|WatchOnlyWallet|LightningCustodianWallet}   */

    let address = '';

    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      address = wallet.getAddress();
    } else {
      // otherwise, lets call widely-used getAddressAsync()
      try {
        address = await Promise.race([wallet.getAddressAsync(), new Promise(resolve => setTimeout(resolve, 2000))]);
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
    }

    let uri = 'https://bluewallet.io/buy-bitcoin-redirect.html?address=' + address;

    if (preferredCurrency) {
      uri += '&currency=' + preferredCurrency;
    }
    return uri;
  }

  async componentDidMount() {
    console.log('buyBitcoin - componentDidMount');

    let uri = await BuyBitcoin.generateURL(this.state.wallet);

    const { safelloStateToken } = this.props.route.params;
    if (safelloStateToken) {
      uri += '&safelloStateToken=' + safelloStateToken;
    }
    this.setState({ uri, isLoading: false });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea>
        <StatusBar barStyle="default" />

        <WebView
          mediaPlaybackRequiresUserAction={false}
          enableApplePay
          source={{
            uri: this.state.uri,
          }}
        />
      </SafeBlueArea>
    );
  }
}

BuyBitcoin.propTypes = {
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      walletID: PropTypes.string.isRequired,
      safelloStateToken: PropTypes.string,
    }),
  }),
};

BuyBitcoin.navigationOptions = navigationStyle({
  closeButton: true,
  title: '',
  stackPresentation: 'modal',
  headerHideBackButton: true,
});

BuyBitcoin.navigate = async wallet => {
  NavigationService.navigate('BuyBitcoin', {
    walletID: wallet.getID(),
  });
};
