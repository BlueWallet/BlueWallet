/**
 * Manage wallets, in the settings style: a search over wallets, their
 * addresses, transactions and memos; each wallet as a card with its kind,
 * network and balance, an eye to hide that balance, and a long press to move
 * it. "Save" shows up at the bottom once something changed; leaving with
 * changes asks first.
 */
import React, { useEffect, useReducer, useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePreventRemove } from '@react-navigation/native';
import DraggableFlatList, { DragEndParams, RenderItemParams } from 'react-native-draggable-flatlist';

import { splitShortenedAmount } from '../../blue_modules/neurai/amounts';
import { isTestnetChain } from '../../blue_modules/neurai/networkConfig';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { TTXMetadata } from '../../class/blue-app';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { ExtendedTransaction, Transaction, TWallet } from '../../class/wallets/types';
import { AddressRow } from '../../components/addresses/AddressRow';
import { ConnectFooter } from '../../components/ConnectUI';
import HighlightedText from '../../components/HighlightedText';
import { HOME_MAX_DECIMALS, walletKindIcon, walletKindLabel } from '../../components/home/homeTheme';
import { TransactionDayCard, transactionDayKey } from '../../components/home/TransactionDayList';
import Icon from '../../components/Icon';
import { SettingsCard, SettingsScreenHeader, SettingsSearchField, useSettingsPalette } from '../../components/settings/SettingsUI';
import { groupTransactionsIntoDays } from '../../helpers/group-transactions-by-day';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { ItemType, AddressItemData } from '../../models/itemTypes';
import { XnaUnit } from '../../models/xnaUnits';
import { appAlert } from '../../components/AppDialog';

interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction;
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

const networkOf = (wallet: TWallet): string =>
  isNeuraiWallet(wallet) && isTestnetChain(wallet.network) ? loc.wallets.neurai_network_testnet : loc.wallets.neurai_network_mainnet;

/** A wallet's balance on its card: XNA, at most HOME_MAX_DECIMALS decimals. */
const balanceParts = (wallet: TWallet): [string, string] => {
  const [integer, decimals] = splitShortenedAmount(
    formatBalanceWithoutSuffix(wallet.getBalance() ?? 0n, XnaUnit.XNA, true),
    HOME_MAX_DECIMALS,
  );
  return [integer, decimals];
};

interface WalletCardProps {
  wallet: TWallet;
  search: string;
  onOpen: (wallet: TWallet) => void;
  onToggleHidden?: (wallet: TWallet) => void;
  /** Starts moving the card (a long press); absent while searching. */
  drag?: () => void;
  active?: boolean;
}

