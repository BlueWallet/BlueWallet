import React, { useEffect, useReducer, useCallback, useMemo, useRef, useState, startTransition } from 'react';
import {
  StyleSheet,
  Animated,
  Keyboard,
  Text,
  Pressable,
  View,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { Gesture, GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, StackActions, useNavigation, useLocale, usePreventRemove, useRoute } from '@react-navigation/native';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TTXMetadata } from '../../class/blue-app';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import useBounceAnimation from '../../hooks/useBounceAnimation';
import ReorderableList, {
  ReorderableListRenderItemInfo,
  ReorderableListReorderEvent,
  ReorderableListCellAnimations,
  reorderItems,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import Reanimated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ItemType, AddressItemData } from '../../models/itemTypes';
import ManageWalletsListItem, { WalletGroupComponent } from '../../components/ManageWalletsListItem';
import HighlightedText from '../../components/HighlightedText';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import ActionSheet from '../ActionSheet';
import presentAlert from '../../components/Alert';
import useScreenMenuActions from '../../hooks/useScreenMenuActions';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { isDesktop } from '../../blue_modules/environment';

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

const dragScaleSpring = {
  damping: 14,
  mass: 0.38,
  stiffness: 240,
  overshootClamping: false,
  restDisplacementThreshold: 0.0001,
};
const activeDragScale = 1.065;

const DragScaleDecorator: React.FC<React.PropsWithChildren<{ isSelected: boolean; reduceMotionEnabled: boolean }>> = ({
  children,
  isSelected,
  reduceMotionEnabled,
}) => {
  const liftAnim = useSharedValue(0);

  useEffect(() => {
    liftAnim.value = reduceMotionEnabled ? (isSelected ? 1 : 0) : withSpring(isSelected ? 1 : 0, dragScaleSpring);
  }, [isSelected, liftAnim, reduceMotionEnabled]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      zIndex: liftAnim.value > 0 ? 1 : 0,
      transform: [
        {
          scale: reduceMotionEnabled ? 1 : interpolate(liftAnim.value, [0, 1], [1, activeDragScale]),
        },
      ],
    };
  }, [reduceMotionEnabled]);

  return <Reanimated.View style={animatedStyle}>{children}</Reanimated.View>;
};

interface ReorderableRowProps {
  item: Item;
  dragEnabled: boolean;
  isSelected: boolean;
  reduceMotionEnabled: boolean;
  renderListItem: (item: Item, drag: (() => void) | undefined, isActive: boolean) => React.ReactElement;
}

const ReorderableRow: React.FC<ReorderableRowProps> = ({ item, dragEnabled, isSelected, reduceMotionEnabled, renderListItem }) => {
  const drag = useReorderableDrag();

  return (
    <DragScaleDecorator isSelected={isSelected} reduceMotionEnabled={reduceMotionEnabled}>
      {renderListItem(item, dragEnabled ? drag : undefined, false)}
    </DragScaleDecorator>
  );
};

const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
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

interface SetInitialDataAction {
  type: typeof SET_INITIAL_DATA;
  payload: { wallets: TWallet[]; txMetadata: TTXMetadata };
}

type Action = SetSearchQueryAction | SetInitialDataAction | SaveChangesAction;

interface State {
  isInitialized: boolean;
  searchQuery: string;
  walletsCopy: TWallet[]; // Copy used for display and filtering
  baselineWallets: TWallet[];
  txMetadata: TTXMetadata;
}

const initialState: State = {
  isInitialized: false,
  searchQuery: '',
  walletsCopy: [],
  baselineWallets: [],
  txMetadata: {},
};

const deepCopyWallets = (wallets: TWallet[]): TWallet[] => {
  return wallets.map(wallet => Object.assign(Object.create(Object.getPrototypeOf(wallet)), wallet));
};

