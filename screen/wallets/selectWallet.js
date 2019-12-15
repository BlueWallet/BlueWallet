import React, { Component } from 'react';
import { View, ActivityIndicator, Image, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueText, BlueSpacing20, BluePrivateBalance } from '../../BlueComponents';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../class/walletGradient';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class SelectWallet extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true, navigation.getParam('dismissAcion')),
    title: loc.wallets.select_wallet,
  });

  constructor(props) {
    super(props);
    props.navigation.setParams({ dismissAcion: this.dismissComponent });
    this.state = {
      isLoading: true,
      data: [],
    };
    this.chainType = props.navigation.getParam('chainType');
  }

  dismissComponent = () => {
    this.props.navigation.goBack(null);
  };

  componentDidMount() {
    const wallets = this.chainType
      ? BlueApp.getWallets().filter(item => item.chain === this.chainType && item.allowSend())
      : BlueApp.getWallets().filter(item => item.allowSend());
    this.setState({
      data: wallets,
      isLoading: false,
    });
  }

  _renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
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
            colors={WalletGradient.gradientsFor(item.type)}
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
            {item.hideBalance ? (
              <BluePrivateBalance />
            ) : (
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
            )}
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
    goBack: PropTypes.func,
    setParams: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
