import { RouteProp, useFocusEffect, useIsFocused, useRoute, useLocale } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  findNodeHandle,
  FlatList,
  InteractionManager,
  Platform,
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import Icon from '../../components/Icon';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import AssetsList from '../../components/AssetsList';
import DePINChat, { DePINChatHandle } from '../../components/DePINChat';
import { isDepinChatSupportedNetwork } from '../../blue_modules/neurai/depinChatIdentity';
import { FButton, FContainer, FloatButtonsBottomFade } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import TransactionsNavigationHeader from '../../components/TransactionsNavigationHeader';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { Chain } from '../../models/xnaUnits';
import ActionSheet from '../ActionSheet';
import { useStorage } from '../../hooks/context/useStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { Transaction } from '../../class/wallets/types';
import getWalletTransactionsOptions, { WalletTransactionsRouteProps } from '../../navigation/helpers/getWalletTransactionsOptions';
import useMenuElements from '../../hooks/useMenuElements';
import useWalletSubscribe from '../../hooks/useWalletSubscribe';
import useDepinPoolWatch from '../../hooks/useDepinPoolWatch';
import { c6Family } from '../../blue_modules/neurai/privacy/wallet';
import { PRIVACY_AVAILABLE } from '../../blue_modules/neurai/privacy/deployment';
import PrivacySection from '../../components/privacy/PrivacySection';
import { getClipboardContent } from '../../blue_modules/clipboard';
import HandOffComponent from '../../components/HandOffComponent';
import { HandOffActivityType } from '../../components/types';
import WalletGradient from '../../class/wallet-gradient';
import { groupTransactionsByDay, TransactionListEntry } from '../../helpers/group-transactions-by-day';

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

type RouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;
type WalletTab = 'transactions' | 'assets' | 'depin' | 'privacy';

type WalletTransactionsProps = NativeStackScreenProps<DetailViewStackParamList, 'WalletTransactions'>;

