/* global alert */
import React, { useEffect, useState } from 'react';
import { Chain } from '../../models/bitcoinUnits';
import {
  Text,
  Platform,
  StyleSheet,
  View,
  Keyboard,
  ActivityIndicator,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  KeyboardAvoidingView,
  Alert,
  InteractionManager,
  useWindowDimensions,
} from 'react-native';
import ImagePicker from 'react-native-image-picker';
import Clipboard from '@react-native-community/clipboard';
import {
  BlueSendButtonIcon,
  BlueReceiveButtonIcon,
  BlueTransactionListItem,
  BlueWalletNavigationHeader,
  BlueAlertWalletExportReminder,
  BlueListItemHooks,
} from '../../BlueComponents';
import WalletGradient from '../../class/wallet-gradient';
import { Icon } from 'react-native-elements';
import { LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import Modal from 'react-native-modal';
import HandoffSettings from '../../class/handoff';
import Handoff from 'react-native-handoff';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { getSystemName } from 'react-native-device-info';
import { useRoute, useNavigation, useTheme } from '@react-navigation/native';
import BuyBitcoin from './buyBitcoin';
const BlueApp = require('../../BlueApp');
const EV = require('../../blue_modules/events');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
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
  },
  marketplaceButton1: {
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
    borderRadius: 9,
    minHeight: 49,
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketpalceText1: {
    fontSize: 18,
  },
  marketpalceText2: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  list: {
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

const WalletTransactions = () => {
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isManageFundsModalVisible, setIsManageFundsModalVisible] = useState(false);
  const { wallet } = useRoute().params;
  const name = useRoute().name;
  const [itemPriceUnit, setItemPriceUnit] = useState(wallet.getPreferredBalanceUnit());
  const [dataSource, setDataSource] = useState(wallet.getTransactions(15));
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [limit, setLimit] = useState(15);
  const [pageSize, setPageSize] = useState(20);
  const { setParams, navigate } = useNavigation();
  const { colors } = useTheme();

  const windowHeight = useWindowDimensions().height;
  const windowWidth = useWindowDimensions().width;
  const stylesHook = StyleSheet.create({
    advancedTransactionOptionsModalContent: {
      backgroundColor: colors.elevated,
    },
    listHeaderText: {
      color: colors.foregroundColor,
    },
    marketplaceButton1: {
      backgroundColor: colors.lightButton,
    },
    marketplaceButton2: {
      backgroundColor: colors.lightButton,
    },
    marketpalceText1: {
      color: colors.cta2,
    },
    marketpalceText2: {
      color: colors.cta2,
    },
    list: {
      backgroundColor: colors.background,
    },
  });

  /**
   * Simple wrapper for `wallet.getTransactions()`, where `wallet` is current wallet.
   * Sorts. Provides limiting.
   *
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @returns {Array}
   */
  const getTransactions = (limit = Infinity) => {
    let txs = wallet.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function (a, b) {
      return b.sort_ts - a.sort_ts;
    });
    return txs.slice(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(() => {
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, refreshTransactionsFunction, true);
    HandoffSettings.isHandoffUseEnabled().then(setIsHandOffUseEnabled);
    const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 60000);
    return () => {
      clearInterval(interval);
      navigate('DrawerRoot', { selectedWallet: '' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLimit(15);
    setPageSize(20);
    setTimeElapsed(0);
    setDataSource(wallet.getTransactions(15));
    setItemPriceUnit(wallet.getPreferredBalanceUnit());
    setParams({ wallet, isLoading: false });
    setIsLoading(false);
    navigate('DrawerRoot', { selectedWallet: wallet.getID() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  const refreshTransactionsFunction = delay => {
    delay = delay || 4000;
    setTimeout(function () {
      refreshTransactions();
    }, delay); // giving a chance to remote server to propagate
  };

  const isLightning = () => {
    const w = wallet;
    if (w && w.chain === Chain.OFFCHAIN) {
      return true;
    }

    return false;
  };

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  const refreshTransactions = async () => {
    if (isLoading) return;
    setIsLoading(true);
    let noErr = true;
    let smthChanged = false;
    try {
      // await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      /** @type {LegacyWallet} */
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
      setIsLoading(false);
    }
    if (noErr && smthChanged) {
      console.log('saving to disk');
      await BlueApp.saveToDisk(); // caching
      EV(EV.enum.TRANSACTIONS_COUNT_CHANGED); // let other components know they should redraw
      setDataSource(getTransactions(limit));
    }
    setIsLoading(false);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return (getTransactions(Infinity).length > limit && <ActivityIndicator style={styles.activityIndicator} />) || <View />;
  };

  const renderListHeaderComponent = () => {
    const style = { opacity: isLoading ? 0.5 : 1.0 };
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
          {wallet.getTransactions().length > 0 && wallet.type !== LightningCustodianWallet.type && renderSellFiat()}
          {wallet.type === LightningCustodianWallet.type && renderMarketplaceButton()}
          {wallet.type === LightningCustodianWallet.type && Platform.OS === 'ios' && renderLappBrowserButton()}
        </View>
        <View style={[styles.listHeaderTextRow, stylesHook.listHeaderTextRow]}>
          <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
          {isDesktop && (
            <TouchableOpacity style={style} onPress={refreshTransactions} disabled={isLoading}>
              <Icon name="refresh" type="font-awesome" color={colors.feeText} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderManageFundsModal = () => {
    return (
      <Modal
        deviceHeight={windowHeight}
        deviceWidth={windowWidth}
        isVisible={isManageFundsModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setIsManageFundsModalVisible(false);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.advancedTransactionOptionsModalContent, stylesHook.advancedTransactionOptionsModalContent]}>
            <BlueListItemHooks
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                const wallets = [...BlueApp.getWallets().filter(item => item.chain === Chain.ONCHAIN && item.allowSend())];
                if (wallets.length === 0) {
                  alert(loc.lnd.refill_create);
                } else {
                  setIsManageFundsModalVisible(false);
                  navigate('SelectWallet', { onWalletSelect, chainType: Chain.ONCHAIN });
                }
              }}
              title={loc.lnd.refill}
            />
            <BlueListItemHooks
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                setIsManageFundsModalVisible(false);

                navigate('ReceiveDetails', {
                  secret: wallet.getSecret(),
                });
              }}
              title={loc.lnd.refill_external}
            />

            <BlueListItemHooks
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                setIsManageFundsModalVisible(false);
                navigateToBuyBitcoin();
              }}
              title={loc.lnd.refill_card}
            />

            <BlueListItemHooks
              title={loc.lnd.exchange}
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                setIsManageFundsModalVisible(false);
                Linking.openURL('https://zigzag.io/?utm_source=integration&utm_medium=bluewallet&utm_campaign=withdrawLink');
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const navigateToBuyBitcoin = () => {
    BuyBitcoin.navigate(wallet);
  };

  const renderMarketplaceButton = () => {
    return Platform.select({
      android: (
        <TouchableOpacity
          onPress={() => {
            if (wallet.type === LightningCustodianWallet.type) {
              navigate('LappBrowser', { fromSecret: wallet.getSecret(), fromWallet: wallet });
            } else {
              navigate('Marketplace', { fromWallet: wallet });
            }
          }}
          style={[styles.marketplaceButton1, stylesHook.marketplaceButton1]}
        >
          <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>marketplace</Text>
        </TouchableOpacity>
      ),
      ios:
        wallet.getBalance() > 0 ? (
          <TouchableOpacity
            onPress={async () => {
              Linking.openURL('https://bluewallet.io/marketplace/');
            }}
            style={[styles.marketplaceButton1, stylesHook.marketplaceButton1]}
          >
            <Icon name="external-link" size={18} type="font-awesome" color="#9aa0aa" />
            <Text style={[styles.marketpalceText2, stylesHook.marketpalceText2]}>marketplace</Text>
          </TouchableOpacity>
        ) : null,
    });
  };

  const renderLappBrowserButton = () => {
    return (
      <TouchableOpacity
        onPress={() => {
          navigate('LappBrowser', {
            fromSecret: wallet.getSecret(),
            fromWallet: wallet,
            url: 'https://duckduckgo.com',
          });
        }}
        style={[styles.marketplaceButton2, stylesHook.marketplaceButton2]}
      >
        <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>LApp Browser</Text>
      </TouchableOpacity>
    );
  };

  const renderSellFiat = () => {
    return (
      <TouchableOpacity onPress={navigateToBuyBitcoin} style={[styles.marketplaceButton2, stylesHook.marketplaceButton2]}>
        <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>{loc.wallets.list_tap_here_to_buy}</Text>
      </TouchableOpacity>
    );
  };

  const onWalletSelect = async selectedWallet => {
    if (selectedWallet) {
      navigate('WalletTransactions', {
        key: `WalletTransactions-${wallet.getID()}`,
      });
      /** @type {LightningCustodianWallet} */
      let toAddress = false;
      if (wallet.refill_addressess.length > 0) {
        toAddress = wallet.refill_addressess[0];
      } else {
        try {
          await wallet.fetchBtcAddress();
          toAddress = wallet.refill_addressess[0];
        } catch (Err) {
          return alert(Err.message);
        }
      }
      navigate('SendDetailsRoot', {
        screen: 'SendDetails',
        params: {
          memo: loc.lnd.refill_lnd_balance,
          address: toAddress,
          fromWallet: selectedWallet,
        },
      });
    }
  };
  const navigateToSendScreen = () => {
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        fromWallet: wallet,
      },
    });
  };

  const renderItem = item => <BlueTransactionListItem item={item.item} itemPriceUnit={itemPriceUnit} timeElapsed={timeElapsed} />;

  const onBarCodeRead = ret => {
    if (!isLoading) {
      setIsLoading(true);
      const params = {
        fromSecret: wallet.getSecret(),
        // ScanLndInvoice actrually uses `fromSecret` so keeping it for now
        uri: ret.data ? ret.data : ret,
        fromWallet: wallet,
      };
      if (wallet.chain === Chain.ONCHAIN) {
        navigate('SendDetailsRoot', { screen: 'SendDetails', params });
      } else {
        navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params });
      }
    }
    setIsLoading(false);
  };

  const choosePhoto = () => {
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
              onBarCodeRead({ data: result });
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        }
      },
    );
  };

  const copyFromClipbard = async () => {
    onBarCodeRead({ data: await Clipboard.getString() });
  };

  const sendButtonLongPress = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
      }
      ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
        if (buttonIndex === 1) {
          choosePhoto();
        } else if (buttonIndex === 2) {
          navigate('ScanQRCodeRoot', {
            screen: 'ScanQRCode',
            params: {
              launchedBy: name,
              onBarScanned: onBarCodeRead,
              showFileImportButton: false,
            },
          });
        } else if (buttonIndex === 3) {
          copyFromClipbard();
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
          onPress: choosePhoto,
        },
        {
          text: loc.wallets.list_long_scan,
          onPress: () =>
            navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: name,
                onBarScanned: onBarCodeRead,
                showFileImportButton: false,
              },
            }),
        },
      ];
      if (!isClipboardEmpty) {
        buttons.push({
          text: loc.wallets.list_long_clipboard,
          onPress: copyFromClipbard,
        });
      }
      ActionSheet.showActionSheetWithOptions({
        title: '',
        message: '',
        buttons,
      });
    }
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={WalletGradient.headerColorFor(wallet.type)} />
      {wallet.chain === Chain.ONCHAIN && isHandOffUseEnabled && (
        <Handoff
          title={`Bitcoin Wallet ${wallet.getLabel()}`}
          type="io.bluewallet.bluewallet"
          url={`https://blockpath.com/search/addr?q=${wallet.getXpub()}`}
        />
      )}
      <BlueWalletNavigationHeader
        wallet={wallet}
        onWalletUnitChange={wallet =>
          InteractionManager.runAfterInteractions(async () => {
            setItemPriceUnit(wallet.getPreferredBalanceUnit());
            BlueApp.saveToDisk();
          })
        }
        onManageFundsPressed={() => {
          if (wallet.getUserHasSavedExport()) {
            setIsManageFundsModalVisible(true);
          } else {
            BlueAlertWalletExportReminder({
              onSuccess: async () => {
                wallet.setUserHasSavedExport(true);
                await BlueApp.saveToDisk();
                setIsManageFundsModalVisible(true);
              },
              onFailure: () =>
                navigate('WalletExport', {
                  wallet,
                }),
            });
          }
        }}
      />
      <View style={[styles.list, stylesHook.list]}>
        <FlatList
          ListHeaderComponent={renderListHeaderComponent}
          onEndReachedThreshold={0.3}
          onEndReached={async () => {
            // pagination in works. in this block we will add more txs to flatlist
            // so as user scrolls closer to bottom it will render mode transactions

            if (getTransactions(Infinity).length < limit) {
              // all list rendered. nop
              return;
            }

            setDataSource(getTransactions(limit + pageSize));
            setLimit(prev => prev + pageSize);
            setPageSize(prev => prev * 2);
          }}
          ListFooterComponent={renderListFooterComponent}
          ListEmptyComponent={
            <ScrollView style={styles.flex} contentContainerStyle={styles.scrollViewContent}>
              <Text numberOfLines={0} style={styles.emptyTxs}>
                {(isLightning() && loc.wallets.list_empty_txs1_lightning) || loc.wallets.list_empty_txs1}
              </Text>
              {isLightning() && <Text style={styles.emptyTxsLightning}>{loc.wallets.list_empty_txs2_lightning}</Text>}

              {!isLightning() && (
                <TouchableOpacity onPress={navigateToBuyBitcoin} style={styles.buyBitcoin}>
                  <Text style={styles.buyBitcoinText}>{loc.wallets.list_tap_here_to_buy}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          }
          onRefresh={refreshTransactions}
          refreshing={isLoading}
          data={dataSource}
          extraData={timeElapsed}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        />
        {renderManageFundsModal()}
      </View>
      <View style={styles.floatButtons}>
        {(() => {
          if (wallet.allowReceive()) {
            return (
              <BlueReceiveButtonIcon
                onPress={() => {
                  if (wallet.chain === Chain.OFFCHAIN) {
                    navigate('LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { fromWallet: wallet } });
                  } else {
                    navigate('ReceiveDetails', { secret: wallet.getSecret() });
                  }
                }}
              />
            );
          }
        })()}

        {(() => {
          if (wallet.allowSend() || (wallet.type === WatchOnlyWallet.type && wallet.isHd() && wallet.getSecret().startsWith('zpub'))) {
            return (
              <BlueSendButtonIcon
                onLongPress={sendButtonLongPress}
                onPress={() => {
                  if (wallet.chain === Chain.OFFCHAIN) {
                    navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params: { fromSecret: wallet.getSecret() } });
                  } else {
                    if (wallet.type === WatchOnlyWallet.type && wallet.isHd() && wallet.getSecret().startsWith('zpub')) {
                      if (wallet.useWithHardwareWalletEnabled()) {
                        navigateToSendScreen();
                      } else {
                        Alert.alert(
                          loc.wallets.details_title,
                          loc.transactions.enable_hw,
                          [
                            {
                              text: loc._.ok,
                              onPress: async () => {
                                wallet.setUseWithHardwareWalletEnabled(true);
                                await BlueApp.saveToDisk();
                                navigateToSendScreen();
                              },
                              style: 'default',
                            },

                            { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
                          ],
                          { cancelable: false },
                        );
                      }
                    } else {
                      navigateToSendScreen();
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
};

export default WalletTransactions;

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
