import React, { Component } from 'react';
import { View, ActivityIndicator, Image, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueText, BlueSpacing20 } from '../../BlueComponents';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';
import { WatchOnlyWallet, LegacyWallet, WatchOnlyHDWallet } from '../../class'
import { HDLegacyP2PKHWallet } from '../../class/hd-legacy-p2pkh-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/hd-legacy-breadwallet-wallet';
import { HDSegwitP2SHWallet } from '../../class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class SelectWallet extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.wallets.select_wallet,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      data: [],
    };
  }

  componentDidMount() {
    const wallets = BlueApp.getWallets().filter(item => item.type !== LightningCustodianWallet.type);
    this.setState({
      data: wallets,
      isLoading: false,
    });
  }

  _renderItem = ({ item }) => {
    let gradient1 = '#65ceef';
    let gradient2 = '#68bbe1';

    if (WatchOnlyWallet.type === item.type) {
      gradient1 = '#7d7d7d';
      gradient2 = '#4a4a4a';
    }

    if (WatchOnlyHDWallet.type === item.type) {
      gradient1 = '#c6c6c6';
      gradient2 = '#656565';
    }

    if (LegacyWallet.type === item.type) {
      gradient1 = '#40fad1';
      gradient2 = '#15be98';
    }

    if (HDLegacyP2PKHWallet.type === item.type) {
      gradient1 = '#e36dfa';
      gradient2 = '#bd10e0';
    }

    if (HDLegacyBreadwalletWallet.type === item.type) {
      gradient1 = '#fe6381';
      gradient2 = '#f99c42';
    }

    if (HDSegwitP2SHWallet.type === item.type) {
      gradient1 = '#c65afb';
      gradient2 = '#9053fe';
    }

    if (LightningCustodianWallet.type === item.type) {
      gradient1 = '#f1be07';
      gradient2 = '#f79056';
    }

    return (
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('selection', false);
          this.props.navigation.getParam('onWalletSelect')(item);
        }}
      >
        <View
          shadowOpacity={40 / 100}
          shadowOffset={{ width: 0, height: 0 }}
          shadowRadius={5}
          style={{ backgroundColor: 'transparent', padding: 10, marginVertical: 17 }}
        >
          <LinearGradient
            shadowColor="#000000"
            colors={[gradient1, gradient2]}
            style={{
              padding: 15,
              borderRadius: 10,
              minHeight: 164,
              elevation: 5,
            }}
          >
            <Image
              source={
                (LightningCustodianWallet.type === item.type && require('../../img/lnd-shape.png')) || require('../../img/btc-shape.png')
              }
              style={{
                width: 99,
                height: 94,
                position: 'absolute',
                bottom: 0,
                right: 0,
              }}
            />

            <Text style={{ backgroundColor: 'transparent' }} />
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontSize: 19,
                color: '#fff',
              }}
            >
              {item.getLabel()}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: 36,
                color: '#fff',
              }}
            >
              {loc.formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
            </Text>
            <Text style={{ backgroundColor: 'transparent' }} />
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontSize: 13,
                color: '#fff',
              }}
            >
              {loc.wallets.list.latest_transaction}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: 16,
                color: '#fff',
              }}
            >
              {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center', paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    } else if (this.state.data.length <= 0) {
      return (
        <SafeBlueArea style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 }}>
            <BlueText style={{ textAlign: 'center' }}>There are currently no Bitcoin wallets available.</BlueText>
            <BlueSpacing20 />
            <BlueText style={{ textAlign: 'center' }}>
              A Bitcoin wallet is required to refill Lightning wallets. Please, create or import one.
            </BlueText>
          </View>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea>
        <FlatList
          style={{ flex: 1 }}
          extraData={this.state.data}
          data={this.state.data}
          renderItem={this._renderItem}
          keyExtractor={(_item, index) => `${index}`}
        />
      </SafeBlueArea>
    );
  }
}

SelectWallet.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    dismiss: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
