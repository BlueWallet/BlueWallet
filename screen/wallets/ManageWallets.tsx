import React, { useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  I18nManager,
  Animated,
  LayoutAnimation,
  FlatList,
  ActivityIndicator,
  Platform,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TTXMetadata } from '../../class';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import useBounceAnimation from '../../hooks/useBounceAnimation';
import HeaderRightButton from '../../components/HeaderRightButton';
import { useSettings } from '../../hooks/context/useSettings';
import DragList, { DragListRenderItemInfo } from 'react-native-draglist';
import useDebounce from '../../hooks/useDebounce';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';

// Lazily load component only when needed
const ManageWalletsListItem = lazy(() =>
  Promise.all([
    import('../../components/ManageWalletsListItem'),
    // Add a small delay to ensure UI is responsive during loading
    new Promise(resolve => setTimeout(resolve, 100)),
  ]).then(([moduleExports]) => moduleExports),
);

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
const SET_INITIAL_ORDER = 'SET_INITIAL_ORDER';
const SET_FILTERED_ORDER = 'SET_FILTERED_ORDER';
const SET_TEMP_ORDER = 'SET_TEMP_ORDER';
const REMOVE_WALLET = 'REMOVE_WALLET';
const SAVE_CHANGES = 'SAVE_CHANGES';

interface SaveChangesAction {
  type: typeof SAVE_CHANGES;
  payload: TWallet[];
}

interface SetSearchQueryAction {
  type: typeof SET_SEARCH_QUERY;
  payload: string;
}

interface SetIsSearchFocusedAction {
  type: typeof SET_IS_SEARCH_FOCUSED;
  payload: boolean;
}

interface SetInitialOrderAction {
  type: typeof SET_INITIAL_ORDER;
  payload: { wallets: TWallet[]; txMetadata: TTXMetadata };
}

interface SetFilteredOrderAction {
  type: typeof SET_FILTERED_ORDER;
  payload: string;
}

interface SetTempOrderAction {
  type: typeof SET_TEMP_ORDER;
  payload: Item[];
}

interface RemoveWalletAction {
  type: typeof REMOVE_WALLET;
  payload: string; // Wallet ID
}

type Action =
  | SetSearchQueryAction
  | SetIsSearchFocusedAction
  | SetInitialOrderAction
  | SetFilteredOrderAction
  | SetTempOrderAction
  | SaveChangesAction
  | RemoveWalletAction;

interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  order: Item[];
  tempOrder: Item[];
  wallets: TWallet[];
  txMetadata: TTXMetadata;
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  order: [],
  tempOrder: [],
  wallets: [],
  txMetadata: {},
};

