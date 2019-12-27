import React, { Component } from 'react';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle } from '../../BlueComponents';
import SortableList from 'react-native-sortable-list';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';
import { PlaceholderWallet, LightningCustodianWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../class/walletGradient';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc/');

export default class ReorderWallets extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(
      navigation,
      true,
      navigation.getParam('customCloseButtonFunction') ? navigation.state.params.customCloseButtonFunction : undefined,
    ),
    title: loc.wallets.reorder.title,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      data: [],
      hasMovedARow: false,
    };
  }

  componentDidMount() {
    this.props.navigation.setParams({
      customCloseButtonFunction: async () => {
        if (this.sortableList.state.data.length === this.state.data.length && this.state.hasMovedARow) {
          let newWalletsOrderArray = [];
          this.sortableList.state.order.forEach(element => {
            newWalletsOrderArray.push(this.state.data[element]);
          });
          BlueApp.wallets = newWalletsOrderArray;
          await BlueApp.saveToDisk();
          setTimeout(function() {
            EV(EV.enum.WALLETS_COUNT_CHANGED);
          }, 500); // adds some animaton
          this.props.navigation.dismiss();
        } else {
          this.props.navigation.dismiss();
        }
      },
    });

    const wallets = BlueApp.getWallets().filter(wallet => wallet.type !== PlaceholderWallet.type);
    this.setState({
      data: wallets,
      isLoading: false,
    });
  }

  _renderItem = (item, _active) => {
    if (!item.data) {
      return;
    }
    item = item.data;

    return (
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
    );
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea>
        <SortableList
          ref={ref => (this.sortableList = ref)}
          style={{ flex: 1 }}
          data={this.state.data}
          renderRow={this._renderItem}
          onChangeOrder={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', { ignoreAndroidSystemSettings: false });
            this.setState({ hasMovedARow: true });
          }}
          onActivateRow={() => {
            ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
          }}
          onReleaseRow={() => {
            ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
          }}
        />
      </SafeBlueArea>
    );
  }
}

ReorderWallets.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    dismiss: PropTypes.func,
  }),
};
