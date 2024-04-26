import React, { useCallback, useContext, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SectionList,
  Image,
  useWindowDimensions,
  findNodeHandle,
  I18nManager,
  InteractionManager,
} from 'react-native';
import { Icon } from 'react-native-elements';

import { BlueHeaderDefaultMain } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import { useFocusEffect, useIsFocused, useRoute } from '@react-navigation/native';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isDesktop } from '../../blue_modules/environment';
import BlueClipboard from '../../blue_modules/clipboard';
import { TransactionListItem } from '../../components/TransactionListItem';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import A from '../../blue_modules/analytics';
import * as fs from '../../blue_modules/fs';
import { TWallet, Transaction } from '../../class/wallets/types';
import { useIsLargeScreen } from '../../hooks/useIsLargeScreen';

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

const WalletsList: React.FC = () => {
  const [state, dispatch] = useReducer<React.Reducer<WalletListState, WalletListAction>>(reducer, initialState);
  const { isLoading } = state;
  const isLargeScreen = useIsLargeScreen();
  const walletsCarousel = useRef<any>();
  const currentWalletIndex = useRef<number>(0);
  const {
    wallets,
    getTransactions,
    getBalance,
    refreshAllWalletTransactions,
    setSelectedWalletID,
    isElectrumDisabled,
    setReloadTransactionsMenuActionFunction,
  } = useContext(BlueStorageContext);
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const { navigate, setOptions } = useExtendedNavigation();
  const isFocused = useIsFocused();
  const routeName = useRoute().name;
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

  useFocusEffect(
    useCallback(() => {
      verifyBalance();
      setSelectedWalletID(undefined);
      InteractionManager.runAfterInteractions(() => {
        setReloadTransactionsMenuActionFunction(() => onRefresh);
      });
      return () => {
        setReloadTransactionsMenuActionFunction(() => {});
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    // new wallet added
    if (wallets.length > walletsCount.current) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current] });
    }

    walletsCount.current = wallets.length;
  }, [wallets]);

  const verifyBalance = () => {
    if (getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }
  };

  useLayoutEffect(() => {
    setOptions({
      navigationBarColor: colors.navigationBarColor,
      headerShown: !isDesktop,
      headerStyle: {
        backgroundColor: colors.customHeader,
      },
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () =>
        I18nManager.isRTL ? null : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.more}
            testID="SettingsButton"
            style={styles.headerTouch}
            onPress={navigateToSettings}
          >
            <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
          </TouchableOpacity>
        ),
      // eslint-disable-next-line react/no-unstable-nested-components
      headerLeft: () =>
        I18nManager.isRTL ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.more}
            testID="SettingsButton"
            style={styles.headerTouch}
            onPress={navigateToSettings}
          >
            <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
          </TouchableOpacity>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  const navigateToSettings = () => {
    navigate('Settings');
  };

  /**
   * Forcefully fetches TXs and balance for ALL wallets.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = async (showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
    if (isElectrumDisabled) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      return;
    }

    dispatch({ type: ActionTypes.SET_LOADING, payload: showLoadingIndicator });

    try {
      await InteractionManager.runAfterInteractions(async () => {
        await refreshAllWalletTransactions(undefined, showUpdateStatusIndicator);
      });
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  useEffect(() => {
    refreshTransactions(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // call refreshTransactions() only once, when screen mounts

  const handleClick = (item?: TWallet) => {
    if (item?.getID) {
      const walletID = item.getID();
      navigate('WalletTransactions', {
        walletID,
        walletType: item.type,
      });
    } else {
      navigate('AddWalletRoot');
    }
  };

  const setIsLoading = (value: boolean) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: value });
  };

  const onSnapToItem = (e: { nativeEvent: { contentOffset: any } }) => {
    if (!isFocused) return;

    const contentOffset = e.nativeEvent.contentOffset;
    const index = Math.ceil(contentOffset.x / width);

    if (currentWalletIndex.current !== index) {
      console.log('onSnapToItem', wallets.length === index ? 'NewWallet/Importing card' : index);
      if (wallets[index] && (wallets[index].timeToRefreshBalance() || wallets[index].timeToRefreshTransaction())) {
        console.log(wallets[index].getLabel(), 'thinks its time to refresh either balance or transactions. refetching both');
        refreshAllWalletTransactions(index, false).finally(() => setIsLoading(false));
      }
      currentWalletIndex.current = index;
    } else {
      console.log('onSnapToItem did not change. Most likely momentum stopped at the same index it started.');
    }
  };

  const renderListHeaderComponent = () => {
    return (
      <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
        <Text textBreakStrategy="simple" style={[styles.listHeaderText, stylesHook.listHeaderText]}>
          {`${loc.transactions.list_title}${'  '}`}
        </Text>
      </View>
    );
  };

  const handleLongPress = () => {
    if (wallets.length > 1) {
      navigate('ReorderWallets');
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    }
  };

  const renderTransactionListsRow = (data: { item: Transaction }) => {
    return (
      <View style={styles.transaction}>
        {/** @ts-ignore: Fix later **/}
        <TransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} walletID={data.item.walletID} />
      </View>
    );
  };

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        // @ts-ignore: Convert to TS later
        data={wallets.concat(false)}
        extraData={[wallets]}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        onMomentumScrollEnd={onSnapToItem}
        ref={walletsCarousel}
        testID="WalletsList"
        horizontal
        scrollEnabled={isFocused}
      />
    );
  };

  const renderSectionItem = (item: { section?: any; item?: Transaction }) => {
    switch (item.section.key) {
      case WalletsListSections.CAROUSEL:
        return isLargeScreen ? null : renderWalletsCarousel();
      case WalletsListSections.TRANSACTIONS:
        /* @ts-ignore: fix later */
        return renderTransactionListsRow(item);
      default:
        return null;
    }
  };

  const renderSectionHeader = (section: { section: { key: any } }) => {
    switch (section.section.key) {
      case WalletsListSections.CAROUSEL:
        return isLargeScreen ? null : (
          <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={() => navigate('AddWalletRoot')} />
        );
      case WalletsListSections.TRANSACTIONS:
        return renderListHeaderComponent();
      default:
        return null;
    }
  };

  const renderSectionFooter = (section: { section: { key: any } }) => {
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
  };

  const renderScanButton = () => {
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
  };

  const sectionListKeyExtractor = (item: any, index: any) => {
    return `${item}${index}}`;
  };

  const onScanButtonPressed = () => {
    scanQrHelper(navigate, routeName).then(onBarScanned);
  };

  const onBarScanned = (value: any) => {
    if (!value) return;
    DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      navigate(...completionValue);
    });
  };

  const copyFromClipboard = async () => {
    onBarScanned(await BlueClipboard().getClipboardContent());
  };

  const sendButtonLongPress = async () => {
    const isClipboardEmpty = (await BlueClipboard().getClipboardContent()).trim().length === 0;

    const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
    if (!isClipboardEmpty) {
      options.push(loc.wallets.list_long_clipboard);
    }

    const props = { title: loc.send.header, options, cancelButtonIndex: 0 };

    const anchor = findNodeHandle(walletActionButtonsRef.current);

    if (anchor) {
      options.push(anchor);
    }

    ActionSheet.showActionSheetWithOptions(props, buttonIndex => {
      switch (buttonIndex) {
        case 0:
          break;
        case 1:
          fs.showImagePickerAndReadImage()
            .then(onBarScanned)
            .catch(error => {
              console.log(error);
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({ title: loc.errors.error, message: error.message });
            });
          break;
        case 2:
          scanQrHelper(navigate, routeName, true).then(data => onBarScanned(data));
          break;
        case 3:
          if (!isClipboardEmpty) {
            copyFromClipboard();
          }
          break;
      }
    });
  };

  const onRefresh = () => {
    refreshTransactions(true, false);
  };
  // Optimized for Mac option doesn't like RN Refresh component. Menu Elements now handles it for macOS
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
  headerTouch: {
    height: 48,
    paddingVertical: 10,
  },
  listHeaderBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
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
