import React, { useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef, useState, startTransition } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Keyboard,
  Text,
  Pressable,
  View,
  FlatList,
  ListRenderItemInfo,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '@react-navigation/native';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TTXMetadata } from '../../class/blue-app';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import useBounceAnimation from '../../hooks/useBounceAnimation';
import DraggableFlatList, { RenderItemParams, DragEndParams } from 'react-native-draggable-flatlist';
import { ItemType, AddressItemData } from '../../models/itemTypes';
import ManageWalletsListItem, { WalletGroupComponent } from '../../components/ManageWalletsListItem';
import HighlightedText from '../../components/HighlightedText';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import DragIcon from '../../img/Search/drag';

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

type Action = SetSearchQueryAction | SetIsSearchFocusedAction | SetInitialDataAction | SaveChangesAction;

interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  walletsCopy: TWallet[]; // Copy used for display and filtering
  txMetadata: TTXMetadata;
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  walletsCopy: [],
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
      return {
        ...state,
        walletsCopy,
        txMetadata: action.payload.txMetadata,
      };
    }
    case SAVE_CHANGES: {
      return {
        ...state,
        walletsCopy: deepCopyWallets(action.payload),
      };
    }
    default:
      throw new Error(`Unhandled action type: ${(action as Action).type}`);
  }
};