const WalletTransactions: React.FC<WalletTransactionsProps> = ({ route }: { route: WalletTransactionsRouteProps }) => {
  const { saveToDisk } = useStorage();
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { direction } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const { params } = useRoute<RouteProps>();
  const { walletID } = params;
  const wallet = useWalletSubscribe(walletID);
  const serviceStale = isNeuraiWallet(wallet) && wallet.getServiceStatus?.() === 'stale';
  const [syncNotice, setSyncNotice] = useState<'updating' | 'delayed' | null>(null);
  useEffect(() => {
    setSyncNotice(null);
    if (!serviceStale) return;
    // Avoid flashing a banner for a normal, brief reconnect.
    const updatingTimer = setTimeout(() => setSyncNotice('updating'), 800);
    const delayedTimer = setTimeout(() => setSyncNotice('delayed'), 10_000);
    return () => {
      clearTimeout(updatingTimer);
      clearTimeout(delayedTimer);
    };
  }, [serviceStale, walletID]);

  const [limit, setLimit] = useState(15);
  const [pageSize] = useState(20);
  const navigation = useExtendedNavigation();
  const { setOptions, navigate } = navigation;
  const { colors, dark } = useTheme();
  const walletActionButtonsRef = useRef<View>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(() => wallet._lastTxFetch || 0);
  const [fetchFailures, setFetchFailures] = useState(0);
  const [balance, setBalance] = useState(wallet.getBalance());
  const [displayUnit, setDisplayUnit] = useState(wallet.preferredBalanceUnit);
  const [isUnitSwitching, setIsUnitSwitching] = useState(false);
  // All Neurai wallets (including the hardware wallet, which reads assets via
  // the backend) get a Transactions / Assets tab switch in the list header.
  const showAssetsTab = isNeuraiWallet(wallet);
  // DePIN chat is Legacy-only (PQ networks have no BIP44 chat identity).
  const showDepinTab = isNeuraiWallet(wallet) && isDepinChatSupportedNetwork(wallet.network);
  // The C6 privacy pool is a testnet section for Legacy and PQ wallets with
  // their words (hardware wallets have none), shown only while a pool is offered.
  const showPrivacyTab = PRIVACY_AVAILABLE && isNeuraiWallet(wallet) && c6Family(wallet) !== null;
  const [activeTab, setActiveTab] = useState<WalletTab>('transactions');
  // Kept-mounted panels stop their background work when this screen is covered
  // (Send, Receive, a transaction...), not only when another tab is shown.
  const isScreenFocused = useIsFocused();
  // A tab is mounted the first time it is opened and then kept, hidden while
  // another one is shown, so coming back finds it as it was left: scroll
  // position, open chat, unlocked private wallet. Leaving the wallet drops them.
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<WalletTab>>(() => new Set<WalletTab>(['transactions']));
  const selectTab = useCallback((tab: WalletTab) => {
    setMountedTabs(prev => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    setActiveTab(tab);
  }, []);
  const availableTabs = useMemo<WalletTab[]>(
    () =>
      showAssetsTab
        ? ['transactions', 'assets', ...(showDepinTab ? (['depin'] as const) : []), ...(showPrivacyTab ? (['privacy'] as const) : [])]
        : ['transactions'],
    [showAssetsTab, showDepinTab, showPrivacyTab],
  );
  const shownTab: WalletTab = availableTabs.includes(activeTab) ? activeTab : 'transactions';
  const MAX_FAILURES = 3;
  const flatListRef = useRef<FlatList<TransactionListEntry>>(null);
  const depinChatRef = useRef<DePINChatHandle>(null);

  // Cheap "new messages" marker: polls only the unencrypted pool stats once a
  // minute, so it never needs an identity, a session or the hardware wallet.
  // Decryption still happens only when the user opens the chat.
  const { hasNewMessages: hasNewDepinMessages } = useDepinPoolWatch({
    enabled: showDepinTab,
    network: isNeuraiWallet(wallet) ? wallet.getNeuraiNetwork() : 'mainnet',
    walletID,
  });

  // On the DePIN and Privacy sections, back (hardware button or header arrow)
  // walks one level at a time instead of leaving the screen: open token chat →
  // token picker (handled by DePINChat.goBack()) → the wallet's Transactions
  // tab → and only from there does the screen actually pop.
  const isPrivacyTabActive = showPrivacyTab && activeTab === 'privacy';
  const isDepinTabActive = (showDepinTab && activeTab === 'depin') || isPrivacyTabActive;
  const handleDepinBack = useCallback((): boolean => {
    if (!isDepinTabActive) return false;
    if (isPrivacyTabActive || !depinChatRef.current?.goBack()) setActiveTab('transactions');
    return true;
  }, [isDepinTabActive, isPrivacyTabActive]);
  useFocusEffect(
    useCallback(() => {
      if (!isDepinTabActive) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', handleDepinBack);
      return () => sub.remove();
    }, [isDepinTabActive, handleDepinBack]),
  );
  useEffect(() => {
    if (!isDepinTabActive) return;
    return navigation.addListener('beforeRemove', (e: any) => {
      const actionType = e?.data?.action?.type;
      if (actionType !== 'GO_BACK' && actionType !== 'POP') return;
      if (handleDepinBack()) e.preventDefault();
    });
  }, [navigation, isDepinTabActive, handleDepinBack]);
  const headerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const refreshInProgressRef = useRef(false);

  const stylesHook = StyleSheet.create({
    syncBar: { backgroundColor: colors.inputBackgroundColor, borderBottomColor: colors.formBorder },
    syncText: { color: colors.alternativeTextColor },
    listHeaderText: {
      color: colors.foregroundColor,
    },
    // Segmented control: a recessed track with the selected section raised out
    // of it. Light and dark swap which of the two surfaces is the lighter one.
    tabsTrack: {
      backgroundColor: dark ? colors.elevated : colors.lightBorder,
    },
    tabActiveBg: {
      backgroundColor: dark ? colors.lightBorder : colors.elevated,
    },
    dayHeaderText: {
      color: colors.alternativeTextColor,
    },
    txCard: {
      backgroundColor: colors.elevated,
    },
    txDivider: {
      backgroundColor: colors.lightBorder,
    },
    tabLabelActive: {
      color: colors.foregroundColor,
    },
    tabLabelInactive: {
      color: colors.alternativeTextColor,
    },
    listFooterStyle: {
      height: '100%',
      backgroundColor: colors.background,
    },
    backgroundContainer: {
      backgroundColor: colors.background,
    },
    gradientBackground: {
      backgroundColor: headerHeight > 0 ? WalletGradient.headerColorForWallet(wallet) : colors.background,
      height: headerHeight > 0 ? headerHeight : '30%',
    },
    activityIndicatorStyle: {
      backgroundColor: colors.background,
    },
    sendIcon: { transform: [{ rotate: direction === 'rtl' ? '-225deg' : '225deg' }] },
    receiveIcon: { transform: [{ rotate: direction === 'rtl' ? '-45deg' : '45deg' }] },
    headerBottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 12,
      height: 12,
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        android: {
          elevation: 0.5,
        },
      }),
    },
  });

  useFocusEffect(
    useCallback(() => {
      setOptions(getWalletTransactionsOptions({ route }));
      headerCollapsedRef.current = false;
    }, [route, setOptions]),
  );

  // Navigation is synchronous, so there is nothing to guard. Gating on
  // `isLoading` (the pull-to-refresh flag) dropped a scanned or pasted address
  // whenever a refresh happened to be running, and the param was then cleared.
  const onBarCodeRead = useCallback(
    (ret?: { data?: any }) => {
      const uri: string | undefined = ret?.data ? ret.data : (ret as unknown as string | undefined);
      navigate('SendNeurai', {
        walletID,
        address: typeof uri === 'string' ? uri : undefined,
      });
    },
    [walletID, navigate],
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
    console.debug('[UnitSwitch] sync from wallet preferred unit', { walletID, preferred: wallet.preferredBalanceUnit });
    setDisplayUnit(wallet.preferredBalanceUnit);
  }, [wallet, walletID]);

  useEffect(() => {
    console.debug('[UnitSwitch] display unit state changed', { walletID, displayUnit, switching: isUnitSwitching });
  }, [walletID, displayUnit, isUnitSwitching]);

  const sortedTransactions = useMemo(() => {
    const txs = wallet.getTransactions().slice();
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
      // Neurai wallets fetch through the Neurai backend, not BlueElectrum, so the
      // legacy "Electrum disabled" toggle no longer applies — only skip when
      // we're already mid-refresh.
      if (refreshInProgressRef.current) return;

      const MIN_REFRESH_INTERVAL = 5000; // 5 seconds
      if (!isManualRefresh && lastFetchTimestamp !== 0 && Date.now() - lastFetchTimestamp < MIN_REFRESH_INTERVAL) {
        return; // Prevent auto-refreshing if last fetch was too recent
      }

      if (fetchFailures >= MAX_FAILURES && !isManualRefresh) {
        return; // Silently stop auto-retrying, but allow manual refresh
      }

      refreshInProgressRef.current = true;
      // Only show loading indicator on manual refresh or after first successful fetch
      if (isManualRefresh || lastFetchTimestamp !== 0) {
        setIsLoading(true);
      }

      let smthChanged = false;
      try {
        // BIP47 / Electrum wait-till-connected were Bitcoin pipeline steps;
        // Neurai wallets fetch via the Neurai backend directly.
        const oldBalance = wallet.getBalance();
        await wallet.fetchBalance();
        if (oldBalance !== wallet.getBalance()) smthChanged = true;
        const oldTxLen = wallet.getTransactions().length;
        await wallet.fetchTransactions();
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
          return newFailures;
        });
      } finally {
        try {
          if (smthChanged) {
            // A failed save is reported by saveToDisk; the fetched page is still shown.
            await saveToDisk().catch(() => {});
            setLimit(prev => prev + pageSize);
          }
        } finally {
          refreshInProgressRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [wallet, saveToDisk, pageSize, lastFetchTimestamp, fetchFailures],
  );

  // Catch-up on focus: just open the WSS connection and subscribe this
  // wallet's addresses. The backend compares the per-address `status` hash
  // returned by the server against what we last persisted and only pushes a
  // synthetic address.changed when something actually moved while we were
  // closed; the push handler then runs the heavy refetch in the background.
  // No periodic polling and no blocking fetch on the focus tick — the UI
  // stays responsive while subscription is in flight.
  useFocusEffect(
    useCallback(() => {
      if (isNeuraiWallet(wallet)) {
        // Open the WSS connection and refresh the per-address subscription
        // diff so server pushes flow back here. `setSubscribedAddresses` is a
        // no-op when the home screen has already established the connection
        // for this wallet, so re-entering a wallet is essentially free.
        const handle = InteractionManager.runAfterInteractions(() => {
          wallet.ensureBackendConnected().catch(err => {
            console.debug('[WalletTransactions] ensureBackendConnected failed', err);
          });
        });
        return () => handle.cancel();
      }
      refreshTransactions(false).catch(console.error);
      return undefined;
    }, [wallet, refreshTransactions]),
  );

  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return wallet.getTransactions().length > limit ? (
      <ActivityIndicator style={[styles.activityIndicator, stylesHook.activityIndicatorStyle]} />
    ) : (
      <View style={stylesHook.listFooterStyle} />
    );
  };

  const navigateToSendScreen = () => {
    if (isNeuraiWallet(wallet)) {
      navigate('SendNeurai', { walletID });
      return;
    }
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        walletID,
      },
    });
  };

  const transactionEntries = useMemo(
    () =>
      groupTransactionsByDay(getTransactions(limit), {
        pending: loc.transactions.pending,
        today: loc.transactions.date_today,
        yesterday: loc.transactions.date_yesterday,
      }),
    [getTransactions, limit],
  );

  // One rounded card per day under its own heading; rows inside a card are
  // split by a hairline that starts past the icon.
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: TransactionListEntry }) => {
      if (item.kind === 'header') {
        return (
          <Text style={[styles.dayHeader, stylesHook.dayHeaderText]} numberOfLines={1} accessibilityRole="header">
            {item.title}
          </Text>
        );
      }
      return (
        <View style={[styles.txCard, stylesHook.txCard, item.isFirst && styles.txCardTop, item.isLast && styles.txCardBottom]}>
          <TransactionListItem item={item.tx} itemPriceUnit={displayUnit} walletID={walletID} style={styles.txRow} timeOnly />
          {!item.isLast && <View style={[styles.txDivider, stylesHook.txDivider]} />}
        </View>
      );
    },
    [displayUnit, walletID, stylesHook.dayHeaderText, stylesHook.txCard, stylesHook.txDivider],
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

  const _keyExtractor = useCallback((item: TransactionListEntry) => item.key, []);

  const pasteFromClipboard = async () => {
    onBarCodeRead({ data: await getClipboardContent() });
  };

  const sendButtonPress = () => {
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
    if (!Number.isFinite(balance)) return '';
    const formatted = formatBalance(balance, displayUnit, true);
    return formatted || '0';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, wallet.hideBalance, displayUnit, balance]);

  // The header shows the wallet name once the balance has scrolled away. Only
  // crossing the line changes anything: setting options on every scroll frame
  // re-rendered the navigator 60 times a second and starved taps meanwhile.
  const headerCollapsedRef = useRef(false);
  const applyHeaderTitle = useCallback(
    (collapsed: boolean) => {
      if (collapsed) {
        navigation.setOptions({ headerTitle: `${wallet.getLabel()} ${walletBalance}` });
      } else {
        setOptions({ ...getWalletTransactionsOptions({ route }), headerTitle: undefined });
      }
    },
    [navigation, wallet, walletBalance, setOptions, route],
  );
  const handleScroll = useCallback(
    (event: any) => {
      const collapsed = event.nativeEvent.contentOffset.y >= 180;
      if (collapsed === headerCollapsedRef.current) return;
      headerCollapsedRef.current = collapsed;
      applyHeaderTitle(collapsed);
    },
    [applyHeaderTitle],
  );
  // A balance that changes while collapsed still has to reach the title.
  useEffect(() => {
    if (headerCollapsedRef.current) applyHeaderTitle(true);
  }, [applyHeaderTitle]);

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

  // Every tab panel carries its own copy of the header (it scrolls away with
  // the transactions and assets lists). It is an element, not a component
  // type: a component re-created on each render would remount the header
  // every time. Only the shown panel's copy drives the backdrop measurement.
  const renderListHeader = (panel: WalletTab) => (
    <View ref={panel === shownTab ? headerRef : undefined} onLayout={panel === shownTab ? measureHeaderHeight : undefined}>
      <TransactionsNavigationHeader
        wallet={wallet}
        onWalletUnitChange={async selectedUnit => {
          console.debug('[UnitSwitch] requested', { walletID, from: displayUnit, to: selectedUnit });
          setIsUnitSwitching(true);
          setDisplayUnit(selectedUnit);
          if ('setPreferredBalanceUnit' in wallet) {
            wallet.setPreferredBalanceUnit(selectedUnit);
          } else {
            (wallet as any).preferredBalanceUnit = selectedUnit;
          }
          // The screen already shows the new unit; the toggle must not stay
          // disabled while the save waits behind other queued writes.
          saveToDisk()
            .then(() => console.debug('[UnitSwitch] persisted preferred unit', { walletID, unit: selectedUnit }))
            .catch(e => console.debug('[UnitSwitch] save failed', e));
          setTimeout(() => {
            setIsUnitSwitching(false);
            console.debug('[UnitSwitch] complete', { walletID, unit: selectedUnit });
          }, 50);
        }}
        unit={displayUnit}
        unitSwitching={isUnitSwitching}
        onWalletBalanceVisibilityChange={async isShouldBeVisible => {
          const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
          if (wallet.hideBalance && isBiometricsEnabled) {
            const unlocked = await unlockWithBiometrics();
            if (!unlocked) throw new Error('Biometrics failed');
          }
          wallet.hideBalance = isShouldBeVisible;
          await saveToDisk();
        }}
        onManageFundsPressed={() => {}}
      />
      <View style={styles.headerBottomBarSpacer}>
        <View style={stylesHook.headerBottomBar} />
      </View>
      {/* No flex: on DePIN/Privacy this header shares a column with a flex:1 panel,
            and a flex:1 child of an auto-height parent collapses to zero there. */}
      <View style={stylesHook.backgroundContainer}>
        {showAssetsTab ? (
          <View style={[styles.tabsBar, stylesHook.tabsTrack]} accessibilityRole="tablist">
            {availableTabs.map(tab => {
              const active = shownTab === tab;
              const label =
                tab === 'transactions'
                  ? loc.assets.tab_transactions
                  : tab === 'assets'
                    ? loc.assets.tab_assets
                    : tab === 'depin'
                      ? loc.assets.tab_depin
                      : loc.privacy.tab;
              return (
                <Pressable
                  key={tab}
                  testID={`WalletTab-${tab}`}
                  onPress={() => selectTab(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && [styles.tabActive, stylesHook.tabActiveBg]]}
                >
                  <Text
                    style={[styles.tabLabel, active ? [styles.tabLabelActive, stylesHook.tabLabelActive] : stylesHook.tabLabelInactive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {label}
                  </Text>
                  {tab === 'depin' && hasNewDepinMessages && <View style={styles.depinUnreadDot} testID="DepinTabUnreadDot" />}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.listHeaderTextRow}>
            <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
          </View>
        )}
      </View>
    </View>
  );

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [walletID]);

  const panelStyle = (tab: WalletTab) => [styles.flex, stylesHook.backgroundContainer, tab !== shownTab && styles.hiddenPanel];

  return (
    <View style={[styles.flex, stylesHook.backgroundContainer]}>
      <View style={[styles.refreshIndicatorBackground, stylesHook.gradientBackground]} testID="TransactionsListView" />
      {serviceStale && syncNotice && (
        <View style={[styles.syncBar, stylesHook.syncBar]} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.alternativeTextColor} />
          <Text style={[styles.syncText, stylesHook.syncText]}>
            {syncNotice === 'delayed' ? loc.wallets.neurai_service_stale : loc.wallets.neurai_service_updating}
          </Text>
        </View>
      )}
      {isNeuraiWallet(wallet) && wallet.getServiceStatus?.() === 'legacy' && (
        <Text accessibilityRole="alert" style={{ color: colors.foregroundColor }}>
          {loc.wallets.neurai_service_legacy}
        </Text>
      )}
      <View style={panelStyle('transactions')}>
        <FlatList<TransactionListEntry>
          ref={flatListRef}
          updateCellsBatchingPeriod={50}
          onEndReachedThreshold={0.3}
          onEndReached={loadMoreTransactions}
          ListFooterComponent={renderListFooterComponent}
          data={transactionEntries}
          extraData={[wallet, displayUnit, wallet.hideBalance]}
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
          ListHeaderComponent={renderListHeader('transactions')}
          ListEmptyComponent={
            <ScrollView style={[styles.emptyTxsContainer, stylesHook.backgroundContainer]} contentContainerStyle={styles.scrollViewContent}>
              <Text numberOfLines={0} style={styles.emptyTxs} testID="TransactionsListEmpty">
                {loc.wallets.list_empty_txs1}
              </Text>
            </ScrollView>
          }
          refreshControl={
            !isDesktop ? (
              <RefreshControl refreshing={isLoading} onRefresh={() => refreshTransactions(true)} tintColor={colors.msSuccessCheck} />
            ) : undefined
          }
        />
      </View>
      {showAssetsTab && mountedTabs.has('assets') && (
        <View style={panelStyle('assets')}>
          <AssetsList walletID={walletID} ListHeaderComponent={renderListHeader('assets')} />
        </View>
      )}
      {showDepinTab && mountedTabs.has('depin') && (
        <View style={panelStyle('depin')}>
          {renderListHeader('depin')}
          <DePINChat ref={depinChatRef} walletID={walletID} paused={shownTab !== 'depin' || !isScreenFocused} />
        </View>
      )}
      {showPrivacyTab && mountedTabs.has('privacy') && (
        <View style={panelStyle('privacy')}>
          {renderListHeader('privacy')}
          <PrivacySection walletID={walletID} hidden={shownTab !== 'privacy' || !isScreenFocused} />
        </View>
      )}

      {/* The DePIN chat owns the bottom of the screen (message input toolbar), so
          hide the floating Send/Receive actions there — they'd overlap the input
          and the latest messages. They remain on the Transactions/Assets tabs.
          Hidden, not unmounted: remounting replays their slide-in, and taps on
          the way back land while the buttons are still moving. */}
      <View style={[StyleSheet.absoluteFill, isDepinTabActive && styles.hiddenPanel]} pointerEvents="box-none">
        <FloatButtonsBottomFade />
        <FContainer ref={walletActionButtonsRef}>
          {wallet.allowReceive() && (
            <FButton
              testID="ReceiveButton"
              text={loc.receive.header}
              onPress={() => {
                navigate('ReceiveDetails', { walletID });
              }}
              icon={
                <View style={styles.iconContainer}>
                  <Icon
                    name="arrow-down"
                    size={buttonFontSize}
                    type="font-awesome"
                    color={colors.buttonTextColor}
                    style={stylesHook.receiveIcon}
                  />
                </View>
              }
            />
          )}
          {wallet.allowSend() && (
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
                    color={colors.buttonTextColor}
                    style={stylesHook.sendIcon}
                  />
                </View>
              }
            />
          )}
        </FContainer>
      </View>
      {wallet.chain === Chain.ONCHAIN && wallet.getXpub && wallet.getXpub() ? (
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
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    columnGap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  syncText: { fontSize: 13, flexShrink: 1 },
  flex: { flex: 1 },
  hiddenPanel: { display: 'none' },
  headerBottomBarSpacer: { position: 'relative', height: 12 },
  scrollViewContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 500 },
  activityIndicator: { marginVertical: 20 },
  listHeaderTextRow: { flex: 1, marginHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' },
  tabsBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 4, marginBottom: 4, padding: 4, borderRadius: 14 },
  // Same green marker the chat uses for unread conversations.
  depinUnreadDot: { position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  tabActive: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  dayHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  txCard: { marginHorizontal: 16, overflow: 'hidden' },
  txCardTop: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  txCardBottom: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  // Stable object: TransactionListItem's memo compares `style` by identity.
  txRow: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  // Starts where the row's text does: 16 padding + 30 icon + 16 gap. A whole
  // dp, not a hairline: Android drops sub-pixel lines at some row offsets.
  txDivider: { position: 'absolute', bottom: 0, left: 62, right: 16, height: 1 },
  listHeaderText: { marginTop: 0, marginBottom: 16, fontWeight: 'bold', fontSize: 24 },
  refreshIndicatorBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  emptyTxsContainer: { height: '10%', minHeight: '10%', flex: 1 },
  emptyTxs: { fontSize: 18, color: '#9aa0aa', textAlign: 'center', marginVertical: 16 },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: buttonFontSize * 1.5,
    height: buttonFontSize * 1.5,
    overflow: 'visible',
  },
});
