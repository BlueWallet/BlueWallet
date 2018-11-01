import React, { Component } from 'react';
import { Text, Button, View, Image, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { LinearGradient } from 'expo';
import {
  WatchOnlyWallet,
  HDLegacyBreadwalletWallet,
  HDSegwitP2SHWallet,
  LightningCustodianWallet,
  LegacyWallet,
  HDLegacyP2PKHWallet,
} from '../../class';
import {
  BlueText,
  BlueTransactionOnchainIcon,
  ManageFundsBigButton,
  BlueTransactionIncommingIcon,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
  BlueTransactionOffchainIcon,
  BlueSendButtonIcon,
  BlueReceiveButtonIcon,
  BlueListItem,
} from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { BitcoinUnit } from '../../models/bitcoinUnits';
/** @type {AppStorage} */

let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const BigNumber = require('bignumber.js');
let EV = require('../../events');

export default class WalletTransactions extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      headerRight: (
        <Button
          onPress={() =>
            navigation.navigate('WalletDetails', {
              address: navigation.state.params.wallet.getAddress(),
              secret: navigation.state.params.wallet.getSecret(),
            })
          }
          title={loc.wallets.options}
          color="#fff"
        />
      ),
      headerStyle: {
        backgroundColor: navigation.state.params.headerColor,
        borderBottomWidth: 0,
      },
      headerTintColor: '#FFFFFF',
    };
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isTransactionsLoading: false,
      wallet: props.navigation.getParam('wallet'),
      gradientColors: ['#FFFFFF', '#FFFFFF'],
      dataSource: props.navigation.getParam('wallet').getTransactions(),
      walletBalanceUnit: BitcoinUnit.MBTC,
    };
    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, this.refreshTransactionsFunction.bind(this));
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

  async componentDidMount() {
    this.refreshFunction();
    let gradient1 = '#65ceef';
    let gradient2 = '#68bbe1';

    if (new WatchOnlyWallet().type === this.state.wallet.type) {
      gradient1 = '#7d7d7d';
      gradient2 = '#4a4a4a';
    }

    if (new LegacyWallet().type === this.state.wallet.type) {
      gradient1 = '#40fad1';
      gradient2 = '#15be98';
    }

    if (new HDLegacyP2PKHWallet().type === this.state.wallet.type) {
      gradient1 = '#e36dfa';
      gradient2 = '#bd10e0';
    }

    if (new HDLegacyBreadwalletWallet().type === this.state.wallet.type) {
      gradient1 = '#fe6381';
      gradient2 = '#f99c42';
    }

    if (new HDSegwitP2SHWallet().type === this.state.wallet.type) {
      gradient1 = '#c65afb';
      gradient2 = '#9053fe';
    }

    if (new LightningCustodianWallet().type === this.state.wallet.type) {
      gradient1 = '#f1be07';
      gradient2 = '#f79056';
    }

    this.props.navigation.setParams({ headerColor: gradient1, wallet: this.state.wallet });
    this.setState({ gradientColors: [gradient1, gradient2] });
  }

  /**
   * Redraws the screen
   */
  refreshFunction() {
    setTimeout(() => {
      console.log('wallets/transactions refreshFunction()');
      let showSend = false;
      let showReceive = false;
      const wallet = this.state.wallet;
      if (wallet) {
        showSend = wallet.allowSend();
        showReceive = wallet.allowReceive();
      }

      let showManageFundsBigButton = false;
      let showManageFundsSmallButton = false;
      if (wallet && wallet.type === new LightningCustodianWallet().type && wallet.getBalance() * 1 === 0) {
        showManageFundsBigButton = true;
        showManageFundsSmallButton = false;
      } else if (wallet && wallet.type === new LightningCustodianWallet().type && wallet.getBalance() > 0) {
        showManageFundsSmallButton = true;
        showManageFundsBigButton = false;
      }

      this.setState({
        isLoading: false,
        isTransactionsLoading: false,
        showReceiveButton: showReceive,
        showSendButton: showSend,
        showManageFundsBigButton,
        showManageFundsSmallButton,
        dataSource: wallet.getTransactions(),
      });
    }, 1);
  }

  isLightning() {
    let w = this.state.wallet;
    if (w && w.type === new LightningCustodianWallet().type) {
      return true;
    }

    return false;
  }

  /**
   * Forcefully fetches TXs and balance for wallet
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
            /** @type {LegacyWallet} */
            let wallet = that.state.wallet;
            await wallet.fetchBalance();
            let start = +new Date();
            await wallet.fetchTransactions();
            let end = +new Date();
            console.log(wallet.getLabel(), 'fetch tx took', (end - start) / 1000, 'sec');
          } catch (err) {
            noErr = false;
            console.warn(err);
          }
          if (noErr) {
            await BlueApp.saveToDisk(); // caching
            EV(EV.enum.TRANSACTIONS_COUNT_CHANGED); // let other components know they should redraw
          }

          that.refreshFunction(); // Redraws the screen
        }, 1);
      },
    );
  }

  changeWalletBalanceUnit() {
    if (this.state.walletBalanceUnit === undefined || this.state.walletBalanceUnit === BitcoinUnit.BTC) {
      this.setState({ walletBalanceUnit: BitcoinUnit.MBTC });
    } else if (this.state.walletBalanceUnit === BitcoinUnit.MBTC) {
      this.setState({ walletBalanceUnit: BitcoinUnit.BITS });
    } else if (this.state.walletBalanceUnit === BitcoinUnit.BITS) {
      this.setState({ walletBalanceUnit: BitcoinUnit.SATOSHIS });
    } else if (this.state.walletBalanceUnit === BitcoinUnit.SATOSHIS) {
      this.setState({ walletBalanceUnit: BitcoinUnit.BTC });
    }
  }

  renderWalletHeader = () => {
    return (
      <LinearGradient colors={[this.state.gradientColors[0], this.state.gradientColors[1]]} style={{ padding: 15, height: 164 }}>
        <Image
          source={
            (new LightningCustodianWallet().type === this.state.wallet.type && require('../../img/lnd-shape.png')) ||
            require('../../img/btc-shape.png')
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
          {this.state.wallet.getLabel()}
        </Text>
        <TouchableOpacity onPress={() => this.changeWalletBalanceUnit()}>
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
            {loc.formatBalance(this.state.wallet.getBalance(), this.state.walletBalanceUnit)}
          </Text>
        </TouchableOpacity>
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
          {loc.transactionTimeToReadable(this.state.wallet.getLatestTransactionTime())}
        </Text>
      </LinearGradient>
    );
  };

  txMemo(hash) {
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash]['memo']) {
      return BlueApp.tx_metadata[hash]['memo'];
    }
    return '';
  }

  _keyExtractor = (_item, index) => index.toString();

  renderListHeaderComponent = () => {
    return (
      <View style={{ flexDirection: 'row', height: 50 }}>
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
      </View>
    );
  };

  render() {
    const { navigate } = this.props.navigation;
    return (
      <View style={{ flex: 1 }}>
        {this.renderWalletHeader()}
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {(() => {
            if (this.state.showManageFundsSmallButton) {
              return (
                <TouchableOpacity
                  style={{ alignSelf: 'flex-end', right: 10, flexDirection: 'row' }}
                  onPress={() => {
                    console.log('navigating to', this.state.wallet.getLabel());
                    navigate('ManageFunds', { fromSecret: this.state.wallet.getSecret() });
                  }}
                >
                  <BlueText style={{ fontWeight: '600', fontSize: 16 }}>{loc.lnd.title}</BlueText>
                  <Icon
                    style={{ position: 'relative' }}
                    name="link"
                    type="font-awesome"
                    size={14}
                    color={BlueApp.settings.foregroundColor}
                    iconStyle={{ left: 5, transform: [{ rotate: '90deg' }] }}
                  />
                </TouchableOpacity>
              );
            }
          })()}
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
                  {(this.isLightning() &&
                    'Lightning wallet should be used for your daily\ntransactions. Fees are unfairly cheap and\nspeed is blazing fast.') ||
                    loc.wallets.list.empty_txs1}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    color: '#9aa0aa',
                    textAlign: 'center',
                  }}
                >
                  {(this.isLightning() && '\nTo start using it tap on "manage funds"\nand topup your balance') ||
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
            refreshControl={<RefreshControl onRefresh={() => this.refreshTransactions()} refreshing={this.state.isTransactionsLoading} />}
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
                    }
                  }}
                  badge={{
                    value: 3,
                    textStyle: { color: 'orange' },
                    containerStyle: { marginTop: 0 },
                  }}
                  hideChevron
                  rightTitle={new BigNumber((rowData.item.value && rowData.item.value) || 0).dividedBy(100000000).toString()}
                  rightTitleStyle={{
                    fontWeight: '600',
                    fontSize: 16,
                    color: rowData.item.value / 100000000 < 0 ? BlueApp.settings.foregroundColor : '#37c0a1',
                  }}
                />
              );
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'center',
            backgroundColor: 'transparent',
            position: 'absolute',
            bottom: 30,
            borderRadius: 15,
            overflow: 'hidden',
          }}
        >
          {(() => {
            if (this.state.showReceiveButton) {
              return (
                <BlueReceiveButtonIcon
                  onPress={() => {
                    navigate('ReceiveDetails', { address: this.state.wallet.getAddress(), secret: this.state.wallet.getSecret() });
                    if (this.state.wallet.getAddress()) {
                      // EV(EV.enum.RECEIVE_ADDRESS_CHANGED, w.getAddress());
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
                    if (this.state.wallet.type === new LightningCustodianWallet().type) {
                      navigate('ScanLndInvoice', { fromSecret: this.state.wallet.getSecret() });
                    } else {
                      navigate('SendDetails', { fromAddress: this.state.wallet.getAddress(), fromSecret: this.state.wallet.getSecret() });
                    }
                  }}
                />
              );
            }
          })()}

          {(() => {
            if (this.state.showManageFundsBigButton) {
              return (
                <ManageFundsBigButton
                  onPress={() => {
                    console.log('navigating to', this.state.wallet.getLabel());
                    navigate('ManageFunds', { fromSecret: this.state.wallet.getSecret() });
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
