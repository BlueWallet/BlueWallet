import React, { useEffect, useLayoutEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme, TouchableOpacity, Image, Animated, Text, I18nManager, View } from 'react-native';
// @ts-ignore: no declaration file
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import { TransactionListItem } from '../../components/TransactionListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import useDebounce from '../../hooks/useDebounce';
import { Header } from '../../components/Header';
import { TTXMetadata } from '../../class';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import useBounceAnimation from '../../hooks/useBounceAnimation';

enum ItemType {
  WalletSection = 'wallet',
  TransactionSection = 'transaction',
}

interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction & LightningTransaction;
}

type Item = WalletItem | TransactionItem;

const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
const SET_IS_SEARCH_FOCUSED = 'SET_IS_SEARCH_FOCUSED';
const SET_WALLET_DATA = 'SET_WALLET_DATA';
const SET_TX_METADATA = 'SET_TX_METADATA';
const SET_ORDER = 'SET_ORDER';

interface SetSearchQueryAction {
  type: typeof SET_SEARCH_QUERY;
  payload: string;
}

interface SetIsSearchFocusedAction {
  type: typeof SET_IS_SEARCH_FOCUSED;
  payload: boolean;
}

interface SetWalletDataAction {
  type: typeof SET_WALLET_DATA;
  payload: TWallet[];
}

interface SetTxMetadataAction {
  type: typeof SET_TX_METADATA;
  payload: TTXMetadata;
}

interface SetOrderAction {
  type: typeof SET_ORDER;
  payload: Item[];
}

type Action = SetSearchQueryAction | SetIsSearchFocusedAction | SetWalletDataAction | SetTxMetadataAction | SetOrderAction;

interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  walletData: TWallet[];
  txMetadata: TTXMetadata;
  order: Item[];
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  walletData: [],
  txMetadata: {},
  order: [],
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case SET_IS_SEARCH_FOCUSED:
      return { ...state, isSearchFocused: action.payload };
    case SET_WALLET_DATA:
      return { ...state, walletData: action.payload };
    case SET_TX_METADATA:
      return { ...state, txMetadata: action.payload };
    case SET_ORDER:
      return { ...state, order: action.payload };
    default:
      return state;
  }
};

