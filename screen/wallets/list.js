/* global alert */
import React, { Component } from 'react';
import {
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  InteractionManager,
  Clipboard,
  SectionList,
  Alert,
  Platform,
} from 'react-native';
import { BlueScanButton, WalletsCarousel, BlueHeaderDefaultMain, BlueTransactionListItem, BlueNavigationStyle } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { AppStorage, PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import ActionSheet from '../ActionSheet';
import ImagePicker from 'react-native-image-picker';
import * as NavigationService from '../../NavigationService';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { getSystemName } from 'react-native-device-info';
const EV = require('../../blue_modules/events');
const A = require('../../blue_modules/analytics');
const BlueApp: AppStorage = require('../../BlueApp');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const WalletsListSections = { CAROUSEL: 'CAROUSEL', LOCALTRADER: 'LOCALTRADER', TRANSACTIONS: 'TRANSACTIONS' };

let lastSnappedTo = 0;
const isDesktop = getSystemName() === 'Mac OS X';
export default class WalletsList extends Component {
  walletsCarousel = React.createRef();

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isFlatListRefreshControlHidden: true,
      wallets: BlueApp.getWallets().concat(false),
      timeElpased: 0,
      dataSource: [],
    };
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => this.redrawScreen(true));

    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.redrawScreen);
  }

  componentDidMount() {
    console.log('wallets/list componentDidMount');
    // the idea is that upon wallet launch we will refresh
    // all balances and all transactions here:
    this.redrawScreen();

    InteractionManager.runAfterInteractions(async () => {
      try {
        await BlueElectrum.waitTillConnected();
        const balanceStart = +new Date();
        await BlueApp.fetchWalletBalances();
        const balanceEnd = +new Date();
        console.log('fetch all wallet balances took', (balanceEnd - balanceStart) / 1000, 'sec');
        const start = +new Date();
        await BlueApp.fetchWalletTransactions();
        const end = +new Date();
        console.log('fetch all wallet txs took', (end - start) / 1000, 'sec');
        await BlueApp.saveToDisk();
      } catch (error) {
        console.log(error);
      }
    });

    this.interval = setInterval(() => {
      this.setState(prev => ({ timeElapsed: prev.timeElapsed + 1 }));
    }, 60000);
    this.redrawScreen();

    this._unsubscribe = this.props.navigation.addListener('focus', this.onNavigationEventFocus);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this._unsubscribe();
  }

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet.
   * Triggered manually by user on pull-to-refresh.
   */
  refreshTransactions = () => {
    this.setState(
      {
        isFlatListRefreshControlHidden: false,
      },
      () => {
        InteractionManager.runAfterInteractions(async () => {
          let noErr = true;
          try {
            // await BlueElectrum.ping();
            await BlueElectrum.waitTillConnected();
            const balanceStart = +new Date();
            await BlueApp.fetchWalletBalances(lastSnappedTo || 0);
            const balanceEnd = +new Date();
            console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
            const start = +new Date();
            await BlueApp.fetchWalletTransactions(lastSnappedTo || 0);
            const end = +new Date();
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
  };

  redrawScreen = (scrollToEnd = false) => {
    console.log('wallets/list redrawScreen()');

    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet.
    // placing event subscription here so it gets exclusively re-subscribed more often. otherwise we would
    // have to unsubscribe on unmount and resubscribe again on mount.
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, this.refreshTransactions.bind(this), true);

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
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash].memo) {
      return BlueApp.tx_metadata[hash].memo;
    }
    return '';
  }

  handleClick = index => {
    console.log('click', index);
    const wallet = BlueApp.wallets[index];
    if (wallet) {
      if (wallet.type === PlaceholderWallet.type) {
        Alert.alert(
          loc.wallets.add_details,
          loc.wallets.list_import_problem,
          [
            {
              text: loc.wallets.details_delete,
              onPress: () => {
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'destructive',
            },
            {
              text: loc.wallets.list_tryagain,
              onPress: () => {
                this.props.navigation.navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: wallet.getSecret() } });
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
        this.props.navigation.navigate('AddWalletRoot');
      }
    }
  };

  onSnapToItem = index => {
    console.log('onSnapToItem', index);
    lastSnappedTo = index;
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
    const wallets = BlueApp.getWallets();
    if (!wallets[index]) {
      return;
    }

    const oldBalance = wallets[index].getBalance();
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
      <View style={styles.listHeaderBack}>
        <Text style={styles.listHeaderText}>{loc.transactions.list_title}</Text>
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
      <View style={styles.transaction}>
        <BlueTransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} />
      </View>
    );
  };

  renderLocalTrader = () => {
    if (BlueApp.getWallets().length > 0 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      return (
        <TouchableOpacity
          onPress={() => {
            this.props.navigation.navigate('HodlHodl', { params: { wallet: this.state.wallet }, screen: 'HodlHodl' });
          }}
          style={styles.ltRoot}
        >
          <View style={styles.ltTextWrap}>
            <Text style={styles.ltTextBig}>Local Trader</Text>
            <Text style={styles.ltTextSmall}>{loc.hodl.p2p}</Text>
          </View>
          <View style={styles.ltButtonWrap}>
            <Text style={styles.ltButton}>New</Text>
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
            leftText={loc.wallets.list_title}
            onNewWalletPress={
              !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)
                ? () => this.props.navigation.navigate('AddWalletRoot')
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
            <View style={styles.footerRoot}>
              <Text style={styles.footerEmpty}>{loc.wallets.list_empty_txs1}</Text>
              <Text style={styles.footerStart}>{loc.wallets.list_empty_txs2}</Text>
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
        <View style={styles.scanButton}>
          <BlueScanButton onPress={this.onScanButtonPressed} onLongPress={isDesktop ? undefined : this.sendButtonLongPress} />
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
    if (isDesktop) {
      this.sendButtonLongPress();
    } else {
      this.props.navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: this.props.route.name,
          onBarScanned: this.onBarScanned,
          showFileImportButton: false,
        },
      });
    }
  };

  onBarScanned = value => {
    DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
      ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
      this.props.navigation.navigate(...completionValue);
    });
  };

  onNavigationEventFocus = () => {
    this.redrawScreen();
  };

  choosePhoto = () => {
    ImagePicker.launchImageLibrary(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              this.onBarScanned(result);
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        }
      },
    );
  };

  takePhoto = () => {
    ImagePicker.launchCamera(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              this.onBarScanned(result);
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        }
      },
    );
  };

  copyFromClipbard = async () => {
    this.onBarScanned(await Clipboard.getString());
  };

  sendButtonLongPress = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, isDesktop ? loc.wallets.take_photo : loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
      }
      ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
        if (buttonIndex === 1) {
          this.choosePhoto();
        } else if (buttonIndex === 2) {
          if (isDesktop) {
            this.takePhoto();
          } else {
            this.props.navigation.navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: this.props.route.name,
                onBarScanned: this.onBarScanned,
                showFileImportButton: false,
              },
            });
          }
        } else if (buttonIndex === 3) {
          this.copyFromClipbard();
        }
      });
    } else if (Platform.OS === 'android') {
      const buttons = [
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: loc.wallets.list_long_choose,
          onPress: this.choosePhoto,
        },
        {
          text: loc.wallets.list_long_scan,
          onPress: () =>
            this.props.navigation.navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: this.props.route.name,
                onBarScanned: this.onBarScanned,
                showFileImportButton: false,
              },
            }),
        },
      ];
      if (!isClipboardEmpty) {
        buttons.push({
          text: loc.wallets.list_long_clipboard,
          onPress: this.copyFromClipbard,
        });
      }
      ActionSheet.showActionSheetWithOptions({
        title: '',
        message: '',
        buttons,
      });
    }
  };

  render() {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="default" />
        <View style={styles.walletsListWrapper}>
          <SectionList
            onRefresh={this.refreshTransactions}
            refreshing={!this.state.isFlatListRefreshControlHidden}
            renderItem={this.renderSectionItem}
            keyExtractor={this.sectionListKeyExtractor}
            renderSectionHeader={this.renderSectionHeader}
            initialNumToRender={20}
            contentInset={styles.scrollContent}
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
  root: {
    flex: 1,
  },
  scrollContent: {
    top: 0,
    left: 0,
    bottom: 60,
    right: 0,
  },
  wrapper: {
    backgroundColor: BlueCurrentTheme.colors.brandingColor,
    flex: 1,
  },
  walletsListWrapper: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.brandingColor,
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
  headerTouch: {
    height: 48,
    paddingRight: 16,
    paddingLeft: 32,
    paddingVertical: 10,
  },
  listHeaderBack: {
    backgroundColor: BlueCurrentTheme.colors.background,
  },
  listHeaderText: {
    paddingLeft: 16,
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 8,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  ltRoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: BlueCurrentTheme.colors.ballOutgoingExpired,
    padding: 16,
    borderRadius: 6,
  },
  ltTextWrap: {
    flexDirection: 'column',
  },
  ltTextBig: {
    fontSize: 16,
    fontWeight: '600',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  ltTextSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },
  ltButtonWrap: {
    flexDirection: 'column',
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  ltButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  footerRoot: {
    top: 80,
    height: 160,
    marginBottom: 80,
  },
  footerEmpty: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  footerStart: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 30,
    borderRadius: 30,
    minHeight: 48,
    overflow: 'hidden',
  },
  listHeader: {
    backgroundColor: '#FFFFFF',
  },
  transaction: {
    marginHorizontal: 4,
  },
});

WalletsList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    addListener: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.object,
  }),
};

WalletsList.navigationOptions = ({ navigation, route }) => {
  return {
    ...BlueNavigationStyle(navigation, true),
    title: '',
    headerStyle: {
      backgroundColor: BlueCurrentTheme.colors.customHeader,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerRight: () => (
      <TouchableOpacity testID="SettingsButton" style={styles.headerTouch} onPress={() => NavigationService.navigate('Settings')}>
        <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueCurrentTheme.colors.foregroundColor} />
      </TouchableOpacity>
    ),
  };
};
