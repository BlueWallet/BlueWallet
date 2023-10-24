import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  InteractionManager,
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  findNodeHandle,
  TouchableOpacity,
  View,
  I18nManager,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useRoute, useNavigation, useTheme, useFocusEffect } from '@react-navigation/native';
import { Chain } from '../../models/bitcoinUnits';
import { BlueAlertWalletExportReminder } from '../../BlueComponents';
import WalletGradient from '../../class/wallet-gradient';
import navigationStyle from '../../components/navigationStyle';
import { LightningCustodianWallet, LightningLdkWallet, MultisigHDWallet, WatchOnlyWallet } from '../../class';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import { BlueStorageContext, WalletTransactionsStatus } from '../../blue_modules/storage-context';
import { isDesktop } from '../../blue_modules/environment';
import BlueClipboard from '../../blue_modules/clipboard';
import LNNodeBar from '../../components/LNNodeBar';
import TransactionsNavigationHeader, { actionKeys } from '../../components/TransactionsNavigationHeader';
import { TransactionListItem } from '../../components/TransactionListItem';
import alert from '../../components/Alert';
import PropTypes from 'prop-types';
import { requestCameraAuthorization } from '../../helpers/scan-qr';

const fs = require('../../blue_modules/fs');
const BlueElectrum = require('../../blue_modules/BlueElectrum');

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

