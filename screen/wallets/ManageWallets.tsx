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
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import useDebounce from '../../hooks/useDebounce';
import { TTXMetadata } from '../../class';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import useBounceAnimation from '../../hooks/useBounceAnimation';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import presentAlert from '../../components/Alert';
import prompt from '../../helpers/prompt';
import HeaderRightButton from '../../components/HeaderRightButton';
import { useSettings } from '../../hooks/context/useSettings';
import DragList, { DragListRenderItemInfo } from 'react-native-draglist';

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
  const { wallets: storedWallets, setWalletsWithNewOrder, txMetadata } = useStorage();
  const { setIsDrawerShouldHide } = useSettings();
  const walletsRef = useRef<TWallet[]>(deepCopyWallets(storedWallets)); // Create a deep copy of wallets for the DraggableFlatList
  const { navigate, setOptions, goBack } = useExtendedNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const navigation = useNavigation();
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);
  const bounceAnim = useBounceAnimation(state.searchQuery);
  const beforeRemoveListenerRef = useRef<(() => void) | null>(null);
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

  useEffect(() => {
    setData(state.tempOrder);
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

  const handleClose = useCallback(() => {
    if (state.searchQuery.length === 0 && !state.isSearchFocused) {
      const newWalletOrder = state.tempOrder
        .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
        .map(item => item.data);

      setWalletsWithNewOrder(newWalletOrder);

      dispatch({ type: SAVE_CHANGES, payload: newWalletOrder });

      walletsRef.current = deepCopyWallets(newWalletOrder);

      if (beforeRemoveListenerRef.current) {
        navigation.removeListener('beforeRemove', beforeRemoveListenerRef.current);
      }

      goBack();
    } else {
      dispatch({ type: SET_SEARCH_QUERY, payload: '' });
      dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false });
    }
  }, [goBack, setWalletsWithNewOrder, state.searchQuery, state.isSearchFocused, state.tempOrder, navigation]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(walletsRef.current) !== JSON.stringify(state.tempOrder.map(item => item.data));
  }, [state.tempOrder]);

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
      const beforeRemoveListener = (e: { preventDefault: () => void; data: { action: any } }) => {
        if (!hasUnsavedChanges) {
          return;
        }

        e.preventDefault();

        Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
          { text: loc._.cancel, style: 'cancel', onPress: () => {} },
          {
            text: loc._.ok,
            style: 'default',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]);
      };

      // @ts-ignore: fix later
      beforeRemoveListenerRef.current = beforeRemoveListener;

      navigation.addListener('beforeRemove', beforeRemoveListener);

      return () => {
        if (beforeRemoveListenerRef.current) {
          navigation.removeListener('beforeRemove', beforeRemoveListenerRef.current);
        }
        setIsDrawerShouldHide(false);
      };
    }, [hasUnsavedChanges, navigation, setIsDrawerShouldHide]),
  );

  // Ensure the listener is re-added every time there are unsaved changes
  useEffect(() => {
    if (beforeRemoveListenerRef.current) {
      navigation.removeListener('beforeRemove', beforeRemoveListenerRef.current);
      navigation.addListener('beforeRemove', beforeRemoveListenerRef.current);
    }
  }, [hasUnsavedChanges, navigation]);

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

  const presentWalletHasBalanceAlert = useCallback(async (wallet: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance: wallet.getBalance() }),
        true,
        'plain-text',
        true,
        loc.wallets.details_delete,
      );
      if (Number(walletBalanceConfirmation) === wallet.getBalance()) {
        dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.wallets.details_del_wb_err });
      }
    } catch (_) {}
  }, []);

  const handleDeleteWallet = useCallback(
    async (wallet: TWallet) => {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      Alert.alert(
        loc.wallets.details_delete_wallet,
        loc.wallets.details_are_you_sure,
        [
          {
            text: loc.wallets.details_yes_delete,
            onPress: async () => {
              const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

              if (isBiometricsEnabled) {
                if (!(await unlockWithBiometrics())) {
                  return;
                }
              }
              if (wallet.getBalance() > 0 && wallet.allowSend()) {
                presentWalletHasBalanceAlert(wallet);
              } else {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
              }
            },
            style: 'destructive',
          },
          { text: loc.wallets.details_no_cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    },
    [isBiometricUseCapableAndEnabled, presentWalletHasBalanceAlert],
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
      return (
        <ManageWalletsListItem
          item={item}
          onPressIn={undefined}
          onPressOut={undefined}
          isDraggingDisabled={state.searchQuery.length > 0 || state.isSearchFocused}
          state={state}
          navigateToWallet={navigateToWallet}
          renderHighlightedText={renderHighlightedText}
          handleDeleteWallet={handleDeleteWallet}
          handleToggleHideBalance={handleToggleHideBalance}
          isActive={isActive}
          drag={onDragStart}
        />
      );
    },
    [state, navigateToWallet, renderHighlightedText, handleDeleteWallet, handleToggleHideBalance],
  );

  const onReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      const copy = [...state.order];
      const removed = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, removed[0]);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      dispatch({ type: SET_TEMP_ORDER, payload: copy });
      dispatch({
        type: SET_INITIAL_ORDER,
        payload: {
          wallets: copy.filter(item => item.type === ItemType.WalletSection).map(item => item.data as TWallet),
          txMetadata: state.txMetadata,
        },
      });
    },
    [state.order, state.txMetadata],
  );

  const keyExtractor = useCallback((item: Item, index: number) => index.toString(), []);

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
            data={data}
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
