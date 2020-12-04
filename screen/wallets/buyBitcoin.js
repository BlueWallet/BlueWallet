import React, { Component } from 'react';
import { StyleSheet, StatusBar, Linking, Platform } from 'react-native';
import { BlueNavigationStyle, BlueLoading, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import * as NavigationService from '../../NavigationService';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const currency = require('../../blue_modules/currency');
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default class BuyBitcoin extends Component {
  static contextType = BlueStorageContext;
  constructor(props) {
    super(props);
    const wallet = props.route.params.wallet;
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
        address = await Promise.race([wallet.getAddressAsync(), this.context.sleep(2000)]);
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
};

BuyBitcoin.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: '',
  headerLeft: null,
});

BuyBitcoin.navigate = async wallet => {
  const uri = await BuyBitcoin.generateURL(wallet);
  if (Platform.OS === 'ios') {
    InAppBrowser.isAvailable()
      .then(_value => {
        InAppBrowser.open(uri, { dismissButtonStyle: 'done', modalEnabled: true, animated: true });
      })
      .catch(error => {
        console.log(error);
        Linking.openURL(uri);
      });
  } else {
    NavigationService.navigate('BuyBitcoin', {
      wallet,
    });
  }
};
