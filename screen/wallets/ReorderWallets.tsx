import React, { useEffect, useLayoutEffect, useRef, useReducer, useCallback } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
// @ts-ignore: fix later
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';

// Action Types
const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
const SET_IS_SEARCH_FOCUSED = 'SET_IS_SEARCH_FOCUSED';
const SET_WALLET_DATA = 'SET_WALLET_DATA';

// Action Interfaces
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
  payload: any[];
}

type Action = SetSearchQueryAction | SetIsSearchFocusedAction | SetWalletDataAction;

// State Interface
interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  walletData: any[];
}

// Initial State
const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  walletData: [],
};

// Reducer
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case SET_IS_SEARCH_FOCUSED:
      return { ...state, isSearchFocused: action.payload };
    case SET_WALLET_DATA:
      return { ...state, walletData: action.payload };
    default:
      return state;
  }
};

const ReorderWallets: React.FC = () => {
  const sortableList = useRef(null);
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useStorage();
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
  };

  useEffect(() => {
    dispatch({ type: SET_WALLET_DATA, payload: wallets });
  }, [wallets]);

  useEffect(() => {
    setOptions({
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
    });
  }, [colorScheme, setOptions]);

  useEffect(() => {
    const filteredWallets = wallets.filter(wallet => wallet.getLabel().toLowerCase().includes(state.searchQuery.toLowerCase()));
    dispatch({ type: SET_WALLET_DATA, payload: filteredWallets });
  }, [wallets, state.searchQuery]);

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        hideWhenScrolling: false,
        onChangeText: (event: { nativeEvent: { text: any } }) => dispatch({ type: SET_SEARCH_QUERY, payload: event.nativeEvent.text }),
        onClear: () => dispatch({ type: SET_SEARCH_QUERY, payload: '' }),
        onFocus: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: true }),
        onBlur: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false }),
        placeholder: loc.wallets.search_wallets,
      },
    });
  }, [setOptions]);

  const navigateToWallet = useCallback(
    (wallet: any) => {
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

  const renderItem = useCallback(
    ({ item, drag, isActive }: any) => {
      const itemOpacity = isActive ? 1 : 0.5;

      return (
        <ScaleDecorator>
          <WalletCarouselItem
            item={item}
            handleLongPress={isDraggingDisabled ? null : drag}
            isActive={isActive}
            onPress={navigateToWallet}
            customStyle={StyleSheet.flatten([styles.padding16, { opacity: itemOpacity }])}
          />
        </ScaleDecorator>
      );
    },
    [isDraggingDisabled, navigateToWallet],
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

  const onDragEnd = useCallback(
    ({ data }: any) => {
      setWalletsWithNewOrder(data);
      dispatch({ type: SET_WALLET_DATA, payload: data });
    },
    [setWalletsWithNewOrder],
  );

  const _keyExtractor = useCallback((_item: any, index: number) => index.toString(), []);

  return (
    <GestureHandlerRootView style={[styles.root, stylesHook.root]}>
      <DraggableFlatList
        ref={sortableList}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        data={state.walletData}
        keyExtractor={_keyExtractor}
        renderItem={renderItem}
        onChangeOrder={onChangeOrder}
        onDragBegin={onDragBegin}
        onRelease={onRelease}
        onDragEnd={onDragEnd}
        containerStyle={styles.root}
      />
    </GestureHandlerRootView>
  );
};

export default ReorderWallets;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding16: {
    padding: 16,
  },
});
