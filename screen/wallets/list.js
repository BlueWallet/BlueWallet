import React, { Component } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, InteractionManager, RefreshControl, SectionList, Alert, Platform } from 'react-native';
import { BlueScanButton, WalletsCarousel, BlueHeaderDefaultMain, BlueTransactionListItem } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { NavigationEvents } from 'react-navigation';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { PlaceholderWallet } from '../../class';
import WalletImport from '../../class/walletImport';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let BlueElectrum = require('../../BlueElectrum');

const WalletsListSections = { CAROUSEL: 'CAROUSEL', LOCALTRADER: 'LOCALTRADER', TRANSACTIONS: 'TRANSACTIONS' };

export default class WalletsList extends Component {
  walletsCarousel = React.createRef();

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isFlatListRefreshControlHidden: true,
      wallets: BlueApp.getWallets().concat(false),
      lastSnappedTo: 0,
      timeElpased: 0,
      dataSource: [],
    };
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => this.redrawScreen(true));

    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.redrawScreen);
  }

  componentDidMount() {
    // the idea is that upon wallet launch we will refresh
    // all balances and all transactions here:
    InteractionManager.runAfterInteractions(async () => {
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
        console.log(error);
      }
    });
    this.interval = setInterval(() => {
      this.setState(prev => ({ timeElapsed: prev.timeElapsed + 1 }));
    }, 60000);
    this.redrawScreen();
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
          this.walletsCarousel.current.snapToItem(this.state.wallets.length - 2);
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

  handleClick = index => {
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
  };

  onSnapToItem = index => {
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
  };

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
      console.warn(Err);
    }

    if (noErr && didRefresh) {
      await BlueApp.saveToDisk(); // caching
    }
  }

  _keyExtractor = (_item, index) => index.toString();

  renderListHeaderComponent = () => {
    return (
      <View style={{ backgroundColor: '#FFFFFF' }}>
        <Text
          style={{
            paddingLeft: 16,
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

  renderTransactionListsRow = data => {
    return (
      <View style={{ marginHorizontal: 4 }}>
        <BlueTransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} />
      </View>
    );
  };

  renderNavigationHeader = () => {
    return (
      <View style={styles.headerStyle}>
        <TouchableOpacity
          testID="SettingsButton"
          style={{ marginHorizontal: 16 }}
          onPress={() => this.props.navigation.navigate('Settings')}
        >
          <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueApp.settings.foregroundColor} />
        </TouchableOpacity>
      </View>
    );
  };

  renderLocalTrader = () => {
    if (BlueApp.getWallets().length > 0 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      return (
        <TouchableOpacity
          onPress={() => {
            this.props.navigation.navigate('HodlHodl', { fromWallet: this.state.wallet });
          }}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginHorizontal: 16,
            marginVertical: 16,
            backgroundColor: '#eef0f4',
            padding: 16,
            borderRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0C2550' }}>Local Trader</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#9AA0AA' }}>A p2p exchange</Text>
          </View>
          <View style={{ flexDirection: 'column', backgroundColor: '#007AFF', borderRadius: 16 }}>
            <Text style={{ paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, color: '#fff', fontWeight: '600' }}>New</Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      return null;
    }
  };

  renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        removeClippedSubviews={false}
        data={this.state.wallets}
        onPress={this.handleClick}
        handleLongPress={this.handleLongPress}
        onSnapToItem={this.onSnapToItem}
        ref={this.walletsCarousel}
        testID="WalletsList"
      />
    );
  };

  renderSectionItem = item => {
    switch (item.section.key) {
      case WalletsListSections.CAROUSEL:
        return this.renderWalletsCarousel();
      case WalletsListSections.LOCALTRADER:
        return this.renderLocalTrader();
      case WalletsListSections.TRANSACTIONS:
        return this.renderTransactionListsRow(item);
      default:
        return null;
    }
  };

  renderSectionHeader = ({ section }) => {
    switch (section.key) {
      case WalletsListSections.CAROUSEL:
        return (
          <BlueHeaderDefaultMain
            leftText={loc.wallets.list.title}
            onNewWalletPress={
              !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)
                ? () => this.props.navigation.navigate('AddWallet')
                : null
            }
          />
        );
      case WalletsListSections.TRANSACTIONS:
        return this.renderListHeaderComponent();
      default:
        return null;
    }
  };

  renderSectionFooter = ({ section }) => {
    switch (section.key) {
      case WalletsListSections.TRANSACTIONS:
        if (this.state.dataSource.length === 0 && !this.state.isLoading) {
          return (
            <View style={{ top: 80, height: 160, marginBottom: 80 }}>
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
                  fontWeight: '600',
                }}
              >
                {loc.wallets.list.empty_txs2}
              </Text>
            </View>
          );
        } else {
          return null;
        }
      default:
        return null;
    }
  };

  renderScanButton = () => {
    if (BlueApp.getWallets().length > 0 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      return (
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
          }}
        >
          <BlueScanButton onPress={this.onScanButtonPressed} />
        </View>
      );
    } else {
      return null;
    }
  };

  sectionListKeyExtractor = (item, index) => {
    return `${item}${index}}`;
  };

  onScanButtonPressed = () => {
    this.props.navigation.navigate('ScanQRCode', {
      launchedBy: this.props.navigation.state.routeName,
      onBarScanned: this.onBarCodeRead,
      showFileImportButton: false,
    });
  };

  onBarScanned = value => {
    DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
      ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
      this.props.navigation.navigate(completionValue);
    });
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        <NavigationEvents
          onDidFocus={() => {
            this.redrawScreen();
          }}
        />
        <View style={styles.walletsListWrapper}>
          {this.renderNavigationHeader()}
          <SectionList
            refreshControl={
              <RefreshControl onRefresh={() => this.refreshTransactions()} refreshing={!this.state.isFlatListRefreshControlHidden} />
            }
            renderItem={this.renderSectionItem}
            keyExtractor={this.sectionListKeyExtractor}
            renderSectionHeader={this.renderSectionHeader}
            contentInset={{ top: 0, left: 0, bottom: 60, right: 0 }}
            renderSectionFooter={this.renderSectionFooter}
            sections={[
              { key: WalletsListSections.CAROUSEL, data: [WalletsListSections.CAROUSEL] },
              { key: WalletsListSections.LOCALTRADER, data: [WalletsListSections.LOCALTRADER] },
              { key: WalletsListSections.TRANSACTIONS, data: this.state.dataSource },
            ]}
          />
          {this.renderScanButton()}
        </View>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  walletsListWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerStyle: {
    ...Platform.select({
      ios: {
        marginTop: 44,
        height: 32,
        alignItems: 'flex-end',
        justifyContent: 'center',
      },
      android: {
        marginTop: 8,
        height: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
      },
    }),
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
