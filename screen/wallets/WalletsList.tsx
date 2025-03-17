import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { useFocusEffect, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { findNodeHandle, Image, InteractionManager, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import A from '../../blue_modules/analytics';
import { getClipboardContent } from '../../blue_modules/clipboard';
import { isDesktop } from '../../blue_modules/environment';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { ExtendedTransaction, Transaction, TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import { FButton, FContainer } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import WalletsCarousel from '../../components/WalletsCarousel';
import { useIsLargeScreen } from '../../hooks/useIsLargeScreen';
import loc from '../../loc';
import ActionSheet from '../ActionSheet';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import { useSettings } from '../../hooks/context/useSettings';
import useMenuElements from '../../hooks/useMenuElements';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';

const WalletsListSections = { CAROUSEL: 'CAROUSEL', TRANSACTIONS: 'TRANSACTIONS' };

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
      return { ...state, currentWalletIndex: action.payload };
    case ActionTypes.SET_REFRESH_FUNCTION:
      return { ...state, refreshFunction: action.payload };
    default:
      return state;
  }
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletsList'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletsList'>;

const WalletsList: React.FC = () => {
  const [state, dispatch] = useReducer<React.Reducer<WalletListState, WalletListAction>>(reducer, initialState);
  const { isLoading } = state;
  const { isLargeScreen } = useIsLargeScreen();
  const walletsCarousel = useRef<any>();
  const currentWalletIndex = useRef<number>(0);
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { wallets, getTransactions, getBalance, refreshAllWalletTransactions } = useStorage();
  const { isTotalBalanceEnabled, isElectrumDisabled } = useSettings();
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const navigation = useExtendedNavigation<NavigationProps>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProps>();
  const dataSource = getTransactions(undefined, 10);
  const walletsCount = useRef<number>(wallets.length);
  const walletActionButtonsRef = useRef<any>();

  const stylesHook = StyleSheet.create({
    walletsListWrapper: {
      backgroundColor: colors.brandingColor,
    },
    listHeaderBack: {
      backgroundColor: colors.background,
    },
    listHeaderText: {
      color: colors.foregroundColor,
    },
  });

  const refreshWallets = useCallback(
    async (index: number | undefined, showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
      if (isElectrumDisabled) return;
      dispatch({ type: ActionTypes.SET_LOADING, payload: showLoadingIndicator });
      try {
        await refreshAllWalletTransactions(index, showUpdateStatusIndicator);
      } catch (error) {
        console.error(error);
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    },
    [isElectrumDisabled, refreshAllWalletTransactions],
  );

  /**
   * Forcefully fetches TXs and balance for ALL wallets.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = useCallback(() => {
    refreshWallets(undefined, true, false);
  }, [refreshWallets]);

  useEffect(() => {
    // Initial load of transactions without triggering scroll
    const initialLoad = async () => {
      if (isElectrumDisabled) return;
      try {
        await refreshAllWalletTransactions(undefined, false);
      } catch (error) {
        console.error(error);
      }
    };

    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    console.debug('WalletsList onRefresh');
    refreshTransactions();
    // Optimized for Mac option doesn't like RN Refresh component. Menu Elements now handles it for macOS
  }, [refreshTransactions]);

  const verifyBalance = useCallback(() => {
    if (getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }
  }, [getBalance]);

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
      const screenKey = route.name;

      return () => {
        console.log(`[WalletsList] Blurred - cleaning up handler for: ${screenKey}`);
        unregisterTransactionsHandler(screenKey);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unregisterTransactionsHandler]),
  );

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        verifyBalance();
      });

      return () => {
        task.cancel();
      };
    }, [verifyBalance]),
  );

  useEffect(() => {
    // new wallet added - no longer auto-scrolls
    if (!isLargeScreen) {
      // Just update the count, no scrolling
      walletsCount.current = wallets.length;
    }
  }, [isLargeScreen, wallets]);

  const onBarScanned = useCallback(
    (value: any) => {
      if (!value) return;
      DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        // @ts-ignore: for now
        navigation.navigate(...completionValue);
      });
    },
    [navigation],
  );

  useEffect(() => {
    const data = route.params?.onBarScanned;
    if (data) {
      onBarScanned(data);
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [navigation, onBarScanned, route.params?.onBarScanned]);

  useEffect(() => {
    refreshTransactions();
    // es-lint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = useCallback(
    (item?: TWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        navigation.navigate('WalletTransactions', {
          walletID,
          walletType: item.type,
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
      const index = Math.ceil(contentOffset.x / width);

      if (currentWalletIndex.current !== index) {
        console.debug('onSnapToItem', wallets.length === index ? 'NewWallet/Importing card' : index);
        if (wallets[index] && (wallets[index].timeToRefreshBalance() || wallets[index].timeToRefreshTransaction())) {
          refreshWallets(index, false, false);
        }
        currentWalletIndex.current = index;
      }
    },
    [isFocused, refreshWallets, wallets, width],
  );

  const renderListHeaderComponent = useCallback(() => {
    return (
      <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
        <Text textBreakStrategy="simple" style={[styles.listHeaderText, stylesHook.listHeaderText]}>
          {`${loc.transactions.list_title}${'  '}`}
        </Text>
      </View>
    );
  }, [stylesHook.listHeaderBack, stylesHook.listHeaderText]);

  const handleLongPress = useCallback(() => {
    navigation.navigate('ManageWallets');
  }, [navigation]);

  const renderTransactionListsRow = useCallback(
    (item: ExtendedTransaction) => (
      <View style={styles.transaction}>
        <TransactionListItem key={item.hash} item={item} itemPriceUnit={item.walletPreferredBalanceUnit} walletID={item.walletID} />
      </View>
    ),
    [],
  );

  const renderWalletsCarousel = useCallback(() => {
    return (
      <>
        <WalletsCarousel
          data={wallets}
          extraData={[wallets]}
          onPress={handleClick}
          handleLongPress={handleLongPress}
          onMomentumScrollEnd={onSnapToItem}
          ref={walletsCarousel}
          onNewWalletPress={handleClick}
          testID="WalletsList"
          horizontal
          scrollEnabled={isFocused}
          animateChanges={true}
        />
      </>
    );
  }, [handleClick, handleLongPress, isFocused, onSnapToItem, wallets]);

  const renderSectionItem = useCallback(
    (item: { section: any; item: ExtendedTransaction }) => {
      switch (item.section.key) {
        case WalletsListSections.CAROUSEL:
          return isLargeScreen ? null : renderWalletsCarousel();
        case WalletsListSections.TRANSACTIONS:
          return renderTransactionListsRow(item.item);
        default:
          return null;
      }
    },
    [isLargeScreen, renderTransactionListsRow, renderWalletsCarousel],
  );

  const renderSectionHeader = useCallback(
    (section: { section: { key: any } }) => {
      switch (section.section.key) {
        case WalletsListSections.TRANSACTIONS:
          return renderListHeaderComponent();
        case WalletsListSections.CAROUSEL: {
          return !isLargeScreen && isTotalBalanceEnabled ? (
            <View style={stylesHook.walletsListWrapper}>
              <TotalWalletsBalance />
            </View>
          ) : null;
        }

        default:
          return null;
      }
    },
    [isLargeScreen, isTotalBalanceEnabled, renderListHeaderComponent, stylesHook.walletsListWrapper],
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

  const renderScanButton = useCallback(() => {
    if (wallets.length > 0) {
      return (
        <FContainer ref={walletActionButtonsRef.current}>
          <FButton
            onPress={onScanButtonPressed}
            onLongPress={sendButtonLongPress}
            icon={<Image resizeMode="stretch" source={scanImage} />}
            text={loc.send.details_scan}
          />
        </FContainer>
      );
    } else {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanImage, wallets.length]);

  const sectionListKeyExtractor = useCallback((item: any, index: any) => {
    return `${item}${index}}`;
  }, []);

  const onScanButtonPressed = useCallback(() => {
    navigation.navigate('ScanQRCode', {
      showFileImportButton: true,
    });
  }, [navigation]);

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
          navigation.navigate('ScanQRCode', {
            showFileImportButton: true,
          });
          break;
        case 3:
          if (!isClipboardEmpty) {
            pasteFromClipboard();
          }
          break;
      }
    });
  }, [onBarScanned, navigation, pasteFromClipboard]);

  const refreshProps = isDesktop || isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh };

  const sections: SectionData[] = [
    { key: WalletsListSections.CAROUSEL, data: [WalletsListSections.CAROUSEL] },
    { key: WalletsListSections.TRANSACTIONS, data: dataSource },
  ];

  const getItemLayout = useCallback(
    (data: any, index: number) => {
      if (index === 0) {
        return {
          length: isLargeScreen ? 0 : 195,
          offset: 0,
          index,
        };
      }
      return {
        length: 80,
        offset: (isLargeScreen ? 0 : 195) + 80 * (index - 1),
        index,
      };
    },
    [isLargeScreen],
  );

  return (
    <>
      <SafeAreaSectionList<any | string, SectionData>
        renderItem={renderSectionItem}
        keyExtractor={sectionListKeyExtractor}
        renderSectionHeader={renderSectionHeader}
        initialNumToRender={10} // Reduced from 20 to avoid rendering items off screen
        renderSectionFooter={renderSectionFooter}
        sections={sections}
        windowSize={21}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
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
  },
  listHeaderText: {
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 16,
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
  transaction: {
    marginHorizontal: 0,
  },
});
