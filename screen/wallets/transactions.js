/* global alert */
import React, { Component } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  InteractionManager,
  Image,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
  Clipboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';
import { NavigationEvents } from 'react-navigation';
import { BlueSendButtonIcon, BlueReceiveButtonIcon, BlueTransactionListItem } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { LightningCustodianWallet } from '../../class';
import WalletGradient from '../../class/walletGradient';
import ToolTip from 'react-native-tooltip';
import showPopupMenu from 'react-native-popup-menu-android';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let EV = require('../../events');

export default class WalletTransactions extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      headerRight: (
        <TouchableOpacity
          disabled={navigation.getParam('isLoading') === true}
          style={{ marginHorizontal: 16, minWidth: 150, justifyContent: 'center', alignItems: 'flex-end' }}
          onPress={() =>
            navigation.navigate('WalletDetails', {
              wallet: navigation.state.params.wallet,
            })
          }
        >
          <Icon name="kebab-horizontal" size={22} type="octicon" color="#FFFFFF" />
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: navigation.getParam('headerColor'),
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
      showShowFlatListRefreshControl: false,
      wallet: wallet,
      dataSource: this.getTransactions(15),
      limit: 15,
      pageSize: 20,
      walletPreviousPreferredUnit: wallet.getPreferredBalanceUnit(),
    };
  }

  componentDidMount() {
    // nop
    this.props.navigation.setParams({ isLoading: false });
  }

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  refreshTransactionsFunction() {
    let that = this;
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
    let wallet = this.props.navigation.getParam('wallet');
    let txs = wallet.getTransactions();
    for (let tx of txs) {
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

  isLightning() {
    let w = this.state.wallet;
    if (w && w.chain === Chain.OFFCHAIN) {
      return true;
    }

    return false;
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
          /** @type {LegacyWallet} */
          let wallet = this.state.wallet;
          let balanceStart = +new Date();
          const oldBalance = wallet.getBalance();
          await wallet.fetchBalance();
          if (oldBalance !== wallet.getBalance()) smthChanged = true;
          let balanceEnd = +new Date();
          console.log(wallet.getLabel(), 'fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          let start = +new Date();
          const oldTxLen = wallet.getTransactions().length;
          await wallet.fetchTransactions();
          if (oldTxLen !== wallet.getTransactions().length) smthChanged = true;
          if (wallet.fetchPendingTransactions) {
            await wallet.fetchPendingTransactions();
          }
          if (wallet.fetchUserInvoices) {
            await wallet.fetchUserInvoices();
          }
          let end = +new Date();
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

  changeWalletBalanceUnit() {
    let walletPreviousPreferredUnit = this.state.wallet.getPreferredBalanceUnit();
    const wallet = this.state.wallet;
    if (walletPreviousPreferredUnit === BitcoinUnit.BTC) {
      wallet.preferredBalanceUnit = BitcoinUnit.SATS;
      walletPreviousPreferredUnit = BitcoinUnit.BTC;
    } else if (walletPreviousPreferredUnit === BitcoinUnit.SATS) {
      wallet.preferredBalanceUnit = BitcoinUnit.LOCAL_CURRENCY;
      walletPreviousPreferredUnit = BitcoinUnit.SATS;
    } else if (walletPreviousPreferredUnit === BitcoinUnit.LOCAL_CURRENCY) {
      wallet.preferredBalanceUnit = BitcoinUnit.BTC;
      walletPreviousPreferredUnit = BitcoinUnit.BTC;
    } else {
      wallet.preferredBalanceUnit = BitcoinUnit.BTC;
      walletPreviousPreferredUnit = BitcoinUnit.BTC;
    }

    this.setState({ wallet: wallet, walletPreviousPreferredUnit: walletPreviousPreferredUnit });
  }

  handleCopyPress = _item => {
    Clipboard.setString(loc.formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit()).toString());
  };

  showAndroidTooltip = () => {
    showPopupMenu(
      [{ id: loc.transactions.details.copy, label: loc.transactions.details.copy }],
      this.handleCopyPress,
      this.walletBalanceText,
    );
  };

  renderWalletHeader = () => {
    return (
      <LinearGradient
        colors={WalletGradient.gradientsFor(this.state.wallet.type)}
        style={{ padding: 15, minHeight: 140, justifyContent: 'center' }}
      >
        <Image
          source={(Chain.OFFCHAIN === this.state.wallet.chain && require('../../img/lnd-shape.png')) || require('../../img/btc-shape.png')}
          style={{
            width: 99,
            height: 94,
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />

        <Text
          numberOfLines={1}
          style={{
            backgroundColor: 'transparent',
            fontSize: 19,
            color: '#fff',
          }}
        >
          {this.state.wallet.getLabel()}
        </Text>
        {Platform.OS === 'ios' && (
          <ToolTip
            ref={tooltip => (this.tooltip = tooltip)}
            actions={[{ text: loc.transactions.details.copy, onPress: this.handleCopyPress }]}
          />
        )}
        <TouchableOpacity
          onPress={() => this.changeWalletBalanceUnit()}
          ref={ref => (this.walletBalanceText = ref)}
          onLongPress={() => (Platform.OS === 'ios' ? this.tooltip.showMenu() : this.showAndroidTooltip())}
        >
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
            {loc.formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit(), true).toString()}
          </Text>
        </TouchableOpacity>
        {this.state.wallet.type === LightningCustodianWallet.type && (
          <TouchableOpacity onPress={() => this.props.navigation.navigate('ManageFunds', { fromWallet: this.state.wallet })}>
            <View
              style={{
                marginTop: 14,
                marginBottom: 10,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 9,
                minWidth: 119,
                minHeight: 39,
                width: 119,
                height: 39,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontWeight: '500',
                  fontSize: 14,
                  color: '#FFFFFF',
                }}
              >
                {loc.lnd.title}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  };

  _keyExtractor = (_item, index) => index.toString();

  renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return (this.getTransactions(Infinity).length > this.state.limit && <ActivityIndicator />) || <View />;
  };

  renderListHeaderComponent = () => {
    return (
      <View style={{ flex: 1, flexDirection: 'row', height: 50 }}>
        <Text
          style={{
            flex: 1,
            marginLeft: 15,
            marginTop: 10,
            fontWeight: 'bold',
            fontSize: 24,
            color: BlueApp.settings.foregroundColor,
          }}
        >
          {loc.transactions.list.title}
        </Text>
      </View>
    );
  };

  async onWillBlur() {
    StatusBar.setBarStyle('dark-content');
    await BlueApp.saveToDisk();
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
        <NavigationEvents
          onWillFocus={() => {
            StatusBar.setBarStyle('light-content');
            this.redrawScreen();
          }}
          onWillBlur={() => this.onWillBlur()}
          onDidFocus={() => this.props.navigation.setParams({ isLoading: false })}
        />
        {this.renderWalletHeader()}

        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {this.state.wallet.type === LightningCustodianWallet.type && (
            <TouchableOpacity
              onPress={() => {
                console.log('navigating to LappBrowser');
                navigate('LappBrowser', { fromSecret: this.state.wallet.getSecret(), fromWallet: this.state.wallet });
              }}
            >
              <View
                style={{
                  margin: 16,
                  backgroundColor: '#f2f2f2',
                  borderRadius: 9,
                  minWidth: 343,
                  minHeight: 49,
                  justifyContent: 'center',
                  alignItems: 'center',
                  alignSelf: 'center',
                }}
              >
                <Text style={{ color: '#062453', fontSize: 18 }}>marketplace</Text>
              </View>
            </TouchableOpacity>
          )}
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
              <View style={{ top: 50, minHeight: 200, paddingHorizontal: 16 }}>
                <Text
                  numberOfLines={0}
                  style={{
                    fontSize: 18,
                    color: '#9aa0aa',
                    textAlign: 'center',
                  }}
                >
                  {(this.isLightning() &&
                    'Lightning wallet should be used for your daily transactions. Fees are unfairly cheap and speed is blazing fast.') ||
                    loc.wallets.list.empty_txs1}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    color: '#9aa0aa',
                    textAlign: 'center',
                  }}
                >
                  {(this.isLightning() && '\nTo start using it tap on "manage funds" and topup your balance') ||
                    loc.wallets.list.empty_txs2}
                </Text>

                <Text />
                <Text />

                {!this.isLightning() && (
                  <Text
                    style={{
                      fontSize: 18,
                      color: '#9aa0aa',
                      textAlign: 'center',
                      textDecorationLine: 'underline',
                    }}
                    onPress={() =>
                      this.props.navigation.navigate('BuyBitcoin', {
                        address: this.state.wallet.getAddress(),
                        secret: this.state.wallet.getSecret(),
                      })
                    }
                  >
                    {loc.wallets.list.tap_here_to_buy}
                  </Text>
                )}
              </View>
            }
            refreshControl={
              <RefreshControl onRefresh={() => this.refreshTransactions()} refreshing={this.state.showShowFlatListRefreshControl} />
            }
            data={this.state.dataSource}
            keyExtractor={this._keyExtractor}
            renderItem={this.renderItem}
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
            flex: 0.84,
            overflow: 'hidden',
          }}
        >
          {(() => {
            if (this.state.wallet.allowReceive()) {
              return (
                <BlueReceiveButtonIcon
                  onPress={() => {
                    if (this.state.wallet.chain === Chain.OFFCHAIN) {
                      navigate('LNDCreateInvoice', { fromWallet: this.state.wallet });
                    } else {
                      navigate('ReceiveDetails', { address: this.state.wallet.getAddress(), secret: this.state.wallet.getSecret() });
                    }
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
                    if (this.state.wallet.chain === Chain.OFFCHAIN) {
                      navigate('ScanLndInvoice', { fromSecret: this.state.wallet.getSecret() });
                    } else {
                      navigate('SendDetails', {
                        fromAddress: this.state.wallet.getAddress(),
                        fromSecret: this.state.wallet.getSecret(),
                        fromWallet: this.state.wallet,
                      });
                    }
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

WalletTransactions.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    setParams: PropTypes.func,
  }),
};
