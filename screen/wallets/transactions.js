/* global alert */
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  PixelRatio,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ImagePicker from 'react-native-image-picker';
import Clipboard from '@react-native-community/clipboard';
import { Icon } from 'react-native-elements';
import Handoff from 'react-native-handoff';
import { getSystemName } from 'react-native-device-info';
import { useRoute, useNavigation, useTheme, useFocusEffect } from '@react-navigation/native';

import { Chain } from '../../models/bitcoinUnits';
import { BlueTransactionListItem, BlueWalletNavigationHeader, BlueAlertWalletExportReminder, BlueListItem } from '../../BlueComponents';
import WalletGradient from '../../class/wallet-gradient';
import { LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import HandoffSettings from '../../class/handoff';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import BottomModal from '../../components/BottomModal';
import BuyBitcoin from './buyBitcoin';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const isDesktop = getSystemName() === 'Mac OS X';

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

const WalletTransactions = () => {
  const { wallets, saveToDisk, setSelectedWallet } = useContext(BlueStorageContext);
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isManageFundsModalVisible, setIsManageFundsModalVisible] = useState(false);
  const { walletID } = useRoute().params;
  const wallet = useRef(wallets.find(w => w.getID() === walletID));
  const name = useRoute().name;
  const [itemPriceUnit, setItemPriceUnit] = useState(wallet.current.getPreferredBalanceUnit());
  const [dataSource, setDataSource] = useState(wallet.current.getTransactions(15));
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [limit, setLimit] = useState(15);
  const [pageSize, setPageSize] = useState(20);
  const { setParams, setOptions, navigate } = useNavigation();
  const { colors } = useTheme();

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
   * Simple wrapper for `wallet.current.getTransactions()`, where `wallet` is current wallet.current.
   * Sorts. Provides limiting.
   *
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @returns {Array}
   */
  const getTransactionsSliced = (limit = Infinity) => {
    let txs = wallet.current.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function (a, b) {
      return b.sort_ts - a.sort_ts;
    });
    return txs.slice(0, limit);
  };

  useEffect(() => {
    HandoffSettings.isHandoffUseEnabled().then(setIsHandOffUseEnabled);
    const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 60000);
    return () => {
      clearInterval(interval);
      setSelectedWallet('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLimit(15);
    setPageSize(20);
    setTimeElapsed(0);
    setItemPriceUnit(wallet.current.getPreferredBalanceUnit());
    setIsLoading(false);
    setSelectedWallet(wallet.current.getID());
    setDataSource(wallet.current.getTransactions(15));
    setOptions({
      headerStyle: {
        backgroundColor: WalletGradient.headerColorFor(wallet.current.type),
        borderBottomWidth: 0,
        elevation: 0,
        // shadowRadius: 0,
        shadowOffset: { height: 0, width: 0 },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, wallet.current, walletID]);

  useEffect(() => {
    const newwallet = wallets.find(w => w.getID() === walletID);
    if (newwallet) {
      wallet.current = newwallet;
      setParams({ walletID, isLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  // if description of transaction has been changed we want to show new one
  useFocusEffect(
    useCallback(() => {
      setTimeElapsed(prev => prev + 1);
    }, []),
  );

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
      const oldBalance = wallet.current.getBalance();
      await wallet.current.fetchBalance();
      if (oldBalance !== wallet.current.getBalance()) smthChanged = true;
      const balanceEnd = +new Date();
      console.log(wallet.current.getLabel(), 'fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
      const start = +new Date();
      const oldTxLen = wallet.current.getTransactions().length;
      await wallet.current.fetchTransactions();
      if (wallet.current.fetchPendingTransactions) {
        await wallet.current.fetchPendingTransactions();
      }
      if (wallet.current.fetchUserInvoices) {
        await wallet.current.fetchUserInvoices();
      }
      if (oldTxLen !== wallet.current.getTransactions().length) smthChanged = true;
      const end = +new Date();
      console.log(wallet.current.getLabel(), 'fetch tx took', (end - start) / 1000, 'sec');
    } catch (err) {
      noErr = false;
      alert(err.message);
      setIsLoading(false);
      setTimeElapsed(prev => prev + 1);
    }
    if (noErr && smthChanged) {
      console.log('saving to disk');
      await saveToDisk(); // caching
      //    setDataSource([...getTransactionsSliced(limit)]);
    }
    setIsLoading(false);
    setTimeElapsed(prev => prev + 1);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return (getTransactionsSliced(Infinity).length > limit && <ActivityIndicator style={styles.activityIndicator} />) || <View />;
  };

  const renderListHeaderComponent = () => {
    const style = {};
    if (!isDesktop) {
      // we need this button for testing
      style.opacity = 0;
      style.height = 1;
      style.width = 1;
    } else if (isLoading) {
      style.opacity = 0.5;
    } else {
      style.opacity = 1.0;
    }

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
          {wallet.current.getTransactions().length > 0 && wallet.current.type !== LightningCustodianWallet.type && renderSellFiat()}
          {wallet.current.type === LightningCustodianWallet.type && renderMarketplaceButton()}
          {wallet.current.type === LightningCustodianWallet.type && Platform.OS === 'ios' && renderLappBrowserButton()}
        </View>
        <View style={[styles.listHeaderTextRow, stylesHook.listHeaderTextRow]}>
          <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
          <TouchableOpacity testID="refreshTransactions" style={style} onPress={refreshTransactions} disabled={isLoading}>
            <Icon name="refresh" type="font-awesome" color={colors.feeText} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const hideManageFundsModal = () => {
    Keyboard.dismiss();
    setIsManageFundsModalVisible(false);
  };

  const renderManageFundsModal = () => {
    return (
      <BottomModal isVisible={isManageFundsModalVisible} onClose={hideManageFundsModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.advancedTransactionOptionsModalContent, stylesHook.advancedTransactionOptionsModalContent]}>
            <BlueListItem
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                const availableWallets = [...wallets.filter(item => item.chain === Chain.ONCHAIN && item.allowSend())];
                if (availableWallets.length === 0) {
                  alert(loc.lnd.refill_create);
                } else {
                  setIsManageFundsModalVisible(false);
                  navigate('SelectWallet', { onWalletSelect, chainType: Chain.ONCHAIN });
                }
              }}
              title={loc.lnd.refill}
            />
            <BlueListItem
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                setIsManageFundsModalVisible(false);

                navigate('ReceiveDetails', {
                  walletID: wallet.current.getID(),
                });
              }}
              title={loc.lnd.refill_external}
            />

            <BlueListItem
              hideChevron
              component={TouchableOpacity}
              onPress={() => {
                setIsManageFundsModalVisible(false);
                setTimeout(() => navigateToBuyBitcoin(), 500);
              }}
              title={loc.lnd.refill_card}
            />

            <BlueListItem
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
      </BottomModal>
    );
  };

  const navigateToBuyBitcoin = () => {
    BuyBitcoin.navigate(wallet.current);
  };

  const renderMarketplaceButton = () => {
    return Platform.select({
      android: (
        <TouchableOpacity
          onPress={() => {
            if (wallet.current.type === LightningCustodianWallet.type) {
              navigate('LappBrowser', { fromSecret: wallet.current.getSecret(), fromWallet: wallet.current });
            } else {
              navigate('Marketplace', { fromWallet: wallet.current });
            }
          }}
          style={[styles.marketplaceButton1, stylesHook.marketplaceButton1]}
        >
          <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>marketplace</Text>
        </TouchableOpacity>
      ),
      ios:
        wallet.current.getBalance() > 0 ? (
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
            fromSecret: wallet.current.getSecret(),
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
        walletType: wallet.current.type,
        walletID: wallet.current.getID(),
        key: `WalletTransactions-${wallet.current.getID()}`,
      });
      /** @type {LightningCustodianWallet} */
      let toAddress = false;
      if (wallet.current.refill_addressess.length > 0) {
        toAddress = wallet.current.refill_addressess[0];
      } else {
        try {
          await wallet.current.fetchBtcAddress();
          toAddress = wallet.current.refill_addressess[0];
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
        fromWallet: wallet.current,
      },
    });
  };

  const renderItem = item => <BlueTransactionListItem item={item.item} itemPriceUnit={itemPriceUnit} timeElapsed={timeElapsed} />;

  const onBarCodeRead = ret => {
    if (!isLoading) {
      setIsLoading(true);
      const params = {
        fromSecret: wallet.current.getSecret(),
        // ScanLndInvoice actrually uses `fromSecret` so keeping it for now
        uri: ret.data ? ret.data : ret,
        fromWallet: wallet,
      };
      if (wallet.current.chain === Chain.ONCHAIN) {
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

  const copyFromClipboard = async () => {
    onBarCodeRead({ data: await Clipboard.getString() });
  };

  const sendButtonPress = () => {
    if (wallet.current.chain === Chain.OFFCHAIN) {
      navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params: { fromSecret: wallet.current.getSecret() } });
    } else {
      if (wallet.current.type === WatchOnlyWallet.type && wallet.current.isHd() && wallet.current.getSecret().startsWith('zpub')) {
        if (wallet.current.useWithHardwareWalletEnabled()) {
          navigateToSendScreen();
        } else {
          Alert.alert(
            loc.wallets.details_title,
            loc.transactions.enable_hw,
            [
              {
                text: loc._.ok,
                onPress: async () => {
                  wallet.current.setUseWithHardwareWalletEnabled(true);
                  await saveToDisk();
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
          copyFromClipboard();
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
          onPress: copyFromClipboard,
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
      <StatusBar barStyle="light-content" backgroundColor={WalletGradient.headerColorFor(wallet.current.type)} />
      {wallet.current.chain === Chain.ONCHAIN && isHandOffUseEnabled && (
        <Handoff
          title={`Bitcoin Wallet ${wallet.current.getLabel()}`}
          type="io.bluewallet.bluewallet"
          url={`https://blockpath.com/search/addr?q=${wallet.current.getXpub()}`}
        />
      )}
      <BlueWalletNavigationHeader
        wallet={wallet.current}
        onWalletUnitChange={passedWallet =>
          InteractionManager.runAfterInteractions(async () => {
            setItemPriceUnit(passedWallet.getPreferredBalanceUnit());
            saveToDisk();
          })
        }
        onManageFundsPressed={() => {
          if (wallet.current.getUserHasSavedExport()) {
            setIsManageFundsModalVisible(true);
          } else {
            BlueAlertWalletExportReminder({
              onSuccess: async () => {
                wallet.current.setUserHasSavedExport(true);
                await saveToDisk();
                setIsManageFundsModalVisible(true);
              },
              onFailure: () =>
                navigate('WalletExport', {
                  walletID: wallet.current.getID(),
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
            // pagination in works. in this block we will add more txs to FlatList
            // so as user scrolls closer to bottom it will render mode transactions

            if (getTransactionsSliced(Infinity).length < limit) {
              // all list rendered. nop
              return;
            }

            setDataSource(getTransactionsSliced(limit + pageSize));
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
                  <Text testID="NoTxBuyBitcoin" style={styles.buyBitcoinText}>
                    {loc.wallets.list_tap_here_to_buy}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          }
          onRefresh={refreshTransactions}
          refreshing={isLoading}
          data={dataSource}
          extraData={[timeElapsed, dataSource]}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        />
        {renderManageFundsModal()}
      </View>

      <FContainer>
        {wallet.current.allowReceive() && (
          <FButton
            text={loc.receive.header}
            onPress={() => {
              if (wallet.current.chain === Chain.OFFCHAIN) {
                navigate('LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { fromWallet: wallet.current } });
              } else {
                navigate('ReceiveDetails', { walletID: wallet.current.getID() });
              }
            }}
            icon={
              <View style={styles.receiveIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
              </View>
            }
          />
        )}
        {(wallet.current.allowSend() ||
          (wallet.current.type === WatchOnlyWallet.type && wallet.current.isHd() && wallet.current.getSecret().startsWith('zpub'))) && (
          <FButton
            onLongPress={sendButtonLongPress}
            onPress={sendButtonPress}
            text={loc.send.header}
            testID="SendButton"
            icon={
              <View style={styles.sendIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
              </View>
            }
          />
        )}
      </FContainer>
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
            walletID: route.params.walletID,
          })
        }
      >
        <Icon name="kebab-horizontal" type="octicon" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    ),
    headerTitle: () => null,
    headerStyle: {
      backgroundColor: WalletGradient.headerColorFor(route.params.walletType),
      borderBottomWidth: 0,
      elevation: 0,
      // shadowRadius: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerTintColor: '#FFFFFF',
    headerBackTitleVisible: false,
  };
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollViewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
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
    marginLeft: 16,
    marginRight: 16,
    marginVertical: 16,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 4,
  },
  marketplaceButton2: {
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 4,
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
  sendIcon: {
    transform: [{ rotate: '225deg' }],
  },
  receiveIcon: {
    transform: [{ rotate: '-45deg' }],
  },
});