const ManageWallets: React.FC = () => {
  const sortableList = useRef(null);
  const { colors, closeImage } = useTheme();
  const { wallets, setWalletsWithNewOrder, txMetadata } = useStorage();
  const colorScheme = useColorScheme();
  const { navigate, setOptions, goBack } = useExtendedNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);

  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
    noResultsText: {
      color: colors.foregroundColor,
    },
  };

  useEffect(() => {
    const initialOrder: Item[] = wallets.map(wallet => ({ type: ItemType.WalletSection, data: wallet }));
    dispatch({ type: SET_WALLET_DATA, payload: wallets });
    dispatch({ type: SET_TX_METADATA, payload: txMetadata });
    dispatch({ type: SET_ORDER, payload: initialOrder });
  }, [wallets, txMetadata]);

  const handleClose = useCallback(() => {
    const walletOrder = state.order.filter(item => item.type === ItemType.WalletSection).map(item => item.data);
    setWalletsWithNewOrder(walletOrder);
    goBack();
  }, [goBack, setWalletsWithNewOrder, state.order]);

  const HeaderRightButton = useMemo(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.close}
        style={styles.button}
        onPress={handleClose}
        testID="NavigationCloseButton"
      >
        <Image source={closeImage} />
      </TouchableOpacity>
    ),
    [handleClose, closeImage],
  );

  useEffect(() => {
    setOptions({
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
      headerRight: () => HeaderRightButton,
    });
  }, [colorScheme, setOptions, HeaderRightButton]);

  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery) {
      const filteredWallets = wallets.filter(wallet => wallet.getLabel()?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      const filteredTxMetadata = Object.entries(txMetadata).filter(([_, tx]) =>
        tx.memo?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
      );

      // Filter transactions
      const filteredTransactions = wallets.flatMap(wallet =>
        wallet
          .getTransactions()
          .filter((tx: Transaction) =>
            filteredTxMetadata.some(
              ([txid, txMeta]) => tx.hash === txid && txMeta.memo?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
            ),
          ),
      );

      const filteredOrder: Item[] = [
        ...filteredWallets.map(wallet => ({ type: ItemType.WalletSection, data: wallet })),
        ...filteredTransactions.map(tx => ({ type: ItemType.TransactionSection, data: tx })),
      ];

      dispatch({ type: SET_WALLET_DATA, payload: filteredWallets });
      dispatch({ type: SET_TX_METADATA, payload: Object.fromEntries(filteredTxMetadata) });
      dispatch({ type: SET_ORDER, payload: filteredOrder });
    } else {
      const initialOrder: Item[] = wallets.map(wallet => ({ type: ItemType.WalletSection, data: wallet }));
      dispatch({ type: SET_WALLET_DATA, payload: wallets });
      dispatch({ type: SET_TX_METADATA, payload: {} });
      dispatch({ type: SET_ORDER, payload: initialOrder });
    }
  }, [wallets, txMetadata, debouncedSearchQuery]);

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        hideWhenScrolling: false,
        onChangeText: (event: { nativeEvent: { text: any } }) => dispatch({ type: SET_SEARCH_QUERY, payload: event.nativeEvent.text }),
        onClear: () => dispatch({ type: SET_SEARCH_QUERY, payload: '' }),
        onFocus: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: true }),
        onBlur: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false }),
        placeholder: loc.wallets.manage_wallets_search_placeholder, // New placeholder text
      },
    });
  }, [setOptions]);

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      const walletID = wallet.getID();
      goBack();
      navigate('WalletTransactions', {
        walletID,
        walletType: wallet.type,
      });
    },
    [goBack, navigate],
  );

  const isDraggingDisabled = state.searchQuery.length > 0 || state.isSearchFocused;

  const bounceAnim = useBounceAnimation(state.searchQuery);

  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return (
        <Text>
          {parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
              <Animated.View key={index} style={[iStyles.highlightedContainer, { transform: [{ scale: bounceAnim }] }]}>
                <Text style={[iStyles.highlighted, iStyles.defaultText]}>{part}</Text>
              </Animated.View>
            ) : (
              <Text key={index} style={[iStyles.defaultText, query ? iStyles.dimmedText : {}]}>
                {part}
              </Text>
            ),
          )}
        </Text>
      );
    },
    [bounceAnim],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: { item: Item; drag: () => void; isActive: boolean }) => {
      const itemOpacity = isActive ? 1 : state.searchQuery ? 0.5 : 1;

      if (item.type === ItemType.TransactionSection && item.data) {
        return (
          <View style={StyleSheet.flatten([styles.padding16, { opacity: itemOpacity }])}>
            <TransactionListItem
              item={item.data}
              itemPriceUnit={BitcoinUnit.BTC}
              walletID={item.data.walletID}
              searchQuery={state.searchQuery}
              style={{ opacity: itemOpacity }}
            />
          </View>
        );
      } else if (item.type === ItemType.WalletSection) {
        return (
          <ScaleDecorator>
            <WalletCarouselItem
              item={item.data}
              handleLongPress={isDraggingDisabled ? undefined : drag}
              isActive={isActive}
              onPress={() => navigateToWallet(item.data)}
              customStyle={StyleSheet.flatten([styles.padding16, { opacity: itemOpacity }])}
              searchQuery={state.searchQuery}
              renderHighlightedText={state.searchQuery ? renderHighlightedText : undefined}
            />
          </ScaleDecorator>
        );
      }
      return null;
    },
    [isDraggingDisabled, navigateToWallet, state.searchQuery, renderHighlightedText],
  );

  const onChangeOrder = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
  }, []);

  const onDragBegin = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  }, []);

  const onRelease = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
  }, []);

  const onDragEnd = useCallback(({ data }: any) => {
    dispatch({ type: SET_ORDER, payload: data });
  }, []);

  const _keyExtractor = useCallback((_item: any, index: number) => index.toString(), []);

  const renderHeader = useMemo(() => {
    if (!state.searchQuery) return null;
    const hasWallets = state.walletData.length > 0;
    const hasTransactions = Object.keys(state.txMetadata).length > 0;

    return (
      <>
        {hasWallets && <Header leftText={loc.wallets.wallets} isDrawerList />}
        {hasTransactions && <Header leftText={loc.addresses.transactions} isDrawerList />}
        {!hasWallets && !hasTransactions && (
          <Text style={[styles.noResultsText, stylesHook.noResultsText]}>{loc.wallets.no_results_found}</Text>
        )}
      </>
    );
  }, [state.searchQuery, state.walletData.length, state.txMetadata, stylesHook.noResultsText]);

  return (
    <GestureHandlerRootView style={[styles.root, stylesHook.root]}>
      <DraggableFlatList
        ref={sortableList}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        data={state.order}
        keyExtractor={_keyExtractor}
        renderItem={renderItem}
        onChangeOrder={onChangeOrder}
        onDragBegin={onDragBegin}
        onRelease={onRelease}
        onDragEnd={onDragEnd}
        containerStyle={styles.root}
        ListHeaderComponent={renderHeader}
      />
    </GestureHandlerRootView>
  );
};

export default ManageWallets;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding16: {
    padding: 16,
  },
  button: {
    padding: 16,
  },
  noResultsText: {
    fontSize: 19,
    fontWeight: 'bold',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    textAlign: 'center',
    justifyContent: 'center',
    marginTop: 34,
  },
});

const iStyles = StyleSheet.create({
  highlightedContainer: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 2,
    alignSelf: 'flex-start', // ensure the container resizes based on its content
  },
  highlighted: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
  },
  defaultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dimmedText: {
    opacity: 0.5,
  },
});
