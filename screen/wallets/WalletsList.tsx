import React, { useCallback, useContext, useEffect, useReducer, useRef, useMemo } from 'react';
import { useFocusEffect, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { findNodeHandle, Image, InteractionManager, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getClipboardContent } from '../../blue_modules/clipboard';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import NeuraiUriMatch from '../../class/neurai-uri-match';
import { openNeuraiPaymentUri } from '../../helpers/open-neurai-payment';
import { ExtendedTransaction, Transaction, TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import { FButton, FContainer, FloatButtonsBottomFade } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import WalletsCarousel, { getWalletCarouselItemWidth } from '../../components/WalletsCarousel';
import { useSizeClass, SizeClass } from '../../blue_modules/sizeClass';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import loc from '../../loc';
import ActionSheet from '../ActionSheet';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConnectionPollContext } from '../../navigation/ConnectionPollContext';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import AddWalletGuide from '../../components/AddWalletGuide';
import { useSettings } from '../../hooks/context/useSettings';
import useMenuElements from '../../hooks/useMenuElements';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useNetworkSelection } from '../../hooks/useNetworkSelection';
import { appAlert } from '../../components/AppDialog';

const WalletsListSections = { CAROUSEL: 'CAROUSEL', TRANSACTIONS: 'TRANSACTIONS', ADD_GUIDE: 'ADD_GUIDE' };

/** Electrum `ping` while the list is visible; detects mid-session drops without polling when user is elsewhere. */
const ELECTRUM_HEALTH_POLL_WHILE_WALLETS_LIST_FOCUSED_MS = 30_000;

/** Recent activity shown under the carousel. */
const RECENT_TRANSACTIONS_LIMIT = 10;

type SectionData = {
  key: string;
  data: Transaction[] | string[];
};

enum ActionTypes {
  SET_LOADING,
  SET_WALLETS,
  SET_CURRENT_INDEX,
  SET_REFRESH_FUNCTION,
}

interface SetLoadingAction {
  type: ActionTypes.SET_LOADING;
  payload: boolean;
}

interface SetWalletsAction {
  type: ActionTypes.SET_WALLETS;
  payload: TWallet[];
}

interface SetCurrentIndexAction {
  type: ActionTypes.SET_CURRENT_INDEX;
  payload: number;
}

interface SetRefreshFunctionAction {
  type: ActionTypes.SET_REFRESH_FUNCTION;
  payload: () => void;
}

type WalletListAction = SetLoadingAction | SetWalletsAction | SetCurrentIndexAction | SetRefreshFunctionAction;

interface WalletListState {
  isLoading: boolean;
  wallets: TWallet[];
  currentWalletIndex: number;
  refreshFunction: () => void;
}

const initialState = {
  isLoading: false,
  wallets: [],
  currentWalletIndex: 0,
  refreshFunction: () => {},
};

function reducer(state: WalletListState, action: WalletListAction) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_WALLETS:
      return { ...state, wallets: action.payload };
    case ActionTypes.SET_CURRENT_INDEX:
      return state.currentWalletIndex === action.payload ? state : { ...state, currentWalletIndex: action.payload };
    case ActionTypes.SET_REFRESH_FUNCTION:
      return { ...state, refreshFunction: action.payload };
    default:
      return state;
  }
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletsList'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletsList'>;

