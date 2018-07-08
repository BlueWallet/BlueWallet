import React, { Component } from 'react';
import { View, Dimensions, Text, ListView } from 'react-native';
import {
  BlueLoading,
  SafeBlueArea,
  WalletsCarousel,
  BlueTransactionIncommingIcon,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
  BlueSendButtonIcon,
  BlueReceiveButtonIcon,
  BlueRefreshIcon,
  BlueList,
  BlueListItem,
  BlueHeaderDefaultMain,
  is,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');

let ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class WalletsList extends Component {
  static navigationOptions = {
    tabBarVisible: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
    EV(EV.enum.WALLETS_COUNT_CHANGED, this.refreshFunction.bind(this));
  }

  async componentDidMount() {
    this.refreshFunction();
  } // end of componendDidMount

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet
   */
  refreshTransactions() {
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
            await BlueApp.fetchWalletTransactions(that.lastSnappedTo || 0);
            await BlueApp.fetchWalletBalances(that.lastSnappedTo || 0);
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

    setTimeout(() => {
      let showSend = false;
      let showReceive = false;
      let wallets = BlueApp.getWallets();
      let wallet = wallets[this.lastSnappedTo || 0];
      if (wallet) {
        showSend = wallet.allowSend();
        showReceive = wallet.allowReceive();
      }

      this.setState({
        isLoading: false,
        isTransactionsLoading: false,
        showReceiveButton: showReceive,
        showSendButton: showSend,
        showRereshButton: (BlueApp.getWallets().length > 0 && true) || false,
        dataSource: ds.cloneWithRows(BlueApp.getTransactions(this.lastSnappedTo || 0)),
      });
    }, 1);
  }

  txMemo(hash) {
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash]['memo']) {
      return BlueApp.tx_metadata[hash]['memo'];
    }
    return '';
  }

  handleClick(index) {
    console.log('cick', index);
    let wallet = BlueApp.wallets[index];
    if (wallet) {
      this.props.navigation.navigate('WalletDetails', {
        address: wallet.getAddress(),
      });
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      this.props.navigation.navigate('AddWallet');
    }
  }

  onSnapToItem(index) {
    console.log('onSnapToItem', index);
    this.lastSnappedTo = index;
    this.setState({
      isLoading: false,
      showReceiveButton: false,
      showSendButton: false,
      showRereshButton: false,
      // TODO: погуглить че это за ебала ds.cloneWithRows, можно ли быстрее сделать прогрузку транзакций на экран
      dataSource: ds.cloneWithRows(BlueApp.getTransactions(index)),
    });

    if (index < BlueApp.getWallets().length) {
      // do not show for last card

      let showSend = false;
      let showReceive = false;
      let wallets = BlueApp.getWallets();
      let wallet = wallets[this.lastSnappedTo || 0];
      if (wallet) {
        showSend = wallet.allowSend();
        showReceive = wallet.allowReceive();
      }

      setTimeout(
        () =>
          this.setState({
            showReceiveButton: showReceive,
            showSendButton: showSend,
            showRereshButton: true,
          }),
        50,
      ); // just to animate it, no real function
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

    try {
      if (wallets && wallets[index] && wallets[index].timeToRefresh()) {
        console.log('snapped to, and now its time to refresh wallet #', index);
        await wallets[index].fetchBalance();
        if (oldBalance !== wallets[index].getBalance() || wallets[index].getUnconfirmedBalance() !== 0) {
          console.log('balance changed, thus txs too');
          // balance changed, thus txs too
          await wallets[index].fetchTransactions();
          this.refreshFunction();
        } else {
          console.log('balance not changed');
        }
      }
    } catch (Err) {
      noErr = false;
      console.warn(Err);
    }

    if (noErr && oldBalance !== wallets[index].getBalance()) {
      // so we DID refresh
      await BlueApp.saveToDisk(); // caching
    }
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea>
        <BlueHeaderDefaultMain leftText={loc.wallets.list.title} onClose={() => navigate('Settings')} />

        <WalletsCarousel
          data={BlueApp.getWallets().concat(false)}
          handleClick={index => {
            this.handleClick(index);
          }}
          onSnapToItem={index => {
            this.onSnapToItem(index);
          }}
        />

        {(() => {
          if (this.state.isTransactionsLoading) {
            return <BlueLoading />;
          } else {
            return (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, flexDirection: 'row', height: 50 }}>
                  <Text
                    style={{
                      paddingLeft: 15,
                      paddingTop: 15,
                      fontWeight: 'bold',
                      fontSize: 24,
                      color: BlueApp.settings.foregroundColor,
                    }}
                  >
                    {loc.transactions.list.title}
                  </Text>
                  {(() => {
                    if (this.state.showRereshButton) {
                      return <BlueRefreshIcon onPress={() => this.refreshTransactions()} />;
                    }
                  })()}
                </View>

                <View
                  style={{
                    top: is.ipad() ? 60 : 120,
                    position: 'absolute',
                    width: width,
                  }}
                >
                  {(() => {
                    if (BlueApp.getTransactions(this.lastSnappedTo || 0).length === 0) {
                      return (
                        <View>
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
                      );
                    }
                  })()}
                </View>

                <View style={{ top: 30, position: 'absolute' }}>
                  <BlueList>
                    <ListView
                      maxHeight={height - 330 + 10}
                      width={width - 5}
                      left={5}
                      enableEmptySections
                      dataSource={this.state.dataSource}
                      renderRow={rowData => {
                        return (
                          <BlueListItem
                            avatar={(() => {
                              if (!rowData.confirmations) {
                                return (
                                  <View style={{ width: 25 }}>
                                    <BlueTransactionPendingIcon />
                                  </View>
                                );
                              } else if (rowData.value < 0) {
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
                            title={loc.transactionTimeToReadable(rowData.received)}
                            subtitle={
                              (rowData.confirmations < 200 ? loc.transactions.list.conf + ': ' + rowData.confirmations + ' ' : '') +
                              this.txMemo(rowData.hash)
                            }
                            onPress={() => {
                              navigate('TransactionDetails', {
                                hash: rowData.hash,
                              });
                            }}
                            badge={{
                              value: 3,
                              textStyle: { color: 'orange' },
                              containerStyle: { marginTop: 0 },
                            }}
                            chevron={false}
                            chevronColor="transparent"
                            rightTitle={rowData.value / 100000000 + ''}
                            rightTitleStyle={{
                              position: 'relative',
                              right: -30,
                              top: -7,
                              fontWeight: '600',
                              fontSize: 16,
                              color: rowData.value / 100000000 < 0 ? BlueApp.settings.foregroundColor : '#37c0a1',
                            }}
                          />
                        );
                      }}
                    />
                  </BlueList>
                </View>
              </View>
            );
          }
        })()}

        {(() => {
          if (this.state.showReceiveButton) {
            return (
              <BlueReceiveButtonIcon
                onPress={() => {
                  let walletIndex = this.lastSnappedTo || 0;
                  console.log('receiving on #', walletIndex);

                  let c = 0;
                  for (let w of BlueApp.getWallets()) {
                    if (c++ === walletIndex) {
                      console.log('found receiving address ', w.getAddress());
                      navigate('ReceiveDetails', { address: w.getAddress() });
                      EV(EV.enum.RECEIVE_ADDRESS_CHANGED, w.getAddress());
                    }
                  }
                }}
              />
            );
          }
        })()}

        {(() => {
          if (this.state.showSendButton) {
            return (
              <BlueSendButtonIcon
                onPress={() => {
                  let walletIndex = this.lastSnappedTo || 0;

                  let c = 0;
                  for (let w of BlueApp.getWallets()) {
                    if (c++ === walletIndex) {
                      navigate('SendDetails', { fromAddress: w.getAddress() });
                    }
                  }
                }}
              />
            );
          }
        })()}
      </SafeBlueArea>
    );
  }
}

WalletsList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
