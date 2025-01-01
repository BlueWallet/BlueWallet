import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { useFocusEffect, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { findNodeHandle, Image, InteractionManager, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const { setReloadTransactionsMenuActionFunction } = useMenuElements();
  const { wallets, getTransactions, getBalance, refreshAllWalletTransactions, setSelectedWalletID } = useStorage();
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

  /**
   * Forcefully fetches TXs and balance for ALL wallets.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = useCallback(
    async (showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
      if (isElectrumDisabled) {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        return;
      }
      dispatch({ type: ActionTypes.SET_LOADING, payload: showLoadingIndicator });
      refreshAllWalletTransactions(undefined, showUpdateStatusIndicator).finally(() => {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      });
    },
    [isElectrumDisabled, refreshAllWalletTransactions],
  );

  const onRefresh = useCallback(() => {
    console.debug('WalletsList onRefresh');
    refreshTransactions(true, false);
    // Optimized for Mac option doesn't like RN Refresh component. Menu Elements now handles it for macOS
  }, [refreshTransactions]);

  const verifyBalance = useCallback(() => {
    if (getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }
  }, [getBalance]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setReloadTransactionsMenuActionFunction(() => onRefresh);
        verifyBalance();
        setSelectedWalletID(undefined);
      });
      return () => {
        task.cancel();
        setReloadTransactionsMenuActionFunction(() => {});
      };
    }, [onRefresh, setReloadTransactionsMenuActionFunction, verifyBalance, setSelectedWalletID]),
  );

  useEffect(() => {
    // new wallet added
    if (wallets.length > walletsCount.current) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current], viewPosition: 0.3 });
    }

    walletsCount.current = wallets.length;
  }, [wallets]);

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
    refreshTransactions(false, true);
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

  const setIsLoading = useCallback((value: boolean) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: value });
  }, []);

  const onSnapToItem = useCallback(
    (e: { nativeEvent: { contentOffset: any } }) => {
      if (!isFocused) return;

      const contentOffset = e.nativeEvent.contentOffset;
      const index = Math.ceil(contentOffset.x / width);

      if (currentWalletIndex.current !== index) {
        console.debug('onSnapToItem', wallets.length === index ? 'NewWallet/Importing card' : index);
        if (wallets[index] && (wallets[index].timeToRefreshBalance() || wallets[index].timeToRefreshTransaction())) {
          refreshAllWalletTransactions(index, false).finally(() => setIsLoading(false));
        }
        currentWalletIndex.current = index;
      }
    },
    [isFocused, refreshAllWalletTransactions, setIsLoading, wallets, width],
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
        <TransactionListItem item={item} itemPriceUnit={item.walletPreferredBalanceUnit} walletID={item.walletID} />
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

  const sectionListKeyExtractor = (item: any, index: any) => {
    return `${item}${index}}`;
  };

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

  return (
    <View style={styles.root}>
      <View style={[styles.walletsListWrapper, stylesHook.walletsListWrapper]}>
        <SectionList<any | string, SectionData>
          removeClippedSubviews
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets
          {...refreshProps}
          renderItem={renderSectionItem}
          keyExtractor={sectionListKeyExtractor}
          renderSectionHeader={renderSectionHeader}
          initialNumToRender={20}
          contentInset={styles.scrollContent}
          renderSectionFooter={renderSectionFooter}
          sections={sections}
          windowSize={21}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
        />
        {renderScanButton()}
      </View>
    </View>
  );
};

export default WalletsList;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    top: 0,
    left: 0,
    bottom: 60,
    right: 0,
  },
  walletsListWrapper: {
    flex: 1,
  },
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
