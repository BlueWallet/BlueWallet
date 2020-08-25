import React, { Component } from 'react';
import { StyleSheet, StatusBar, Linking } from 'react-native';
import { BlueNavigationStyle, BlueLoading, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { getSystemName } from 'react-native-device-info';
import { AppStorage, LightningCustodianWallet, WatchOnlyWallet } from '../../class';
const currency = require('../../blue_modules/currency');
const BlueApp: AppStorage = require('../../BlueApp');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default class BuyBitcoin extends Component {
  constructor(props) {
    super(props);
    const wallet = props.route.params.wallet;
    if (!wallet) console.warn('wallet was not passed to buyBitcoin');

    this.state = {
      isLoading: true,
      wallet,
      address: '',
      uri: '',
    };
  }

  async componentDidMount() {
    console.log('buyBitcoin - componentDidMount');

    let preferredCurrency = await currency.getPreferredCurrency();
    preferredCurrency = preferredCurrency.endPointKey;

    /**  @type {AbstractHDWallet|WatchOnlyWallet|LightningCustodianWallet}   */
    const wallet = this.state.wallet;

    let address = '';

    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      address = wallet.getAddress();
    } else {
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
    }

    const { safelloStateToken } = this.props.route.params;

    let uri = 'https://bluewallet.io/buy-bitcoin-redirect.html?address=' + address;

    if (safelloStateToken) {
      uri += '&safelloStateToken=' + safelloStateToken;
    }

    if (preferredCurrency) {
      uri += '&currency=' + preferredCurrency;
    }

    if (getSystemName() === 'Mac OS X') {
      Linking.openURL(uri).finally(() => this.props.navigation.goBack(null));
    } else {
      this.setState({ uri, isLoading: false, address });
    }
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={styles.root}>
        <StatusBar barStyle="default" />
        <WebView
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
      wallet: PropTypes.object.isRequired,
      safelloStateToken: PropTypes.string,
    }),
  }),
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
  }),
};

BuyBitcoin.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: '',
  headerLeft: null,
});
