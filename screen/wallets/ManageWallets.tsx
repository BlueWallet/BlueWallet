import React, { useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  I18nManager,
  Animated,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  Keyboard,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePreventRemove } from '@react-navigation/native';
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

interface SetInitialDataAction {
  type: typeof SET_INITIAL_DATA;
  payload: { wallets: TWallet[]; txMetadata: TTXMetadata };
}

interface SetManagedDataAction {
  type: typeof SET_MANAGED_DATA;
  payload: Item[];
}

interface RemoveWalletAction {
  type: typeof REMOVE_WALLET;
  payload: string; // Wallet ID
}

type Action =
  | SetSearchQueryAction
  | SetIsSearchFocusedAction
  | SetInitialDataAction
  | SetManagedDataAction
  | SaveChangesAction
  | RemoveWalletAction;

interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  originalWallets: TWallet[];
  managedWalletsData: Item[];
  txMetadata: TTXMetadata;
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  originalWallets: [],
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
      const managedWalletsData: WalletItem[] = deepCopyWallets(action.payload.wallets).map(wallet => ({
        type: ItemType.WalletSection,
        data: wallet,
      }));
      return {
        ...state,
        originalWallets: deepCopyWallets(action.payload.wallets),
        txMetadata: action.payload.txMetadata,
        managedWalletsData,
      };
    }
    case SET_MANAGED_DATA: {
      return {
        ...state,
        managedWalletsData: action.payload,
      };
    }
    case SAVE_CHANGES: {
      return {
        ...state,
        originalWallets: deepCopyWallets(action.payload),
      };
    }
    case REMOVE_WALLET: {
      const updatedOrder = state.managedWalletsData.filter(
        item => item.type !== ItemType.WalletSection || item.data.getID() !== action.payload,
      );
      return {
        ...state,
        managedWalletsData: updatedOrder,
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
  const [uiData, setUiData] = useState(state.managedWalletsData);
  const [noResultsOpacity] = useState(new Animated.Value(0));

  const listRef = useRef<FlatList<Item> | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);

  const getFilteredWalletsData = useCallback(() => {
    if (debouncedSearchQuery) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      
      // Track which wallets have matching items (transactions, addresses, or memos)
      const walletsWithMatches = new Map<string, {
        wallet: TWallet,
        transactions: TransactionItem[],
        addresses: AddressItem[]
      }>();
      
      // First check for transaction memos in txMetadata
      Object.entries(state.txMetadata).forEach(([txid, metadata]) => {
        if (metadata.memo && metadata.memo.toLowerCase().includes(lowerQuery)) {
          // Find which wallet has this transaction
          state.originalWallets.forEach(wallet => {
            try {
              // Check if the wallet contains this transaction
              const tx = wallet.getTransactions().find((t: Transaction) => t.hash === txid || t.txid === txid);
              if (tx) {
                const walletID = wallet.getID();
                
                if (!walletsWithMatches.has(walletID)) {
                  walletsWithMatches.set(walletID, {
                    wallet,
                    transactions: [],
                    addresses: []
                  });
                }
                
                // Add the transaction to the matching group
                const group = walletsWithMatches.get(walletID)!;
                
                // Only add if it's not already in the array
                const alreadyAdded = group.transactions.some(
                  item => (item.data.hash === txid || item.data.txid === txid)
                );
                
                if (!alreadyAdded) {
                  group.transactions.push({
                    type: ItemType.TransactionSection,
                    data: tx as ExtendedTransaction & LightningTransaction
                  });
                }
              }
            } catch (e) {
              // Skip if the wallet doesn't have getTransactions method or other errors
            }
          });
        }
      });
      
      // Search through all wallets for addresses and additional transactions
      state.originalWallets.forEach(wallet => {
        const walletID = wallet.getID();
        const walletLabel = wallet.getLabel() || '';
        
        // Check if wallet label matches
        const walletLabelMatches = walletLabel.toLowerCase().includes(lowerQuery);
        
        // If wallet label matches, make sure it's in our map
        if (walletLabelMatches && !walletsWithMatches.has(walletID)) {
          walletsWithMatches.set(walletID, {
            wallet,
            transactions: [],
            addresses: []
          });
        }
        
        // Search through transactions
        try {
          const transactions = wallet.getTransactions() || [];
          
          transactions.forEach((tx: Transaction) => {
            const txid = tx.hash || tx.txid;
            // Using value instead of amount since that's what the Transaction type has
            const txAmount = tx.value?.toString() || '';
            const txDate = tx.received?.toString() || '';
            
            // Check if any transaction data matches the search query
            const txMemoMatches = txid && 
              state.txMetadata[txid] && 
              state.txMetadata[txid].memo && 
              state.txMetadata[txid].memo.toLowerCase().includes(lowerQuery);
              
            // Check if the transaction ID matches the search query
            const txIdMatches = txid && txid.toLowerCase().includes(lowerQuery);
            
            const txDataMatches = txAmount.includes(lowerQuery) || txDate.includes(lowerQuery);
            
            if (txMemoMatches || txDataMatches || txIdMatches) {
              if (!walletsWithMatches.has(walletID)) {
                walletsWithMatches.set(walletID, {
                  wallet,
                  transactions: [],
                  addresses: []
                });
              }
              
              const group = walletsWithMatches.get(walletID)!;
              
              // Only add if it's not already in the array
              const alreadyAdded = group.transactions.some(
                item => (item.data.hash === txid || item.data.txid === txid)
              );
              
              if (!alreadyAdded) {
                group.transactions.push({
                  type: ItemType.TransactionSection,
                  data: tx as ExtendedTransaction & LightningTransaction
                });
              }
            }
          });
        } catch (e) {
          // Skip if wallet doesn't support getTransactions
        }
        
        // Search through addresses
        try {
          const addresses = wallet.getAllExternalAddresses() || [];
          
          // Check if any address matches
          addresses.forEach((address: any, index: number) => {
            const addressValue = typeof address === 'string' ? address : address.address;
            const addressLabel = typeof address === 'string' ? '' : (address.label || '');
            
            if (addressValue.toLowerCase().includes(lowerQuery) || 
                addressLabel.toLowerCase().includes(lowerQuery)) {
              
              if (!walletsWithMatches.has(walletID)) {
                walletsWithMatches.set(walletID, {
                  wallet,
                  transactions: [],
                  addresses: []
                });
              }
              
              const group = walletsWithMatches.get(walletID)!;
              
              const addressItem: AddressItem = {
                type: ItemType.AddressSection,
                data: {
                  address: addressValue,
                  walletID,
                  index,
                  isInternal: false,
                }
              };
              
              // Check if this address is already in the array
              const alreadyAdded = group.addresses.some(item => item.data.address === addressValue);
              
              if (!alreadyAdded) {
                group.addresses.push(addressItem);
              }
            }
          });
        } catch (e) {
          // Skip if wallet doesn't support getAllExternalAddresses
        }
      });
      
      // Now convert the map to the data format needed for the list
      const result: Item[] = [];
      
      // Process matches by wallet
      walletsWithMatches.forEach((matchData, walletID) => {
        const { wallet, transactions, addresses } = matchData;
        
        // If this wallet has transactions or addresses that match, create a group
        if (transactions.length > 0 || addresses.length > 0) {
          // Add a wallet group item
          result.push({
            type: ItemType.WalletGroupSection,
            wallet,
            transactions,
            addresses
          });
        } else {
          // If it's just the wallet label that matched, add a regular wallet item
          result.push({
            type: ItemType.WalletSection,
            data: wallet
          });
        }
      });

      return result;
    }
    
    // When not searching, return the original managed data
    return state.managedWalletsData;
  }, [debouncedSearchQuery, state.managedWalletsData, state.originalWallets, state.txMetadata]);

  useEffect(() => {
    dispatch({ type: SET_INITIAL_DATA, payload: { wallets: initialWalletsRef.current, txMetadata } });
  }, [txMetadata]);

  // Handle no results animation
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
  }, [getFilteredWalletsData, state.searchQuery, state.managedWalletsData.length, noResultsOpacity]);

  useEffect(() => {
    setUiData(getFilteredWalletsData());
  }, [state.managedWalletsData, debouncedSearchQuery]);

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

      const walletsToDelete = state.originalWallets.filter(
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
    state.managedWalletsData,
    state.originalWallets,
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

  // Platform-specific highlight animation
  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      return <HighlightedText text={text} query={query} bounceAnim={bounceAnim} />;
    },
    [bounceAnim],
  );

  const handleDeleteWallet = useCallback(async (wallet: TWallet) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext({
        duration: 300,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
        delete: {
          type: LayoutAnimation.Types.spring,
          property: LayoutAnimation.Properties.scaleXY,
          springDamping: 0.9,
          duration: 300,
        },
      });
    } else {
      LayoutAnimation.configureNext({
        duration: 250,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
        delete: {
          type: LayoutAnimation.Types.easeOut,
          property: LayoutAnimation.Properties.opacity,
          duration: 200,
        },
      });
    }

    dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
  }, []);

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
      goBack();
      navigate('WalletTransactions', {
        walletID,
        walletType: wallet.type,
      });
    },
    [goBack, navigate],
  );

  const navigateToAddress = useCallback(
    (address: string, walletID: string) => {
      // First dismiss the modal and then navigate with a slight delay
      Keyboard.dismiss();
      goBack();
      
      // Use setTimeout to ensure the modal is fully dismissed before navigation
      setTimeout(() => {
        navigate('ReceiveDetails', {
          walletID,
          address,
        });
      }, 300);
    },
    [goBack, navigate],
  );

  const renderItem = useCallback(
    (info: DragListRenderItemInfo<Item>) => {
      const { item, onDragStart, isActive } = info;

      const compatibleState = {
        wallets: state.originalWallets,
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
          handleDeleteWallet={handleDeleteWallet}
          handleToggleHideBalance={handleToggleHideBalance}
          isActive={isActive}
          drag={onDragStart}
        />
      );
    },
    [
      state.originalWallets,
      state.searchQuery,
      state.isSearchFocused,
      navigateToWallet,
      navigateToAddress,
      renderHighlightedText,
      handleDeleteWallet,
      handleToggleHideBalance,
    ],
  );

  const onReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      // Prevent reordering when search query is active or search bar is focused
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
            automaticallyAdjustKeyboardInsets
            automaticallyAdjustsScrollIndicatorInsets
            contentInsetAdjustmentBehavior="automatic"
            data={getFilteredWalletsData()}
            containerStyle={[{ backgroundColor: colors.background }, styles.root]}
            keyExtractor={keyExtractor}
            onReordered={onReordered}
            renderItem={renderItem}
            ref={listRef}
            extraData={debouncedSearchQuery} // Use extraData instead of key for re-renders
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
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
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
