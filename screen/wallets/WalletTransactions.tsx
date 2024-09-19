import { useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  findNodeHandle,
  FlatList,
  I18nManager,
  InteractionManager,
  LayoutAnimation,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '@rneui/themed';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import BlueClipboard from '../../blue_modules/clipboard';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { LightningCustodianWallet, MultisigHDWallet, WatchOnlyWallet } from '../../class';
import presentAlert, { AlertType } from '../../components/Alert';
import { FButton, FContainer } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import TransactionsNavigationHeader, { actionKeys } from '../../components/TransactionsNavigationHeader';
import { scanQrHelper } from '../../helpers/scan-qr';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
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

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

type WalletTransactionsProps = NativeStackScreenProps<DetailViewStackParamList, 'WalletTransactions'>;

const WalletTransactions: React.FC<WalletTransactionsProps> = ({ route }) => {
  const { wallets, saveToDisk, setSelectedWalletID, isElectrumDisabled, setReloadTransactionsMenuActionFunction } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const [isLoading, setIsLoading] = useState(false);
  const { walletID } = route.params;
  const { name } = useRoute();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [itemPriceUnit, setItemPriceUnit] = useState<BitcoinUnit>(wallet?.getPreferredBalanceUnit() ?? BitcoinUnit.BTC);
  const [limit, setLimit] = useState(15);
  const [pageSize] = useState(20);
  const navigation = useExtendedNavigation();
  const { setOptions, navigate } = navigation;
  const { colors } = useTheme();
  const walletActionButtonsRef = useRef<View>(null);

  const stylesHook = StyleSheet.create({
    listHeaderText: {
      color: colors.foregroundColor,
    },
    list: {
      backgroundColor: colors.background,
    },
  });

  useFocusEffect(
    useCallback(() => {
      setOptions(getWalletTransactionsOptions({ route }));
    }, [route, setOptions]),
  );

  const getTransactions = useCallback(
    (lmt = Infinity): Transaction[] => {
      if (!wallet) return [];
      const txs = wallet.getTransactions();
      txs.sort((a: { received: string }, b: { received: string }) => +new Date(b.received) - +new Date(a.received));
      return txs.slice(0, lmt);
    },
    [wallet],
  );

  const loadMoreTransactions = useCallback(() => {
    if (getTransactions(Infinity).length > limit) {
      setLimit(prev => prev + pageSize);
    }
  }, [getTransactions, limit, pageSize]);

  const refreshTransactions = useCallback(async () => {
    console.debug('refreshTransactions, ', wallet?.getLabel());
    if (!wallet || isElectrumDisabled || isLoading) return;
    setIsLoading(true);
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
    } catch (err) {
      presentAlert({ message: (err as Error).message, type: AlertType.Toast });
    } finally {
      if (smthChanged) {
        await saveToDisk();
        setLimit(prev => prev + pageSize);
      }
      setIsLoading(false);
    }
  }, [wallet, isElectrumDisabled, isLoading, saveToDisk, pageSize]);

  useEffect(() => {
    if (wallet && wallet.getLastTxFetch() === 0) {
      refreshTransactions();
    }
  }, [wallet, refreshTransactions]);

  useEffect(() => {
    if (wallet) {
      setSelectedWalletID(wallet.getID());
    }
  }, [wallet, setSelectedWalletID]);

  const isLightning = (): boolean => wallet?.chain === Chain.OFFCHAIN || false;

  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return wallet && wallet.getTransactions().length > limit ? <ActivityIndicator style={styles.activityIndicator} /> : <View />;
  };

  const renderListHeaderComponent = () => {
    const style: any = {};
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
        <View style={styles.listHeaderTextRow}>
          <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
        </View>
      </View>
    );
  };

  const navigateToSendScreen = () => {
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        walletID: wallet?.getID(),
      },
    });
  };

  const onWalletSelect = async (selectedWallet: TWallet) => {
    assert(wallet?.type === LightningCustodianWallet.type, `internal error, wallet is not ${LightningCustodianWallet.type}`);
    navigate('WalletTransactions', {
      walletType: wallet?.type,
      walletID: wallet?.getID(),
      key: `WalletTransactions-${wallet?.getID()}`,
    }); // navigating back to ln wallet screen

    // getting refill address, either cached or from the server:
    let toAddress;
    if (wallet?.refill_addressess.length > 0) {
      toAddress = wallet.refill_addressess[0];
    } else {
      try {
        await wallet?.fetchBtcAddress();
        toAddress = wallet?.refill_addressess[0];
      } catch (Err) {
        return presentAlert({ message: (Err as Error).message, type: AlertType.Toast });
      }
    }

    // navigating to pay screen where user can pay to refill address:
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        memo: loc.lnd.refill_lnd_balance,
        address: toAddress,
        walletID: selectedWallet.getID(),
      },
    });
  };

  const navigateToViewEditCosigners = () => {
    navigate('ViewEditMultisigCosignersRoot', {
      screen: 'ViewEditMultisigCosigners',
      params: {
        walletID,
      },
    });
  };

  const onManageFundsPressed = (id?: string) => {
    if (id === actionKeys.Refill) {
      const availableWallets = wallets.filter(item => item.chain === Chain.ONCHAIN && item.allowSend());
      if (availableWallets.length === 0) {
        presentAlert({ message: loc.lnd.refill_create });
      } else {
        selectWallet(navigate, name, Chain.ONCHAIN).then(onWalletSelect);
      }
    } else if (id === actionKeys.RefillWithExternalWallet) {
      navigate('ReceiveDetailsRoot', {
        screen: 'ReceiveDetails',
        params: {
          walletID,
        },
      });
    }
  };

  const getItemLayout = (_: any, index: number) => ({
    length: 64,
    offset: 64 * index,
    index,
  });

  const renderItem = (item: { item: Transaction }) => (
    <TransactionListItem item={item.item} itemPriceUnit={itemPriceUnit} walletID={walletID} />
  );

  const onBarCodeRead = useCallback(
    (ret?: { data?: any }) => {
      if (!isLoading) {
        setIsLoading(true);
        const params = {
          walletID: wallet?.getID(),
          uri: ret?.data ? ret.data : ret,
        };
        if (wallet?.chain === Chain.ONCHAIN) {
          navigate('SendDetailsRoot', { screen: 'SendDetails', params });
        } else {
          navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params });
        }
        setIsLoading(false);
      }
    },
    [wallet, navigate, isLoading],
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

  const _keyExtractor = (_item: any, index: number) => index.toString();

  const copyFromClipboard = async () => {
    onBarCodeRead({ data: await BlueClipboard().getClipboardContent() });
  };

  const sendButtonPress = () => {
    if (wallet?.chain === Chain.OFFCHAIN) {
      return navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params: { walletID: wallet.getID() } });
    }

    if (wallet?.type === WatchOnlyWallet.type && wallet.isHd() && !wallet.useWithHardwareWalletEnabled()) {
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
    const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
    const cancelButtonIndex = 0;

    if (!isClipboardEmpty) {
      options.push(loc.wallets.list_long_clipboard);
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
            const data = await scanQrHelper(name, true);
            if (data) {
              onBarCodeRead({ data });
            }
            break;
          }
          case 3:
            if (!isClipboardEmpty) {
              copyFromClipboard();
            }
            break;
        }
      },
    );
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setReloadTransactionsMenuActionFunction(() => refreshTransactions);
      });
      return () => {
        task.cancel();
        setReloadTransactionsMenuActionFunction(() => {});
      };
    }, [setReloadTransactionsMenuActionFunction, refreshTransactions]),
  );

  const refreshProps = isDesktop || isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh: refreshTransactions };

  return (
    <View style={styles.flex}>
      {wallet && (
        <TransactionsNavigationHeader
          wallet={wallet}
          onWalletUnitChange={async passedWallet => {
            setItemPriceUnit(passedWallet.getPreferredBalanceUnit());
            await saveToDisk();
          }}
          onWalletBalanceVisibilityChange={async isShouldBeVisible => {
            const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
            if (wallet?.hideBalance && isBiometricsEnabled) {
              const unlocked = await unlockWithBiometrics();
              if (!unlocked) throw new Error('Biometrics failed');
            }
            wallet!.hideBalance = isShouldBeVisible;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await saveToDisk();
          }}
          onManageFundsPressed={id => {
            if (wallet?.type === MultisigHDWallet.type) {
              navigateToViewEditCosigners();
            } else if (wallet?.type === LightningCustodianWallet.type) {
              if (wallet.getUserHasSavedExport()) {
                if (!id) return;
                onManageFundsPressed(id);
              } else {
                presentWalletExportReminder()
                  .then(async () => {
                    if (!id) return;
                    wallet!.setUserHasSavedExport(true);
                    await saveToDisk();
                    onManageFundsPressed(id);
                  })
                  .catch(() => {
                    navigate('WalletExportRoot', {
                      screen: 'WalletExport',
                      params: {
                        walletID: wallet!.getID(),
                      },
                    });
                  });
              }
            }
          }}
        />
      )}
      <View style={[styles.list, stylesHook.list]}>
        {wallet?.type === WatchOnlyWallet.type && wallet.isWatchOnlyWarningVisible && (
          <WatchOnlyWarning
            handleDismiss={() => {
              wallet.isWatchOnlyWarningVisible = false;
              LayoutAnimation.configureNext(LayoutAnimation.Presets.linear);
              saveToDisk();
            }}
          />
        )}
        <FlatList
          getItemLayout={getItemLayout}
          updateCellsBatchingPeriod={30}
          ListHeaderComponent={renderListHeaderComponent}
          onEndReachedThreshold={0.3}
          onEndReached={loadMoreTransactions}
          ListFooterComponent={renderListFooterComponent}
          ListEmptyComponent={
            <ScrollView style={styles.flex} contentContainerStyle={styles.scrollViewContent}>
              <Text numberOfLines={0} style={styles.emptyTxs}>
                {(isLightning() && loc.wallets.list_empty_txs1_lightning) || loc.wallets.list_empty_txs1}
              </Text>
              {isLightning() && <Text style={styles.emptyTxsLightning}>{loc.wallets.list_empty_txs2_lightning}</Text>}
            </ScrollView>
          }
          {...refreshProps}
          data={getTransactions(limit)}
          extraData={wallet}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          initialNumToRender={10}
          removeClippedSubviews
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
          maxToRenderPerBatch={15}
          windowSize={25}
        />
      </View>
      <FContainer ref={walletActionButtonsRef}>
        {wallet?.allowReceive() && (
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
        {(wallet?.allowSend() || (wallet?.type === WatchOnlyWallet.type && wallet.isHd())) && (
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollViewContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 40 },
  activityIndicator: { marginVertical: 20 },
  listHeaderTextRow: { flex: 1, margin: 16, flexDirection: 'row', justifyContent: 'space-between' },
  listHeaderText: { marginTop: 8, marginBottom: 8, fontWeight: 'bold', fontSize: 24 },
  list: { flex: 1 },
  emptyTxs: { fontSize: 18, color: '#9aa0aa', textAlign: 'center', marginVertical: 16 },
  emptyTxsLightning: { fontSize: 18, color: '#9aa0aa', textAlign: 'center', fontWeight: '600' },
  sendIcon: { transform: [{ rotate: I18nManager.isRTL ? '-225deg' : '225deg' }] },
  receiveIcon: { transform: [{ rotate: I18nManager.isRTL ? '45deg' : '-45deg' }] },
});
