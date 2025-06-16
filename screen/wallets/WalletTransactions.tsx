import { RouteProp, useFocusEffect, useRoute, useLocale } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  findNodeHandle,
  FlatList,
  LayoutAnimation,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { Icon } from '@rneui/themed';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { LightningCustodianWallet, MultisigHDWallet, WatchOnlyWallet } from '../../class';
import presentAlert, { AlertType } from '../../components/Alert';
import { FButton, FContainer } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import TransactionsNavigationHeader, { actionKeys } from '../../components/TransactionsNavigationHeader';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import ActionSheet from '../ActionSheet';
import { useStorage } from '../../hooks/context/useStorage';
import WatchOnlyWarning from '../../components/WatchOnlyWarning';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { Transaction, TWallet } from '../../class/wallets/types';
import getWalletTransactionsOptions from '../../navigation/helpers/getWalletTransactionsOptions';
import { presentWalletExportReminder } from '../../helpers/presentWalletExportReminder';
import selectWallet from '../../helpers/select-wallet';
import assert from 'assert';
import useMenuElements from '../../hooks/useMenuElements';
import { useSettings } from '../../hooks/context/useSettings';
import useWalletSubscribe from '../../hooks/useWalletSubscribe';
import { getClipboardContent } from '../../blue_modules/clipboard';
import HandOffComponent from '../../components/HandOffComponent';
import { HandOffActivityType } from '../../components/types';
import WalletGradient from '../../class/wallet-gradient';

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

type RouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

type WalletTransactionsProps = NativeStackScreenProps<DetailViewStackParamList, 'WalletTransactions'>;

