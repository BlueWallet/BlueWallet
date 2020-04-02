/* global alert */
import React, { Component } from 'react';
import { Chain } from '../../models/bitcoinUnits';
import {
  Text,
  Platform,
  StyleSheet,
  View,
  Keyboard,
  ActivityIndicator,
  InteractionManager,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import PropTypes from 'prop-types';
import { NavigationEvents } from 'react-navigation';
import {
  BlueSendButtonIcon,
  BlueListItem,
  BlueReceiveButtonIcon,
  BlueTransactionListItem,
  BlueWalletNavigationHeader,
} from '../../BlueComponents';
import WalletGradient from '../../class/walletGradient';
import { Icon } from 'react-native-elements';
import Handoff from 'react-native-handoff';
import Modal from 'react-native-modal';
import NavigationService from '../../NavigationService';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');
const EV = require('../../events');
const BlueElectrum = require('../../BlueElectrum');

export default class WalletTransactions extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      headerRight: (
        <TouchableOpacity
          disabled={navigation.getParam('isLoading') === true}
          style={{
            marginHorizontal: 16,
            minWidth: 150,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
          onPress={() =>
            navigation.navigate('WalletDetails', {
              wallet: navigation.state.params.wallet,
            })
          }>
          <Icon name="kebab-horizontal" type="octicon" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: WalletGradient.headerColorFor(navigation.state.params.wallet.type),
        borderBottomWidth: 0,
        elevation: 0,
        shadowRadius: 0,
      },
      headerTintColor: '#FFFFFF',
    };
  };

  walletBalanceText = null;

  constructor(props) {
    super(props);

    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, this.refreshTransactionsFunction.bind(this));
    const wallet = props.navigation.getParam('wallet');
    this.props.navigation.setParams({ wallet: wallet, isLoading: true });
    this.state = {
      isLoading: true,
      isManageFundsModalVisible: false,
      showShowFlatListRefreshControl: false,
      wallet: wallet,
      dataSource: this.getTransactions(15),
      limit: 15,
      pageSize: 20,
    };
  }

  componentDidMount() {
    this.props.navigation.setParams({ isLoading: false });
  }

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  refreshTransactionsFunction() {
    const that = this;
    setTimeout(function() {
      that.refreshTransactions();
    }, 4000); // giving a chance to remote server to propagate
  }

  /**
   * Simple wrapper for `wallet.getTransactions()`, where `wallet` is current wallet.
   * Sorts. Provides limiting.
   *
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @returns {Array}
   */
  getTransactions(limit = Infinity) {
    const wallet = this.props.navigation.getParam('wallet');
    let txs = wallet.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function(a, b) {
      return b.sort_ts - a.sort_ts;
    });
    return txs.slice(0, limit);
  }

  redrawScreen() {
    InteractionManager.runAfterInteractions(async () => {
      console.log('wallets/transactions redrawScreen()');

      this.setState({
        isLoading: false,
        showShowFlatListRefreshControl: false,
        dataSource: this.getTransactions(this.state.limit),
      });
    });
  }

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  refreshTransactions() {
    if (this.state.isLoading) return;
    this.setState(
      {
        showShowFlatListRefreshControl: true,
        isLoading: true,
      },
      async () => {
        let noErr = true;
        let smthChanged = false;
        try {
          await BlueElectrum.ping();
          await BlueElectrum.waitTillConnected();
          /** @type {LegacyWallet} */
          const wallet = this.state.wallet;
          const balanceStart = +new Date();
          const oldBalance = wallet.getBalance();
          await wallet.fetchBalance();
          if (oldBalance !== wallet.getBalance()) smthChanged = true;
          const balanceEnd = +new Date();
          console.log(wallet.getLabel(), 'fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          const start = +new Date();
          const oldTxLen = wallet.getTransactions().length;
          await wallet.fetchTransactions();
          if (wallet.fetchPendingTransactions) {
            await wallet.fetchPendingTransactions();
          }
          if (wallet.fetchUserInvoices) {
            await wallet.fetchUserInvoices();
          }
          if (oldTxLen !== wallet.getTransactions().length) smthChanged = true;
          const end = +new Date();
          console.log(wallet.getLabel(), 'fetch tx took', (end - start) / 1000, 'sec');
        } catch (err) {
          noErr = false;
          alert(err.message);
          this.setState({
            isLoading: false,
            showShowFlatListRefreshControl: false,
          });
        }
        if (noErr && smthChanged) {
          console.log('saving to disk');
          await BlueApp.saveToDisk(); // caching
          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED); // let other components know they should redraw
        }
        this.redrawScreen();
      },
    );
  }

  _keyExtractor = (_item, index) => index.toString();

  renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return (
      (this.getTransactions(Infinity).length > this.state.limit && (
        <ActivityIndicator style={{ marginVertical: 20 }} />
      )) || <View />
    );
  };

  renderListHeaderComponent = () => {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Text
          style={{
            flex: 1,
            marginLeft: 16,
            marginTop: 24,
            marginBottom: 8,
            fontWeight: 'bold',
            fontSize: 24,
            color: BlueApp.settings.foregroundColor,
          }}>
          {loc.transactions.list.title}
        </Text>
      </View>
    );
  };

  onWalletSelect = async wallet => {
    if (wallet) {
      NavigationService.navigate('WalletTransactions', {
        key: `WalletTransactions-${wallet.getID()}`,
      });
      /** @type {LightningCustodianWallet} */
      let toAddress = false;
      if (this.state.wallet.refill_addressess.length > 0) {
        toAddress = this.state.wallet.refill_addressess[0];
      } else {
        try {
          await this.state.wallet.fetchBtcAddress();
          toAddress = this.state.wallet.refill_addressess[0];
        } catch (Err) {
          return alert(Err.message);
        }
      }
      this.props.navigation.navigate('SendDetails', {
        memo: loc.lnd.refill_lnd_balance,
        fromSecret: wallet.getSecret(),
        address: toAddress,
        fromWallet: wallet,
      });
    }
  };

  async onWillBlur() {
    StatusBar.setBarStyle('dark-content');
  }

  componentWillUnmount() {
    this.onWillBlur();
  }

  renderItem = item => {
    return <BlueTransactionListItem item={item.item} itemPriceUnit={this.state.wallet.getPreferredBalanceUnit()} />;
  };

  render() {
    const { navigate } = this.props.navigation;
    return (
      <View style={{ flex: 1 }}>
        {this.state.wallet.chain === Chain.ONCHAIN}
        <NavigationEvents
          onWillFocus={() => {
            StatusBar.setBarStyle('light-content');
            this.redrawScreen();
          }}
          onWillBlur={() => this.onWillBlur()}
          onDidFocus={() => this.props.navigation.setParams({ isLoading: false })}
        />
        <BlueWalletNavigationHeader
          wallet={this.state.wallet}
          onWalletUnitChange={wallet =>
            InteractionManager.runAfterInteractions(async () => {
              this.setState({ wallet }, () => InteractionManager.runAfterInteractions(() => BlueApp.saveToDisk()));
            })
          }
        />
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <View
            style={{
              flexDirection: 'row',
              margin: 16,
              justifyContent: 'space-evenly',
            }}></View>
          <FlatList
            onEndReachedThreshold={0.3}
            onEndReached={() => {
              // pagination in works. in this block we will add more txs to flatlist
              // so as user scrolls closer to bottom it will render mode transactions

              if (this.getTransactions(Infinity).length < this.state.limit) {
                // all list rendered. nop
                return;
              }

              this.setState({
                dataSource: this.getTransactions(this.state.limit + this.state.pageSize),
                limit: this.state.limit + this.state.pageSize,
                pageSize: this.state.pageSize * 2,
              });
            }}
            ListHeaderComponent={this.renderListHeaderComponent}
            ListFooterComponent={this.renderListFooterComponent}
            ListEmptyComponent={
              <ScrollView
                style={{ minHeight: 100 }}
                contentContainerStyle={{
                  flex: 1,
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                }}>
                <Text
                  numberOfLines={0}
                  style={{
                    fontSize: 18,
                    color: '#9aa0aa',
                    textAlign: 'center',
                  }}>
                  {true && loc.wallets.list.empty_txs1}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    color: '#9aa0aa',
                    textAlign: 'center',
                  }}>
                  {true && loc.wallets.list.empty_txs2}
                </Text>

                <Text />
                <Text />
              </ScrollView>
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => this.refreshTransactions()}
                refreshing={this.state.showShowFlatListRefreshControl}
              />
            }
            extraData={this.state.dataSource}
            data={this.state.dataSource}
            keyExtractor={this._keyExtractor}
            renderItem={this.renderItem}
            contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'center',
            backgroundColor: 'transparent',
            position: 'absolute',
            bottom: 30,
            borderRadius: 30,
            minHeight: 48,
            overflow: 'hidden',
          }}>
          {(() => {
            if (this.state.wallet.allowReceive()) {
              return (
                <BlueReceiveButtonIcon
                  onPress={() => {
                    navigate('ReceiveDetails', {
                      secret: this.state.wallet.getSecret(),
                    });
                  }}
                />
              );
            }
          })()}

          {(() => {
            if (this.state.wallet.allowSend()) {
              return (
                <BlueSendButtonIcon
                  onPress={() => {
                    navigate('SendDetails', {
                      fromAddress: this.state.wallet.getAddress(),
                      fromSecret: this.state.wallet.getSecret(),
                      fromWallet: this.state.wallet,
                    });
                  }}
                />
              );
            }
          })()}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },
  advancedTransactionOptionsModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 130,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

WalletTransactions.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    setParams: PropTypes.func,
  }),
};