/** One wallet: its kind, name, network and balance, the eye that hides the balance and, when it can move, the handle. */
const WalletCard: React.FC<WalletCardProps> = ({ wallet, search, onOpen, onToggleHidden, drag, active }) => {
  const p = useSettingsPalette();
  const label = wallet.getLabel();
  const hidden = !!wallet.hideBalance;
  const [integer, decimals] = balanceParts(wallet);
  return (
    <Pressable
      onPress={() => onOpen(wallet)}
      onLongPress={drag}
      delayLongPress={250}
      disabled={active}
      accessibilityRole="button"
      accessibilityLabel={String(loc.formatString(loc.home.open_wallet, { name: label }))}
      accessibilityHint={drag ? loc.wallets.manage_move_hint : undefined}
      testID={`ManageWallet-${label}`}
      style={({ pressed }) => [
        styles.walletCard,
        { backgroundColor: p.card },
        active && [styles.walletActive, { shadowColor: p.shadow }],
        pressed && !active && styles.pressed,
      ]}
    >
      <View style={[styles.walletIcon, { backgroundColor: p.accentSoft }]}>
        <Icon name={walletKindIcon(wallet)} type="material" size={20} color={p.accentText} />
      </View>
      <View style={styles.walletTexts}>
        {search ? (
          <HighlightedText text={label} query={search} caseSensitive={false} style={[styles.walletName, { color: p.ink }]} />
        ) : (
          <Text style={[styles.walletName, { color: p.ink }]} numberOfLines={1}>
            {label}
          </Text>
        )}
        <Text style={[styles.walletKind, { color: p.mutedOnCard }]} numberOfLines={1}>
          {walletKindLabel(wallet)} · {networkOf(wallet)}
        </Text>
      </View>
      <View style={styles.walletBalance}>
        <Text style={[styles.walletAmount, { color: p.ink }]} numberOfLines={1}>
          {hidden ? '••••' : integer}
          {!hidden && decimals ? <Text style={[styles.walletDecimals, { color: p.mutedOnCard }]}>{decimals}</Text> : null}
        </Text>
        <Text style={[styles.walletUnit, { color: p.mutedOnCard }]}>XNA</Text>
      </View>
      {onToggleHidden ? (
        <Pressable
          onPress={() => onToggleHidden(wallet)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={hidden ? loc.transactions.details_balance_show : loc.transactions.details_balance_hide}
          testID={`ManageWalletHide-${label}`}
          style={({ pressed }) => [styles.eye, { backgroundColor: p.ground }, pressed && styles.pressed]}
        >
          <Icon name={hidden ? 'visibility-off' : 'visibility'} type="material" size={18} color={p.mutedOnCard} />
        </Pressable>
      ) : null}
      {drag ? <Icon name="drag-indicator" type="material" size={20} color={p.mutedOnCard} /> : null}
    </Pressable>
  );
};

interface WalletMatchesProps {
  wallet: TWallet;
  transactions: TransactionItem[];
  addresses: AddressItem[];
  search: string;
  onOpen: (wallet: TWallet) => void;
  onOpenAddress: (address: Omit<AddressItemData, 'label'>) => void;
}

/** A wallet found by its addresses or transactions: its card, then what matched. */
const WalletMatches: React.FC<WalletMatchesProps> = ({ wallet, transactions, addresses, search, onOpen, onOpenAddress }) => {
  const days = useMemo(
    () =>
      groupTransactionsIntoDays(
        transactions.map(item => item.data as Transaction),
        { pending: loc.transactions.pending, today: loc.transactions.date_today, yesterday: loc.transactions.date_yesterday },
      ),
    [transactions],
  );
  const neurai = isNeuraiWallet(wallet) ? wallet : undefined;
  return (
    <View style={styles.group}>
      <WalletCard wallet={wallet} search={search} onOpen={onOpen} />
      {addresses.length > 0 ? (
        <SettingsCard>
          {addresses.map((item, index) => (
            <AddressRow
              key={item.data.address}
              address={item.data.address}
              index={item.data.index}
              used={!!neurai?.isAddressUsed(item.data.address)}
              onPress={() => onOpenAddress(item.data)}
              search={search}
              divider={index > 0}
            />
          ))}
        </SettingsCard>
      ) : null}
      {days.map(day => (
        <TransactionDayCard key={transactionDayKey(day)} day={day} unit={wallet.getPreferredBalanceUnit()} walletID={wallet.getID()} />
      ))}
    </View>
  );
};

const ManageWallets: React.FC = () => {
  const p = useSettingsPalette();
  const { wallets: persistedWallets, setWalletsWithNewOrder, txMetadata } = useStorage();
  const initialWalletsRef = useRef<TWallet[]>(deepCopyWallets(persistedWallets));
  const { navigate, goBack, dispatch: navigationDispatch } = useExtendedNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);

  const [dragging, setDragging] = useState(false);
  const [dragSnapshot, setDragSnapshot] = useState<Item[] | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const pendingNavigationRef = useRef<{ walletID: string; walletType: string } | null>(null);

  const getFilteredWalletsData = useCallback(
    (search: string, walletsSource: TWallet[], metadataSource: TTXMetadata): Item[] => {
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
                        data: tx as ExtendedTransaction,
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
                        data: tx as ExtendedTransaction,
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
    },
    [state.managedWalletsData],
  );

  const listData = useMemo(
    () => getFilteredWalletsData(state.searchQuery, state.walletsCopy, state.txMetadata),
    [getFilteredWalletsData, state.searchQuery, state.walletsCopy, state.txMetadata],
  );
  const isDragDisabled = state.walletsCopy.length <= 1 || state.searchQuery.length > 0 || state.isSearchFocused;

  useEffect(() => {
    dispatch({ type: SET_INITIAL_DATA, payload: { wallets: initialWalletsRef.current, txMetadata } });
  }, [txMetadata]);

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

  usePreventRemove(
    hasUnsavedChanges && !saveInProgress,
    useCallback(
      ({ data: preventRemoveData }) => {
        appAlert(loc._.discard_changes, loc._.discard_changes_explain, [
          {
            text: loc._.cancel,
            style: 'cancel',
            onPress: () => {
              pendingNavigationRef.current = null;
            },
          },
          {
            text: loc._.ok,
            style: 'destructive',
            onPress: () => {
              navigationDispatch(preventRemoveData.action);

              const pending = pendingNavigationRef.current;
              pendingNavigationRef.current = null;

              if (pending) {
                setTimeout(() => {
                  navigate('WalletTransactions', {
                    walletID: pending.walletID,
                    walletType: pending.walletType,
                  });
                }, 0);
              }
            },
          },
        ]);
      },
      [navigationDispatch, navigate],
    ),
  );

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

  const clearSearch = useCallback(() => {
    dispatch({ type: SET_SEARCH_QUERY, payload: '' });
    dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false });
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
      if (hasUnsavedChanges && !saveInProgress) {
        pendingNavigationRef.current = { walletID, walletType: wallet.type };
        goBack();
        return;
      }

      goBack();
      setTimeout(() => {
        navigate('WalletTransactions', {
          walletID,
          walletType: wallet.type,
        });
      }, 0);
    },
    [navigate, goBack, hasUnsavedChanges, saveInProgress],
  );

  const navigateToAddress = useCallback(
    (item: Omit<AddressItemData, 'label'>) => {
      Keyboard.dismiss();
      navigate('AddressDetails', { walletID: item.walletID, address: item.address, index: item.index, change: item.isInternal });
    },
    [navigate],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Item>) => {
      if (item.type === ItemType.WalletGroupSection) {
        return (
          <WalletMatches
            wallet={item.wallet}
            transactions={item.transactions}
            addresses={item.addresses}
            search={state.searchQuery}
            onOpen={navigateToWallet}
            onOpenAddress={navigateToAddress}
          />
        );
      }
      if (item.type !== ItemType.WalletSection) return null;
      return (
        <WalletCard
          wallet={item.data}
          search={state.searchQuery}
          onOpen={navigateToWallet}
          onToggleHidden={state.searchQuery ? undefined : handleToggleHideBalance}
          drag={isDragDisabled ? undefined : drag}
          active={isActive}
        />
      );
    },
    [state.searchQuery, navigateToWallet, navigateToAddress, handleToggleHideBalance, isDragDisabled],
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

  const renderData = dragSnapshot ?? listData;
  const listExtraData = useMemo(
    () => ({ searchQuery: state.searchQuery, isSearchFocused: state.isSearchFocused }),
    [state.searchQuery, state.isSearchFocused],
  );

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="ManageWallets">
      <SettingsScreenHeader title={loc.wallets.manage_title} onBack={goBack} icon="close" iconLabel={loc._.close} />
      <View style={styles.search}>
        <SettingsSearchField
          value={state.searchQuery}
          onChangeText={text => dispatch({ type: SET_SEARCH_QUERY, payload: text })}
          placeholder={loc.wallets.manage_wallets_search_placeholder}
          testID="ManageWalletsSearch"
        />
        {!state.searchQuery && state.walletsCopy.length > 1 ? (
          <Text style={[styles.hint, { color: p.muted }]}>{loc.wallets.manage_move_hint}</Text>
        ) : null}
      </View>
      <GestureHandlerRootView style={styles.flex}>
        {state.searchQuery && renderData.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: p.muted }]}>{loc.wallets.no_results_found}</Text>
            <Pressable
              onPress={clearSearch}
              accessibilityRole="button"
              style={({ pressed }) => [styles.clear, { backgroundColor: p.card }, pressed && styles.pressed]}
            >
              <Text style={[styles.clearText, { color: p.accentText }]}>{loc.wallets.manage_clear_search}</Text>
            </Pressable>
          </View>
        ) : (
          <DraggableFlatList
            data={renderData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onDragBegin={() => {
              if (!dragSnapshot) {
                setDragSnapshot([...listData]);
              }
              setDragging(true);
              triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
            }}
            onDragEnd={({ from, to, data }: DragEndParams<Item>) => {
              setDragging(false);
              setDragSnapshot(data);

              if (state.searchQuery.length > 0 || state.isSearchFocused) {
                return;
              }

              if (from === to) {
                return;
              }

              dispatch({ type: SET_MANAGED_DATA, payload: data });
              triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);

              // Clear snapshot after state has re-rendered with new order.
              setTimeout(() => {
                setDragSnapshot(null);
              }, 0);
            }}
            containerStyle={styles.flex}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            activationDistance={8}
            autoscrollThreshold={32}
            autoscrollSpeed={16}
            dragItemOverflow
            animationConfig={{ damping: 26, mass: 0.6, stiffness: 260, overshootClamping: true }}
            disableVirtualization={dragging}
            extraData={listExtraData}
          />
        )}
      </GestureHandlerRootView>
      {hasUnsavedChanges ? (
        <ConnectFooter
          primary={{ title: loc.wallets.manage_save, onPress: handleClose, disabled: saveInProgress, testID: 'ManageWalletsSave' }}
        />
      ) : null}
    </View>
  );
};

export default React.memo(ManageWallets);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  search: { paddingHorizontal: 16, paddingBottom: 12, rowGap: 8 },
  hint: { fontSize: 12, marginHorizontal: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  group: { rowGap: 8, marginBottom: 16 },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    minHeight: 72,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  walletActive: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 8 },
  walletIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletTexts: { flex: 1, rowGap: 2 },
  walletName: { fontSize: 15, fontWeight: '600' },
  walletKind: { fontSize: 12 },
  walletBalance: { alignItems: 'flex-end' },
  walletAmount: { fontSize: 15, fontWeight: '700' },
  walletDecimals: { fontSize: 13, fontWeight: '600' },
  walletUnit: { fontSize: 11, fontWeight: '600' },
  eye: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, rowGap: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  clear: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  clearText: { fontSize: 14, fontWeight: '600' },
});
