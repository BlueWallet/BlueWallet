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
  Easing,
  View,
  Dimensions,
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

// Add these new types and constants for animation state management
type AnimationState = {
  isDragging: boolean;
  activeItemId: string | null;
  isResettingAnimations: boolean;
  animationsRunning: boolean;
};

type AnimationAction =
  | { type: 'START_DRAG'; payload: { itemId: string | null } }
  | { type: 'END_DRAG' }
  | { type: 'START_ANIMATIONS' }
  | { type: 'END_ANIMATIONS' }
  | { type: 'START_RESET' }
  | { type: 'END_RESET' };

const initialAnimationState: AnimationState = {
  isDragging: false,
  activeItemId: null,
  isResettingAnimations: false,
  animationsRunning: false,
};

function animationReducer(state: AnimationState, action: AnimationAction): AnimationState {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        activeItemId: action.payload.itemId,
      };
    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        activeItemId: null,
      };
    case 'START_ANIMATIONS':
      return {
        ...state,
        animationsRunning: true,
      };
    case 'END_ANIMATIONS':
      return {
        ...state,
        animationsRunning: false,
      };
    case 'START_RESET':
      return {
        ...state,
        isResettingAnimations: true,
      };
    case 'END_RESET':
      return {
        ...state,
        isResettingAnimations: false,
      };
    default:
      return state;
  }
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
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [navigationAttemptTarget, setNavigationAttemptTarget] = useState<{ wallet: TWallet; attempted: boolean } | null>(null);

  // Replace multiple state variables and refs with a single useReducer
  const [animState, animDispatch] = useReducer(animationReducer, initialAnimationState);

  // Keep the animation values as useRefs for better performance
  const contentWidthAnim = useRef(new Animated.Value(1)).current;
  const contentMarginHorizontalAnim = useRef(new Animated.Value(0)).current;
  const contentVerticalOffsetAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(1)).current;

  // Add the missing listRef declaration
  const listRef = useRef<FlatList<Item> | null>(null);

  // Add the missing hasStartedDrag reference
  const hasStartedDrag = useRef(false);

  // Track active item to handle vertical centering
  const activeItemRef = useRef<View | null>(null);
  const listContainerRef = useRef<View | null>(null);

  const screenDimensions = useRef({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  // Track dimensions changes
  useEffect(() => {
    const updateDimensions = () => {
      screenDimensions.current = {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      };
    };

    const dimensionListener = Dimensions.addEventListener('change', updateDimensions);
    return () => {
      dimensionListener.remove();
    };
  }, []);

  // Watch for search state changes and reset drag UI if needed
  useEffect(() => {
    // If search is active or has text, reset the drag UI to default state
    if (state.isSearchFocused || state.searchQuery.length > 0) {
      // Only reset if we're in drag mode
      if (animState.isDragging || animState.activeItemId !== null) {
        // Reset state
        animDispatch({ type: 'START_RESET' });
        animDispatch({ type: 'END_DRAG' });

        // Reset animations
        contentScaleAnim.setValue(1);
        contentWidthAnim.setValue(1);
        contentMarginHorizontalAnim.setValue(0);
        contentVerticalOffsetAnim.setValue(0);

        // Clear info
        setCurrentDragInfo(null);
        hasStartedDrag.current = false;
      }
    }
  }, [
    state.isSearchFocused,
    state.searchQuery,
    animState.isDragging,
    animState.activeItemId,
    contentScaleAnim,
    contentWidthAnim,
    contentMarginHorizontalAnim,
    contentVerticalOffsetAnim,
  ]);

  // Refactored animation system using the reducer
  const startDragAnimations = useCallback(() => {
    // Don't start drag animations if search is active or has text
    if (state.isSearchFocused || state.searchQuery.length > 0 || animState.animationsRunning || animState.isResettingAnimations) return;

    animDispatch({ type: 'START_ANIMATIONS' });

    const verticalOffset = -screenDimensions.current.height * 0.2;

    // Stop any ongoing animations
    contentWidthAnim.stopAnimation();
    contentMarginHorizontalAnim.stopAnimation();
    contentVerticalOffsetAnim.stopAnimation();
    contentScaleAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(contentScaleAnim, {
        toValue: 0.97,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentWidthAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentMarginHorizontalAnim, {
        toValue: 10,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentVerticalOffsetAnim, {
        toValue: verticalOffset,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(({ finished }) => {
      if (finished) {
        animDispatch({ type: 'END_ANIMATIONS' });
      }
    });
  }, [
    state.isSearchFocused,
    state.searchQuery,
    animState.animationsRunning,
    animState.isResettingAnimations,
    contentScaleAnim,
    contentWidthAnim,
    contentMarginHorizontalAnim,
    contentVerticalOffsetAnim,
  ]);

  const resetDragAnimations = useCallback(() => {
    if (animState.animationsRunning) return;

    animDispatch({ type: 'START_RESET' });
    animDispatch({ type: 'START_ANIMATIONS' });

    // Stop any ongoing animations first
    contentWidthAnim.stopAnimation();
    contentMarginHorizontalAnim.stopAnimation();
    contentVerticalOffsetAnim.stopAnimation();
    contentScaleAnim.stopAnimation();

    // Set values immediately to avoid flicker
    contentWidthAnim.setValue(1);
    contentMarginHorizontalAnim.setValue(0);
    contentVerticalOffsetAnim.setValue(0);
    contentScaleAnim.setValue(1);

    Animated.parallel([
      Animated.timing(contentScaleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentWidthAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentMarginHorizontalAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentVerticalOffsetAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(({ finished }) => {
      if (finished) {
        animDispatch({ type: 'END_ANIMATIONS' });
        animDispatch({ type: 'END_RESET' });
      }
    });
  }, [animState.animationsRunning, contentScaleAnim, contentWidthAnim, contentMarginHorizontalAnim, contentVerticalOffsetAnim]);

  // Watch for state changes and trigger animations appropriately
  useEffect(() => {
    if ((animState.isDragging || animState.activeItemId !== null) && !animState.isResettingAnimations) {
      startDragAnimations();
    } else if (!animState.isDragging && !animState.activeItemId && animState.isResettingAnimations) {
      resetDragAnimations();
    }
  }, [animState.isDragging, animState.activeItemId, animState.isResettingAnimations, startDragAnimations, resetDragAnimations]);

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
      {
        text: loc._.cancel,
        style: 'cancel',
        onPress: () => {
          // Reset any navigation attempt tracking when back navigation is cancelled
          setNavigationAttemptTarget(null);
        },
      },
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

  // Add a helper function to handle unsaved changes confirmation
  const confirmNavigationWithUnsavedChanges = useCallback(
    (wallet: TWallet, navigationAction: () => void) => {
      // Check if we already attempted navigation to this wallet
      const isSameWallet = navigationAttemptTarget?.wallet && navigationAttemptTarget.wallet.getID() === wallet.getID();

      if (hasUnsavedChanges && (!navigationAttemptTarget || !isSameWallet)) {
        // Set the navigation target for tracking
        setNavigationAttemptTarget({ wallet, attempted: true });

        Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
          {
            text: loc._.cancel,
            style: 'cancel',
            onPress: () => {
              // Reset the navigation target to ensure future attempts will trigger the alert
              setNavigationAttemptTarget(null);
            },
          },
          {
            text: loc._.ok,
            style: 'destructive',
            onPress: () => {
              // Proceed with navigation
              navigationAction();
            },
          },
        ]);
      } else {
        // No unsaved changes or we already attempted navigation to this wallet, proceed with navigation
        navigationAction();
      }
    },
    [hasUnsavedChanges, navigationAttemptTarget],
  );

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      const walletID = wallet.getID();

      // Use the confirmation helper before navigating
      confirmNavigationWithUnsavedChanges(wallet, () => {
        goBack();
        navigate('WalletTransactions', {
          walletID,
          walletType: wallet.type,
        });
      });
    },
    [goBack, navigate, confirmNavigationWithUnsavedChanges],
  );

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
    // Always reset navigation attempt tracking when closing
    setNavigationAttemptTarget(null);
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

  // Use an effect to handle active item tracking instead of doing it in render
  const [currentDragInfo, setCurrentDragInfo] = useState<{ item: Item; isActive: boolean } | null>(null);

  // When drag info changes, update the activeItemId
  useEffect(() => {
    if (currentDragInfo) {
      const { item, isActive } = currentDragInfo;
      if (isActive && item.type === ItemType.WalletSection) {
        // Update through reducer instead of direct state
        animDispatch({ type: 'START_DRAG', payload: { itemId: item.data.getID() } });
      }
    }
  }, [currentDragInfo]);

  // Modified animatedContainerStyle to use the reducer state
  const animatedContainerStyle = useMemo(() => {
    const centered = animState.isDragging || animState.activeItemId !== null;

    // Define default style that will be applied both in normal and drag states
    const baseStyle = {
      width: contentWidthAnim.interpolate({
        inputRange: [0.9, 1],
        outputRange: ['90%', '100%'],
      }),
      alignSelf: 'center' as const,
      marginHorizontal: contentMarginHorizontalAnim,
      flex: 1,
    };

    // Apply transforms only during drag state to ensure clean reset
    if (centered) {
      return {
        ...baseStyle,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        transform: [{ scale: contentScaleAnim }, { translateY: contentVerticalOffsetAnim }],
      };
    }

    // When not dragging, use a clean style with no transforms for more reliable reset
    return {
      ...baseStyle,
      transform: [{ scale: 1 }, { translateY: 0 }], // Explicitly set default transform values
    };
  }, [
    contentWidthAnim,
    contentMarginHorizontalAnim,
    contentVerticalOffsetAnim,
    contentScaleAnim,
    animState.isDragging,
    animState.activeItemId,
  ]);

  // Modified handleDragBegin to use the reducer
  const handleDragBegin = useCallback(() => {
    // Don't start drag if search is active - early return instead of conditional
    if (state.isSearchFocused || state.searchQuery.length > 0) {
      return;
    }

    if (!hasStartedDrag.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
      hasStartedDrag.current = true;
    }

    // Dispatch to update drag state
    animDispatch({ type: 'START_DRAG', payload: { itemId: animState.activeItemId } });

    // Reset animations explicitly when drag begins to ensure clean state
    contentScaleAnim.setValue(1);

    // Start animation sequence
    startDragAnimations();
  }, [state.isSearchFocused, state.searchQuery, animState.activeItemId, contentScaleAnim, startDragAnimations]);

  // Modified handleDragEnd to use the reducer
  const handleDragEnd = useCallback(() => {
    // Start the reset process
    animDispatch({ type: 'START_RESET' });

    // First ensure animated values are immediately reset to avoid visible glitch
    contentScaleAnim.setValue(1);
    contentWidthAnim.setValue(1);
    contentMarginHorizontalAnim.setValue(0);
    contentVerticalOffsetAnim.setValue(0);

    // Update React state to reflect end of drag
    setCurrentDragInfo(null);

    // End the drag state
    animDispatch({ type: 'END_DRAG' });

    // Then run the reset animations for smooth visual transition
    resetDragAnimations();

    // Reset drag flags
    hasStartedDrag.current = false;
  }, [resetDragAnimations, contentScaleAnim, contentWidthAnim, contentMarginHorizontalAnim, contentVerticalOffsetAnim]);

  // Update renderItem to handle drag disabling in the item renderer
  const renderItem = useCallback(
    (info: DragListRenderItemInfo<Item>) => {
      const { item, onDragStart, isActive } = info;

      // Create modified drag handler that respects search state
      const handleDragStart =
        state.isSearchFocused || state.searchQuery.length > 0
          ? undefined // Passing undefined prevents dragging
          : onDragStart;

      // Update drag info immediately without setTimeout to prevent delays
      if (isActive && item.type === ItemType.WalletSection) {
        // Use the item ID from the current active item
        if (animState.activeItemId !== item.data.getID()) {
          // Use requestAnimationFrame instead of setTimeout for smoother state updates
          requestAnimationFrame(() => {
            // Update through reducer instead of direct state setter
            animDispatch({ type: 'START_DRAG', payload: { itemId: item.data.getID() } });
            setCurrentDragInfo({ item, isActive });
          });
        }
      }

      const compatibleState = {
        wallets: state.availableWallets,
        searchQuery: state.searchQuery,
      };

      // Skip rendering updates for items not being dragged during active drag operations
      if (
        (animState.isDragging || animState.activeItemId !== null) &&
        !isActive &&
        item.type === ItemType.WalletSection &&
        animState.activeItemId !== item.data.getID()
      ) {
        return (
          <ManageWalletsListItem
            item={item}
            onPressIn={undefined}
            onPressOut={undefined}
            isDraggingDisabled={true}
            state={compatibleState}
            navigateToWallet={navigateToWallet}
            renderHighlightedText={renderHighlightedText}
            handleDeleteWallet={handleDeleteWallet}
            handleToggleHideBalance={handleToggleHideBalance}
            isActive={false}
            globalDragActive={animState.isDragging || animState.activeItemId !== null}
            optimization="high"
          />
        );
      }

      return (
        <View ref={isActive ? activeItemRef : null}>
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
            globalDragActive={animState.isDragging || animState.activeItemId !== null}
            drag={handleDragStart}
          />
        </View>
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
      animState.isDragging,
      animState.activeItemId,
      animDispatch,
    ],
  );

  const onReordered = useCallback(
    (fromIndex: number, toIndex: number) => {
      // Skip updating if indexes are the same to prevent unnecessary re-renders
      if (fromIndex === toIndex) return;

      const updatedOrder = [...state.currentWalletsOrder];
      const removed = updatedOrder.splice(fromIndex, 1);
      updatedOrder.splice(toIndex, 0, removed[0]);

      // Use requestAnimationFrame to ensure UI updates are batched properly
      requestAnimationFrame(() => {
        dispatch({ type: SET_TEMP_ORDER, payload: updatedOrder });
      });
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
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
        <>
          {renderHeader}
          <View ref={listContainerRef} style={styles.containerFlex}>
            <Animated.View style={animatedContainerStyle}>
              <DragList
                data={uiData}
                keyExtractor={keyExtractor}
                onReordered={onReordered}
                renderItem={renderItem}
                automaticallyAdjustContentInsets
                contentInsetAdjustmentBehavior="automatic"
                automaticallyAdjustKeyboardInsets
                automaticallyAdjustsScrollIndicatorInsets
                ref={listRef}
                onDragBegin={handleDragBegin}
                onDragEnd={handleDragEnd}
                contentContainerStyle={styles.dragListContent}
                containerStyle={styles.dragListContainer}
              />
            </Animated.View>
          </View>
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
  containerFlex: {
    flex: 1,
    // Add justifyContent for better vertical centering during drag
    justifyContent: 'center',
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
  dragListContent: {
    // Make drag list content fill the container for better centering
    flexGrow: 1,
    justifyContent: 'center',
  },
  dragListContainer: {
    flex: 1,
  },
});
