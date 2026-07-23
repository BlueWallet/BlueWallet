import { RouteProp, useFocusEffect, useRoute, useLocale } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  findNodeHandle,
  FlatList,
  Platform,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { isDesktop, isIOS26OrHigher } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import { FButton, FContainer, FloatButtonsBottomFade, getFloatingButtonReservedHeight } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import { TX_ROW_BASE_HEIGHT } from '../../components/ListItem';
import TransactionsNavigationHeader, { actionKeys } from '../../components/TransactionsNavigationHeader';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import ActionSheet from '../ActionSheet';
import { useStorage } from '../../hooks/context/useStorage';
import WatchOnlyWarning from '../../components/WatchOnlyWarning';
import { NativeStackNavigationOptions, NativeStackScreenProps } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { Transaction, TWallet } from '../../class/wallets/types';
import getWalletTransactionsOptions, {
  WalletTransactionsRouteProps,
  createWalletDetailsHeaderRight,
  createWalletDetailsHeaderRightItems,
} from '../../navigation/helpers/getWalletTransactionsOptions';
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
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

type RouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

type WalletTransactionsProps = NativeStackScreenProps<DetailViewStackParamList, 'WalletTransactions'>;

const isWatchOnlyWallet = (wallet: TWallet): wallet is WatchOnlyWallet => wallet.type === WatchOnlyWallet.type;

/** Scroll offset after which the compact wallet name + balance header is shown. */
const SCROLLED_HEADER_SHOW_OFFSET = 180;
const SCROLLED_HEADER_FADE_IN_MS = 180;
const SCROLLED_HEADER_FADE_OUT_MS = 150;

const usesIos26AnimatedScrolledHeader = Platform.OS === 'ios' && isIOS26OrHigher && !isDesktop;

/** Native stack options used when scrolled; includes props missing from the published TS types. */
type WalletTransactionsScrolledHeaderOptions = NativeStackNavigationOptions & {
  headerTitleContainerStyle?: StyleProp<ViewStyle>;
};

/** Horizontal space reserved so the scrolled title does not run under back / header-right actions. */
const getScrolledHeaderTitleLayout = (screenWidth: number) => {
  const titleInsetLeft = Platform.OS === 'ios' ? (isIOS26OrHigher ? 40 : 56) : 72;
  const titleInsetRight = Platform.OS === 'ios' ? (isIOS26OrHigher ? 96 : 84) : 84;
  return {
    maxWidth: Math.max(0, screenWidth - titleInsetLeft - titleInsetRight),
    titleInsetLeft,
    titleInsetRight,
  };
};

const buildIos26HeaderTitleLayoutOptions = (
  screenWidth: number,
): Pick<WalletTransactionsScrolledHeaderOptions, 'headerTitleAlign' | 'headerTitleContainerStyle'> => ({
  headerTitleAlign: 'left',
  headerTitleContainerStyle: {
    width: screenWidth,
    maxWidth: screenWidth,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    left: 0,
    flexShrink: 1,
    minWidth: 0,
  },
});

type WalletTransactionsScrolledHeaderTitleProps = {
  walletLabel: string;
  balance: string;
};

type WalletTransactionsScrolledHeaderTitleAnimatedProps = WalletTransactionsScrolledHeaderTitleProps & {
  opacity: SharedValue<number>;
};

const WalletTransactionsScrolledHeaderTitleAnimated: React.FC<WalletTransactionsScrolledHeaderTitleAnimatedProps> = ({
  opacity,
  walletLabel,
  balance,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[scrolledHeaderTitleStyles.animatedTitleWrapper, { width: screenWidth }, animatedStyle]} pointerEvents="box-none">
      <WalletTransactionsScrolledHeaderTitle walletLabel={walletLabel} balance={balance} />
    </Animated.View>
  );
};

