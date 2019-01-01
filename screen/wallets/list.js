import React, { Component } from 'react';
import { View, TouchableOpacity, Text, FlatList, RefreshControl, ScrollView } from 'react-native';
import {
  BlueTransactionOnchainIcon,
  BlueLoading,
  SafeBlueArea,
  WalletsCarousel,
  BlueTransactionIncommingIcon,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
  BlueTransactionOffchainIcon,
  BlueTransactionExpiredIcon,
  BlueList,
  BlueListItem,
  BlueHeaderDefaultMain,
  BlueTransactionOffchainIncomingIcon,
} from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { NavigationEvents } from 'react-navigation';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { BitcoinUnit } from '../../models/bitcoinUnits';
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
      wallets: BlueApp.getWallets().concat(false),
      lastSnappedTo: 0,
    };
    EV(EV.enum.WALLETS_COUNT_CHANGED, this.refreshFunction.bind(this));

    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.refreshFunction.bind(this));
  }

  componentDidMount() {
    this.refreshFunction();
  }

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet.
   * Triggered manually by user on pull-to-refresh.
   */
  refreshTransactions() {
    if (!(this.lastSnappedTo < BlueApp.getWallets().length)) {
      // last card, nop
      console.log('last card, nop');
      return;
    }

    this.setState(
      {
        isTransactionsLoading: true,
      },
      async function() {
        let that = this;
        setTimeout(async function() {
          // more responsive
          let noErr = true;
          try {
            await BlueApp.fetchWalletBalances(that.lastSnappedTo || 0);
            let start = +new Date();
            await BlueApp.fetchWalletTransactions(that.lastSnappedTo || 0);
            let end = +new Date();
            console.log('fetch tx took', (end - start) / 1000, 'sec');
          } catch (err) {
            noErr = false;
            console.warn(err);
          }
          if (noErr) await BlueApp.saveToDisk(); // caching

          that.refreshFunction();
        }, 1);
      },
    );
  }

  /**
   * Redraws the screen
   */
  refreshFunction() {
    if (BlueApp.getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    }

    this.setState({
      isLoading: false,
      isTransactionsLoading: false,
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

  handleClick(index, gradients) {
    console.log('click', index);
    let wallet = BlueApp.wallets[index];
    if (wallet) {
      this.props.navigation.navigate('WalletTransactions', {
        wallet: wallet,
        gradients: gradients,
      });
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      this.props.navigation.navigate('AddWallet');
    }
  }

  onSnapToItem(index) {
    console.log('onSnapToItem', index);
    this.lastSnappedTo = index;
    this.setState({ lastSnappedTo: index });

    if (index < BlueApp.getWallets().length) {
      // not the last
    }

    // now, lets try to fetch balance and txs for this wallet in case it has changed
    this.lazyRefreshWallet(index);
  }

  /**
   * Decides whether wallet with such index shoud be refreshed,
   * refreshes if yes and redraws the screen
   * @param index {Integer} Index of the wallet.
   * @return {Promise.<void>}
   */
  async lazyRefreshWallet(index) {
    /** @type {Array.<AbstractWallet>} wallets */
    let wallets = BlueApp.getWallets();
    if (!wallets[index]) {
      return;
    }

    let oldBalance = wallets[index].getBalance();
    let noErr = true;
    let didRefresh = false;

    try {
      if (wallets && wallets[index] && wallets[index].timeToRefreshBalance()) {
        console.log('snapped to, and now its time to refresh wallet #', index);
        await wallets[index].fetchBalance();
        if (oldBalance !== wallets[index].getBalance() || wallets[index].getUnconfirmedBalance() !== 0) {
          console.log('balance changed, thus txs too');
          // balance changed, thus txs too
          await wallets[index].fetchTransactions();
          this.refreshFunction();
          didRefresh = true;
        } else if (wallets[index].timeToRefreshTransaction()) {
          console.log(wallets[index].getLabel(), 'thinks its time to refresh TXs');
          await wallets[index].fetchTransactions();
          if (wallets[index].fetchPendingTransactions) {
            await wallets[index].fetchPendingTransactions();
          }
          if (wallets[index].fetchUserInvoices) {
            await wallets[index].fetchUserInvoices();
          }
          this.refreshFunction();
          didRefresh = true;
        } else {
          console.log('balance not changed');
        }
      }
    } catch (Err) {
      noErr = false;
      console.warn(Err);
    }

    if (noErr && didRefresh) {
      await BlueApp.saveToDisk(); // caching
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

  rowTitle = item => {
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        return loc.formatBalanceWithoutSuffix(item.value && item.value, BitcoinUnit.BTC);
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          return loc.formatBalanceWithoutSuffix(item.value && item.value, BitcoinUnit.BTC);
        } else {
          return loc.lnd.expired;
        }
      }
    } else {
      return loc.formatBalanceWithoutSuffix(item.value && item.value, BitcoinUnit.BTC);
    }
  };

  rowTitleStyle = item => {
    let color = '#37c0a1';

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        color = '#37c0a1';
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = '#37c0a1';
        } else {
          color = '#FF0000';
        }
      }
    } else if (item.value / 100000000 < 0) {
      color = BlueApp.settings.foregroundColor;
    }

    return {
      fontWeight: '600',
      fontSize: 16,
      color: color,
    };
  };

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }
    return (
      <SafeBlueArea style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <NavigationEvents
          onWillFocus={() => {
            this.refreshFunction();
          }}
        />
        <ScrollView
          refreshControl={<RefreshControl onRefresh={() => this.refreshTransactions()} refreshing={this.state.isTransactionsLoading} />}
        >
          <BlueHeaderDefaultMain leftText={loc.wallets.list.title} onNewWalletPress={() => this.props.navigation.navigate('AddWallet')} />
          <WalletsCarousel
            data={this.state.wallets}
            handleClick={(index, headerColor) => {
              this.handleClick(index, headerColor);
            }}
            handleLongPress={this.handleLongPress}
            onSnapToItem={index => {
              this.onSnapToItem(index);
            }}
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
              renderItem={rowData => {
                return (
                  <BlueListItem
                    avatar={(() => {
                      // is it lightning refill tx?
                      if (rowData.item.category === 'receive' && rowData.item.confirmations < 3) {
                        return (
                          <View style={{ width: 25 }}>
                            <BlueTransactionPendingIcon />
                          </View>
                        );
                      }

                      if (rowData.item.type && rowData.item.type === 'bitcoind_tx') {
                        return (
                          <View style={{ width: 25 }}>
                            <BlueTransactionOnchainIcon />
                          </View>
                        );
                      }
                      if (rowData.item.type === 'paid_invoice') {
                        // is it lightning offchain payment?
                        return (
                          <View style={{ width: 25 }}>
                            <BlueTransactionOffchainIcon />
                          </View>
                        );
                      }

                      if (rowData.item.type === 'user_invoice' || rowData.item.type === 'payment_request') {
                        if (!rowData.item.ispaid) {
                          const currentDate = new Date();
                          const now = (currentDate.getTime() / 1000) | 0;
                          const invoiceExpiration = rowData.item.timestamp + rowData.item.expire_time;
                          if (invoiceExpiration < now) {
                            return (
                              <View style={{ width: 25 }}>
                                <BlueTransactionExpiredIcon />
                              </View>
                            );
                          }
                        } else {
                          return (
                            <View style={{ width: 25 }}>
                              <BlueTransactionOffchainIncomingIcon />
                            </View>
                          );
                        }
                      }

                      if (!rowData.item.confirmations) {
                        return (
                          <View style={{ width: 25 }}>
                            <BlueTransactionPendingIcon />
                          </View>
                        );
                      } else if (rowData.item.value < 0) {
                        return (
                          <View style={{ width: 25 }}>
                            <BlueTransactionOutgoingIcon />
                          </View>
                        );
                      } else {
                        return (
                          <View style={{ width: 25 }}>
                            <BlueTransactionIncommingIcon />
                          </View>
                        );
                      }
                    })()}
                    title={loc.transactionTimeToReadable(rowData.item.received)}
                    subtitle={
                      (rowData.item.confirmations < 7 ? loc.transactions.list.conf + ': ' + rowData.item.confirmations + ' ' : '') +
                      this.txMemo(rowData.item.hash) +
                      (rowData.item.memo || '')
                    }
                    onPress={() => {
                      if (rowData.item.hash) {
                        navigate('TransactionDetails', {
                          hash: rowData.item.hash,
                        });
                      } else if (rowData.item.type === 'user_invoice') {
                        // this.props.navigation.navigate('LNDViewInvoice', {
                        //   invoice: rowData.item,
                        //   fromWallet: this.state.wallets[this.state.lastSnappedTo],
                        // });
                      }
                    }}
                    badge={{
                      value: 3,
                      textStyle: { color: 'orange' },
                      containerStyle: { marginTop: 0 },
                    }}
                    hideChevron
                    rightTitle={this.rowTitle(rowData.item)}
                    rightTitleStyle={this.rowTitleStyle(rowData.item)}
                  />
                );
              }}
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
