import React, { Component } from 'react';
import { View, TouchableOpacity, Text, FlatList, InteractionManager, RefreshControl, ScrollView } from 'react-native';
import { BlueLoading, SafeBlueArea, WalletsCarousel, BlueList, BlueHeaderDefaultMain, BlueTransactionListItem } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { NavigationEvents } from 'react-navigation';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import WalletGradient from '../../class/walletGradient';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class WalletsList extends Component {
  static navigationOptions = ({ navigation }) => ({
    headerStyle: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 0,
      elevation: 0,
    },
    headerRight: (
      <TouchableOpacity
        style={{ marginHorizontal: 16, width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' }}
        onPress={() => navigation.navigate('Settings')}
      >
        <Icon name="kebab-horizontal" size={22} type="octicon" color={BlueApp.settings.foregroundColor} />
      </TouchableOpacity>
    ),
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isFlatListRefreshControlHidden: true,
      wallets: BlueApp.getWallets().concat(false),
      lastSnappedTo: 0,
    };
    EV(EV.enum.WALLETS_COUNT_CHANGED, this.redrawScreen.bind(this));

    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.redrawScreen.bind(this));
  }

  componentDidMount() {
    this.redrawScreen();
  }

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet.
   * Triggered manually by user on pull-to-refresh.
   */
  refreshTransactions() {
    this.setState(
      {
        isFlatListRefreshControlHidden: true,
      },
      () => {
        InteractionManager.runAfterInteractions(async () => {
          // more responsive
          let noErr = true;
          try {
            let balanceStart = +new Date();
            await BlueApp.fetchWalletBalances();
            let balanceEnd = +new Date();
            console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
            let start = +new Date();
            await BlueApp.fetchWalletTransactions();
            let end = +new Date();
            console.log('fetch tx took', (end - start) / 1000, 'sec');
          } catch (err) {
            noErr = false;
            console.warn(err);
          }
          if (noErr) await BlueApp.saveToDisk(); // caching
          this.redrawScreen();
        });
      },
    );
  }

  redrawScreen() {
    console.log('wallets/list redrawScreen()');
    if (BlueApp.getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    }

    this.setState({
      isLoading: false,
      isFlatListRefreshControlHidden: true,
      dataSource: BlueApp.getTransactions(),
      wallets: BlueApp.getWallets().concat(false),
    });
  }

  txMemo(hash) {
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash]['memo']) {
      return BlueApp.tx_metadata[hash]['memo'];
    }
    return '';
  }

  handleClick(index) {
    console.log('click', index);
    let wallet = BlueApp.wallets[index];
    if (wallet) {
      this.props.navigation.navigate('WalletTransactions', {
        wallet: wallet,
        headerColor: WalletGradient.headerColorFor(wallet.type),
      });
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      this.props.navigation.navigate('AddWallet');
    }
  }

  _keyExtractor = (_item, index) => index.toString();

  renderListHeaderComponent = () => {
    return (
      <View>
        <Text
          style={{
            paddingLeft: 15,
            fontWeight: 'bold',
            fontSize: 24,
            marginVertical: 8,
            color: BlueApp.settings.foregroundColor,
          }}
        >
          {loc.transactions.list.title}
        </Text>
      </View>
    );
  };

  handleLongPress = () => {
    if (BlueApp.getWallets().length > 1) {
      this.props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', false);
    }
  };

  _renderItem = data => {
    return <BlueTransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} />;
  };
  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }
    return (
      <SafeBlueArea style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <NavigationEvents
          onWillFocus={() => {
            this.redrawScreen();
          }}
        />
        <ScrollView
          refreshControl={
            <RefreshControl onRefresh={() => this.refreshTransactions()} refreshing={!this.state.isFlatListRefreshControlHidden} />
          }
        >
          <BlueHeaderDefaultMain leftText={loc.wallets.list.title} onNewWalletPress={() => this.props.navigation.navigate('AddWallet')} />
          <WalletsCarousel
            data={this.state.wallets}
            handleClick={index => {
              this.handleClick(index);
            }}
            handleLongPress={this.handleLongPress}
          />
          <BlueList>
            <FlatList
              ListHeaderComponent={this.renderListHeaderComponent}
              ListEmptyComponent={
                <View style={{ top: 50, height: 100 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: '#9aa0aa',
                      textAlign: 'center',
                    }}
                  >
                    {loc.wallets.list.empty_txs1}
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      color: '#9aa0aa',
                      textAlign: 'center',
                    }}
                  >
                    {loc.wallets.list.empty_txs2}
                  </Text>
                </View>
              }
              data={this.state.dataSource}
              extraData={this.state.dataSource}
              keyExtractor={this._keyExtractor}
              renderItem={this._renderItem}
            />
          </BlueList>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

WalletsList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
