import React, { useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  I18nManager,
  Animated,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
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

const ManageWalletsListItem = lazy(() => import('../../components/ManageWalletsListItem'));

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
  originalWalletsOrder: Item[];
  currentWalletsOrder: Item[];
  availableWallets: TWallet[];
  txMetadata: TTXMetadata;
  initialWalletsBackup: TWallet[];
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  originalWalletsOrder: [],
  currentWalletsOrder: [],
  availableWallets: [],
  txMetadata: {},
  initialWalletsBackup: [],
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
        availableWallets: action.payload.wallets,
        txMetadata: action.payload.txMetadata,
        originalWalletsOrder: initialWalletsOrder,
        currentWalletsOrder: initialWalletsOrder,
        initialWalletsBackup: deepCopyWallets(action.payload.wallets),
      };
    }
    case SET_FILTERED_ORDER: {
      const query = action.payload.toLowerCase();
      const filteredWallets = state.availableWallets
        .filter(wallet => wallet.getLabel()?.toLowerCase().includes(query))
        .map(wallet => ({ type: ItemType.WalletSection, data: wallet }));

      const filteredTxMetadata = Object.entries(state.txMetadata).filter(([_, tx]) => tx.memo?.toLowerCase().includes(query));

      const filteredTransactions = state.availableWallets.flatMap(wallet =>
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
        currentWalletsOrder: filteredOrder,
      };
    }
    case SAVE_CHANGES: {
      const savedWallets = deepCopyWallets(action.payload);
      return {
        ...state,
        availableWallets: savedWallets,
        initialWalletsBackup: savedWallets,
        currentWalletsOrder: state.currentWalletsOrder.map(item =>
          item.type === ItemType.WalletSection
            ? { ...item, data: action.payload.find(wallet => wallet.getID() === item.data.getID())! }
            : item,
        ),
      };
    }
    case SET_TEMP_ORDER: {
      return { ...state, currentWalletsOrder: action.payload };
    }
    case REMOVE_WALLET: {
      const updatedOrder = state.currentWalletsOrder.filter(
        item => item.type !== ItemType.WalletSection || item.data.getID() !== action.payload,
      );
      return {
        ...state,
        currentWalletsOrder: updatedOrder,
      };
    }
    default:
      throw new Error(`Unhandled action type: ${(action as Action).type}`);
  }
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ManageWallets: React.FC = () => {
  const { colors, closeImage } = useTheme();
  const { wallets: persistedWallets, setWalletsWithNewOrder, txMetadata, handleWalletDeletion } = useStorage();
  const { setIsDrawerShouldHide } = useSettings();
  const initialWalletsRef = useRef<TWallet[]>(deepCopyWallets(persistedWallets));
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
  const [uiData, setUiData] = useState(state.currentWalletsOrder);

  const listRef = useRef<FlatList<Item> | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);

  useEffect(() => {
    setUiData(state.currentWalletsOrder);
  }, [state.currentWalletsOrder]);

  useEffect(() => {
    dispatch({ type: SET_INITIAL_ORDER, payload: { wallets: initialWalletsRef.current, txMetadata } });
  }, [txMetadata]);

  useEffect(() => {
    if (debouncedSearchQuery) {
      dispatch({ type: SET_FILTERED_ORDER, payload: debouncedSearchQuery });
    } else {
      dispatch({ type: SET_TEMP_ORDER, payload: state.originalWalletsOrder });
    }
  }, [debouncedSearchQuery, state.originalWalletsOrder]);

  const hasUnsavedChanges = useMemo(() => {
    const currentWalletIds = state.currentWalletsOrder
      .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
      .map(item => item.data.getID());

    const originalWalletIds = state.initialWalletsBackup.map(wallet => wallet.getID());

    if (currentWalletIds.length !== originalWalletIds.length) {
      return true;
    }

    for (let i = 0; i < currentWalletIds.length; i++) {
      if (currentWalletIds[i] !== originalWalletIds[i]) {
        return true;
      }
    }

    const modifiedWallets = state.currentWalletsOrder
      .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
      .map(item => item.data);

    for (const modifiedWallet of modifiedWallets) {
      const originalWallet = state.initialWalletsBackup.find(w => w.getID() === modifiedWallet.getID());
      if (originalWallet && originalWallet.hideBalance !== modifiedWallet.hideBalance) {
        return true;
      }
    }

    return false;
  }, [state.currentWalletsOrder, state.initialWalletsBackup]);

  usePreventRemove(hasUnsavedChanges && !saveInProgress, ({ data: preventRemoveData }) => {
    Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
      { text: loc._.cancel, style: 'cancel' },
      {
        text: loc._.ok,
        style: 'destructive',
        onPress: () => navigationDispatch(preventRemoveData.action),
      },
    ]);
  });

  useEffect(() => {
    if (saveInProgress) {
      goBack();
      setSaveInProgress(false);
    }
  }, [saveInProgress, goBack]);

  const handleClose = useCallback(() => {
    if (state.searchQuery.length === 0 && !state.isSearchFocused) {
      const reorderedWallets = state.currentWalletsOrder
        .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
        .map(item => item.data);

      const walletsToDelete = state.initialWalletsBackup.filter(
        originalWallet => !reorderedWallets.some(wallet => wallet.getID() === originalWallet.getID()),
      );

      setWalletsWithNewOrder(reorderedWallets);
      dispatch({ type: SAVE_CHANGES, payload: reorderedWallets });
      initialWalletsRef.current = deepCopyWallets(reorderedWallets);

      walletsToDelete.forEach(wallet => {
        handleWalletDeletion(wallet.getID());
      });

      setSaveInProgress(true);
    } else {
      dispatch({ type: SET_SEARCH_QUERY, payload: '' });
      dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false });
    }
  }, [
    setWalletsWithNewOrder,
    state.searchQuery,
    state.isSearchFocused,
    state.currentWalletsOrder,
    state.initialWalletsBackup,
    handleWalletDeletion,
  ]);

  const buttonOpacity = useMemo(() => ({ opacity: saveInProgress ? 0.5 : 1 }), [saveInProgress]);
  const HeaderLeftButton = useMemo(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.close}
        style={[styles.button, buttonOpacity]}
        onPress={goBack}
        disabled={saveInProgress}
        testID="NavigationCloseButton"
      >
        <Image source={closeImage} />
      </TouchableOpacity>
    ),
    [buttonOpacity, goBack, saveInProgress, closeImage],
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

  const handleDeleteWallet = useCallback(async (wallet: TWallet) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        duration: 200,
      },
    });

    dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
  }, []);

  const handleToggleHideBalance = useCallback(
    (wallet: TWallet) => {
      const updatedOrder = state.currentWalletsOrder.map(item => {
        if (item.type === ItemType.WalletSection && item.data.getID() === wallet.getID()) {
          item.data.hideBalance = !item.data.hideBalance;
          return {
            ...item,
            data: item.data,
          };
        }
        return item;
      });

      dispatch({ type: SET_TEMP_ORDER, payload: updatedOrder });
    },
    [state.currentWalletsOrder],
  );

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

  const renderItem = useCallback(
    (info: DragListRenderItemInfo<Item>) => {
      const { item, onDragStart, isActive } = info;

      const compatibleState = {
        wallets: state.availableWallets,
        searchQuery: state.searchQuery,
      };

      return (
        <ManageWalletsListItem
          item={item}
          onPressIn={undefined}
          onPressOut={undefined}
          isDraggingDisabled={state.searchQuery.length > 0 || state.isSearchFocused}
          state={compatibleState}
          navigateToWallet={navigateToWallet}
          renderHighlightedText={renderHighlightedText}
          handleDeleteWallet={handleDeleteWallet}
          handleToggleHideBalance={handleToggleHideBalance}
          isActive={isActive}
          drag={onDragStart}
        />
      );
    },
    [
      state.availableWallets,
      state.searchQuery,
      state.isSearchFocused,
      navigateToWallet,
      renderHighlightedText,
      handleDeleteWallet,
      handleToggleHideBalance,
    ],
  );

  const onReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedOrder = [...state.currentWalletsOrder];
      const removed = updatedOrder.splice(fromIndex, 1);
      updatedOrder.splice(toIndex, 0, removed[0]);

      dispatch({ type: SET_TEMP_ORDER, payload: updatedOrder });
    },
    [state.currentWalletsOrder],
  );

  const keyExtractor = useCallback((item: Item, index: number) => index.toString(), []);

  const renderHeader = useMemo(() => {
    if (!state.searchQuery) return null;
    const hasWallets = state.availableWallets.length > 0;
    const filteredTxMetadata = Object.entries(state.txMetadata).filter(([_, tx]) =>
      tx.memo?.toLowerCase().includes(state.searchQuery.toLowerCase()),
    );
    const hasTransactions = filteredTxMetadata.length > 0;

    return (
      !hasWallets &&
      !hasTransactions && <Text style={[styles.noResultsText, stylesHook.noResultsText]}>{loc.wallets.no_results_found}</Text>
    );
  }, [state.searchQuery, state.availableWallets.length, state.txMetadata, stylesHook.noResultsText]);

  return (
    <Suspense fallback={<ActivityIndicator size="large" color={colors.brandingColor} />}>
      <GestureHandlerRootView style={[{ backgroundColor: colors.background }, styles.root]}>
        <>
          {renderHeader}
          <DragList
            automaticallyAdjustContentInsets
            automaticallyAdjustKeyboardInsets
            automaticallyAdjustsScrollIndicatorInsets
            contentInsetAdjustmentBehavior="automatic"
            data={uiData}
            containerStyle={[{ backgroundColor: colors.background }, styles.root]}
            keyExtractor={keyExtractor}
            onReordered={onReordered}
            renderItem={renderItem}
            ref={listRef}
          />
        </>
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
  noResultsText: {
    textAlign: 'center',
    justifyContent: 'center',
    marginTop: 34,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    fontWeight: 'bold',
    fontSize: 19,
  },
  dimmedText: {
    opacity: 0.8,
  },
  defaultText: {
    fontSize: 19,
    fontWeight: '600',
  },
  highlighted: {
    fontSize: 19,
    fontWeight: '600',
    color: 'black',
    textShadowRadius: 1,
    textShadowOffset: { width: 1, height: 1 },
    textShadowColor: '#000',
    textDecorationStyle: 'double',
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
    padding: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: 'white',
  },
  highlightedContainer: {
    alignSelf: 'flex-start',
  },
});