const deepCopyWallets = (wallets: TWallet[]): TWallet[] => {
  return wallets.map(wallet => Object.assign(Object.create(Object.getPrototypeOf(wallet)), wallet));
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case SET_IS_SEARCH_FOCUSED:
      return { ...state, isSearchFocused: action.payload };
    case SET_INITIAL_ORDER: {
      const initialWalletsOrder: WalletItem[] = deepCopyWallets(action.payload.wallets).map(wallet => ({
        type: ItemType.WalletSection,
        data: wallet,
      }));
      return {
        ...state,
        wallets: action.payload.wallets,
        txMetadata: action.payload.txMetadata,
        order: initialWalletsOrder,
        tempOrder: initialWalletsOrder,
      };
    }
    case SET_FILTERED_ORDER: {
      const query = action.payload.toLowerCase();
      const filteredWallets = state.wallets
        .filter(wallet => wallet.getLabel()?.toLowerCase().includes(query))
        .map(wallet => ({ type: ItemType.WalletSection, data: wallet }));

      const filteredTxMetadata = Object.entries(state.txMetadata).filter(([_, tx]) => tx.memo?.toLowerCase().includes(query));

      const filteredTransactions = state.wallets.flatMap(wallet =>
        wallet
          .getTransactions()
          .filter((tx: Transaction) =>
            filteredTxMetadata.some(([txid, txMeta]) => tx.hash === txid && txMeta.memo?.toLowerCase().includes(query)),
          )
          .map((tx: Transaction) => ({ type: ItemType.TransactionSection, data: tx as ExtendedTransaction & LightningTransaction })),
      );

      const filteredOrder = [...filteredWallets, ...filteredTransactions];

      return {
        ...state,
        tempOrder: filteredOrder,
      };
    }
    case SAVE_CHANGES: {
      return {
        ...state,
        wallets: deepCopyWallets(action.payload),
        tempOrder: state.tempOrder.map(item =>
          item.type === ItemType.WalletSection
            ? { ...item, data: action.payload.find(wallet => wallet.getID() === item.data.getID())! }
            : item,
        ),
      };
    }
    case SET_TEMP_ORDER: {
      return { ...state, tempOrder: action.payload };
    }
    case REMOVE_WALLET: {
      const updatedOrder = state.tempOrder.filter(item => item.type !== ItemType.WalletSection || item.data.getID() !== action.payload);
      return {
        ...state,
        tempOrder: updatedOrder,
      };
    }
    default:
      throw new Error(`Unhandled action type: ${(action as Action).type}`);
  }
};