const WalletsList: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isLoading, currentWalletIndex: focusedWalletIndex } = state;
  const { sizeClass, isLarge } = useSizeClass();
  const walletsCarousel = useRef<any>(null);
  const connectionPoll = useContext(ConnectionPollContext);
  const currentWalletIndex = useRef<number>(0);
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { wallets, refreshAllWalletTransactions } = useStorage();
  const { isTotalBalanceEnabled } = useSettings();
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const navigation = useExtendedNavigation<NavigationProps>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProps>();
  // Only the network on screen reaches the carousel, the total and the recent
  // list below. `wallets` (all of them) is still what gets connected and
  // refreshed: hidden wallets keep syncing, or the switcher's dot would never
  // light and their balances would be stale on the way back.
  const { network, visibleWallets } = useNetworkSelection();
  // The recent list follows the card in view. Large screens have no carousel
  // (wallets live in the drawer), so there is no card to follow and they get
  // the merged list.
  const showUnifiedTransactions = sizeClass === SizeClass.Large;
  // The "add wallet" card past the end has no transactions of its own: under
  // it goes the guide to the ways of adding one. Also the whole content when
  // there is no wallet yet, merged list or not.
  const showAddGuide =
    sizeClass !== SizeClass.Large &&
    (visibleWallets.length === 0 || (!showUnifiedTransactions && focusedWalletIndex >= visibleWallets.length));
  const focusedWallet: TWallet | undefined = visibleWallets[Math.min(focusedWalletIndex, visibleWallets.length - 1)];
  // Same rules as BlueApp.getTransactions (hidden-wallet flag, newest first)
  // over the visible subset — the storage-wide getter cannot filter by network.
  const dataSource = useMemo<ExtendedTransaction[]>(() => {
    const sourceWallets = showUnifiedTransactions ? visibleWallets : focusedWallet ? [focusedWallet] : [];
    const txs: ExtendedTransaction[] = [];
    for (const wallet of sourceWallets) {
      if (wallet.getHideTransactionsInWalletsList()) continue;
      const walletID = wallet.getID();
      const walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
      for (const t of wallet.getTransactions()) txs.push({ ...t, walletID, walletPreferredBalanceUnit });
    }
    return txs.sort((a, b) => b.timestamp - a.timestamp).slice(0, RECENT_TRANSACTIONS_LIMIT);
  }, [showUnifiedTransactions, visibleWallets, focusedWallet]);
  const walletsCount = useRef<number>(wallets.length);
  const walletActionButtonsRef = useRef<View>(null);

  const stylesHook = StyleSheet.create({
    walletsListWrapper: {
      backgroundColor: colors.brandingColor,
    },
    listHeaderBack: {
      backgroundColor: colors.background,
      paddingTop: sizeClass === SizeClass.Large ? 8 : 0,
    },
    listHeaderText: {
      color: colors.foregroundColor,
    },
  });

  const refreshWallets = useCallback(
    async (index: number | undefined, showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
      // Neurai wallets fetch through blue_modules/neurai, so we no
      // longer gate refresh on the BlueElectrum offline toggle.
      dispatch({ type: ActionTypes.SET_LOADING, payload: showLoadingIndicator });
      try {
        await refreshAllWalletTransactions(index, showUpdateStatusIndicator);
      } catch (error) {
        console.error(error);
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        InteractionManager.runAfterInteractions(() => {
          dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        });
      }
    },
    [refreshAllWalletTransactions],
  );

  const refreshTransactions = useCallback(() => {
    // Manual pull-to-refresh already has its own loading UI, so we
    // don't surface the global "Updating..." header pill here.
    return refreshWallets(undefined, true, false);
  }, [refreshWallets]);

  const onRefresh = useCallback(() => {
    console.debug('WalletsList onRefresh');
    return refreshTransactions();
    // Optimized for Mac option doesn't like RN Refresh component. Menu Elements now handles it for macOS
  }, [refreshTransactions]);

  useEffect(() => {
    const screenKey = route.name;
    console.log(`[WalletsList] Registering handler with key: ${screenKey}`);
    registerTransactionsHandler(onRefresh, screenKey);

    return () => {
      console.log(`[WalletsList] Unmounting - cleaning up handler for: ${screenKey}`);
      unregisterTransactionsHandler(screenKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh, registerTransactionsHandler, unregisterTransactionsHandler]);

  useFocusEffect(
    useCallback(() => {
      connectionPoll?.pollConnection();
      const screenKey = route.name;

      // Catch-up on focus: open the WSS connection and subscribe each Neurai
      // wallet's addresses. The server compares the per-address `status`
      // hash against what we last persisted and pushes a synthetic
      // address.changed only for addresses that actually moved while we
      // were closed — opening the wallet when nothing changed costs one
      // round-trip, not a full history refetch. The push handler in
      // AbstractNeuraiWallet runs the heavy refetch in the background, so
      // the UI stays responsive.
      // Open the WSS connection and resubscribe addresses, but defer until
      // after the home screen finished mounting and is fully interactive.
      // Wallets whose backend has no push protocol (mainnet stub today) are
      // short-circuited inside ensureBackendConnected so we never pay an
      // engine bootstrap just to learn there's nothing to do.
      const handle = InteractionManager.runAfterInteractions(() => {
        for (const wallet of wallets) {
          if (!isNeuraiWallet(wallet)) continue;
          wallet.ensureBackendConnected().catch(err => {
            console.debug('[WalletsList] ensureBackendConnected failed', err);
          });
        }
      });

      return () => {
        handle.cancel();
        console.log(`[WalletsList] Blurred - cleaning up handler for: ${screenKey}`);
        unregisterTransactionsHandler(screenKey);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionPoll, unregisterTransactionsHandler, wallets]),
  );

  useEffect(() => {
    // Electrum health polling is no longer relevant for Neurai; the connection
    // poller is a no-op stub kept around for compile-time compatibility.
    if (!isFocused || !connectionPoll) return;
    const interval = setInterval(() => {
      connectionPoll.pollConnection();
    }, ELECTRUM_HEALTH_POLL_WHILE_WALLETS_LIST_FOCUSED_MS);
    return () => clearInterval(interval);
  }, [isFocused, connectionPoll]);

  useEffect(() => {
    // Switching network swaps the carousel's cards and sends it back to the
    // first one, so the focused card is the first wallet of the new network.
    currentWalletIndex.current = 0;
    dispatch({ type: ActionTypes.SET_CURRENT_INDEX, payload: 0 });
  }, [network]);

  useEffect(() => {
    // new wallet added - no longer auto-scrolls
    if (!isLarge) {
      // Just update the count, no scrolling
      walletsCount.current = wallets.length;
    }
  }, [isLarge, wallets]);

  const onBarScanned = useCallback(
    (value: any) => {
      if (!value) return;
      try {
        // Neurai first: a scanned `nc:` pairing opens the Connect flow and an
        // `xna:` request opens the send flow, while anything the Neurai matcher
        // does not own falls through to the legacy Bitcoin-era router inside it.
        NeuraiUriMatch.navigationRouteFor(
          { url: value },
          completionValue => {
            triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
            // @ts-ignore: for now
            navigation.navigate(...completionValue);
          },
          undefined,
          {
            onPayment: payment => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
              if (!openNeuraiPaymentUri(navigation, wallets, payment)) appAlert(loc.send.header, loc.wallets.select_no_bitcoin);
            },
          },
        );
      } catch (e: any) {
        appAlert(loc.send.details_scan_error, e.message);
      }
    },
    [navigation, wallets],
  );

  const handleClick = useCallback(
    (item?: TWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        navigation.navigate('WalletTransactions', {
          walletID,
          walletType: item.type,
          walletNetwork: (item as { network?: string }).network,
        });
      } else {
        navigation.navigate('AddWalletRoot');
      }
    },
    [navigation],
  );

  const onSnapToItem = useCallback(
    (e: { nativeEvent: { contentOffset: any } }) => {
      if (!isFocused) return;

      const contentOffset = e.nativeEvent.contentOffset;
      const cardWidth = getWalletCarouselItemWidth(width);
      const snapStep = cardWidth; // keep in sync with WalletsCarousel snap interval
      const index = Math.max(0, Math.round(contentOffset.x / snapStep));

      if (currentWalletIndex.current !== index) {
        console.debug('onSnapToItem', wallets.length === index ? 'NewWallet/Importing card' : index);
        triggerHapticFeedback(HapticFeedbackTypes.Selection);
        // All wallets in this app are Neurai variants; they get their
        // updates via the WSS push handler in AbstractNeuraiWallet, so no
        // need to fire a refresh just because the user swiped to the card.
        currentWalletIndex.current = index;
      }
    },
    [isFocused, wallets, width],
  );

  // Tracks the card in view from every scroll, not only from a finished swipe:
  // the carousel also scrolls by itself (to a freshly added wallet, back to the
  // start on a network swap) and those moves do not reliably end in a
  // momentum event.
  // The reducer bails out on an unchanged index, so per-frame events only
  // re-render when the card in view actually changes.
  const onCarouselScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.max(0, Math.round(e.nativeEvent.contentOffset.x / getWalletCarouselItemWidth(width)));
      dispatch({ type: ActionTypes.SET_CURRENT_INDEX, payload: index });
    },
    [width],
  );

  const renderListHeaderComponent = useCallback(
    (title: string) => {
      return (
        <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
          <Text
            textBreakStrategy="simple"
            style={[styles.listHeaderText, stylesHook.listHeaderText]}
            numberOfLines={2}
            adjustsFontSizeToFit={true}
          >
            {`${title}${'  '}`}
          </Text>
        </View>
      );
    },
    [stylesHook.listHeaderBack, stylesHook.listHeaderText],
  );

  // Import and hardware open inside the add-wallet flow, with its first screen
  // underneath, so back lands on the full list of options.
  const openCreateWallet = useCallback(() => navigation.navigate('AddWalletRoot'), [navigation]);
  const openImportWallet = useCallback(
    () => navigation.navigate('AddWalletRoot', { screen: 'ImportNeurai', initial: false }),
    [navigation],
  );
  const openHardwareWallet = useCallback(
    () => navigation.navigate('AddWalletRoot', { screen: 'AddHardwareWallet', initial: false }),
    [navigation],
  );

  const handleLongPress = useCallback(() => {
    navigation.navigate('ManageWallets');
  }, [navigation]);

  const renderTransactionListsRow = useCallback(
    (item: ExtendedTransaction) => (
      <TransactionListItem key={item.hash} item={item} itemPriceUnit={item.walletPreferredBalanceUnit} walletID={item.walletID} />
    ),
    [],
  );

  const renderWalletsCarousel = useCallback(() => {
    return (
      <>
        <WalletsCarousel
          data={visibleWallets}
          extraData={[visibleWallets]}
          onPress={handleClick}
          handleLongPress={handleLongPress}
          onMomentumScrollEnd={onSnapToItem}
          onScroll={onCarouselScroll}
          scrollEventThrottle={16}
          ref={walletsCarousel}
          onNewWalletPress={handleClick}
          testID="WalletsList"
          horizontal
          scrollEnabled={isFocused}
          animateChanges={true}
        />
      </>
    );
  }, [handleClick, handleLongPress, isFocused, onCarouselScroll, onSnapToItem, visibleWallets]);

  const renderSectionItem = useCallback(
    (item: { section: any; item: ExtendedTransaction }) => {
      switch (item.section.key) {
        case WalletsListSections.CAROUSEL:
          return sizeClass === SizeClass.Large ? null : renderWalletsCarousel();
        case WalletsListSections.TRANSACTIONS:
          return renderTransactionListsRow(item.item);
        case WalletsListSections.ADD_GUIDE:
          return <AddWalletGuide onCreate={openCreateWallet} onImport={openImportWallet} onHardware={openHardwareWallet} />;
        default:
          return null;
      }
    },
    [sizeClass, renderTransactionListsRow, renderWalletsCarousel, openCreateWallet, openImportWallet, openHardwareWallet],
  );

  const renderSectionHeader = useCallback(
    (section: { section: { key: any } }) => {
      if (sizeClass === SizeClass.Large) {
        return null;
      }

      switch (section.section.key) {
        case WalletsListSections.TRANSACTIONS:
          return renderListHeaderComponent(loc.transactions.list_title);
        case WalletsListSections.ADD_GUIDE:
          return renderListHeaderComponent(loc.wallets.add_guide_title);
        case WalletsListSections.CAROUSEL: {
          // Any wallet at all, not two: with one network on screen the total is
          // also where the fiat view lives, and a single-wallet mainnet user
          // would otherwise never get it.
          const shouldShowTotalBalance = isTotalBalanceEnabled && visibleWallets.length > 0;
          return shouldShowTotalBalance ? (
            <View style={stylesHook.walletsListWrapper}>
              <TotalWalletsBalance />
            </View>
          ) : (
            <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
              <Text
                textBreakStrategy="simple"
                style={[styles.listHeaderText, stylesHook.listHeaderText]}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
              >
                {`${loc.wallets.wallets}${'  '}`}
              </Text>
            </View>
          );
        }
        default:
          return null;
      }
    },
    [
      sizeClass,
      isTotalBalanceEnabled,
      renderListHeaderComponent,
      stylesHook.listHeaderBack,
      stylesHook.listHeaderText,
      stylesHook.walletsListWrapper,
      visibleWallets.length,
    ],
  );

  const renderSectionFooter = useCallback(
    (section: { section: { key: any } }) => {
      switch (section.section.key) {
        case WalletsListSections.TRANSACTIONS:
          if (dataSource.length === 0 && !isLoading) {
            return (
              <View style={styles.footerRoot} testID="NoTransactionsMessage">
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
    },
    [dataSource.length, isLoading],
  );

  const onScanButtonPressed = useCallback(() => {
    scanQrHelper().then(onBarScanned);
  }, [onBarScanned]);

  const pasteFromClipboard = useCallback(async () => {
    onBarScanned(await getClipboardContent());
  }, [onBarScanned]);

  const sendButtonLongPress = useCallback(async () => {
    const isClipboardEmpty = (await getClipboardContent())?.trim().length === 0;

    const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
    if (!isClipboardEmpty) {
      options.push(loc.wallets.paste_from_clipboard);
    }

    const props = { title: loc.send.header, options, cancelButtonIndex: 0 };

    const anchor = findNodeHandle(walletActionButtonsRef.current);

    if (anchor) {
      options.push(String(anchor));
    }

    ActionSheet.showActionSheetWithOptions(props, buttonIndex => {
      switch (buttonIndex) {
        case 0:
          break;
        case 1:
          fs.showImagePickerAndReadImage()
            .then(onBarScanned)
            .catch(error => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({ title: loc.errors.error, message: error.message });
            });
          break;
        case 2:
          scanQrHelper().then(onBarScanned);
          break;
        case 3:
          if (!isClipboardEmpty) {
            pasteFromClipboard();
          }
          break;
      }
    });
  }, [onBarScanned, pasteFromClipboard]);

  const renderScanButton = useCallback(() => {
    if (wallets.length > 0) {
      return (
        <>
          <FloatButtonsBottomFade />
          <FContainer ref={walletActionButtonsRef}>
            <FButton
              onPress={onScanButtonPressed}
              onLongPress={sendButtonLongPress}
              icon={<Image resizeMode="stretch" source={scanImage} />}
              text={loc.send.details_scan}
              testID="HomeScreenScanButton"
            />
          </FContainer>
        </>
      );
    } else {
      return null;
    }
  }, [onScanButtonPressed, scanImage, sendButtonLongPress, wallets.length]);

  const sectionListKeyExtractor = useCallback((item: any, index: any) => {
    return `${item}${index}`;
  }, []);

  const refreshProps = isDesktop ? {} : { refreshing: isLoading, onRefresh };

  const sections: SectionData[] = useMemo(() => {
    // On large screens, only show transactions section
    if (sizeClass === SizeClass.Large) {
      return [{ key: WalletsListSections.TRANSACTIONS, data: dataSource }];
    }

    // On smaller screens, show both carousel and transactions (or the guide)
    return [
      { key: WalletsListSections.CAROUSEL, data: [WalletsListSections.CAROUSEL] },
      showAddGuide
        ? { key: WalletsListSections.ADD_GUIDE, data: [WalletsListSections.ADD_GUIDE] }
        : { key: WalletsListSections.TRANSACTIONS, data: dataSource },
    ];
  }, [sizeClass, dataSource, showAddGuide]);

  // Constants for layout calculations
  const TRANSACTION_ITEM_HEIGHT = 80;
  const CAROUSEL_HEIGHT = 195;
  const SECTION_HEADER_HEIGHT = 56; // Base height
  const LARGE_TITLE_EXTRA_HEIGHT = 20; // Additional height for large titles

  const getSectionHeaderHeight = useCallback(() => {
    return SECTION_HEADER_HEIGHT + (sizeClass === SizeClass.Large ? LARGE_TITLE_EXTRA_HEIGHT : 0);
  }, [sizeClass]);

  const getItemLayout = useCallback(
    (data: any, index: number) => {
      const headerHeight = getSectionHeaderHeight();

      if (sizeClass === SizeClass.Large) {
        // On large screens: only transaction items, no carousel
        return {
          length: TRANSACTION_ITEM_HEIGHT,
          offset: TRANSACTION_ITEM_HEIGHT * index,
          index,
        };
      } else {
        // On smaller screens: first item is carousel, rest are transactions
        // First section: Carousel
        if (index === 0) {
          return {
            length: CAROUSEL_HEIGHT,
            offset: 0,
            index,
          };
        }

        // Second section: Transactions
        // Need to account for:
        // 1. Carousel height
        // 2. Section header height for transactions section
        // 3. Transaction items
        const transactionIndex = index - 1; // Adjust index to account for carousel
        return {
          length: TRANSACTION_ITEM_HEIGHT,
          offset: CAROUSEL_HEIGHT + headerHeight + TRANSACTION_ITEM_HEIGHT * transactionIndex,
          index,
        };
      }
    },
    [sizeClass, getSectionHeaderHeight],
  );

  return (
    <>
      <SafeAreaSectionList<any | string, SectionData>
        testID="Wallets"
        renderItem={renderSectionItem}
        keyExtractor={sectionListKeyExtractor}
        renderSectionHeader={renderSectionHeader}
        initialNumToRender={10}
        renderSectionFooter={renderSectionFooter}
        sections={sections}
        floatingButtonHeight={70}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        // Fixed row heights do not describe the guide.
        getItemLayout={showAddGuide ? undefined : getItemLayout}
        ignoreTopInset={true} // Ignore top inset as the screen header already handles it
        {...refreshProps}
      />
      {renderScanButton()}
    </>
  );
};

export default WalletsList;

const styles = StyleSheet.create({
  listHeaderBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  listHeaderText: {
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 16,
    flexWrap: 'wrap',
    flexShrink: 1,
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
});