const WalletTransactions = ({ navigation }) => {
  const { wallets, saveToDisk, setSelectedWallet, walletTransactionUpdateStatus, isElectrumDisabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(false);
  const { walletID } = useRoute().params;
  const { name } = useRoute();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [itemPriceUnit, setItemPriceUnit] = useState(wallet.getPreferredBalanceUnit());
  const [dataSource, setDataSource] = useState(wallet.getTransactions(15));
  const [isRefreshing, setIsRefreshing] = useState(false); // a simple flag to know that wallet was being updated once
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [limit, setLimit] = useState(15);
  const [pageSize, setPageSize] = useState(20);
  const { setParams, setOptions, navigate } = useNavigation();
  const { colors } = useTheme();
  const [lnNodeInfo, setLnNodeInfo] = useState({ canReceive: 0, canSend: 0 });
  const walletActionButtonsRef = useRef();

  const stylesHook = StyleSheet.create({
    listHeaderText: {
      color: colors.foregroundColor,
    },
    browserButton2: {
      backgroundColor: colors.lightButton,
    },
    marketpalceText1: {
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
   * @param lmt {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @returns {Array}
   */
  const getTransactionsSliced = (lmt = Infinity) => {
    let txs = wallet.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function (a, b) {
      return b.sort_ts - a.sort_ts;
    });
    return txs.slice(0, lmt);
  };

  useEffect(() => {
    const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (walletTransactionUpdateStatus === walletID) {
      // wallet is being refreshed, drawing the 'Updating...' header:
      setOptions({ headerTitle: loc.transactions.updating });
      setIsRefreshing(true);
    } else {
      setOptions({ headerTitle: '' });
    }

    if (isRefreshing && walletTransactionUpdateStatus === WalletTransactionsStatus.NONE) {
      // if we are here this means that wallet was being updated (`walletTransactionUpdateStatus` was set, and
      // `isRefreshing` flag was set) and we displayed "Updating..." message,
      // and when it ended `walletTransactionUpdateStatus` became false (flag `isRefreshing` stayed).
      // chances are that txs list changed for the wallet, so we need to re-render:
      console.log('re-rendering transactions');
      setDataSource([...getTransactionsSliced(limit)]);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTransactionUpdateStatus]);

  useEffect(() => {
    setIsLoading(true);
    setLimit(15);
    setPageSize(20);
    setTimeElapsed(0);
    setItemPriceUnit(wallet.getPreferredBalanceUnit());
    setIsLoading(false);
    setSelectedWallet(wallet.getID());
    setDataSource([...getTransactionsSliced(limit)]);
    setOptions({
      headerStyle: {
        backgroundColor: WalletGradient.headerColorFor(wallet.type),
        borderBottomWidth: 0,
        elevation: 0,
        // shadowRadius: 0,
        shadowOffset: { height: 0, width: 0 },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  useEffect(() => {
    const newWallet = wallets.find(w => w.getID() === walletID);
    if (newWallet) {
      setParams({ walletID, isLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  // refresh transactions if it never hasn't been done. It could be a fresh imported wallet
  useEffect(() => {
    if (wallet.getLastTxFetch() === 0) {
      refreshTransactions();
    }
    refreshLnNodeInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const refreshLnNodeInfo = () => {
    if (wallet.type === LightningLdkWallet.type) {
      setLnNodeInfo({ canReceive: wallet.getReceivableBalance(), canSend: wallet.getBalance() });
    }
  };

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  const refreshTransactions = async () => {
    if (isElectrumDisabled) return setIsLoading(false);
    if (isLoading) return;
    setIsLoading(true);
    let noErr = true;
    let smthChanged = false;
    try {
      refreshLnNodeInfo();
      // await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      if (wallet.allowBIP47() && wallet.isBIP47Enabled()) {
        const pcStart = +new Date();
        await wallet.fetchBIP47SenderPaymentCodes();
        const pcEnd = +new Date();
        console.log(wallet.getLabel(), 'fetch payment codes took', (pcEnd - pcStart) / 1000, 'sec');
      }
      const balanceStart = +new Date();
      const oldBalance = wallet.getBalance();
      await wallet.fetchBalance();
      if (oldBalance !== wallet.getBalance()) smthChanged = true;
      const balanceEnd = +new Date();
      console.log(wallet.getLabel(), 'fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
      const start = +new Date();
      const oldTxLen = wallet.getTransactions().length;
      let immatureTxsConfs = ''; // a silly way to keep track if anything changed in immature transactions
      for (const tx of wallet.getTransactions()) {
        if (tx.confirmations < 7) immatureTxsConfs += tx.txid + ':' + tx.confirmations + ';';
      }
      await wallet.fetchTransactions();
      if (wallet.fetchPendingTransactions) {
        await wallet.fetchPendingTransactions();
      }
      if (wallet.fetchUserInvoices) {
        await wallet.fetchUserInvoices();
      }
      if (oldTxLen !== wallet.getTransactions().length) smthChanged = true;
      let unconfirmedTxsConfs2 = ''; // a silly way to keep track if anything changed in immature transactions
      for (const tx of wallet.getTransactions()) {
        if (tx.confirmations < 7) unconfirmedTxsConfs2 += tx.txid + ':' + tx.confirmations + ';';
      }
      if (unconfirmedTxsConfs2 !== immatureTxsConfs) {
        smthChanged = true;
      }
      const end = +new Date();
      console.log(wallet.getLabel(), 'fetch tx took', (end - start) / 1000, 'sec');
    } catch (err) {
      noErr = false;
      alert(err.message);
      setIsLoading(false);
      setTimeElapsed(prev => prev + 1);
    }
    if (noErr && smthChanged) {
      console.log('saving to disk');
      await saveToDisk(); // caching
      setDataSource([...getTransactionsSliced(limit)]);
    }
    setIsLoading(false);
    setTimeElapsed(prev => prev + 1);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return (wallet.getTransactions().length > limit && <ActivityIndicator style={styles.activityIndicator} />) || <View />;
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
        <View style={styles.listHeader}>{wallet.chain === Chain.OFFCHAIN && renderLappBrowserButton()}</View>
        {wallet.type === LightningLdkWallet.type && (lnNodeInfo.canSend > 0 || lnNodeInfo.canReceive > 0) && (
          <View style={[styles.marginHorizontal18, styles.marginBottom18]}>
            <LNNodeBar canSend={lnNodeInfo.canSend} canReceive={lnNodeInfo.canReceive} itemPriceUnit={itemPriceUnit} />
          </View>
        )}
        <View style={styles.listHeaderTextRow}>
          <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            testID="refreshTransactions"
            style={style}
            onPress={refreshTransactions}
            disabled={isLoading}
          >
            <Icon name="refresh" type="font-awesome" color={colors.feeText} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLappBrowserButton = () => {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          navigate('LappBrowserRoot', {
            screen: 'LappBrowser',
            params: {
              walletID,
              url: 'https://duckduckgo.com',
            },
          });
        }}
        style={[styles.browserButton2, stylesHook.browserButton2]}
      >
        <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>{loc.wallets.list_ln_browser}</Text>
      </TouchableOpacity>
    );
  };

  const onWalletSelect = async selectedWallet => {
    if (selectedWallet) {
      navigate('WalletTransactions', {
        walletType: wallet.type,
        walletID: wallet.getID(),
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
          walletID: selectedWallet.getID(),
        },
      });
    }
  };
  const navigateToSendScreen = () => {
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        walletID: wallet.getID(),
      },
    });
  };

  const renderItem = item => (
    <TransactionListItem item={item.item} itemPriceUnit={itemPriceUnit} timeElapsed={timeElapsed} walletID={walletID} />
  );

  const onBarCodeRead = ret => {
    if (!isLoading) {
      setIsLoading(true);
      const params = {
        walletID: wallet.getID(),
        uri: ret.data ? ret.data : ret,
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
    fs.showImagePickerAndReadImage().then(onBarCodeRead);
  };

  const copyFromClipboard = async () => {
    onBarCodeRead({ data: await BlueClipboard().getClipboardContent() });
  };

  const sendButtonPress = () => {
    if (wallet.chain === Chain.OFFCHAIN) {
      return navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params: { walletID: wallet.getID() } });
    }

    if (wallet.type === WatchOnlyWallet.type && wallet.isHd() && !wallet.useWithHardwareWalletEnabled()) {
      return Alert.alert(
        loc.wallets.details_title,
        loc.transactions.enable_offline_signing,
        [
          {
            text: loc._.ok,
            onPress: async () => {
              wallet.setUseWithHardwareWalletEnabled(true);
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

    navigateToSendScreen();
  };

  const sendButtonLongPress = async () => {
    const isClipboardEmpty = (await BlueClipboard().getClipboardContent()).trim().length === 0;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
      }
      ActionSheet.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, anchor: findNodeHandle(walletActionButtonsRef.current) },
        buttonIndex => {
          if (buttonIndex === 1) {
            choosePhoto();
          } else if (buttonIndex === 2) {
            requestCameraAuthorization().then(() =>
              navigate('ScanQRCodeRoot', {
                screen: 'ScanQRCode',
                params: {
                  launchedBy: name,
                  onBarScanned: onBarCodeRead,
                  showFileImportButton: false,
                },
              }),
            );
          } else if (buttonIndex === 3) {
            copyFromClipboard();
          }
        },
      );
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
            requestCameraAuthorization().then(() => {
              navigate('ScanQRCodeRoot', {
                screen: 'ScanQRCode',
                params: {
                  launchedBy: name,
                  onBarScanned: onBarCodeRead,
                  showFileImportButton: false,
                },
              });
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

  const navigateToViewEditCosigners = () => {
    navigate('ViewEditMultisigCosignersRoot', {
      screen: 'ViewEditMultisigCosigners',
      params: {
        walletId: wallet.getID(),
      },
    });
  };

  const onManageFundsPressed = ({ id }) => {
    if (id === actionKeys.Refill) {
      const availableWallets = [...wallets.filter(item => item.chain === Chain.ONCHAIN && item.allowSend())];
      if (availableWallets.length === 0) {
        alert(loc.lnd.refill_create);
      } else {
        navigate('SelectWallet', { onWalletSelect, chainType: Chain.ONCHAIN });
      }
    } else if (id === actionKeys.RefillWithExternalWallet) {
      if (wallet.getUserHasSavedExport()) {
        navigate('ReceiveDetailsRoot', {
          screen: 'ReceiveDetails',
          params: {
            walletID: wallet.getID(),
          },
        });
      }
    }
  };

  useEffect(() => {
    setOptions({ statusBarStyle: 'light', barTintColor: WalletGradient.headerColorFor(wallet.type) });
  }, [setOptions, wallet.type]);

  const getItemLayout = (_, index) => ({
    length: 64,
    offset: 64 * index,
    index,
  });

  return (
    <View style={styles.flex}>
      <TransactionsNavigationHeader
        navigation={navigation}
        wallet={wallet}
        onWalletUnitChange={passedWallet =>
          InteractionManager.runAfterInteractions(async () => {
            setItemPriceUnit(passedWallet.getPreferredBalanceUnit());
            saveToDisk();
          })
        }
        onManageFundsPressed={id => {
          if (wallet.type === MultisigHDWallet.type) {
            navigateToViewEditCosigners();
          } else if (wallet.type === LightningLdkWallet.type) {
            navigate('LdkInfo', { walletID: wallet.getID() });
          } else if (wallet.type === LightningCustodianWallet.type) {
            if (wallet.getUserHasSavedExport()) {
              onManageFundsPressed({ id });
            } else {
              BlueAlertWalletExportReminder({
                onSuccess: async () => {
                  wallet.setUserHasSavedExport(true);
                  await saveToDisk();
                  onManageFundsPressed({ id });
                },
                onFailure: () =>
                  navigate('WalletExportRoot', {
                    screen: 'WalletExport',
                    params: {
                      walletID: wallet.getID(),
                    },
                  }),
              });
            }
          }
        }}
      />
      <View style={[styles.list, stylesHook.list]}>
        <FlatList
          getItemLayout={getItemLayout}
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
            </ScrollView>
          }
          {...(isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh: refreshTransactions })}
          data={dataSource}
          extraData={[timeElapsed, dataSource, wallets]}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          initialNumToRender={10}
          removeClippedSubviews
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        />
      </View>

      <FContainer ref={walletActionButtonsRef}>
        {wallet.allowReceive() && (
          <FButton
            testID="ReceiveButton"
            text={loc.receive.header}
            onPress={() => {
              if (wallet.chain === Chain.OFFCHAIN) {
                navigate('LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { walletID: wallet.getID() } });
              } else {
                navigate('ReceiveDetailsRoot', { screen: 'ReceiveDetails', params: { walletID: wallet.getID() } });
              }
            }}
            icon={
              <View style={styles.receiveIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
              </View>
            }
          />
        )}
        {(wallet.allowSend() || (wallet.type === WatchOnlyWallet.type && wallet.isHd())) && (
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

WalletTransactions.navigationOptions = navigationStyle({}, (options, { theme, navigation, route }) => {
  return {
    headerRight: () => (
      <TouchableOpacity
        accessibilityRole="button"
        testID="WalletDetails"
        disabled={route.params.isLoading === true}
        style={styles.walletDetails}
        onPress={() =>
          navigation.navigate('WalletDetails', {
            walletID: route.params.walletID,
          })
        }
      >
        <Icon name="more-horiz" type="material" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    ),
    title: '',
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
});

WalletTransactions.propTypes = {
  navigation: PropTypes.shape(),
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
  marginHorizontal18: {
    marginHorizontal: 18,
  },
  marginBottom18: {
    marginBottom: 18,
  },
  walletDetails: {
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
  browserButton2: {
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
  sendIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '-225deg' : '225deg' }],
  },
  receiveIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '45deg' : '-45deg' }],
  },
});