type TransactionListItem = Transaction & { type: 'transaction' | 'header' };
const WalletTransactions: React.FC<WalletTransactionsProps> = ({ route }) => {
  const { wallets, saveToDisk } = useStorage();
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { direction } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const { params, name } = useRoute<RouteProps>();
  const { walletID } = params;
  const wallet = useWalletSubscribe(walletID);
  const [limit, setLimit] = useState(15);
  const [pageSize] = useState(20);
  const navigation = useExtendedNavigation();
  const { setOptions, navigate } = navigation;
  const { colors } = useTheme();
  const { isElectrumDisabled } = useSettings();
  const walletActionButtonsRef = useRef<View>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(() => wallet._lastTxFetch || 0);
  const [fetchFailures, setFetchFailures] = useState(0);
  const [balance, setBalance] = useState(wallet.getBalance());
  const MAX_FAILURES = 3;
  const flatListRef = useRef<FlatList<Transaction>>(null);
  const headerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const stylesHook = StyleSheet.create({
    listHeaderText: {
      color: colors.foregroundColor,
    },
    listFooterStyle: {
      height: '100%',
      backgroundColor: colors.background,
    },
    backgroundContainer: {
      backgroundColor: colors.background,
    },
    gradientBackground: {
      backgroundColor: headerHeight > 0 ? WalletGradient.headerColorFor(wallet.type) : colors.background,
      height: headerHeight > 0 ? headerHeight : '30%',
    },
    activityIndicatorStyle: {
      backgroundColor: colors.background,
    },
    sendIcon: { transform: [{ rotate: direction === 'rtl' ? '-225deg' : '225deg' }] },
    receiveIcon: { transform: [{ rotate: direction === 'rtl' ? '-45deg' : '45deg' }] },
  });

  useFocusEffect(
    useCallback(() => {
      setOptions(getWalletTransactionsOptions({ route }));
    }, [route, setOptions]),
  );

  const onBarCodeRead = useCallback(
    (ret?: { data?: any }) => {
      if (!isLoading) {
        setIsLoading(true);
        const parameters = {
          walletID,
          uri: ret?.data ? ret.data : ret,
        };
        if (wallet.chain === Chain.ONCHAIN) {
          navigate('SendDetailsRoot', { screen: 'SendDetails', params: parameters });
        } else {
          navigate('ScanLNDInvoiceRoot', { screen: 'ScanLNDInvoice', params: parameters });
        }
        setIsLoading(false);
      }
    },
    [isLoading, walletID, wallet.chain, navigate],
  );

  useEffect(() => {
    const data = route.params?.onBarScanned;
    if (data) {
      onBarCodeRead({ data });
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [navigation, onBarCodeRead, route.params]);

  const sortedTransactions = useMemo(() => {
    const txs = wallet.getTransactions();
    txs.sort((a: { received: string }, b: { received: string }) => +new Date(b.received) - +new Date(a.received));
    return txs;
  }, [wallet]);

  const getTransactions = useCallback((lmt = Infinity): Transaction[] => sortedTransactions.slice(0, lmt), [sortedTransactions]);

  const loadMoreTransactions = useCallback(() => {
    if (getTransactions(Infinity).length > limit) {
      setLimit(prev => prev + pageSize);
    }
  }, [getTransactions, limit, pageSize]);

  const refreshTransactions = useCallback(
    async (isManualRefresh = false) => {
      console.debug('refreshTransactions, ', wallet.getLabel());
      if (isElectrumDisabled || isLoading) return;

      const MIN_REFRESH_INTERVAL = 5000; // 5 seconds
      if (!isManualRefresh && lastFetchTimestamp !== 0 && Date.now() - lastFetchTimestamp < MIN_REFRESH_INTERVAL) {
        return; // Prevent auto-refreshing if last fetch was too recent
      }

      if (fetchFailures >= MAX_FAILURES && !isManualRefresh) {
        return; // Silently stop auto-retrying, but allow manual refresh
      }

      // Only show loading indicator on manual refresh or after first successful fetch
      if (isManualRefresh || lastFetchTimestamp !== 0) {
        setIsLoading(true);
      }

      let smthChanged = false;
      try {
        await BlueElectrum.waitTillConnected();
        if (wallet.allowBIP47() && wallet.isBIP47Enabled() && 'fetchBIP47SenderPaymentCodes' in wallet) {
          await wallet.fetchBIP47SenderPaymentCodes();
        }
        const oldBalance = wallet.getBalance();
        await wallet.fetchBalance();
        if (oldBalance !== wallet.getBalance()) smthChanged = true;
        const oldTxLen = wallet.getTransactions().length;
        await wallet.fetchTransactions();
        if ('fetchPendingTransactions' in wallet) {
          await wallet.fetchPendingTransactions();
        }
        if ('fetchUserInvoices' in wallet) {
          await wallet.fetchUserInvoices();
        }
        if (oldTxLen !== wallet.getTransactions().length) smthChanged = true;

        // Success - reset failure counter and update timestamps
        setFetchFailures(0);
        const newTimestamp = Date.now();
        setLastFetchTimestamp(newTimestamp);
      } catch (err) {
        setFetchFailures(prev => {
          const newFailures = prev + 1;
          // Only show error on final attempt for automatic refresh
          if ((isManualRefresh || newFailures === MAX_FAILURES) && newFailures >= MAX_FAILURES) {
            if (err) {
              presentAlert({ message: (err as Error).message, type: AlertType.Toast });
            }
          }
          setIsLoading(true);
          return newFailures;
        });
      } finally {
        if (smthChanged) {
          await saveToDisk();
          setLimit(prev => prev + pageSize);
        }
        setIsLoading(false);
      }
    },
    [wallet, isElectrumDisabled, isLoading, saveToDisk, pageSize, lastFetchTimestamp, fetchFailures],
  );

  useEffect(() => {
    if (lastFetchTimestamp === 0 && !isLoading && !isElectrumDisabled) {
      refreshTransactions(false).catch(console.error);
    }
  }, [wallet, isElectrumDisabled, isLoading, refreshTransactions, lastFetchTimestamp]);

  const isLightning = useCallback((): boolean => wallet.chain === Chain.OFFCHAIN || false, [wallet]);
  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return wallet.getTransactions().length > limit ? (
      <ActivityIndicator style={[styles.activityIndicator, stylesHook.activityIndicatorStyle]} />
    ) : (
      <View style={stylesHook.listFooterStyle} />
    );
  };

  const navigateToSendScreen = () => {
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        walletID,
      },
    });
  };

  const onWalletSelect = useCallback(
    async (selectedWallet: TWallet) => {
      assert(wallet.type === LightningCustodianWallet.type, `internal error, wallet is not ${LightningCustodianWallet.type}`);
      navigate('WalletTransactions', {
        walletType: wallet.type,
        walletID,
        key: `WalletTransactions-${walletID}`,
      }); // navigating back to ln wallet screen

      // getting refill address, either cached or from the server:
      let toAddress;
      if (wallet.refill_addressess.length > 0) {
        toAddress = wallet.refill_addressess[0];
      } else {
        try {
          await wallet.fetchBtcAddress();
          toAddress = wallet.refill_addressess[0];
        } catch (Err) {
          return presentAlert({ message: (Err as Error).message, type: AlertType.Toast });
        }
      }

      // navigating to pay screen where user can pay to refill address:
      navigate('SendDetailsRoot', {
        screen: 'SendDetails',
        params: {
          transactionMemo: loc.lnd.refill_lnd_balance,
          address: toAddress,
          walletID: selectedWallet.getID(),
        },
      });
    },
    [navigate, wallet, walletID],
  );

  const navigateToViewEditCosigners = useCallback(() => {
    navigate('ViewEditMultisigCosigners', {
      walletID,
    });
  }, [navigate, walletID]);

  const onManageFundsPressed = useCallback(
    (id?: string) => {
      if (id === actionKeys.Refill) {
        const availableWallets = wallets.filter(item => item.chain === Chain.ONCHAIN && item.allowSend());
        if (availableWallets.length === 0) {
          presentAlert({ message: loc.lnd.refill_create });
        } else {
          selectWallet(navigate, name, Chain.ONCHAIN).then(onWalletSelect);
        }
      } else if (id === actionKeys.RefillWithExternalWallet) {
        navigate('ReceiveDetails', { walletID });
      }
    },
    [name, navigate, onWalletSelect, walletID, wallets],
  );

  const getItemLayout = (_: any, index: number) => ({
    length: 64,
    offset: 64 * index,
    index,
  });

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: Transaction }) => (
      <TransactionListItem key={item.hash} item={item} itemPriceUnit={wallet.preferredBalanceUnit} walletID={walletID} />
    ),
    [wallet.preferredBalanceUnit, walletID],
  );

  const choosePhoto = () => {
    fs.showImagePickerAndReadImage()
      .then(data => {
        if (data) {
          onBarCodeRead({ data });
        }
      })
      .catch(error => {
        console.log(error);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ title: loc.errors.error, message: error.message });
      });
  };

  const _keyExtractor = useCallback((_item: any, index: number) => index.toString(), []);

  const pasteFromClipboard = async () => {
    onBarCodeRead({ data: await getClipboardContent() });
  };

  const sendButtonPress = () => {
    if (wallet.chain === Chain.OFFCHAIN) {
      return navigate('ScanLNDInvoiceRoot', { screen: 'ScanLNDInvoice', params: { walletID } });
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
    const isClipboardEmpty = (await getClipboardContent())?.trim().length === 0;
    const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
    const cancelButtonIndex = 0;

    if (!isClipboardEmpty) {
      options.push(loc.wallets.paste_from_clipboard);
    }

    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.send.header,
        options,
        cancelButtonIndex,
        anchor: findNodeHandle(walletActionButtonsRef.current) ?? undefined,
      },
      async buttonIndex => {
        switch (buttonIndex) {
          case 0:
            break;
          case 1: {
            choosePhoto();
            break;
          }
          case 2: {
            navigate('ScanQRCode', {
              showImportFileButton: true,
            });
            break;
          }
          case 3:
            if (!isClipboardEmpty) {
              pasteFromClipboard();
            }
            break;
        }
      },
    );
  };

  useEffect(() => {
    const screenKey = `WalletTransactions-${walletID}`;
    registerTransactionsHandler(() => refreshTransactions(true), screenKey);

    return () => {
      unregisterTransactionsHandler(screenKey);
    };
  }, [walletID, refreshTransactions, registerTransactionsHandler, unregisterTransactionsHandler]);

  useFocusEffect(
    useCallback(() => {
      const screenKey = `WalletTransactions-${walletID}`;

      return () => {
        unregisterTransactionsHandler(screenKey);
      };
    }, [walletID, unregisterTransactionsHandler]),
  );

  useEffect(() => {
    const interval = setInterval(() => setBalance(wallet.getBalance()), 1000);
    return () => clearInterval(interval);
  }, [wallet]);

  const walletBalance = useMemo(() => {
    if (wallet.hideBalance) return '';
    if (isNaN(balance) || balance === 0) return '';
    return formatBalance(balance, wallet.preferredBalanceUnit, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, wallet.hideBalance, wallet.preferredBalanceUnit, balance]);

  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const combinedHeight = 180;
      if (offsetY < combinedHeight) {
        setOptions({ ...getWalletTransactionsOptions({ route }), headerTitle: undefined });
      } else {
        navigation.setOptions({
          headerTitle: `${wallet.getLabel()} ${walletBalance}`,
        });
      }
    },
    [navigation, wallet, walletBalance, setOptions, route],
  );

  const measureHeaderHeight = useCallback(() => {
    if (!headerRef.current) {
      // If header ref is not available, use default background
      setHeaderHeight(0);
      return;
    }

    headerRef.current.measure((x, y, width, height, pageX, pageY) => {
      // Check if the header is actually visible
      if (height === 0 || pageY < 0) {
        // Header is not visible, use default background
        setHeaderHeight(0);
        return;
      }

      const fullHeight = pageY + height;
      if (fullHeight > 0) {
        setHeaderHeight(fullHeight);
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(measureHeaderHeight, 100);
    return () => clearTimeout(timer);
  }, [walletID, measureHeaderHeight]);

  const ListHeaderComponent = useCallback(
    () => (
      <View ref={headerRef} onLayout={measureHeaderHeight}>
        <TransactionsNavigationHeader
          wallet={wallet}
          onWalletUnitChange={async selectedUnit => {
            wallet.preferredBalanceUnit = selectedUnit;
            await saveToDisk();
          }}
          unit={wallet.preferredBalanceUnit}
          onWalletBalanceVisibilityChange={async isShouldBeVisible => {
            const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
            if (wallet.hideBalance && isBiometricsEnabled) {
              const unlocked = await unlockWithBiometrics();
              if (!unlocked) throw new Error('Biometrics failed');
            }
            wallet.hideBalance = isShouldBeVisible;
            await saveToDisk();
          }}
          onManageFundsPressed={id => {
            if (wallet.type === MultisigHDWallet.type) {
              navigateToViewEditCosigners();
            } else if (wallet.type === LightningCustodianWallet.type) {
              if (wallet.getUserHasSavedExport()) {
                if (!id) return;
                onManageFundsPressed(id);
              } else {
                presentWalletExportReminder()
                  .then(async () => {
                    if (!id) return;
                    wallet.setUserHasSavedExport(true);
                    await saveToDisk();
                    onManageFundsPressed(id);
                  })
                  .catch(() => {
                    navigate('WalletExportRoot', {
                      screen: 'WalletExport',
                      params: {
                        walletID,
                      },
                    });
                  });
              }
            }
          }}
        />
        <>
          <View style={[styles.flex, stylesHook.backgroundContainer]}>
            <View style={styles.listHeaderTextRow}>
              <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
            </View>
          </View>
          <View style={stylesHook.backgroundContainer}>
            {wallet.type === WatchOnlyWallet.type && wallet.isWatchOnlyWarningVisible && (
              <WatchOnlyWarning
                handleDismiss={() => {
                  wallet.isWatchOnlyWarningVisible = false;
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.linear);
                  saveToDisk();
                }}
              />
            )}
          </View>
        </>
      </View>
    ),
    [
      wallet,
      measureHeaderHeight,
      stylesHook.backgroundContainer,
      stylesHook.listHeaderText,
      saveToDisk,
      isBiometricUseCapableAndEnabled,
      navigateToViewEditCosigners,
      onManageFundsPressed,
      navigate,
      walletID,
    ],
  );

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [walletID]);

  return (
    <View style={[styles.flex, stylesHook.backgroundContainer]}>
      <View style={[styles.refreshIndicatorBackground, stylesHook.gradientBackground]} testID="TransactionsListView" />
      <FlatList<Transaction>
        ref={flatListRef}
        getItemLayout={getItemLayout}
        updateCellsBatchingPeriod={50}
        onEndReachedThreshold={0.3}
        onEndReached={loadMoreTransactions}
        ListFooterComponent={renderListFooterComponent}
        data={getTransactions(limit)}
        extraData={wallet}
        keyExtractor={_keyExtractor}
        renderItem={renderItem}
        initialNumToRender={10}
        removeClippedSubviews
        contentContainerStyle={stylesHook.backgroundContainer}
        contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        maxToRenderPerBatch={10}
        onScroll={handleScroll}
        windowSize={15}
        scrollEventThrottle={16}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          <ScrollView style={[styles.emptyTxsContainer, stylesHook.backgroundContainer]} contentContainerStyle={styles.scrollViewContent}>
            <Text numberOfLines={0} style={styles.emptyTxs} testID="TransactionsListEmpty">
              {(isLightning() && loc.wallets.list_empty_txs1_lightning) || loc.wallets.list_empty_txs1}
            </Text>
            {isLightning() && <Text style={styles.emptyTxsLightning}>{loc.wallets.list_empty_txs2_lightning}</Text>}
          </ScrollView>
        }
        refreshControl={
          !isDesktop && !isElectrumDisabled ? (
            <RefreshControl refreshing={isLoading} onRefresh={() => refreshTransactions(true)} tintColor={colors.msSuccessCheck} />
          ) : undefined
        }
      />

      <FContainer ref={walletActionButtonsRef}>
        {wallet.allowReceive() && (
          <FButton
            testID="ReceiveButton"
            text={loc.receive.header}
            onPress={() => {
              if (wallet.chain === Chain.OFFCHAIN) {
                navigate('LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { walletID } });
              } else {
                navigate('ReceiveDetails', { walletID });
              }
            }}
            icon={
              <View style={styles.iconContainer}>
                <Icon
                  name="arrow-down"
                  size={buttonFontSize}
                  type="font-awesome"
                  color={colors.buttonAlternativeTextColor}
                  style={stylesHook.receiveIcon}
                />
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
              <View style={styles.iconContainer}>
                <Icon
                  name="arrow-down"
                  size={buttonFontSize}
                  type="font-awesome"
                  color={colors.buttonAlternativeTextColor}
                  style={stylesHook.sendIcon}
                />
              </View>
            }
          />
        )}
      </FContainer>
      {wallet.chain === Chain.ONCHAIN && wallet.type !== MultisigHDWallet.type && wallet.getXpub && wallet.getXpub() ? (
        <HandOffComponent
          title={wallet.getLabel()}
          type={HandOffActivityType.Xpub}
          url={`https://www.blockonomics.co/#/search?q=${wallet.getXpub()}`}
        />
      ) : null}
    </View>
  );
};

export default WalletTransactions;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollViewContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 500 },
  activityIndicator: { marginVertical: 20 },
  listHeaderTextRow: { flex: 1, margin: 16, flexDirection: 'row', justifyContent: 'space-between' },
  listHeaderText: { marginTop: 8, marginBottom: 8, fontWeight: 'bold', fontSize: 24 },
  refreshIndicatorBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  emptyTxsContainer: { height: '10%', minHeight: '10%', flex: 1 },
  emptyTxs: { fontSize: 18, color: '#9aa0aa', textAlign: 'center', marginVertical: 16 },
  emptyTxsLightning: { fontSize: 18, color: '#9aa0aa', textAlign: 'center', fontWeight: '600' },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: buttonFontSize * 1.5,
    height: buttonFontSize * 1.5,
    overflow: 'visible',
  },
});