const ManageWallets: React.FC = () => {
  const { colors, closeImage } = useTheme();
  const { wallets: storedWallets, setWalletsWithNewOrder, txMetadata, handleWalletDeletion } = useStorage();
  const { setIsDrawerShouldHide } = useSettings();
  const walletsRef = useRef<TWallet[]>(deepCopyWallets(storedWallets)); // Create a deep copy of wallets for the DraggableFlatList
  const { navigate, setOptions, goBack, dispatch: navigationDispatch } = useExtendedNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);
  const bounceAnim = useBounceAnimation(state.searchQuery);
  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    noResultsText: {
      color: colors.foregroundColor,
    },
  };
  const [data, setData] = useState(state.tempOrder);
  const listRef = useRef<FlatList<Item> | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const draggedItem = useRef<Item | null>(null);
  const initialRenderComplete = useRef(false);
  const lastScrollTime = useRef(Date.now());

  useEffect(() => {
    initialRenderComplete.current = true;
  }, []);

  useEffect(() => {
    if (initialRenderComplete.current) {
      setData(state.tempOrder);
    }
  }, [state.tempOrder]);

  useEffect(() => {
    dispatch({ type: SET_INITIAL_ORDER, payload: { wallets: walletsRef.current, txMetadata } });
  }, [txMetadata]);

  useEffect(() => {
    if (debouncedSearchQuery) {
      dispatch({ type: SET_FILTERED_ORDER, payload: debouncedSearchQuery });
    } else {
      dispatch({ type: SET_TEMP_ORDER, payload: state.order });
    }
  }, [debouncedSearchQuery, state.order]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(walletsRef.current) !== JSON.stringify(state.tempOrder.map(item => item.data));
  }, [state.tempOrder]);

  usePreventRemove(hasUnsavedChanges, ({ data: preventRemoveData }) => {
    Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc._.ok,
        style: 'destructive',
        onPress: () => navigationDispatch(preventRemoveData.action),
      },
    ]);
  });

  const handleClose = useCallback(() => {
    if (state.searchQuery.length === 0 && !state.isSearchFocused) {
      const newWalletOrder = state.tempOrder
        .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
        .map(item => item.data);

      setWalletsWithNewOrder(newWalletOrder);

      dispatch({ type: SAVE_CHANGES, payload: newWalletOrder });

      walletsRef.current = deepCopyWallets(newWalletOrder);

      state.tempOrder.forEach(item => {
        if (item.type === ItemType.WalletSection && !newWalletOrder.some(wallet => wallet.getID() === item.data.getID())) {
          handleWalletDeletion(item.data.getID());
        }
      });

      goBack();
    } else {
      dispatch({ type: SET_SEARCH_QUERY, payload: '' });
      dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false });
    }
  }, [goBack, setWalletsWithNewOrder, state.searchQuery, state.isSearchFocused, state.tempOrder, handleWalletDeletion]);

  const HeaderLeftButton = useMemo(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.close}
        style={styles.button}
        onPress={goBack}
        testID="NavigationCloseButton"
      >
        <Image source={closeImage} />
      </TouchableOpacity>
    ),
    [goBack, closeImage],
  );

  const SaveButton = useMemo(
    () => <HeaderRightButton disabled={!hasUnsavedChanges} title={loc.send.input_done} onPress={handleClose} />,
    [handleClose, hasUnsavedChanges],
  );

  useLayoutEffect(() => {
    const searchBarOptions = {
      hideWhenScrolling: false,
      onChangeText: (event: { nativeEvent: { text: any } }) => dispatch({ type: SET_SEARCH_QUERY, payload: event.nativeEvent.text }),
      onClear: () => dispatch({ type: SET_SEARCH_QUERY, payload: '' }),
      onFocus: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: true }),
      onBlur: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false }),
      placeholder: loc.wallets.manage_wallets_search_placeholder,
    };

    setOptions({
      headerLeft: () => HeaderLeftButton,
      headerRight: () => SaveButton,
      headerSearchBarOptions: searchBarOptions,
    });
  }, [setOptions, HeaderLeftButton, SaveButton]);

  useFocusEffect(
    useCallback(() => {
      setIsDrawerShouldHide(true);
      return () => {
        setIsDrawerShouldHide(false);
      };
    }, [setIsDrawerShouldHide]),
  );

  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return (
        <Text>
          {parts.map((part, index) =>
            query && part.toLowerCase().includes(query.toLowerCase()) ? (
              <Animated.View key={`${index}-${query}`} style={[styles.highlightedContainer, { transform: [{ scale: bounceAnim }] }]}>
                <Text style={styles.highlighted}>{part}</Text>
              </Animated.View>
            ) : (
              <Text key={`${index}-${query}`} style={query ? styles.dimmedText : styles.defaultText}>
                {part}
              </Text>
            ),
          )}
        </Text>
      );
    },
    [bounceAnim],
  );

  const handleDeleteWallet = useCallback(
    async (wallet: TWallet) => {
      const deletionSucceeded = await handleWalletDeletion(wallet.getID());
      if (deletionSucceeded) {
        dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
      }
    },
    [handleWalletDeletion],
  );

  const handleToggleHideBalance = useCallback(
    (wallet: TWallet) => {
      const updatedOrder = state.tempOrder.map(item => {
        if (item.type === ItemType.WalletSection && item.data.getID() === wallet.getID()) {
          item.data.hideBalance = !item.data.hideBalance;
          return {
            ...item,
            data: item.data,
          };
        }
        return item;
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      dispatch({ type: SET_TEMP_ORDER, payload: updatedOrder });
    },
    [state.tempOrder],
  );

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      const walletID = wallet.getID();
      navigate('WalletTransactions', {
        walletID,
        walletType: wallet.type,
      });
    },
    [navigate],
  );

  const renderItem = useCallback(
    (info: DragListRenderItemInfo<Item>) => {
      const { item, onDragStart, onDragEnd, isActive } = info;

      const handleDragStart = () => {
        draggedItem.current = item;
        setIsDragging(true);
        if (onDragStart) onDragStart();
      };

      const handleDragEnd = () => {
        setIsDragging(false);
        draggedItem.current = null;
        if (onDragEnd) onDragEnd();
      };

      return (
        <ManageWalletsListItem
          item={item}
          onPressIn={undefined}
          onPressOut={handleDragEnd}
          isDraggingDisabled={state.searchQuery.length > 0 || state.isSearchFocused}
          state={state}
          navigateToWallet={navigateToWallet}
          renderHighlightedText={renderHighlightedText}
          handleDeleteWallet={handleDeleteWallet}
          handleToggleHideBalance={handleToggleHideBalance}
          isActive={isActive}
          drag={handleDragStart}
          globalDragActive={isDragging}
        />
      );
    },
    [state, navigateToWallet, renderHighlightedText, handleDeleteWallet, handleToggleHideBalance, isDragging],
  );

  const onReordered = useCallback(
    async (fromIndex: number, toIndex: number) => {
      // Skip if no actual change
      if (fromIndex === toIndex) return;

      setIsDragging(false);
      draggedItem.current = null;

      const copy = [...state.order];
      const removed = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, removed[0]);

      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);

      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext({
          duration: 250,
          create: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
          update: {
            type: LayoutAnimation.Types.easeInEaseOut,
            springDamping: 0.7,
          },
        });
      } else {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }

      dispatch({ type: SET_TEMP_ORDER, payload: copy });

      setTimeout(() => {
        dispatch({
          type: SET_INITIAL_ORDER,
          payload: {
            wallets: copy.filter(item => item.type === ItemType.WalletSection).map(item => item.data as TWallet),
            txMetadata: state.txMetadata,
          },
        });
      }, 50); // Small delay to ensure UI remains responsive
    },
    [state.order, state.txMetadata],
  );

  const keyExtractor = useCallback((item: Item) => {
    if (item.type === ItemType.WalletSection) {
      return `wallet-${item.data.getID()}`;
    }
    return `tx-${item.data.hash || Math.random()}`;
  }, []);

  const onHoverChanged = useCallback(
    (index: number) => {
      if (isDragging) {
        triggerHapticFeedback(HapticFeedbackTypes.Selection);
      }
    },
    [isDragging],
  );

  const renderHeader = useMemo(() => {
    if (!state.searchQuery) return null;
    const hasWallets = state.wallets.length > 0;
    const filteredTxMetadata = Object.entries(state.txMetadata).filter(([_, tx]) =>
      tx.memo?.toLowerCase().includes(state.searchQuery.toLowerCase()),
    );
    const hasTransactions = filteredTxMetadata.length > 0;

    return (
      !hasWallets &&
      !hasTransactions && <Text style={[styles.noResultsText, stylesHook.noResultsText]}>{loc.wallets.no_results_found}</Text>
    );
  }, [state.searchQuery, state.wallets.length, state.txMetadata, stylesHook.noResultsText]);

  const fallback = (
    <View style={[styles.root, styles.fallbackContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.brandingColor} />
    </View>
  );

  return (
    <Suspense fallback={fallback}>
      <GestureHandlerRootView style={[{ backgroundColor: colors.background }, styles.root]}>
        {renderHeader}
        <DragList
          data={data}
          containerStyle={[{ backgroundColor: colors.background }, styles.root]}
          keyExtractor={keyExtractor}
          onReordered={onReordered}
          onHoverChanged={onHoverChanged}
          renderItem={renderItem}
          ref={listRef}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          automaticallyAdjustContentInsets
          automaticallyAdjustKeyboardInsets
          scrollEventThrottle={16}
          onScroll={() => {
            lastScrollTime.current = Date.now();
          }}
        />
      </GestureHandlerRootView>
    </Suspense>
  );
};

export default React.memo(ManageWallets);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  button: {
    padding: 16,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 19,
    fontWeight: 'bold',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    textAlign: 'center',
    justifyContent: 'center',
    marginTop: 34,
  },
  highlightedContainer: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 2,
    alignSelf: 'flex-start',
    textDecorationLine: 'underline',
    textDecorationStyle: 'double',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  highlighted: {
    color: 'black',
    fontSize: 19,
    fontWeight: '600',
  },
  defaultText: {
    fontSize: 19,
  },
  dimmedText: {
    opacity: 0.8,
  },
});
