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
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import ImagePicker from 'react-native-image-picker';
import Clipboard from '@react-native-community/clipboard';
import {
  BlueSendButtonIcon,
  BlueListItem,
  BlueReceiveButtonIcon,
  BlueTransactionListItem,
  BlueWalletNavigationHeader,
  BlueAlertWalletExportReminder,
} from '../../BlueComponents';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import WalletGradient from '../../class/wallet-gradient';
import { Icon } from 'react-native-elements';
import { LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import Modal from 'react-native-modal';
import * as NavigationService from '../../NavigationService';
import HandoffSettings from '../../class/handoff';
import Handoff from 'react-native-handoff';
import { BlueCurrentTheme } from '../../components/themes';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { getSystemName } from 'react-native-device-info';
import BuyBitcoin from './buyBitcoin';
const BlueApp = require('../../BlueApp');
const EV = require('../../blue_modules/events');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const windowHeight = Dimensions.get('window').height;
const isDesktop = getSystemName() === 'Mac OS X';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollViewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
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
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
  walletDetails: {
    marginHorizontal: 16,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  activityIndicator: {
    marginVertical: 20,
  },
  listHeader: {
    flexDirection: 'row',
    margin: 16,
    justifyContent: 'space-evenly',
  },
  listHeaderTextRow: {
    flex: 1,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listHeaderText: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 24,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  marketplaceButton1: {
    backgroundColor: BlueCurrentTheme.colors.lightButton,
    borderRadius: 9,
    minHeight: 49,
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketplaceButton2: {
    marginLeft: 5,
    backgroundColor: BlueCurrentTheme.colors.lightButton,
    borderRadius: 9,
    minHeight: 49,
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketpalceText1: {
    color: BlueCurrentTheme.colors.cta2,
    fontSize: 18,
  },
  marketpalceText2: {
    color: BlueCurrentTheme.colors.cta2,
    fontSize: 18,
    marginHorizontal: 8,
  },
  list: {
    backgroundColor: BlueCurrentTheme.colors.background,
    flex: 1,
  },
  emptyTxs: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
    marginVertical: 16,
  },
  emptyTxsLightning: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
    fontWeight: '600',
  },
  buyBitcoin: {
    backgroundColor: '#007AFF',
    minWidth: 260,
    borderRadius: 8,
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buyBitcoinText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  floatButtons: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    position: 'absolute',
    alignSelf: 'center',
    bottom: 30,
    borderRadius: 30,
    width: '60%',
    maxWidth: 400,
    flex: 1,
    height: '6.3%',
    minHeight: 44,
    overflow: 'hidden',
  },
});

export default class WalletTransactions extends Component {
  walletBalanceText = null;

  constructor(props) {
    super(props);

    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, this.refreshTransactionsFunction.bind(this), true);
    const wallet = props.route.params.wallet;
    this.props.navigation.setParams({ wallet: wallet, isLoading: true });
    this.state = {
      isHandOffUseEnabled: false,
      isLoading: true,
      isManageFundsModalVisible: false,
      showShowFlatListRefreshControl: false,
      wallet: wallet,
      itemPriceUnit: wallet.getPreferredBalanceUnit(),
      dataSource: this.getTransactions(15),
      timeElapsed: 0, // this is to force a re-render for FlatList items.
      limit: 15,
      pageSize: 20,
    };
  }

  componentDidMount() {
    this._unsubscribeFocus = this.props.navigation.addListener('focus', this.onFocus);
    this.props.navigation.setParams({ isLoading: false });
    this.interval = setInterval(() => {
      this.setState(prev => ({ timeElapsed: prev.timeElapsed + 1 }));
    }, 60000);
    HandoffSettings.isHandoffUseEnabled().then(enabled => this.setState({ isHandOffUseEnabled: enabled }));
    this.setState({ isLoading: false });
  }

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  refreshTransactionsFunction(delay) {
    delay = delay || 4000;
    const that = this;
    setTimeout(function () {
      that.refreshTransactions();
    }, delay); // giving a chance to remote server to propagate
  }

  /**
   * Simple wrapper for `wallet.getTransactions()`, where `wallet` is current wallet.
   * Sorts. Provides limiting.
   *
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @returns {Array}
   */
  getTransactions(limit = Infinity) {
    const wallet = this.props.route.params.wallet;

    let txs = wallet.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function (a, b) {
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
    const w = this.state.wallet;
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
          // await BlueElectrum.ping();
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
    return (this.getTransactions(Infinity).length > this.state.limit && <ActivityIndicator style={styles.activityIndicator} />) || <View />;
  };

  renderListHeaderComponent = () => {
    const style = { opacity: this.state.isLoading ? 0.5 : 1.0 };
    return (
      <View style={styles.flex}>
        <View style={styles.listHeader}>
          {/*
            Current logic - Onchain:
            - Shows buy button on middle when empty
            - Show buy button on top when not empty
            - Shows Marketplace button on details screen, open in browser (iOS)
            - Shows Marketplace button on details screen, open in in-app (android)
            Current logic - Offchain:
            - Shows Lapp Browser empty (iOS)
            - Shows Lapp Browser with marketplace (android)
            - Shows Marketplace button to open in browser (iOS)

            The idea is to avoid showing on iOS an appstore/market style app that goes against the TOS.

           */}
          {this.state.wallet.getTransactions().length > 0 &&
            this.state.wallet.type !== LightningCustodianWallet.type &&
            this.renderSellFiat()}
          {this.state.wallet.type === LightningCustodianWallet.type && this.renderMarketplaceButton()}
          {this.state.wallet.type === LightningCustodianWallet.type && Platform.OS === 'ios' && this.renderLappBrowserButton()}
        </View>
        <View style={styles.listHeaderTextRow}>
          <Text style={styles.listHeaderText}>{loc.transactions.list_title}</Text>
          {isDesktop && (
            <TouchableOpacity style={style} onPress={() => this.refreshTransactions()} disabled={this.state.isLoading}>
              <Icon name="refresh" type="font-awesome" color={BlueCurrentTheme.colors.feeText} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  renderManageFundsModal = () => {
    return (
      <Modal
        deviceHeight={windowHeight}
        isVisible={this.state.isManageFundsModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isManageFundsModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.advancedTransactionOptionsModalContent}>
            <BlueListItem
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                const wallets = [...BlueApp.getWallets().filter(item => item.chain === Chain.ONCHAIN && item.allowSend())];
                if (wallets.length === 0) {
                  alert(loc.lnd.refill_create);
                } else {
                  this.setState({ isManageFundsModalVisible: false });
                  this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.ONCHAIN });
                }
              }}
              title={loc.lnd.refill}
            />
            <BlueListItem
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                this.setState({ isManageFundsModalVisible: false }, () =>
                  this.props.navigation.navigate('ReceiveDetails', {
                    secret: this.state.wallet.getSecret(),
                  }),
                );
              }}
              title={loc.lnd.refill_external}
            />

            <BlueListItem
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                this.setState({ isManageFundsModalVisible: false }, this.navigateToBuyBitcoin);
              }}
              title={loc.lnd.refill_card}
            />

            <BlueListItem
              title={loc.lnd.exchange}
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                this.setState({ isManageFundsModalVisible: false });
                Linking.openURL('https://zigzag.io/?utm_source=integration&utm_medium=bluewallet&utm_campaign=withdrawLink');
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  renderMarketplaceButton = () => {
    return Platform.select({
      android: (
        <TouchableOpacity
          onPress={() => {
            if (this.state.wallet.type === LightningCustodianWallet.type) {
              this.props.navigation.navigate('LappBrowser', { fromSecret: this.state.wallet.getSecret(), fromWallet: this.state.wallet });
            } else {
              this.props.navigation.navigate('Marketplace', { fromWallet: this.state.wallet });
            }
          }}
          style={styles.marketplaceButton1}
        >
          <Text style={styles.marketpalceText1}>marketplace</Text>
        </TouchableOpacity>
      ),
      ios:
        this.state.wallet.getBalance() > 0 ? (
          <TouchableOpacity
            onPress={async () => {
              Linking.openURL('https://bluewallet.io/marketplace/');
            }}
            style={styles.marketplaceButton1}
          >
            <Icon name="external-link" size={18} type="font-awesome" color="#9aa0aa" />
            <Text style={styles.marketpalceText2}>marketplace</Text>
          </TouchableOpacity>
        ) : null,
    });
  };

  renderLappBrowserButton = () => {
    return (
      <TouchableOpacity
        onPress={() => {
          this.props.navigation.navigate('LappBrowser', {
            fromSecret: this.state.wallet.getSecret(),
            fromWallet: this.state.wallet,
            url: 'https://duckduckgo.com',
          });
        }}
        style={styles.marketplaceButton2}
      >
        <Text style={styles.marketpalceText1}>LApp Browser</Text>
      </TouchableOpacity>
    );
  };

  renderSellFiat = () => {
    return (
      <TouchableOpacity onPress={this.navigateToBuyBitcoin} style={styles.marketplaceButton2}>
        <Text style={styles.marketpalceText1}>{loc.wallets.list_tap_here_to_buy}</Text>
      </TouchableOpacity>
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
      this.props.navigation.navigate('SendDetailsRoot', {
        screen: 'SendDetails',
        params: {
          memo: loc.lnd.refill_lnd_balance,
          address: toAddress,
          fromWallet: wallet,
        },
      });
    }
  };

  onFocus = () => {
    this.redrawScreen();
    this.props.navigation.setParams({ isLoading: false });
  };

  componentWillUnmount() {
    clearInterval(this.interval);
    this._unsubscribeFocus();
  }

  navigateToSendScreen = () => {
    this.props.navigation.navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        fromWallet: this.state.wallet,
      },
    });
  };

  renderItem = item => (
    <BlueTransactionListItem item={item.item} itemPriceUnit={this.state.itemPriceUnit} timeElapsed={this.state.timeElapsed} />
  );

  onBarCodeRead = ret => {
    if (!this.state.isLoading) {
      this.setState({ isLoading: true }, () => {
        this.setState({ isLoading: false });
        const params = {
          fromSecret: this.state.wallet.getSecret(),
          // ScanLndInvoice actrually uses `fromSecret` so keeping it for now
          uri: ret.data ? ret.data : ret,
          fromWallet: this.state.wallet,
        };
        if (this.state.wallet.chain === Chain.ONCHAIN) {
          this.props.navigation.navigate('SendDetailsRoot', { screen: 'SendDetails', params });
        } else {
          this.props.navigation.navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params });
        }
      });
    }
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
              this.onBarCodeRead({ data: result });
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        }
      },
    );
  };

  copyFromClipbard = async () => {
    this.onBarCodeRead({ data: await Clipboard.getString() });
  };

  sendButtonLongPress = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
      }
      ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
        if (buttonIndex === 1) {
          this.choosePhoto();
        } else if (buttonIndex === 2) {
          this.props.navigation.navigate('ScanQRCodeRoot', {
            screen: 'ScanQRCode',
            params: {
              launchedBy: this.props.route.name,
              onBarScanned: this.onBarScanned,
              showFileImportButton: false,
            },
          });
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

  navigateToBuyBitcoin = async () => {
    const uri = await BuyBitcoin.generateURL(this.state.wallet);
    if (getSystemName() === 'Mac OS X') {
      InAppBrowser.isAvailable()
        .then(_value => InAppBrowser.open(uri, { dismissButtonStyle: 'done' }))
        .catch(_error => Linking.openURL(uri));
    } else if (Platform.OS === 'ios') {
      InAppBrowser.isAvailable()
        .then(_value => InAppBrowser.open(uri, { dismissButtonStyle: 'done' }))
        .catch(_error =>
          this.props.navigation.navigate('BuyBitcoin', {
            wallet: this.state.wallet,
          }),
        );
    } else {
      this.props.navigation.navigate('BuyBitcoin', {
        wallet: this.state.wallet,
      });
    }
  };

  render() {
    const { navigate } = this.props.navigation;
    return (
      <View style={styles.flex}>
        <StatusBar barStyle="light-content" backgroundColor={WalletGradient.headerColorFor(this.props.route.params.wallet.type)} />
        {this.state.wallet.chain === Chain.ONCHAIN && this.state.isHandOffUseEnabled && (
          <Handoff
            title={`Bitcoin Wallet ${this.state.wallet.getLabel()}`}
            type="io.bluewallet.bluewallet"
            url={`https://blockpath.com/search/addr?q=${this.state.wallet.getXpub()}`}
          />
        )}
        <BlueWalletNavigationHeader
          wallet={this.state.wallet}
          onWalletUnitChange={wallet =>
            InteractionManager.runAfterInteractions(async () => {
              this.setState({ wallet, itemPriceUnit: wallet.getPreferredBalanceUnit() }, () =>
                InteractionManager.runAfterInteractions(() => BlueApp.saveToDisk()),
              );
            })
          }
          onManageFundsPressed={() => {
            if (this.state.wallet.getUserHasSavedExport()) {
              this.setState({ isManageFundsModalVisible: true });
            } else {
              BlueAlertWalletExportReminder({
                onSuccess: async () => {
                  this.state.wallet.setUserHasSavedExport(true);
                  await BlueApp.saveToDisk();
                  this.setState({ isManageFundsModalVisible: true });
                },
                onFailure: () =>
                  this.props.navigation.navigate('WalletExport', {
                    wallet: this.state.wallet,
                  }),
              });
            }
          }}
        />
        <View style={styles.list}>
          <FlatList
            ListHeaderComponent={this.renderListHeaderComponent}
            onEndReachedThreshold={0.3}
            onEndReached={async () => {
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
            ListFooterComponent={this.renderListFooterComponent}
            ListEmptyComponent={
              <ScrollView style={styles.flex} contentContainerStyle={styles.scrollViewContent}>
                <Text numberOfLines={0} style={styles.emptyTxs}>
                  {(this.isLightning() && loc.wallets.list_empty_txs1_lightning) || loc.wallets.list_empty_txs1}
                </Text>
                {this.isLightning() && <Text style={styles.emptyTxsLightning}>{loc.wallets.list_empty_txs2_lightning}</Text>}

                {!this.isLightning() && (
                  <TouchableOpacity onPress={this.navigateToBuyBitcoin} style={styles.buyBitcoin}>
                    <Text style={styles.buyBitcoinText}>{loc.wallets.list_tap_here_to_buy}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            }
            onRefresh={() => this.refreshTransactions()}
            refreshing={this.state.showShowFlatListRefreshControl}
            data={this.state.dataSource}
            extraData={this.state.timeElapsed}
            keyExtractor={this._keyExtractor}
            renderItem={this.renderItem}
            contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
          />
          {this.renderManageFundsModal()}
        </View>
        <View style={styles.floatButtons}>
          {(() => {
            if (this.state.wallet.allowReceive()) {
              return (
                <BlueReceiveButtonIcon
                  onPress={() => {
                    if (this.state.wallet.chain === Chain.OFFCHAIN) {
                      navigate('LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { fromWallet: this.state.wallet } });
                    } else {
                      navigate('ReceiveDetails', { secret: this.state.wallet.getSecret() });
                    }
                  }}
                />
              );
            }
          })()}

          {(() => {
            if (
              this.state.wallet.allowSend() ||
              (this.state.wallet.type === WatchOnlyWallet.type &&
                this.state.wallet.isHd() &&
                this.state.wallet.getSecret().startsWith('zpub'))
            ) {
              return (
                <BlueSendButtonIcon
                  onLongPress={this.sendButtonLongPress}
                  onPress={() => {
                    if (this.state.wallet.chain === Chain.OFFCHAIN) {
                      navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params: { fromSecret: this.state.wallet.getSecret() } });
                    } else {
                      if (
                        this.state.wallet.type === WatchOnlyWallet.type &&
                        this.state.wallet.isHd() &&
                        this.state.wallet.getSecret().startsWith('zpub')
                      ) {
                        if (this.state.wallet.useWithHardwareWalletEnabled()) {
                          this.navigateToSendScreen();
                        } else {
                          Alert.alert(
                            loc.wallets.details_title,
                            loc.transactions.enable_hw,
                            [
                              {
                                text: loc._.ok,
                                onPress: () => {
                                  const wallet = this.state.wallet;
                                  wallet.setUseWithHardwareWalletEnabled(true);
                                  this.setState({ wallet }, async () => {
                                    await BlueApp.saveToDisk();
                                    this.navigateToSendScreen();
                                  });
                                },
                                style: 'default',
                              },

                              { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
                            ],
                            { cancelable: false },
                          );
                        }
                      } else {
                        this.navigateToSendScreen();
                      }
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
    setParams: PropTypes.func,
    addListener: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.object,
  }),
};

WalletTransactions.navigationOptions = ({ navigation, route }) => {
  return {
    headerRight: () => (
      <TouchableOpacity
        disabled={route.params.isLoading === true}
        style={styles.walletDetails}
        onPress={() =>
          navigation.navigate('WalletDetails', {
            wallet: route.params.wallet,
          })
        }
      >
        <Icon name="kebab-horizontal" type="octicon" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    ),
    headerTitle: () => null,
    headerStyle: {
      backgroundColor: WalletGradient.headerColorFor(route.params.wallet.type),
      borderBottomWidth: 0,
      elevation: 0,
      // shadowRadius: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerTintColor: '#FFFFFF',
    headerBackTitleVisible: false,
  };
};