const ManageWallets: React.FC = () => {
  const { colors, closeImage, dark } = useTheme();
  const { wallets: persistedWallets, setWalletsWithNewOrder, txMetadata } = useStorage();
  const initialWalletsRef = useRef<TWallet[]>(deepCopyWallets(persistedWallets));
  const { navigate, setOptions, goBack } = useExtendedNavigation();
  const { direction } = useLocale();
  const [state, dispatch] = useReducer(reducer, initialState);
  const bounceAnim = useBounceAnimation(state.searchQuery);
  const stylesHook = {
    noResultsText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
    clearSearchButton: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  };
  const [noResultsOpacity] = useState(new Animated.Value(0));

  const [dragging, setDragging] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useCallback((text: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (text.length === 0) {
      dispatch({ type: SET_SEARCH_QUERY, payload: '' });
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      startTransition(() => {
        dispatch({ type: SET_SEARCH_QUERY, payload: text });
      });
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const getFilteredWalletsData = useCallback((search: string, walletsSource: TWallet[], metadataSource: TTXMetadata): Item[] => {
    if (search) {
      const lowerQuery = search.toLowerCase();

      const walletsWithMatches = new Map<
        string,
        {
          wallet: TWallet;
          transactions: TransactionItem[];
          addresses: AddressItem[];
        }
      >();

      const walletIdSet = new Set(walletsSource.map(wallet => wallet.getID()));

      const matchingTxids = Object.entries(metadataSource).filter(
        ([_, metadata]) => metadata.memo && metadata.memo.toLowerCase().includes(lowerQuery),
      );

      if (matchingTxids.length > 0) {
        const txidToWalletMap = new Map<string, string>();

        walletsSource.forEach(wallet => {
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
            const wallet = walletsSource.find(w => w.getID() === walletID);
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

      walletsSource.forEach(wallet => {
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
        walletsSource.forEach(wallet => {
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
                const txIdMatches = typeof txid === 'string' && txid.length > 0 ? txid.toLowerCase().includes(lowerQuery) : false;
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
                  const addressValue =
                    typeof address === 'string'
                      ? address
                      : address &&
                          typeof address === 'object' &&
                          'address' in (address as any) &&
                          typeof (address as any).address === 'string'
                        ? ((address as any).address as string)
                        : '';

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

    return walletsSource.map(wallet => ({
      type: ItemType.WalletSection,
      data: wallet,
    }));
  }, []);

  const listData = useMemo(
    () => getFilteredWalletsData(state.searchQuery, state.walletsCopy, state.txMetadata),
    [getFilteredWalletsData, state.searchQuery, state.walletsCopy, state.txMetadata],
  );
  /** When true, use FlatList instead of DraggableFlatList (search/focus churn + drag list stresses Fabric). */
  const isDragDisabled = state.walletsCopy.length <= 1 || state.searchQuery.length > 0 || state.isSearchFocused;

  useEffect(() => {
    dispatch({ type: SET_INITIAL_DATA, payload: { wallets: initialWalletsRef.current, txMetadata } });
  }, [txMetadata]);

  useEffect(() => {
    if (state.searchQuery && listData.length === 0) {
      Animated.timing(noResultsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      noResultsOpacity.setValue(0);
    }
  }, [listData.length, state.searchQuery, noResultsOpacity]);

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

  useLayoutEffect(() => {
    const searchBarOptions = {
      hideWhenScrolling: false,
      onChangeText: (event: { nativeEvent: { text: any } }) => debouncedSearch(event.nativeEvent.text),
      onClear: () => debouncedSearch(''),
      onFocus: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: true }),
      onBlur: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false }),
      placeholder: loc.wallets.manage_wallets_search_placeholder,
    };
    setOptions({
      headerLeft: () => HeaderLeftButton,
      headerRight: undefined,
      headerSearchBarOptions: searchBarOptions,
    });
  }, [setOptions, HeaderLeftButton, debouncedSearch]);

  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      return (
        <HighlightedText
          text={text}
          query={query}
          bounceAnim={bounceAnim}
          style={{ color: colors.foregroundColor }}
          highlightStyle={dark ? StyleSheet.flatten([styles.searchHighlightDark, { color: colors.foregroundColor }]) : undefined}
        />
      );
    },
    [bounceAnim, colors.foregroundColor, dark],
  );

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      Keyboard.dismiss();
      const walletID = wallet.getID();
      goBack();
      setTimeout(() => {
        navigate('WalletTransactions', {
          walletID,
          walletType: wallet.type,
        });
      }, 0);
    },
    [navigate, goBack],
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

  const handleToggleHideBalance = useCallback(
    (wallet: TWallet) => {
      const walletID = wallet.getID();
      const updatedWallets = deepCopyWallets(state.walletsCopy).map(w => {
        if (w.getID() === walletID) {
          w.hideBalance = !w.hideBalance;
        }
        return w;
      });

      setWalletsWithNewOrder(updatedWallets);
      dispatch({ type: SAVE_CHANGES, payload: updatedWallets });
    },
    [state.walletsCopy, setWalletsWithNewOrder],
  );

  const renderListItem = useCallback(
    (item: Item, drag: (() => void) | undefined, isActive: boolean) => {
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
          />
        );
      }

      return (
        <ManageWalletsListItem
          item={item}
          isDraggingDisabled={isDragDisabled}
          handleToggleHideBalance={handleToggleHideBalance}
          state={compatibleState}
          navigateToWallet={navigateToWallet}
          navigateToAddress={navigateToAddress}
          renderHighlightedText={renderHighlightedText}
          isActive={isActive}
          drag={isDragDisabled ? undefined : drag}
          globalDragActive={dragging}
        />
      );
    },
    [
      handleToggleHideBalance,
      state.walletsCopy,
      state.searchQuery,
      state.isSearchFocused,
      navigateToWallet,
      navigateToAddress,
      renderHighlightedText,
      dragging,
      isDragDisabled,
    ],
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Item>) => renderListItem(item, drag, isActive),
    [renderListItem],
  );

  const renderPlainListItem = useCallback(
    (info: ListRenderItemInfo<Item>) => renderListItem(info.item, undefined, false),
    [renderListItem],
  );

  const keyExtractor = useCallback((item: Item, index: number) => {
    if (item.type === ItemType.WalletSection) {
      return `wallet-${item.data.getID()}`;
    }

    if (item.type === ItemType.TransactionSection) {
      const txid = item.data.hash || item.data.txid || index;
      return `tx-${txid}-${item.data.walletID || ''}`;
    }

    if (item.type === ItemType.AddressSection) {
      return `addr-${item.data.address}-${item.data.walletID}-${item.data.index ?? index}`;
    }

    if (item.type === ItemType.WalletGroupSection) {
      return `group-${item.wallet.getID()}`;
    }

    return index.toString();
  }, []);

  const listContentStyle = useMemo(() => [styles.listContentContainer], []);
  const listExtraData = useMemo(
    () => ({ searchQuery: state.searchQuery, isSearchFocused: state.isSearchFocused }),
    [state.searchQuery, state.isSearchFocused],
  );

  const shouldShowReorderHint = useMemo(
    () => state.searchQuery.length === 0 && state.walletsCopy.length > 1,
    [state.searchQuery.length, state.walletsCopy.length],
  );

  const ListHeaderComponent = useMemo(() => {
    if (!shouldShowReorderHint) return null;

    const hintTextColor = dark ? colors.foregroundColor : colors.alternativeTextColor;
    return (
      <Pressable accessibilityRole="text" style={styles.reorderHintContainer}>
        <View style={styles.reorderHintIcon}>
          <DragIcon color={hintTextColor} />
        </View>
        <View style={styles.reorderHintTextContainer}>
          <Text style={[styles.reorderHintTitle, { color: hintTextColor, writingDirection: direction }]}>{loc.wallets.wallets}</Text>
          <Text style={[styles.reorderHintSubtitle, { color: hintTextColor, writingDirection: direction }]}>
            {loc.wallets.drag_to_reorder}
          </Text>
        </View>
      </Pressable>
    );
  }, [colors.alternativeTextColor, colors.foregroundColor, dark, direction, shouldShowReorderHint]);

  const ListEmptyComponent = useMemo(() => {
    if (!state.searchQuery) return null;
    return (
      <Animated.View style={[styles.noResultsContainer, { opacity: noResultsOpacity }]}>
        <Animated.Text style={[styles.noResultsText, stylesHook.noResultsText]}>{loc.wallets.no_results_found}</Animated.Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.wallets.clear_search}
          style={({ pressed }) => [styles.clearSearchButton, stylesHook.clearSearchButton, pressed && styles.clearSearchButtonPressed]}
          android_ripple={{ color: colors.buttonDisabledTextColor, borderless: false }}
          onPress={() => {
            dispatch({ type: SET_SEARCH_QUERY, payload: '' });
            dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false });
          }}
        >
          <Text style={[styles.clearSearchText, { color: colors.buttonTextColor }]}>{loc.wallets.clear_search}</Text>
        </Pressable>
      </Animated.View>
    );
  }, [
    colors.buttonDisabledTextColor,
    colors.buttonTextColor,
    noResultsOpacity,
    state.searchQuery,
    stylesHook.clearSearchButton,
    stylesHook.noResultsText,
  ]);

  const listSharedProps = {
    data: listData,
    keyExtractor,
    contentContainerStyle: listContentStyle,
    extraData: listExtraData,
    ListHeaderComponent,
    ListEmptyComponent,
    automaticallyAdjustContentInsets: true,
    contentInsetAdjustmentBehavior: 'automatic' as const,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
  };

  return (
    <SafeAreaView style={[{ backgroundColor: colors.background }, styles.root]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.gestureRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureHandlerRootView style={styles.gestureRoot}>
          {isDragDisabled ? (
            <FlatList<Item> {...listSharedProps} style={styles.listContainer} renderItem={renderPlainListItem} />
          ) : (
            <DraggableFlatList<Item>
              {...listSharedProps}
              renderItem={renderDraggableItem}
              containerStyle={styles.listContainer}
              onDragBegin={() => {
                setDragging(true);
              }}
              onDragEnd={({ from, to, data }: DragEndParams<Item>) => {
                setDragging(false);

                if (state.searchQuery.length > 0 || state.isSearchFocused) {
                  return;
                }

                if (from === to) {
                  return;
                }

                const reorderedWallets = data
                  .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
                  .map(item => item.data);
                setWalletsWithNewOrder(reorderedWallets);
                dispatch({ type: SAVE_CHANGES, payload: reorderedWallets });
                triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
              }}
              activationDistance={8}
              autoscrollThreshold={32}
              autoscrollSpeed={16}
              dragItemOverflow
              animationConfig={{ damping: 26, mass: 0.6, stiffness: 260, overshootClamping: true }}
            />
          )}
        </GestureHandlerRootView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default React.memo(ManageWallets);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gestureRoot: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  clearSearchButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  clearSearchButtonPressed: {
    opacity: 0.85,
  },
  clearSearchText: {
    fontWeight: '600',
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
  reorderHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  reorderHintIcon: {
    marginRight: 12,
  },
  reorderHintTextContainer: {
    flex: 1,
  },
  reorderHintTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  reorderHintSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    opacity: 0.55,
  },
  searchHighlightDark: {
    backgroundColor: 'rgba(255, 245, 192, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
