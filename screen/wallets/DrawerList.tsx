import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useReducer } from 'react';
import { StyleSheet, LayoutAnimation, FlatList, ViewStyle, InteractionManager } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useIsFocused, NavigationProp, ParamListBase } from '@react-navigation/native';
import { BlueHeaderDefaultMain } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { TWallet } from '../../class/wallets/types';

enum WalletActionType {
  SetWallets = 'SET_WALLETS',
  SelectWallet = 'SELECT_WALLET',
  SetFocus = 'SET_FOCUS',
  Navigate = 'NAVIGATE',
}

interface WalletState {
  wallets: TWallet[];
  selectedWalletID: string | null;
  isFocused: boolean;
}

interface SelectWalletAction {
  type: WalletActionType.SelectWallet;
  walletID: string;
  walletType: string;
}

interface SelectWalletAction {
  type: WalletActionType.SelectWallet;
  walletID: string;
}
interface NavigateAction {
  type: WalletActionType.Navigate;
  screen: string;
  params: { [key: string]: any };
}

interface SetFocusAction {
  type: WalletActionType.SetFocus;
  isFocused: boolean;
}

interface SetWalletsAction {
  type: WalletActionType.SetWallets;
  wallets: TWallet[];
}

interface SelectWalletAction {
  type: WalletActionType.SelectWallet;
  walletID: string;
}

type WalletAction = SetWalletsAction | SelectWalletAction | SetFocusAction | NavigateAction;

interface DrawerListProps {
  navigation: NavigationProp<ParamListBase>;
}

const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case WalletActionType.SetWallets: {
      const isSelectedWalletInNewSet = action.wallets.some(wallet => wallet.getID() === state.selectedWalletID);
      return {
        ...state,
        wallets: action.wallets,
        selectedWalletID: isSelectedWalletInNewSet ? state.selectedWalletID : null,
      };
    }
    case WalletActionType.SelectWallet: {
      return { ...state, selectedWalletID: action.walletID };
    }
    case WalletActionType.SetFocus: {
      return { ...state, isFocused: action.isFocused };
    }
    default:
      return state;
  }
};

const DrawerList: React.FC<DrawerListProps> = memo(({ navigation }) => {
  const initialState: WalletState = {
    wallets: [],
    selectedWalletID: null,
    isFocused: false,
  };

  const [state, dispatch] = useReducer(walletReducer, initialState);
  const walletsCarousel = useRef<FlatList<TWallet>>(null);
  const { wallets } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();

  const stylesHook = useMemo(
    () =>
      StyleSheet.create({
        root: { backgroundColor: colors.elevated } as ViewStyle,
      }),
    [colors.elevated],
  );

  useEffect(() => {
    dispatch({ type: WalletActionType.SetWallets, wallets });
    dispatch({ type: WalletActionType.SetFocus, isFocused });
  }, [wallets, isFocused]);

  const handleClick = useCallback(
    (item: TWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        const walletType = item.type;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch({ type: WalletActionType.SelectWallet, walletID, walletType });
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate({
            name: 'WalletTransactions',
            params: { walletID, walletType },
          });
        });
      } else {
        navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
      }
    },
    [navigation],
  );

  const handleLongPress = useCallback(() => {
    if (state.wallets.length > 1) {
      navigation.navigate('ReorderWallets');
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    }
  }, [state.wallets.length, navigation]);

  const onNewWalletPress = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

  return (
    <DrawerContentScrollView
      contentContainerStyle={stylesHook.root}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      <WalletsCarousel
        // @ts-ignore: refactor later
        data={state.wallets.concat(false as any)}
        extraData={[state.wallets]}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        testID="WalletsList"
        selectedWallet={state.selectedWalletID}
        scrollEnabled={state.isFocused}
      />
    </DrawerContentScrollView>
  );
});

export default DrawerList;