const WalletTransactionsScrolledHeaderTitle: React.FC<WalletTransactionsScrolledHeaderTitleProps> = ({ walletLabel, balance }) => {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { maxWidth, titleInsetLeft, titleInsetRight } = getScrolledHeaderTitleLayout(screenWidth);

  const titleColor = Platform.OS === 'ios' ? colors.foregroundColor : '#FFFFFF';

  const titleContent = (
    <>
      <Text style={[scrolledHeaderTitleStyles.walletLabel, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
        {walletLabel}
      </Text>
      {balance.length > 0 ? (
        <Text style={[scrolledHeaderTitleStyles.balance, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
          {balance}
        </Text>
      ) : null}
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={[scrolledHeaderTitleStyles.iosHeaderRoot, { width: screenWidth }]}>
        <View
          style={[
            scrolledHeaderTitleStyles.container,
            scrolledHeaderTitleStyles.iosTitleArea,
            { left: titleInsetLeft, right: titleInsetRight },
          ]}
        >
          {titleContent}
        </View>
      </View>
    );
  }

  return <View style={[scrolledHeaderTitleStyles.container, { maxWidth }]}>{titleContent}</View>;
};

const WalletTransactions: React.FC<WalletTransactionsProps> = ({ route }: { route: WalletTransactionsRouteProps }) => {
  const { wallets, saveToDisk } = useStorage();
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { direction } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const { params, name } = useRoute<RouteProps>();
  const { walletID } = params;
  const wallet = useWalletSubscribe(walletID);
  const watchOnlyWallet = isWatchOnlyWallet(wallet) ? wallet : undefined;
  const [limit, setLimit] = useState(15);
  const [pageSize] = useState(20);
  const navigation = useExtendedNavigation();
  const { setOptions, navigate } = navigation;
  const { colors, dark } = useTheme();
  const { isElectrumDisabled } = useSettings();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const navBarHeight = Platform.select({ ios: 44, android: 56, default: 44 }) ?? 44;
  const headerOverlayHeight = insets.top + navBarHeight;
  const walletActionButtonsRef = useRef<View>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(() => wallet._lastTxFetch || 0);
  const [fetchFailures, setFetchFailures] = useState(0);
  const [balance, setBalance] = useState(wallet.getBalance());
  const [displayUnit, setDisplayUnit] = useState(wallet.preferredBalanceUnit);
  const [isUnitSwitching, setIsUnitSwitching] = useState(false);
  const [isWatchOnlyWarningVisible, setIsWatchOnlyWarningVisible] = useState(() => watchOnlyWallet?.isWatchOnlyWarningVisible ?? false);
  const MAX_FAILURES = 3;
  const flatListRef = useRef<FlatList<Transaction>>(null);
  const headerRef = useRef<View>(null);
  const headerScrolledRef = useRef(false);
  const scrolledHeaderOpacity = useSharedValue(0);

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
    contentBottomInset: {
      paddingBottom: insets.bottom + getFloatingButtonReservedHeight(fontScale, insets.bottom),
    },
    activityIndicatorStyle: {
      backgroundColor: colors.background,
    },
    sendIcon: {
      transform: [{ rotate: direction === 'rtl' ? '-225deg' : '225deg' }],
    },
    receiveIcon: {
      transform: [{ rotate: direction === 'rtl' ? '-45deg' : '45deg' }],
    },
  });

  const onBarCodeRead = useCallback(
    (ret?: { data?: any }) => {
      if (!isLoading) {
        setIsLoading(true);
        const parameters = {
          walletID,
          uri: ret?.data ? ret.data : ret,
        };
        if (wallet.chain === Chain.ONCHAIN) {
          navigate('SendDetailsRoot', {
            screen: 'SendDetails',
            params: parameters,
          });
        } else {
          navigate('ScanLNDInvoiceRoot', {
            screen: 'ScanLNDInvoice',
            params: parameters,
          });
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

  useEffect(() => {
    // keep local display unit in sync when wallet changes (e.g., switching wallets)
    setDisplayUnit(wallet.preferredBalanceUnit);
  }, [wallet, walletID]);

  useEffect(() => {
    setIsWatchOnlyWarningVisible(watchOnlyWallet?.isWatchOnlyWarningVisible ?? false);
  }, [walletID, watchOnlyWallet]);

  const sortedTransactions = useMemo(() => {
    const txs = wallet.getTransactions();
    txs.sort((a, b) => b.timestamp - a.timestamp);
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
        if (!(await BlueElectrum.ensureConnected())) {
          throw new Error(loc.errors.network);
        }
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
      } catch (err: any) {
        const errorMessage: string = err.message;
        setFetchFailures(prev => {
          const newFailures = prev + 1;
          // Only show error on final attempt for automatic refresh
          if ((isManualRefresh || newFailures === MAX_FAILURES) && newFailures >= MAX_FAILURES) {
            if (errorMessage) {
              presentAlert({ message: errorMessage, type: AlertType.Toast });
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
      assert(
        wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type,
        `internal error, wallet is not ${LightningCustodianWallet.type} or ${LightningArkWallet.type}`,
      );

      // getting refill address, either cached or from the server:
      let toAddress;
      if (wallet.refill_addressess.length > 0) {
        toAddress = wallet.refill_addressess[0];
      } else {
        try {
          await wallet.fetchBtcAddress();
          toAddress = wallet.refill_addressess[0];
        } catch (Err) {
          return presentAlert({
            message: (Err as Error).message,
            type: AlertType.Toast,
          });
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
    [navigate, wallet],
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
          selectWallet(navigation, name, Chain.ONCHAIN).then(onWalletSelect);
        }
      } else if (id === actionKeys.RefillWithExternalWallet) {
        navigate('ReceiveDetails', { walletID });
      }
    },
    [name, navigate, navigation, onWalletSelect, walletID, wallets],
  );

  const txRowHeight = Math.round(TX_ROW_BASE_HEIGHT * fontScale);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: txRowHeight,
      offset: txRowHeight * index,
      index,
    }),
    [txRowHeight],
  );

  const renderItem = useCallback(
    // react/no-unused-prop-types misfires on inline arrow renderers: it reads the
    // destructured `item: Transaction` annotation as a propTypes definition and
    // ignores that the value is consumed on the next line.
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: Transaction }) => (
      // Ark wallet rows lack on-chain `hash` and instead carry a synthetic
      // `txid` (`swap-…`, `ark-…`, `boarding-…`, `boarding-utxo-…`). Falling
      // back to `txid` prevents multiple Ark rows from sharing
      // `key={undefined}`, which made React reuse stale memoized renders
      // across rows.
      <TransactionListItem
        key={item.hash ?? (item as { txid?: string }).txid}
        item={item}
        itemPriceUnit={displayUnit}
        walletID={walletID}
      />
    ),
    [displayUnit, walletID],
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

  const _keyExtractor = useCallback((item: Transaction, index: number) => item.hash || item.txid || index.toString(), []);

  const pasteFromClipboard = async () => {
    onBarCodeRead({ data: await getClipboardContent() });
  };

  const sendButtonPress = () => {
    if (wallet.chain === Chain.OFFCHAIN) {
      return navigate('ScanLNDInvoiceRoot', {
        screen: 'ScanLNDInvoice',
        params: { walletID },
      });
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

  useFocusEffect(
    useCallback(() => {
      // sync once on focus so balance is fresh after returning to screen
      setBalance(wallet.getBalance());
      const interval = setInterval(() => setBalance(wallet.getBalance()), 1000);
      return () => clearInterval(interval);
    }, [wallet]),
  );

  const walletBalance = useMemo(() => {
    if (wallet.hideBalance) return '';
    if (!Number.isFinite(balance)) return '';
    const formatted = formatBalance(balance, displayUnit, true);
    return formatted || '0';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, wallet.hideBalance, displayUnit, balance]);

  const walletLabel = wallet.getLabel();
  const scrolledHeaderTitle = useCallback(() => {
    if (usesIos26AnimatedScrolledHeader) {
      return (
        <WalletTransactionsScrolledHeaderTitleAnimated opacity={scrolledHeaderOpacity} walletLabel={walletLabel} balance={walletBalance} />
      );
    }
    return <WalletTransactionsScrolledHeaderTitle walletLabel={walletLabel} balance={walletBalance} />;
  }, [walletLabel, walletBalance, scrolledHeaderOpacity]);

  const { width: screenWidth } = useWindowDimensions();

  const getScrolledHeaderOptions = useCallback((): WalletTransactionsScrolledHeaderOptions => {
    const { titleInsetRight } = getScrolledHeaderTitleLayout(screenWidth);
    const routeIsLoading = route.params.isLoading ?? false;
    const scrolledHeaderIconColor = colors.foregroundColor;

    return {
      headerTitle: scrolledHeaderTitle,
      // iOS ignores 'left'; title is positioned manually in WalletTransactionsScrolledHeaderTitle.
      ...(Platform.OS === 'ios'
        ? buildIos26HeaderTitleLayoutOptions(screenWidth)
        : {
            headerTitleAlign: 'left' as const,
            headerTitleContainerStyle: {
              paddingRight: titleInsetRight,
              flexShrink: 1,
              minWidth: 0,
              alignItems: 'flex-start',
            },
            headerStyle: {
              backgroundColor: WalletGradient.headerColorFor(wallet.type),
            },
            headerTintColor: '#ffffff',
          }),
      ...(Platform.OS === 'ios'
        ? {
            headerTintColor: scrolledHeaderIconColor,
            statusBarStyle: 'light',
            ...(isIOS26OrHigher && !isDesktop
              ? {
                  headerRight: undefined,
                  unstable_headerRightItems: createWalletDetailsHeaderRightItems({
                    isLoading: routeIsLoading,
                    walletID,
                  }),
                  experimental_userInterfaceStyle: dark ? ('dark' as const) : ('light' as const),
                }
              : {
                  headerBlurEffect: dark ? ('dark' as const) : ('light' as const),
                  headerRight: createWalletDetailsHeaderRight({
                    walletID,
                    isLoading: routeIsLoading,
                    iconColor: scrolledHeaderIconColor,
                  }),
                }),
          }
        : {}),
    };
  }, [scrolledHeaderTitle, screenWidth, colors.foregroundColor, dark, route.params.isLoading, walletID, wallet.type]);

  useEffect(() => {
    if (!headerScrolledRef.current) return;
    setOptions(getScrolledHeaderOptions());
  }, [walletBalance, getScrolledHeaderOptions, setOptions]);

  useFocusEffect(
    useCallback(() => {
      if (usesIos26AnimatedScrolledHeader) {
        headerScrolledRef.current = false;
        scrolledHeaderOpacity.value = 0;
        setOptions({
          ...getWalletTransactionsOptions({ route }),
          ...buildIos26HeaderTitleLayoutOptions(screenWidth),
          headerTitle: scrolledHeaderTitle,
        });
        return;
      }
      setOptions(getWalletTransactionsOptions({ route }));
    }, [route, screenWidth, scrolledHeaderTitle, scrolledHeaderOpacity, setOptions]),
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const scrolled = offsetY >= SCROLLED_HEADER_SHOW_OFFSET;

      if (usesIos26AnimatedScrolledHeader) {
        if (scrolled === headerScrolledRef.current) return;
        headerScrolledRef.current = scrolled;
        scrolledHeaderOpacity.value = withTiming(scrolled ? 1 : 0, {
          duration: scrolled ? SCROLLED_HEADER_FADE_IN_MS : SCROLLED_HEADER_FADE_OUT_MS,
        });
        if (scrolled) {
          setOptions(getScrolledHeaderOptions());
        } else {
          setOptions({
            ...getWalletTransactionsOptions({ route }),
            ...buildIos26HeaderTitleLayoutOptions(screenWidth),
            headerTitle: scrolledHeaderTitle,
          });
        }
        return;
      }

      if (scrolled === headerScrolledRef.current) return;
      headerScrolledRef.current = scrolled;

      if (!scrolled) {
        setOptions({
          ...getWalletTransactionsOptions({ route }),
          headerTitle: undefined,
          headerTitleAlign: undefined,
          headerTitleContainerStyle: undefined,
          headerBlurEffect: undefined,
        });
      } else {
        setOptions(getScrolledHeaderOptions());
      }
    },
    [getScrolledHeaderOptions, setOptions, route, screenWidth, scrolledHeaderTitle, scrolledHeaderOpacity],
  );

  const ListHeaderComponent = useCallback(
    () => (
      <View ref={headerRef}>
        <TransactionsNavigationHeader
          headerOverlayHeight={headerOverlayHeight}
          wallet={wallet}
          onWalletUnitChange={async selectedUnit => {
            setIsUnitSwitching(true);
            setDisplayUnit(selectedUnit);
            if ('setPreferredBalanceUnit' in wallet) {
              wallet.setPreferredBalanceUnit(selectedUnit);
            } else {
              (wallet as TWallet).preferredBalanceUnit = selectedUnit;
            }
            await saveToDisk();
            setTimeout(() => {
              setIsUnitSwitching(false);
            }, 50);
          }}
          unit={displayUnit}
          unitSwitching={isUnitSwitching}
          onWalletBalanceVisibilityChange={async shouldHideBalance => {
            try {
              const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
              if (wallet.hideBalance && !shouldHideBalance && isBiometricsEnabled) {
                if (!(await unlockWithBiometrics())) {
                  return;
                }
              }
              wallet.hideBalance = shouldHideBalance;
              await saveToDisk();
            } catch (error) {
              console.error('Failed to toggle balance visibility:', error);
            }
          }}
          onManageFundsPressed={id => {
            if (wallet.type === MultisigHDWallet.type) {
              navigateToViewEditCosigners();
            } else if (wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) {
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
                    navigate('WalletExport', {
                      walletID,
                    });
                  });
              }
            }
          }}
        />
        <View style={[styles.flex, styles.transactionsSection, stylesHook.backgroundContainer]}>
          <View style={styles.listHeaderTextRow}>
            <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
          </View>
        </View>
        <View style={stylesHook.backgroundContainer}>
          {watchOnlyWallet?.shouldShowWatchOnlyWarning() && isWatchOnlyWarningVisible && (
            <WatchOnlyWarning
              handleDismiss={() => {
                setIsWatchOnlyWarningVisible(false);
                watchOnlyWallet.isWatchOnlyWarningVisible = false;
                saveToDisk();
              }}
            />
          )}
        </View>
      </View>
    ),
    [
      wallet,
      displayUnit,
      isUnitSwitching,
      headerOverlayHeight,
      stylesHook.backgroundContainer,
      stylesHook.listHeaderText,
      saveToDisk,
      isBiometricUseCapableAndEnabled,
      navigateToViewEditCosigners,
      onManageFundsPressed,
      navigate,
      walletID,
      watchOnlyWallet,
      isWatchOnlyWarningVisible,
    ],
  );

  useEffect(() => {
    headerScrolledRef.current = false;
    scrolledHeaderOpacity.value = 0;
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [walletID, scrolledHeaderOpacity]);

  return (
    <View style={[styles.flex, { backgroundColor: WalletGradient.headerColorFor(wallet.type) }]} testID="TransactionsListView">
      <FlatList<Transaction>
        ref={flatListRef}
        style={styles.flatList}
        getItemLayout={getItemLayout}
        updateCellsBatchingPeriod={50}
        onEndReachedThreshold={0.3}
        onEndReached={loadMoreTransactions}
        ListFooterComponent={renderListFooterComponent}
        data={getTransactions(limit)}
        extraData={[wallet, displayUnit, wallet.hideBalance]}
        keyExtractor={_keyExtractor}
        renderItem={renderItem}
        initialNumToRender={10}
        removeClippedSubviews={false}
        contentContainerStyle={[styles.contentContainer, stylesHook.backgroundContainer, stylesHook.contentBottomInset]}
        contentInsetAdjustmentBehavior="never"
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
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => refreshTransactions(true)}
              tintColor={Platform.OS === 'ios' ? 'transparent' : colors.msSuccessCheck}
              progressViewOffset={headerOverlayHeight}
            />
          ) : undefined
        }
      />

      {isLoading && Platform.OS === 'ios' && (
        <ActivityIndicator
          style={[styles.refreshSpinner, { top: headerOverlayHeight + 12, transform: [{ scale: 1.4 }] }]}
          color="#ffffff"
          size="small"
          pointerEvents="none"
        />
      )}

      <FloatButtonsBottomFade />
      <FContainer ref={walletActionButtonsRef}>
        {wallet.allowReceive() && (
          <FButton
            testID="ReceiveButton"
            text={loc.receive.header}
            onPress={() => {
              if (wallet.chain === Chain.OFFCHAIN) {
                navigate('LNDCreateInvoiceRoot', {
                  screen: 'LNDCreateInvoice',
                  params: { walletID },
                });
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

const scrolledHeaderTitleStyles = StyleSheet.create({
  animatedTitleWrapper: {
    alignSelf: 'flex-start',
  },
  iosHeaderRoot: {
    height: 44,
    justifyContent: 'center',
  },
  iosTitleArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    minWidth: 0,
  },
  container: {
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  walletLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.15,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  balance: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 1,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flatList: { flex: 1, backgroundColor: 'transparent' },
  transactionsSection: { marginTop: -1 },
  scrollViewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 500,
  },
  activityIndicator: { marginVertical: 20 },
  listHeaderTextRow: {
    flex: 1,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listHeaderText: {
    marginTop: 16,
    marginBottom: 16,
    fontWeight: 'bold',
    fontSize: 24,
  },
  contentContainer: { flexGrow: 1 },
  refreshSpinner: { position: 'absolute', alignSelf: 'center', zIndex: 10 },
  emptyTxsContainer: { height: '10%', minHeight: '10%', flex: 1 },
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
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: buttonFontSize * 1.5,
    height: buttonFontSize * 1.5,
    overflow: 'visible',
  },
});