const hasWalletChanges = (wallets: TWallet[], baselineWallets: TWallet[]): boolean => {
  if (wallets.length !== baselineWallets.length) return true;

  return wallets.some((wallet, index) => {
    const baselineWallet = baselineWallets[index];
    return (
      wallet.getID() !== baselineWallet.getID() ||
      Boolean(wallet.hideBalance) !== Boolean(baselineWallet.hideBalance) ||
      wallet.getPreferredBalanceUnit() !== baselineWallet.getPreferredBalanceUnit()
    );
  });
};

const reconcileWallets = (wallets: TWallet[], baselineWallets: TWallet[], persistedWallets: TWallet[]): TWallet[] => {
  if (!hasWalletChanges(wallets, baselineWallets)) return deepCopyWallets(persistedWallets);

  const localById = new Map(wallets.map(wallet => [wallet.getID(), wallet]));
  const baselineById = new Map(baselineWallets.map(wallet => [wallet.getID(), wallet]));
  const persistedCopies = deepCopyWallets(persistedWallets);
  const persistedById = new Map(persistedCopies.map(wallet => [wallet.getID(), wallet]));

  for (const persistedWallet of persistedCopies) {
    const localWallet = localById.get(persistedWallet.getID());
    const baselineWallet = baselineById.get(persistedWallet.getID());
    if (localWallet && baselineWallet && Boolean(localWallet.hideBalance) !== Boolean(baselineWallet.hideBalance)) {
      persistedWallet.hideBalance = localWallet.hideBalance;
    }
    if (localWallet && baselineWallet && localWallet.getPreferredBalanceUnit() !== baselineWallet.getPreferredBalanceUnit()) {
      persistedWallet.setPreferredBalanceUnit(localWallet.getPreferredBalanceUnit());
    }
  }

  const localOrderChanged = wallets.some((wallet, index) => wallet.getID() !== baselineWallets[index]?.getID());
  if (!localOrderChanged) return persistedCopies;

  const reconciled = wallets.map(wallet => persistedById.get(wallet.getID())).filter((wallet): wallet is TWallet => wallet !== undefined);
  const reconciledIds = new Set(reconciled.map(wallet => wallet.getID()));
  return [...reconciled, ...persistedCopies.filter(wallet => !reconciledIds.has(wallet.getID()))];
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case SET_INITIAL_DATA: {
      const baselineWallets = deepCopyWallets(action.payload.wallets);
      return {
        ...state,
        isInitialized: true,
        walletsCopy: state.isInitialized
          ? reconcileWallets(state.walletsCopy, state.baselineWallets, action.payload.wallets)
          : deepCopyWallets(action.payload.wallets),
        baselineWallets,
        txMetadata: action.payload.txMetadata,
      };
    }
    case SAVE_CHANGES: {
      return {
        ...state,
        walletsCopy: [...action.payload],
      };
    }
    default:
      throw new Error(`Unhandled action type: ${(action as Action).type}`);
  }
};

interface ManageWalletsProps {
  clearSearch: () => void;
  focusSearch: () => void;
  registerCloseHandler: (handler: () => void) => () => void;
  registerConfirmHandler: (handler: () => void | Promise<void>) => () => void;
  onUnsavedChangesChange: (hasUnsavedChanges: boolean) => void;
}

