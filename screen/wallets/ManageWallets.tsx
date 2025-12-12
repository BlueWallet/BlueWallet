import React, { useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  FlatList,
  ActivityIndicator,
  UIManager,
  Platform,
  Keyboard,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLocale, usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TTXMetadata } from '../../class';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import useBounceAnimation from '../../hooks/useBounceAnimation';
import HeaderRightButton from '../../components/HeaderRightButton';
import DragList, { DragListRenderItemInfo } from 'react-native-draglist';
import useDebounce from '../../hooks/useDebounce';
import { ItemType, AddressItemData } from '../../models/itemTypes';
import { WalletGroupComponent } from '../../components/ManageWalletsListItem';
import HighlightedText from '../../components/HighlightedText';

const ManageWalletsListItem = lazy(() => import('../../components/ManageWalletsListItem'));

interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction & LightningTransaction;
}

interface AddressItem {
  type: ItemType.AddressSection;
  data: Omit<AddressItemData, 'label'>;
}

interface WalletGroupItem {
  type: ItemType.WalletGroupSection;
  wallet: TWallet;
  transactions: TransactionItem[];
  addresses: AddressItem[];
}

type Item = WalletItem | TransactionItem | AddressItem | WalletGroupItem;

const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
const SET_IS_SEARCH_FOCUSED = 'SET_IS_SEARCH_FOCUSED';
const SET_INITIAL_DATA = 'SET_INITIAL_DATA';
const SET_MANAGED_DATA = 'SET_MANAGED_DATA';
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

interface SetInitialDataAction {
  type: typeof SET_INITIAL_DATA;
  payload: { wallets: TWallet[]; txMetadata: TTXMetadata };
}

interface SetManagedDataAction {
  type: typeof SET_MANAGED_DATA;
  payload: Item[];
}

type Action = SetSearchQueryAction | SetIsSearchFocusedAction | SetInitialDataAction | SetManagedDataAction | SaveChangesAction;

interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  originalWallets: TWallet[]; // Only used for verifying unsaved changes
  walletsCopy: TWallet[]; // Copy used for display and filtering
  managedWalletsData: Item[];
  txMetadata: TTXMetadata;
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  originalWallets: [],
  walletsCopy: [],
  managedWalletsData: [],
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
    case SET_INITIAL_DATA: {
      const walletsCopy = deepCopyWallets(action.payload.wallets);
      const managedWalletsData: WalletItem[] = walletsCopy.map(wallet => ({
        type: ItemType.WalletSection,
        data: wallet,
      }));

      return {
        ...state,
        originalWallets: deepCopyWallets(action.payload.wallets),
        walletsCopy,
        txMetadata: action.payload.txMetadata,
        managedWalletsData,
      };
    }
    case SET_MANAGED_DATA: {
      const updatedWalletsCopy = action.payload
        .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
        .map(item => item.data);

      return {
        ...state,
        walletsCopy: updatedWalletsCopy.length > 0 ? updatedWalletsCopy : state.walletsCopy,
        managedWalletsData: action.payload,
      };
    }
    case SAVE_CHANGES: {
      return {
        ...state,
        originalWallets: deepCopyWallets(action.payload),
        walletsCopy: deepCopyWallets(action.payload),
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
  const { wallets: persistedWallets, setWalletsWithNewOrder, txMetadata } = useStorage();
  const initialWalletsRef = useRef<TWallet[]>(deepCopyWallets(persistedWallets));
  const { navigate, setOptions, goBack, dispatch: navigationDispatch } = useExtendedNavigation();
  const { direction } = useLocale();
  const [state, dispatch] = useReducer(reducer, initialState);
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);
  const bounceAnim = useBounceAnimation(state.searchQuery);
  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    noResultsText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
  };
  const [noResultsOpacity] = useState(new Animated.Value(0));

  const listRef = useRef<FlatList<Item> | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);

  const getFilteredWalletsData = useCallback(() => {
    if (debouncedSearchQuery) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();

      const walletsWithMatches = new Map<
        string,
        {
          wallet: TWallet;
          transactions: TransactionItem[];
          addresses: AddressItem[];
        }
      >();

      const walletIdSet = new Set(state.walletsCopy.map(wallet => wallet.getID()));

      const matchingTxids = Object.entries(state.txMetadata).filter(
        ([_, metadata]) => metadata.memo && metadata.memo.toLowerCase().includes(lowerQuery),
      );

      if (matchingTxids.length > 0) {
        const txidToWalletMap = new Map<string, string>();

        state.walletsCopy.forEach(wallet => {
          try {
            const transactions = wallet.getTransactions();
            if (transactions && transactions.length) {
              const walletID = wallet.getID();
              transactions.forEach((tx: Transaction) => {
                const txid = tx.hash || tx.txid;
                if (txid) {
                  txidToWalletMap.set(txid, walletID);
                }
              });
            }
          } catch (e) {}
        });

        matchingTxids.forEach(([txid]) => {
          const walletID = txidToWalletMap.get(txid);
          if (walletID && walletIdSet.has(walletID)) {
            const wallet = state.walletsCopy.find(w => w.getID() === walletID);
            if (wallet) {
              if (!walletsWithMatches.has(walletID)) {
                walletsWithMatches.set(walletID, {
                  wallet,
                  transactions: [],
                  addresses: [],
                });
              }

              try {
                const tx = wallet.getTransactions().find((t: Transaction) => t.hash === txid || t.txid === txid);
                if (tx) {
                  const group = walletsWithMatches.get(walletID)!;
                  const txExists = group.transactions.some(item => item.data.hash === txid || item.data.txid === txid);

                  if (!txExists) {
                    group.transactions.push({
                      type: ItemType.TransactionSection,
                      data: tx as ExtendedTransaction & LightningTransaction,
                    });
                  }
                }
              } catch (e) {}
            }
          }
        });
      }

      state.walletsCopy.forEach(wallet => {
        const walletID = wallet.getID();
        const walletLabel = wallet.getLabel() || '';

        if (walletLabel.toLowerCase().includes(lowerQuery) && !walletsWithMatches.has(walletID)) {
          walletsWithMatches.set(walletID, {
            wallet,
            transactions: [],
            addresses: [],
          });
        }
      });

      if (walletsWithMatches.size < 10) {
        state.walletsCopy.forEach(wallet => {
          const walletID = wallet.getID();

          if (walletsWithMatches.has(walletID)) return;

          try {
            const transactions = wallet.getTransactions();
            if (transactions && transactions.length) {
              const txToProcess = Math.min(transactions.length, 100);

              for (let i = 0; i < txToProcess; i++) {
                const tx = transactions[i];
                const txid = tx.hash || tx.txid;

                const txAmount = tx.value?.toString() || '';
                const txIdMatches = txid.toLowerCase().includes(lowerQuery);
                const txDataMatches = txAmount.includes(lowerQuery);

                if (txIdMatches || txDataMatches) {
                  if (!walletsWithMatches.has(walletID)) {
                    walletsWithMatches.set(walletID, {
                      wallet,
                      transactions: [],
                      addresses: [],
                    });
                  }

                  const group = walletsWithMatches.get(walletID)!;
                  if (!group.transactions.some(item => item.data.hash === txid || item.data.txid === txid)) {
                    group.transactions.push({
                      type: ItemType.TransactionSection,
                      data: tx as ExtendedTransaction & LightningTransaction,
                    });
                  }

                  break;
                }
              }
            }
          } catch (e) {}

          if (walletsWithMatches.size < 20) {
            try {
              const addresses = wallet.getAllExternalAddresses();
              if (addresses && addresses.length) {
                const addressLimit = Math.min(addresses.length, 50);

                for (let i = 0; i < addressLimit; i++) {
                  const address = addresses[i];
                  const addressValue = typeof address === 'string' ? address : (address as { address: string }).address || '';

                  if (addressValue.toLowerCase().includes(lowerQuery)) {
                    if (!walletsWithMatches.has(walletID)) {
                      walletsWithMatches.set(walletID, {
                        wallet,
                        transactions: [],
                        addresses: [],
                      });
                    }

                    const group = walletsWithMatches.get(walletID)!;
                    const addressItem: AddressItem = {
                      type: ItemType.AddressSection,
                      data: {
                        address: addressValue,
                        walletID,
                        index: i,
                        isInternal: false,
                      },
                    };

                    if (!group.addresses.some(item => item.data.address === addressValue)) {
                      group.addresses.push(addressItem);
                    }

                    break;
                  }
                }
              }
            } catch (e) {}
          }
        });
      }

      const resultItems = Array.from(walletsWithMatches.values());
      const result: Item[] = [];

      resultItems.sort((a, b) => {
        const aMatches = a.transactions.length + a.addresses.length;
        const bMatches = b.transactions.length + b.addresses.length;
        return bMatches - aMatches;
      });

      resultItems.forEach(matchData => {
        const { wallet, transactions, addresses } = matchData;

        if (transactions.length > 0 || addresses.length > 0) {
          transactions.sort((a, b) => {
            if (a.data.timestamp && b.data.timestamp) {
              return b.data.timestamp - a.data.timestamp;
            }
            return 0;
          });

          const limitedTransactions = transactions.slice(0, 15);
          const limitedAddresses = addresses.slice(0, 10);

          result.push({
            type: ItemType.WalletGroupSection,
            wallet,
            transactions: limitedTransactions,
            addresses: limitedAddresses,
          });
        } else {
          result.push({
            type: ItemType.WalletSection,
            data: wallet,
          });
        }
      });

      return result;
    }

    return state.managedWalletsData;
  }, [debouncedSearchQuery, state.managedWalletsData, state.walletsCopy, state.txMetadata]);

  useEffect(() => {
    dispatch({ type: SET_INITIAL_DATA, payload: { wallets: initialWalletsRef.current, txMetadata } });
  }, [txMetadata]);

  useEffect(() => {
    if (state.searchQuery && getFilteredWalletsData().length === 0) {
      Animated.timing(noResultsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      noResultsOpacity.setValue(0);
    }
  }, [getFilteredWalletsData, state.searchQuery, noResultsOpacity]);

  const hasUnsavedChanges = useMemo(() => {
    if (state.searchQuery.length > 0 || state.isSearchFocused) {
      return false;
    }

    const currentWalletIds = state.managedWalletsData
      .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
      .map(item => item.data.getID());

    const originalWalletIds = state.originalWallets.map(wallet => wallet.getID());

    if (currentWalletIds.length !== originalWalletIds.length) {
      return true;
    }

    for (let i = 0; i < currentWalletIds.length; i++) {
      if (currentWalletIds[i] !== originalWalletIds[i]) {
        return true;
      }
    }

    const modifiedWallets = state.managedWalletsData
      .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
      .map(item => item.data);

    for (const modifiedWallet of modifiedWallets) {
      const originalWallet = state.originalWallets.find(w => w.getID() === modifiedWallet.getID());
      if (originalWallet && originalWallet.hideBalance !== modifiedWallet.hideBalance) {
        return true;
      }
    }

    return false;
  }, [state.managedWalletsData, state.originalWallets, state.searchQuery, state.isSearchFocused]);

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
      const reorderedWallets = state.managedWalletsData
        .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
        .map(item => item.data);

      setWalletsWithNewOrder(reorderedWallets);
      dispatch({ type: SAVE_CHANGES, payload: reorderedWallets });
      initialWalletsRef.current = deepCopyWallets(reorderedWallets);

      setSaveInProgress(true);
    } else {
      dispatch({ type: SET_SEARCH_QUERY, payload: '' });
      dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false });
    }
  }, [setWalletsWithNewOrder, state.searchQuery, state.isSearchFocused, state.managedWalletsData]);

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

  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      return <HighlightedText text={text} query={query} bounceAnim={bounceAnim} />;
    },
    [bounceAnim],
  );

  const handleToggleHideBalance = useCallback(
    (wallet: TWallet) => {
      const updatedOrder = state.managedWalletsData.map(item => {
        if (item.type === ItemType.WalletSection && item.data.getID() === wallet.getID()) {
          item.data.hideBalance = !item.data.hideBalance;
          return {
            ...item,
            data: item.data,
          };
        }
        return item;
      });

      dispatch({ type: SET_MANAGED_DATA, payload: updatedOrder });
    },
    [state.managedWalletsData],
  );

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      Keyboard.dismiss();
      const walletID = wallet.getID();
      navigate('WalletTransactions', {
        walletID,
        walletType: wallet.type,
      });
    },
    [navigate],
  );

  const navigateToAddress = useCallback(
    (address: string) => {
      Keyboard.dismiss();

      navigate('ReceiveDetails', {
        address,
      });
    },
    [navigate],
  );

  const renderItem = useCallback(
    (info: DragListRenderItemInfo<Item>) => {
      const { item, onDragStart, isActive } = info;

      const compatibleState = {
        wallets: state.walletsCopy,
        searchQuery: state.searchQuery,
        isSearchFocused: state.isSearchFocused,
      };

      if (item.type === ItemType.WalletGroupSection) {
        return (
          <WalletGroupComponent
            wallet={item.wallet}
            transactions={item.transactions}
            addresses={item.addresses}
            state={compatibleState}
            navigateToWallet={navigateToWallet}
            navigateToAddress={navigateToAddress}
            renderHighlightedText={renderHighlightedText}
            isSearching={state.searchQuery.length > 0}
          />
        );
      }

      return (
        <ManageWalletsListItem
          item={item}
          onPressIn={undefined}
          onPressOut={undefined}
          isDraggingDisabled={state.searchQuery.length > 0 || state.isSearchFocused}
          state={compatibleState}
          navigateToWallet={navigateToWallet}
          navigateToAddress={navigateToAddress}
          renderHighlightedText={renderHighlightedText}
          handleToggleHideBalance={handleToggleHideBalance}
          isActive={isActive}
          drag={onDragStart}
        />
      );
    },
    [
      state.walletsCopy,
      state.searchQuery,
      state.isSearchFocused,
      navigateToWallet,
      navigateToAddress,
      renderHighlightedText,
      handleToggleHideBalance,
    ],
  );

  const onReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (state.searchQuery.length > 0 || state.isSearchFocused) {
        return;
      }

      const updatedOrder = [...state.managedWalletsData];
      const removed = updatedOrder.splice(fromIndex, 1);
      updatedOrder.splice(toIndex, 0, removed[0]);

      dispatch({ type: SET_MANAGED_DATA, payload: updatedOrder });
    },
    [state.managedWalletsData, state.searchQuery, state.isSearchFocused],
  );

  const keyExtractor = useCallback((item: Item, index: number) => index.toString(), []);

  return (
    <Suspense fallback={<ActivityIndicator size="large" color={colors.brandingColor} />}>
      <GestureHandlerRootView style={[{ backgroundColor: colors.background }, styles.root]}>
        {state.searchQuery && getFilteredWalletsData().length === 0 ? (
          <Animated.View style={[styles.noResultsContainer, { opacity: noResultsOpacity }]}>
            <Animated.Text style={[styles.noResultsText, stylesHook.noResultsText]}>{loc.wallets.no_results_found}</Animated.Text>
          </Animated.View>
        ) : (
          <DragList
            automaticallyAdjustContentInsets
            automaticallyAdjustsScrollIndicatorInsets
            contentInsetAdjustmentBehavior="automatic"
            data={getFilteredWalletsData()}
            containerStyle={[{ backgroundColor: colors.background }, styles.root]}
            keyExtractor={keyExtractor}
            onReordered={onReordered}
            renderItem={renderItem}
            ref={listRef}
            extraData={debouncedSearchQuery}
          />
        )}
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
    fontWeight: 'bold',
    fontSize: 19,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
