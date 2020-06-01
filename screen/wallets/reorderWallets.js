import React, { Component } from 'react';
import { View, ActivityIndicator, Image, Text, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle } from '../../BlueComponents';
import SortableList from 'react-native-sortable-list';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';
import { PlaceholderWallet, LightningCustodianWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../class/wallet-gradient';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc/');

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
  },
  itemRoot: {
    backgroundColor: 'transparent',
    padding: 10,
    marginVertical: 17,
  },
  gradient: {
    padding: 15,
    borderRadius: 10,
    minHeight: 164,
    elevation: 5,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  transparentText: {
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    color: '#fff',
  },
  latestTxLabel: {
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#fff',
  },
  latestTxValue: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
});

export default class ReorderWallets extends Component {
  static navigationOptions = ({ navigation, route }) => ({
    ...BlueNavigationStyle(
      navigation,
      true,
      route.params && route.params.customCloseButtonFunction ? route.params.customCloseButtonFunction : undefined,
    ),
    headerTitle: loc.wallets.reorder.title,
    headerLeft: null,
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
          this.props.navigation.goBack();
        } else {
          this.props.navigation.goBack();
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
      <View shadowOpacity={40 / 100} shadowOffset={{ width: 0, height: 0 }} shadowRadius={5} style={styles.itemRoot}>
        <LinearGradient shadowColor="#000000" colors={WalletGradient.gradientsFor(item.type)} style={styles.gradient}>
          <Image
            source={
              (LightningCustodianWallet.type === item.type && require('../../img/lnd-shape.png')) || require('../../img/btc-shape.png')
            }
            style={styles.image}
          />

          <Text style={styles.transparentText} />
          <Text numberOfLines={1} style={styles.label}>
            {item.getLabel()}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
            {loc.formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
          </Text>
          <Text style={styles.transparentText} />
          <Text numberOfLines={1} style={styles.latestTxLabel}>
            {loc.wallets.list.latest_transaction}
          </Text>
          <Text numberOfLines={1} style={styles.latestTxValue}>
            {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea>
        <SortableList
          ref={ref => (this.sortableList = ref)}
          style={styles.root}
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
    goBack: PropTypes.func,
  }),
};
