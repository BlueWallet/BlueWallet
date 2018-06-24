import React, { Component } from 'react';
import {
  View,
  TouchableOpacity,
  Dimensions,
  Text,
  ListView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Icon } from 'react-native-elements';
import {
  BlueLoading,
  SafeBlueArea,
  BlueHeader,
  WalletsCarousel,
  BlueTransactionIncommingIcon,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
  BlueSendButtonIcon,
  BlueReceiveButtonIcon,
  BlueRefreshIcon,
  BlueList,
  BlueListItem,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');

let ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class WalletsList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.wallets.list.tabBarLabel,
    tabBarVisible: false,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
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

  refreshFunction() {
    setTimeout(() => {
      this.setState({
        isLoading: false,
        isTransactionsLoading: false,
        showReceiveButton: true,
        showSendButton: true,
        final_balance: BlueApp.getBalance(),
        dataSource: ds.cloneWithRows(
          BlueApp.getTransactions(this.lastSnappedTo || 0),
        ),
      });
    }, 1);

    /* this.setState(
      {
        isLoading: true,
      },
      () => {
        setTimeout(() => {
          this.setState({
            isLoading: false,
            final_balance: BlueApp.getBalance(),
            dataSource: ds.cloneWithRows(BlueApp.getTransactions()),
          });
        }, 1);
      },
    ); */

    // this.forceUpdate();

    /* this.setState(
      {
        isLoading: true,
      },
      () => {
        setTimeout(() => {
          this.setState({
            isLoading: false,
          });
        }, 1);
      },
    ); */
  }

  txMemo(hash) {
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash]['memo']) {
      return ' | ' + BlueApp.tx_metadata[hash]['memo'];
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
      final_balance: BlueApp.getBalance(),
      dataSource: ds.cloneWithRows(BlueApp.getTransactions(index)),
    });

    if (index < BlueApp.getWallets().length) {
      // do not show for last card
      setTimeout(
        () => this.setState({ showReceiveButton: true, showSendButton: true }),
        50,
      ); // just to animate it, no real function
    }
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea>
        <BlueHeader
          leftComponent={
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 34,
                color: BlueApp.settings.foregroundColor,
              }}
            >
              {loc.wallets.list.title}
            </Text>
          }
          rightComponent={
            <TouchableOpacity onPress={() => navigate('Settings')}>
              <Icon
                name="ellipsis-h"
                size={16}
                type="font-awesome"
                color={BlueApp.settings.foregroundColor}
              />
            </TouchableOpacity>
          }
        />

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
                <View style={{ flex: 1, flexDirection: 'row' }}>
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
                  <BlueRefreshIcon onPress={() => this.refreshTransactions()} />
                </View>

                <BlueList>
                  <ListView
                    maxHeight={height - 330 + 10}
                    width={width - 5}
                    left={5}
                    top={-10}
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
                          title={loc.transactionTimeToReadable(
                            rowData.received,
                          )}
                          subtitle={
                            this.txMemo(rowData.hash) +
                            (rowData.confirmations < 200
                              ? loc.transactions.list.conf +
                                ': ' +
                                rowData.confirmations
                              : '')
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
                            color:
                              rowData.value / 100000000 < 0
                                ? BlueApp.settings.foregroundColor
                                : '#37c0a1',
                          }}
                        />
                      );
                    }}
                  />
                </BlueList>
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
          if (this.state.showReceiveButton) {
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
