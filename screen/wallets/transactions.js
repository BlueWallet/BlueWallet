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
  findNodeHandle,
  TouchableOpacity,
  View,
  I18nManager,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useRoute, useNavigation, useTheme, useFocusEffect } from '@react-navigation/native';
import { Chain } from '../../models/bitcoinUnits';
import { BlueAlertWalletExportReminder, BlueListItem } from '../../BlueComponents';
import WalletGradient from '../../class/wallet-gradient';
import navigationStyle from '../../components/navigationStyle';
import { LightningCustodianWallet, MultisigHDWallet, WatchOnlyWallet } from '../../class';
import HandoffComponent from '../../components/handoff';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import BottomModal from '../../components/BottomModal';
import BuyBitcoin from './buyBitcoin';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isDesktop, isMacCatalina } from '../../blue_modules/environment';
import BlueClipboard from '../../blue_modules/clipboard';
import TransactionsNavigationHeader from '../../components/TransactionsNavigationHeader';
import { TransactionListItem } from '../../components/TransactionListItem';

const fs = require('../../blue_modules/fs');
const BlueElectrum = require('../../blue_modules/BlueElectrum');

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

const WalletTransactions = () => {
  const { wallets, saveToDisk, setSelectedWallet, walletTransactionUpdateStatus, isElectrumDisabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isManageFundsModalVisible, setIsManageFundsModalVisible] = useState(false);
  const { walletID } = useRoute().params;
  const { name } = useRoute();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [itemPriceUnit, setItemPriceUnit] = useState(wallet.getPreferredBalanceUnit());
  const [dataSource, setDataSource] = useState(wallet.getTransactions(15));
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [limit, setLimit] = useState(15);
  const [pageSize, setPageSize] = useState(20);
  const { setParams, setOptions, navigate } = useNavigation();
  const { colors } = useTheme();
  const walletActionButtonsRef = useRef();

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
  const getTransactionsSliced = (limit = Infinity) => {
    let txs = wallet.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function (a, b) {
      return b.sort_ts - a.sort_ts;
    });
    return txs.slice(0, limit);
  };

  useEffect(() => {
    const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 60000);
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions({ headerTitle: walletTransactionUpdateStatus === walletID ? loc.transactions.updating : '' });
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
    setDataSource(wallet.getTransactions(15));
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
  }, [wallets, wallet, walletID]);

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
          {wallet.getTransactions().length > 0 && wallet.type !== LightningCustodianWallet.type && renderSellFiat()}
          {wallet.type === LightningCustodianWallet.type && renderMarketplaceButton()}
          {wallet.type === LightningCustodianWallet.type && Platform.OS === 'ios' && renderLappBrowserButton()}
        </View>
        <View style={[styles.listHeaderTextRow, stylesHook.listHeaderTextRow]}>
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

  const hideManageFundsModal = () => {
    Keyboard.dismiss();
    setIsManageFundsModalVisible(false);
  };

  const renderManageFundsModal = () => {
    return (
      <BottomModal isVisible={isManageFundsModalVisible} onClose={hideManageFundsModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
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

                navigate('ReceiveDetailsRoot', {
                  screen: 'ReceiveDetails',
                  params: {
                    walletID: wallet.getID(),
                  },
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
    BuyBitcoin.navigate(wallet);
  };

  const renderMarketplaceButton = () => {
    return (
      wallet.chain === Chain.OFFCHAIN &&
      Platform.select({
        android: (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              if (wallet.type === LightningCustodianWallet.type) {
                navigate('LappBrowserRoot', {
                  screen: 'LappBrowser',
                  params: { walletID },
                });
              } else {
                navigate('Marketplace', { walletID });
              }
            }}
            style={[styles.marketplaceButton1, stylesHook.marketplaceButton1]}
          >
            <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>{loc.wallets.list_marketplace}</Text>
          </TouchableOpacity>
        ),
        ios:
          wallet.getBalance() > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={async () => {
                Linking.openURL('https://bluewallet.io/marketplace/');
              }}
              style={[styles.marketplaceButton1, stylesHook.marketplaceButton1]}
            >
              <Icon name="external-link" size={18} type="font-awesome" color="#9aa0aa" />
              <Text style={[styles.marketpalceText2, stylesHook.marketpalceText2]}>{loc.wallets.list_marketplace}</Text>
            </TouchableOpacity>
          ) : null,
      })
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
        style={[styles.marketplaceButton2, stylesHook.marketplaceButton2]}
      >
        <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>{loc.wallets.list_ln_browser}</Text>
      </TouchableOpacity>
    );
  };

  const renderSellFiat = () => {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={navigateToBuyBitcoin}
        style={[styles.marketplaceButton2, stylesHook.marketplaceButton2]}
      >
        <Text style={[styles.marketpalceText1, stylesHook.marketpalceText1]}>{loc.wallets.list_tap_here_to_buy}</Text>
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

  const renderItem = item => <TransactionListItem item={item.item} itemPriceUnit={itemPriceUnit} timeElapsed={timeElapsed} />;

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
    onBarCodeRead({ data: await BlueClipboard.getClipboardContent() });
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
    if (isMacCatalina) {
      fs.showActionSheet({ anchor: walletActionButtonsRef.current }).then(onBarCodeRead);
    } else {
      const isClipboardEmpty = (await BlueClipboard.getClipboardContent()).trim().length === 0;
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

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={WalletGradient.headerColorFor(wallet.type)} />
      {wallet.chain === Chain.ONCHAIN && wallet.type !== MultisigHDWallet.type && (
        <HandoffComponent
          title={`Bitcoin Wallet ${wallet.getLabel()}`}
          type="io.bluewallet.bluewallet"
          url={`https://blockpath.com/search/addr?q=${wallet.getXpub()}`}
        />
      )}
      <TransactionsNavigationHeader
        wallet={wallet}
        onWalletUnitChange={passedWallet =>
          InteractionManager.runAfterInteractions(async () => {
            setItemPriceUnit(passedWallet.getPreferredBalanceUnit());
            saveToDisk();
          })
        }
        onManageFundsPressed={() => {
          if (wallet.type === MultisigHDWallet.type) {
            navigateToViewEditCosigners();
          } else if (wallet.type === LightningCustodianWallet.type) {
            if (wallet.getUserHasSavedExport()) {
              setIsManageFundsModalVisible(true);
            } else {
              BlueAlertWalletExportReminder({
                onSuccess: async () => {
                  wallet.setUserHasSavedExport(true);
                  await saveToDisk();
                  setIsManageFundsModalVisible(true);
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
                <TouchableOpacity onPress={navigateToBuyBitcoin} style={styles.buyBitcoin} accessibilityRole="button">
                  <Text testID="NoTxBuyBitcoin" style={styles.buyBitcoinText}>
                    {loc.wallets.list_tap_here_to_buy}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          }
          {...(isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh: refreshTransactions })}
          data={dataSource}
          extraData={[timeElapsed, dataSource, wallets]}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        />
        {renderManageFundsModal()}
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
        <Icon name="kebab-horizontal" type="octicon" size={22} color="#FFFFFF" />
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
    transform: [{ rotate: I18nManager.isRTL ? '-225deg' : '225deg' }],
  },
  receiveIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '45deg' : '-45deg' }],
  },
});
