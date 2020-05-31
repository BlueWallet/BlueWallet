import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import { BlueNavigationStyle, BlueLoading, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { AppStorage, LightningCustodianWallet, WatchOnlyWallet } from '../../class';
const currency = require('../../currency');
let BlueApp: AppStorage = require('../../BlueApp');
let loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default class BuyBitcoin extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.buyBitcoin.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    let wallet = props.route.params.wallet;
    if (!wallet) console.warn('wallet was not passed to buyBitcoin');

    this.state = {
      isLoading: true,
      wallet,
      address: '',
    };
  }

  async componentDidMount() {
    console.log('buyBitcoin - componentDidMount');

    let preferredCurrency = await currency.getPreferredCurrency();
    preferredCurrency = preferredCurrency.endPointKey;

    /**  @type {AbstractHDWallet|WatchOnlyWallet|LightningCustodianWallet}   */
    let wallet = this.state.wallet;

    let address = '';

    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      address = wallet.getAddress();
      this.setState({
        isLoading: false,
        address,
        preferredCurrency,
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
      preferredCurrency,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    const { safelloStateToken } = this.props.route.params;

    let uri = 'https://bluewallet.io/buy-bitcoin-redirect.html?address=' + this.state.address;

    if (safelloStateToken) {
      uri += '&safelloStateToken=' + safelloStateToken;
    }

    if (this.state.preferredCurrency) {
      uri += '&currency=' + this.state.preferredCurrency;
    }

    return (
      <SafeBlueArea style={styles.root}>
        <WebView
          source={{
            uri,
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
      wallet: PropTypes.object.isRequired,
      safelloStateToken: PropTypes.string,
    }),
  }),
};
