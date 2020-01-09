/* global alert */
import React, { Component } from 'react';
import {
  View,
  StatusBar,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  InteractionManager,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { BlueLoading, SafeBlueArea, WalletsCarousel, BlueList, BlueHeaderDefaultMain, BlueTransactionListItem } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { NavigationEvents } from 'react-navigation';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { PlaceholderWallet } from '../../class';
import WalletImport from '../../class/walletImport';
import Swiper from 'react-native-swiper';
import ScanQRCode from '../send/scanQrAddress';
import DeeplinkSchemaMatch from '../../class/deeplinkSchemaMatch';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let BlueElectrum = require('../../BlueElectrum');

export default class WalletsList extends Component {
  walletsCarousel = React.createRef();
  swiperRef = React.createRef();

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isFlatListRefreshControlHidden: true,
      wallets: BlueApp.getWallets().concat(false),
      lastSnappedTo: 0,
      timeElpased: 0,
      cameraPreviewIsPaused: true,
    };
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => this.redrawScreen(true));

    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.redrawScreen);
  }

  componentDidMount() {
    this.redrawScreen();
    // the idea is that upon wallet launch we will refresh
    // all balances and all transactions here:
    InteractionManager.runAfterInteractions(async () => {
      let noErr = true;
      try {
        await BlueElectrum.waitTillConnected();
        let balanceStart = +new Date();
        await BlueApp.fetchWalletBalances();
        let balanceEnd = +new Date();
        console.log('fetch all wallet balances took', (balanceEnd - balanceStart) / 1000, 'sec');
        let start = +new Date();
        await BlueApp.fetchWalletTransactions();
        let end = +new Date();
        console.log('fetch all wallet txs took', (end - start) / 1000, 'sec');
      } catch (error) {
        noErr = false;
        alert(error);
      }
      if (noErr) this.redrawScreen();
    });
    this.interval = setInterval(() => {
      this.setState(prev => ({ timeElapsed: prev.timeElapsed + 1 }));
    }, 60000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet.
   * Triggered manually by user on pull-to-refresh.
   */
  refreshTransactions() {
    if (!(this.lastSnappedTo < BlueApp.getWallets().length) && this.lastSnappedTo !== undefined) {
      // last card, nop
      console.log('last card, nop');
      return;
    }
    this.setState(
      {
        isFlatListRefreshControlHidden: false,
      },
      () => {
        InteractionManager.runAfterInteractions(async () => {
          let noErr = true;
          try {
            await BlueElectrum.ping();
            await BlueElectrum.waitTillConnected();
            let balanceStart = +new Date();
            await BlueApp.fetchWalletBalances(this.lastSnappedTo || 0);
            let balanceEnd = +new Date();
            console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
            let start = +new Date();
            await BlueApp.fetchWalletTransactions(this.lastSnappedTo || 0);
            let end = +new Date();
            console.log('fetch tx took', (end - start) / 1000, 'sec');
          } catch (err) {
            noErr = false;
            alert(err);
            console.warn(err);
          }
          if (noErr) await BlueApp.saveToDisk(); // caching

          this.redrawScreen();
        });
      },
    );
  }

  redrawScreen = (scrollToEnd = false) => {
    console.log('wallets/list redrawScreen()');
    if (BlueApp.getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }

    const wallets = BlueApp.getWallets().concat(false);
    if (scrollToEnd) {
      scrollToEnd = wallets.length > this.state.wallets.length;
    }

    this.setState(
      {
        isLoading: false,
        isFlatListRefreshControlHidden: true,
        dataSource: BlueApp.getTransactions(null, 10),
        wallets: BlueApp.getWallets().concat(false),
      },
      () => {
        if (scrollToEnd) {
          this.walletsCarousel.snapToItem(this.state.wallets.length - 2);
        }
      },
    );
  };

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
      if (wallet.type === PlaceholderWallet.type) {
        Alert.alert(
          loc.wallets.add.details,
          'There was a problem importing this wallet.',
          [
            {
              text: loc.wallets.details.delete,
              onPress: () => {
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'destructive',
            },
            {
              text: 'Try Again',
              onPress: () => {
                this.props.navigation.navigate('ImportWallet', { label: wallet.getSecret() });
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'default',
            },
          ],
          { cancelable: false },
        );
      } else {
        this.props.navigation.navigate('WalletTransactions', {
          wallet: wallet,
          key: `WalletTransactions-${wallet.getID()}`,
        });
      }
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      if (!BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
        this.props.navigation.navigate('AddWallet');
      }
    }
  }

  onSnapToItem(index) {
    console.log('onSnapToItem', index);
    this.lastSnappedTo = index;
    this.setState({ lastSnappedTo: index });

    if (index < BlueApp.getWallets().length) {
      // not the last
    }

    if (this.state.wallets[index].type === PlaceholderWallet.type) {
      return;
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
      if (wallets && wallets[index] && wallets[index].type !== PlaceholderWallet.type && wallets[index].timeToRefreshBalance()) {
        console.log('snapped to, and now its time to refresh wallet #', index);
        await wallets[index].fetchBalance();
        if (oldBalance !== wallets[index].getBalance() || wallets[index].getUnconfirmedBalance() !== 0) {
          console.log('balance changed, thus txs too');
          // balance changed, thus txs too
          await wallets[index].fetchTransactions();
          this.redrawScreen();
          didRefresh = true;
        } else if (wallets[index].timeToRefreshTransaction()) {
          console.log(wallets[index].getLabel(), 'thinks its time to refresh TXs');
          await wallets[index].fetchTransactions();
          if (wallets[index].fetchPendingTransactions) {
            await wallets[index].fetchPendingTransactions();
          }
          if (wallets[index].fetchUserInvoices) {
            await wallets[index].fetchUserInvoices();
            await wallets[index].fetchBalance(); // chances are, paid ln invoice was processed during `fetchUserInvoices()` call and altered user's balance, so its worth fetching balance again
          }
          this.redrawScreen();
          didRefresh = true;
        } else {
          console.log('balance not changed');
        }
      }
    } catch (Err) {
      noErr = false;
      alert(Err);
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
    if (BlueApp.getWallets().length > 1 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      this.props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  onSwiperIndexChanged = index => {
    StatusBar.setBarStyle(index === 1 ? 'dark-content' : 'light-content');
    this.setState({ cameraPreviewIsPaused: index === 1 || index === undefined });
  };

  onBarScanned = value => {
    DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
      ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
      this.props.navigation.navigate(completionValue);
    });
  };

  _renderItem = data => {
    return <BlueTransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} />;
  };

  renderNavigationHeader = () => {
    return (
      <View style={{ height: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
        <TouchableOpacity style={{ marginHorizontal: 16 }} onPress={() => this.props.navigation.navigate('Settings')}>
          <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueApp.settings.foregroundColor} />
        </TouchableOpacity>
      </View>
    );
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <NavigationEvents
          onDidFocus={() => {
            this.redrawScreen();
            this.setState({ cameraPreviewIsPaused: this.swiperRef.current.index === 1 || this.swiperRef.current.index === undefined });
          }}
          onWillBlur={() => this.setState({ cameraPreviewIsPaused: true })}
        />
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              onRefresh={() => this.refreshTransactions()}
              refreshing={!this.state.isFlatListRefreshControlHidden}
              shouldRefresh={this.state.timeElpased}
            />
          }
        >
          <Swiper
            style={styles.wrapper}
            onIndexChanged={this.onSwiperIndexChanged}
            index={1}
            ref={this.swiperRef}
            showsPagination={false}
            showsButtons={false}
            loop={false}
          >
            <View style={styles.scanQRWrapper}>
              <ScanQRCode
                cameraPreviewIsPaused={this.state.cameraPreviewIsPaused}
                onBarScanned={this.onBarScanned}
                showCloseButton={false}
                initialCameraStatusReady={false}
                launchedBy={this.props.navigation.state.routeName}
              />
            </View>
            <SafeBlueArea>
              <View style={styles.walletsListWrapper}>
                {this.renderNavigationHeader()}
                <ScrollView
                  refreshControl={
                    <RefreshControl onRefresh={() => this.refreshTransactions()} refreshing={!this.state.isFlatListRefreshControlHidden} />
                  }
                >
                  <BlueHeaderDefaultMain
                    leftText={loc.wallets.list.title}
                    onNewWalletPress={
                      !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)
                        ? () => this.props.navigation.navigate('AddWallet')
                        : null
                    }
                  />
                  <WalletsCarousel
                    removeClippedSubviews={false}
                    data={this.state.wallets}
                    handleClick={index => {
                      this.handleClick(index);
                    }}
                    handleLongPress={this.handleLongPress}
                    onSnapToItem={index => {
                      this.onSnapToItem(index);
                    }}
                    ref={c => (this.walletsCarousel = c)}
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
              </View>
            </SafeBlueArea>
          </Swiper>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
  },
  walletsListWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scanQRWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

WalletsList.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      routeName: PropTypes.string,
    }),
    navigate: PropTypes.func,
  }),
};