const ManageWallets: React.FC<ManageWalletsProps> = ({
  clearSearch,
  focusSearch,
  registerCloseHandler,
  registerConfirmHandler,
  onUnsavedChangesChange,
}) => {
  const { colors, dark } = useTheme();
  const { wallets: persistedWallets, saveToDisk, txMetadata } = useStorage();
  const { goBack, setParams, dispatch: dispatchNavigation } = useNavigation();
  const { params } = useRoute<RouteProp<DetailViewStackParamList, 'ManageWallets'>>();
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

  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const dragScale = useSharedValue(1);
  const reorderPanGesture = useMemo(() => Gesture.Pan().activateAfterLongPress(520), []);
  const reorderableCellAnimations = useMemo<ReorderableListCellAnimations>(
    () => ({ opacity: 1, transform: [{ scale: dragScale }] as ReorderableListCellAnimations['transform'] }),
    [dragScale],
  );
  const handleDragStart = useCallback(() => {
    'worklet';

    dragScale.value = reduceMotionEnabled ? 1 : withSpring(activeDragScale, dragScaleSpring);
    runOnJS(triggerHapticFeedback)(HapticFeedbackTypes.ImpactMedium);
  }, [dragScale, reduceMotionEnabled]);
  const handleDragEnd = useCallback(() => {
    'worklet';

    dragScale.value = reduceMotionEnabled ? 1 : withSpring(1, dragScaleSpring);
    runOnJS(triggerHapticFeedback)(HapticFeedbackTypes.ImpactLight);
  }, [dragScale, reduceMotionEnabled]);
  const openSwipeableRef = useRef<Swipeable | null>(null);
  const discardChangesAnchorRef = useRef<View>(null);
  const pendingRemovalActionRef = useRef<() => void>(goBack);
  const isSavingRef = useRef(false);
  const walletsCopyRef = useRef(state.walletsCopy);
  walletsCopyRef.current = state.walletsCopy;
  const [allowRemoval, setAllowRemoval] = useState(false);
  const [focusedWalletID, setFocusedWalletID] = useState<string | null>(null);
  const [rowClickMode, setRowClickMode] = useState<'navigate' | 'select'>('navigate');
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

  const hasUnsavedChanges = useMemo(() => {
    if (!state.isInitialized) return false;
    return hasWalletChanges(state.walletsCopy, state.baselineWallets);
  }, [state.baselineWallets, state.isInitialized, state.walletsCopy]);

  const persistChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return true;
    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    try {
      await saveToDisk(false, walletsCopyRef.current);
      return true;
    } catch {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [hasUnsavedChanges, saveToDisk]);

  useEffect(() => {
    onUnsavedChangesChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => () => onUnsavedChangesChange(false), [onUnsavedChangesChange]);

  const confirmChanges = useCallback(() => {
    if (!hasUnsavedChanges) return;
    const anchor = findNodeHandle(discardChangesAnchorRef.current) ?? undefined;
    presentAlert({
      title: loc.wallets.manage_wallets_confirm_title,
      message: loc.wallets.manage_wallets_confirm_message,
      anchor,
      hapticFeedback: HapticFeedbackTypes.NotificationWarning,
      buttons: [
        {
          text: loc._.cancel,
          style: 'cancel',
        },
        {
          text: loc._.yes,
          onPress: async () => {
            if (!(await persistChanges())) return;
            triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
            pendingRemovalActionRef.current = goBack;
            setAllowRemoval(true);
          },
        },
      ],
      options: { cancelable: true },
    });
  }, [goBack, hasUnsavedChanges, persistChanges]);

  const closeManageWallets = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    goBack();
  }, [goBack]);

  useEffect(() => registerConfirmHandler(confirmChanges), [confirmChanges, registerConfirmHandler]);

  useEffect(() => registerCloseHandler(closeManageWallets), [closeManageWallets, registerCloseHandler]);

  usePreventRemove(hasUnsavedChanges && !allowRemoval, ({ data }) => {
    const anchor = findNodeHandle(discardChangesAnchorRef.current) ?? 0;
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    ActionSheet.showActionSheetWithOptions(
      {
        options: [loc._.cancel, loc._.ok],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
        confirmButtonIndex: 1,
        anchor,
        title: loc._.discard_changes,
        message: loc._.discard_changes_explain,
      },
      buttonIndex => {
        if (buttonIndex !== 1) return;
        pendingRemovalActionRef.current = () => {
          dispatchNavigation(data.action);
        };
        setAllowRemoval(true);
      },
    );
  });

  useEffect(() => {
    if (allowRemoval) pendingRemovalActionRef.current();
  }, [allowRemoval]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const nativeSearchQuery = params?.searchQuery ?? '';
  const isSearchFocused = params?.isSearchFocused ?? false;
  const isSearchActive = nativeSearchQuery.length > 0 || isSearchFocused;

  useEffect(() => {
    debouncedSearch(nativeSearchQuery);
  }, [debouncedSearch, nativeSearchQuery]);

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
        ([_, metadata]) => typeof metadata.memo === 'string' && metadata.memo.toLowerCase().includes(lowerQuery),
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
  const isDragDisabled = state.walletsCopy.length <= 1 || isSearchActive;

  useEffect(() => {
    dispatch({
      type: SET_INITIAL_DATA,
      payload: { wallets: persistedWallets, txMetadata },
    });
  }, [persistedWallets, txMetadata]);

  useEffect(() => {
    if (state.searchQuery && listData.length === 0) {
      Animated.timing(noResultsOpacity, {
        toValue: 1,
        duration: reduceMotionEnabled ? 0 : 300,
        useNativeDriver: true,
      }).start();
    } else {
      noResultsOpacity.setValue(0);
    }
  }, [listData.length, state.searchQuery, noResultsOpacity, reduceMotionEnabled]);

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
      dispatchNavigation(
        StackActions.replace('WalletTransactions', {
          walletID: wallet.getID(),
          walletType: wallet.type,
        }),
      );
    },
    [dispatchNavigation],
  );

  const navigateToAddress = useCallback(
    (address: string) => {
      Keyboard.dismiss();
      dispatchNavigation(StackActions.replace('ReceiveDetails', { address }));
    },
    [dispatchNavigation],
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

      dispatch({ type: SAVE_CHANGES, payload: updatedWallets });
    },
    [state.walletsCopy],
  );

  const handleSetBalanceUnit = useCallback(
    (wallet: TWallet, unit: BitcoinUnit) => {
      const walletID = wallet.getID();
      const updatedWallets = deepCopyWallets(state.walletsCopy).map(w => {
        if (w.getID() === walletID) w.setPreferredBalanceUnit(unit);
        return w;
      });
      dispatch({ type: SAVE_CHANGES, payload: updatedWallets });
    },
    [state.walletsCopy],
  );

  const moveWallet = useCallback(
    (wallet: TWallet, offset: -1 | 1) => {
      const from = state.walletsCopy.findIndex(candidate => candidate.getID() === wallet.getID());
      const to = from + offset;
      if (from < 0 || to < 0 || to >= state.walletsCopy.length) return;

      const reorderedWallets = [...state.walletsCopy];
      const [movedWallet] = reorderedWallets.splice(from, 1);
      reorderedWallets.splice(to, 0, movedWallet);
      dispatch({ type: SAVE_CHANGES, payload: reorderedWallets });
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      AccessibilityInfo.announceForAccessibility(
        String(
          loc.formatString(loc.wallets.wallet_moved, {
            wallet: wallet.getLabel(),
            position: to + 1,
            total: reorderedWallets.length,
          }),
        ),
      );
    },
    [state.walletsCopy],
  );

  const focusedWallet = useMemo(
    () => state.walletsCopy.find(wallet => wallet.getID() === focusedWalletID),
    [focusedWalletID, state.walletsCopy],
  );
  const focusedWalletPosition = focusedWallet ? state.walletsCopy.findIndex(wallet => wallet.getID() === focusedWallet.getID()) : -1;
  const canUseWalletCommands = !isSearchActive;

  useEffect(() => {
    if (!canUseWalletCommands) setFocusedWalletID(null);
  }, [canUseWalletCommands]);

  const selectFocusedWallet = useCallback(
    (offset: -1 | 1) => {
      if (state.walletsCopy.length === 0) return;
      const currentPosition = focusedWalletPosition >= 0 ? focusedWalletPosition : offset > 0 ? -1 : state.walletsCopy.length;
      const nextPosition = Math.max(0, Math.min(state.walletsCopy.length - 1, currentPosition + offset));
      const nextWallet = state.walletsCopy[nextPosition];
      if (!nextWallet || nextPosition === currentPosition) return;
      setFocusedWalletID(nextWallet.getID());
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      AccessibilityInfo.announceForAccessibility(
        `${nextWallet.getLabel()}, ${String(
          loc.formatString(loc.wallets.wallet_position, {
            position: nextPosition + 1,
            total: state.walletsCopy.length,
          }),
        )}`,
      );
    },
    [focusedWalletPosition, state.walletsCopy],
  );

  const cancelSearchOrClose = useCallback(() => {
    if (isSearchActive) {
      clearSearch();
      setParams({ searchQuery: '', isSearchFocused: false });
      dispatch({ type: SET_SEARCH_QUERY, payload: '' });
      return;
    }
    closeManageWallets();
  }, [clearSearch, closeManageWallets, isSearchActive, setParams]);

  useScreenMenuActions({
    manageWalletSearch: focusSearch,
    manageWalletSave: hasUnsavedChanges ? confirmChanges : undefined,
    manageWalletClose: cancelSearchOrClose,
    manageWalletOpen: canUseWalletCommands && focusedWallet ? () => navigateToWallet(focusedWallet) : undefined,
    manageWalletSelectUp:
      canUseWalletCommands && state.walletsCopy.length > 0 && (!focusedWallet || focusedWalletPosition > 0)
        ? () => selectFocusedWallet(-1)
        : undefined,
    manageWalletSelectDown:
      canUseWalletCommands && state.walletsCopy.length > 0 && (!focusedWallet || focusedWalletPosition < state.walletsCopy.length - 1)
        ? () => selectFocusedWallet(1)
        : undefined,
    manageWalletSelectionMode: canUseWalletCommands
      ? () => setRowClickMode(mode => (mode === 'navigate' ? 'select' : 'navigate'))
      : undefined,
    manageWalletSelectionModeSelected: canUseWalletCommands && rowClickMode === 'select' ? () => {} : undefined,
    manageWalletMoveUp:
      focusedWallet && canUseWalletCommands && focusedWalletPosition > 0 ? () => moveWallet(focusedWallet, -1) : undefined,
    manageWalletMoveDown:
      focusedWallet && canUseWalletCommands && focusedWalletPosition < state.walletsCopy.length - 1
        ? () => moveWallet(focusedWallet, 1)
        : undefined,
  });

  const renderListItem = useCallback(
    (item: Item, drag: (() => void) | undefined, isActive: boolean) => {
      const compatibleState = {
        wallets: state.walletsCopy,
        searchQuery: state.searchQuery,
        isSearchFocused,
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
          isSwipeEnabled={!isSearchActive}
          handleToggleHideBalance={handleToggleHideBalance}
          handleSetBalanceUnit={handleSetBalanceUnit}
          moveWallet={moveWallet}
          state={compatibleState}
          navigateToWallet={navigateToWallet}
          navigateToAddress={navigateToAddress}
          renderHighlightedText={renderHighlightedText}
          isActive={isActive}
          isFocusedWallet={
            isDesktop && canUseWalletCommands && focusedWalletID === (item.type === ItemType.WalletSection ? item.data.getID() : undefined)
          }
          rowClickMode={rowClickMode}
          drag={isDragDisabled ? undefined : drag}
          openSwipeableRef={openSwipeableRef}
          walletPosition={
            item.type === ItemType.WalletSection ? state.walletsCopy.findIndex(wallet => wallet.getID() === item.data.getID()) : undefined
          }
          walletCount={state.walletsCopy.length}
          onWalletFocus={wallet => setFocusedWalletID(wallet.getID())}
        />
      );
    },
    [
      handleToggleHideBalance,
      handleSetBalanceUnit,
      moveWallet,
      state.walletsCopy,
      state.searchQuery,
      isSearchFocused,
      isSearchActive,
      navigateToWallet,
      navigateToAddress,
      renderHighlightedText,
      isDragDisabled,
      canUseWalletCommands,
      focusedWalletID,
      rowClickMode,
      setFocusedWalletID,
    ],
  );

  const renderDraggableItem = useCallback(
    ({ item }: ReorderableListRenderItemInfo<Item>) => {
      const isSelected =
        isDesktop &&
        canUseWalletCommands &&
        item.type === ItemType.WalletSection &&
        focusedWalletID !== null &&
        item.data.getID() === focusedWalletID;
      return (
        <ReorderableRow
          item={item}
          dragEnabled={!isDragDisabled}
          isSelected={isSelected}
          reduceMotionEnabled={reduceMotionEnabled}
          renderListItem={renderListItem}
        />
      );
    },
    [canUseWalletCommands, focusedWalletID, isDragDisabled, reduceMotionEnabled, renderListItem],
  );

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      if (isSearchActive || from === to) return;

      const currentWallets = walletsCopyRef.current;
      if (from < 0 || to < 0 || from >= currentWallets.length || to >= currentWallets.length) return;

      const reorderedWallets = reorderItems(currentWallets, from, to);
      dispatch({ type: SAVE_CHANGES, payload: reorderedWallets });
      const movedWallet = reorderedWallets[to];
      if (movedWallet) {
        AccessibilityInfo.announceForAccessibility(
          String(
            loc.formatString(loc.wallets.wallet_moved, {
              wallet: movedWallet.getLabel(),
              position: to + 1,
              total: reorderedWallets.length,
            }),
          ),
        );
      }
    },
    [isSearchActive],
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

  const listExtraData = useMemo(
    () => ({
      searchQuery: state.searchQuery,
      isSearchFocused,
    }),
    [isSearchFocused, state.searchQuery],
  );

  const ListEmptyComponent = useMemo(() => {
    if (!state.searchQuery) return null;
    return (
      <Animated.View style={[styles.noResultsContainer, { opacity: noResultsOpacity }]}>
        <Animated.Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.noResultsText, stylesHook.noResultsText]}>
          {loc.wallets.no_results_found}
        </Animated.Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.wallets.clear_search}
          testID="ManageWalletsClearSearchButton"
          style={({ pressed }) => [styles.clearSearchButton, stylesHook.clearSearchButton, pressed && styles.clearSearchButtonPressed]}
          android_ripple={{
            color: colors.buttonDisabledTextColor,
            borderless: false,
          }}
          onPress={() => {
            triggerHapticFeedback(HapticFeedbackTypes.Selection);
            clearSearch();
            setParams({ searchQuery: '', isSearchFocused: false });
            dispatch({ type: SET_SEARCH_QUERY, payload: '' });
          }}
        >
          <Text style={[styles.clearSearchText, { color: colors.buttonTextColor }]}>{loc.wallets.clear_search}</Text>
        </Pressable>
      </Animated.View>
    );
  }, [
    colors.buttonDisabledTextColor,
    colors.buttonTextColor,
    clearSearch,
    noResultsOpacity,
    setParams,
    state.searchQuery,
    stylesHook.clearSearchButton,
    stylesHook.noResultsText,
  ]);

  const listSharedProps = {
    data: listData,
    keyExtractor,
    extraData: listExtraData,
    ListEmptyComponent,
    automaticallyAdjustContentInsets: true,
    contentInsetAdjustmentBehavior: 'automatic' as const,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    accessibilityRole: 'list' as const,
    accessibilityLabel: loc.wallets.manage_title,
  };

  return (
    <View ref={discardChangesAnchorRef} style={styles.root} collapsable={false}>
      <SafeAreaView style={[{ backgroundColor: colors.background }, styles.safeArea]} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.gestureRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GestureHandlerRootView style={styles.gestureRoot}>
            <ReorderableList<Item>
              {...listSharedProps}
              testID="ManageWalletsList"
              renderItem={renderDraggableItem}
              style={styles.listContainer}
              dragEnabled={!isDragDisabled}
              panGesture={reorderPanGesture}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onReorder={handleReorder}
              autoscrollThreshold={0.12}
              autoscrollSpeedScale={0.8}
              animationDuration={reduceMotionEnabled ? 0 : 260}
              cellAnimations={reorderableCellAnimations}
            />
          </GestureHandlerRootView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default React.memo(ManageWallets);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    overflow: 'hidden',
  },
  gestureRoot: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  clearSearchButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    minHeight: 44,
    cursor: 'pointer',
  },
  clearSearchButtonPressed: {
    opacity: 0.85,
  },
  clearSearchText: {
    fontWeight: '600',
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
  searchHighlightDark: {
    backgroundColor: 'rgba(255, 245, 192, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
