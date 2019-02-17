import React, { Component } from 'react';
import { Text, View, InteractionManager, Image, FlatList, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';
import { NavigationEvents } from 'react-navigation';
import { BlueText, ManageFundsBigButton, BlueSendButtonIcon, BlueReceiveButtonIcon, BlueTransactionListItem } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { LightningCustodianWallet } from '../../class';
import WalletGradient from '../../class/walletGradient';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let EV = require('../../events');

export default class WalletTransactions extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      headerRight: (
        <TouchableOpacity
          style={{ marginHorizontal: 8, minWidth: 150 }}
          onPress={() =>
            navigation.navigate('WalletDetails', {
              wallet: navigation.state.params.wallet,
            })
          }
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '500', textAlign: 'right' }}>{loc.wallets.options}</Text>
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

  constructor(props) {
    super(props);

    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, this.refreshTransactionsFunction.bind(this));
    const wallet = props.navigation.getParam('wallet');
    this.props.navigation.setParams({ wallet: wallet });
    this.state = {
      isLoading: true,
      showShowFlatListRefreshControl: false,
      wallet: wallet,
      dataSource: wallet.getTransactions(),
      walletPreviousPreferredUnit: wallet.getPreferredBalanceUnit(),
      walletHeaderLatestTransaction: '...',
      showSendButton:
        (wallet.allowSend() && wallet.type === LightningCustodianWallet.type && wallet.balance > 0) ||
        (wallet.allowSend() && wallet.type !== LightningCustodianWallet.type),
      showReceiveButton: wallet.allowReceive(),
    };
  }

  componentDidMount() {
    // nop
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

  redrawScreen() {
    InteractionManager.runAfterInteractions(async () => {
      console.log('wallets/transactions redrawScreen()');
      let showSend = false;
      let showReceive = false;
      const wallet = this.state.wallet;
      if (wallet) {
        showSend = wallet.allowSend();
        showReceive = wallet.allowReceive();
      }
      let showManageFundsBigButton = false;
      let showManageFundsSmallButton = false;
      if (wallet && wallet.type === LightningCustodianWallet.type && wallet.getBalance() * 1 <= 0) {
        showManageFundsBigButton = true;
        showManageFundsSmallButton = false;
      } else if (wallet && wallet.type === LightningCustodianWallet.type && wallet.getBalance() > 0) {
        showManageFundsSmallButton = true;
        showManageFundsBigButton = false;
      }

      let txs = wallet.getTransactions();
      for (let tx of txs) {
        tx.sort_ts = +new Date(tx.received);
      }
      txs = txs.sort(function(a, b) {
        return b.sort_ts - a.sort_ts;
      });

      const latestTXTime = loc.transactionTimeToReadable(wallet.getLatestTransactionTime());
      this.setState({
        isLoading: false,
        showShowFlatListRefreshControl: false,
        showReceiveButton: showReceive,
        showSendButton: showSend,
        showManageFundsBigButton,
        showManageFundsSmallButton,
        dataSource: txs,
        walletHeaderLatestTransaction: latestTXTime,
      });
    });
  }

  isLightning() {
    let w = this.state.wallet;
    if (w && w.type === LightningCustodianWallet.type) {
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
          console.warn(err);
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

  renderWalletHeader = () => {
    return (
      <LinearGradient colors={WalletGradient.gradientsFor(this.state.wallet.type)} style={{ padding: 15, minHeight: 164 }}>
        <Image
          source={
            (LightningCustodianWallet.type === this.state.wallet.type && require('../../img/lnd-shape.png')) ||
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
            {loc.formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit(), true).toString()}
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
          {this.state.walletHeaderLatestTransaction}
        </Text>
      </LinearGradient>
    );
  };

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
        />
        {this.renderWalletHeader()}
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {(() => {
            if (this.state.showManageFundsSmallButton) {
              return (
                <View style={{ justifyContent: 'space-between', alignContent: 'center', flexDirection: 'row', marginVertical: 8 }}>
                  <TouchableOpacity
                    style={{ left: 10, flexDirection: 'row', flex: 1, alignItems: 'center' }}
                    onPress={() => {
                      console.log('navigating to LappBrowser');
                      navigate('LappBrowser', { fromSecret: this.state.wallet.getSecret(), fromWallet: this.state.wallet });
                    }}
                  >
                    <BlueText style={{ fontWeight: '600', fontSize: 16 }}>marketplace</BlueText>
                    <Icon
                      name="shopping-cart"
                      type="font-awesome"
                      size={14}
                      color={BlueApp.settings.foregroundColor}
                      iconStyle={{ left: 5, top: 2 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ marginRight: 10, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      console.log('navigating to', this.state.wallet.getLabel());
                      navigate('ManageFunds', { fromWallet: this.state.wallet });
                    }}
                  >
                    <BlueText style={{ fontWeight: '600', fontSize: 16 }}>{loc.lnd.title}</BlueText>
                    <Icon
                      name="link"
                      type="font-awesome"
                      size={14}
                      color={BlueApp.settings.foregroundColor}
                      iconStyle={{ left: 5, top: 2, transform: [{ rotate: '90deg' }] }}
                    />
                  </TouchableOpacity>
                </View>
              );
            }
          })()}
          <FlatList
            ListHeaderComponent={this.renderListHeaderComponent}
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
            initialNumToRender={10}
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
            if (this.state.showReceiveButton) {
              return (
                <BlueReceiveButtonIcon
                  onPress={() => {
                    if (this.state.wallet.type === new LightningCustodianWallet().type) {
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
            if (this.state.showSendButton) {
              return (
                <BlueSendButtonIcon
                  onPress={() => {
                    if (this.state.wallet.type === LightningCustodianWallet.type) {
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
                    navigate('ManageFunds', { fromWallet: this.state.wallet });
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
