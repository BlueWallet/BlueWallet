import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useIsFocused, useNavigationState } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { InteractionManager, StyleSheet, View, ViewStyle } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { TWallet } from '../../class/wallets/types';
import { Header } from '../../components/Header';
import { useTheme } from '../../components/themes';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

enum WalletActionType {
  SetWallets = 'SET_WALLETS',
  SelectWallet = 'SELECT_WALLET',
  SetFocus = 'SET_FOCUS',
  Navigate = 'NAVIGATE',
}

interface WalletState {
  wallets: TWallet[];
  isFocused: boolean;
}

interface SelectWalletAction {
  type: WalletActionType.SelectWallet;
  walletID: string;
  walletType: string;
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

type WalletAction = SetWalletsAction | SelectWalletAction | SetFocusAction | NavigateAction;

const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case WalletActionType.SetWallets: {
      return {
        ...state,
        wallets: action.wallets,
      };
    }
    case WalletActionType.SetFocus: {
      return { ...state, isFocused: action.isFocused };
    }
    default:
      return state;
  }
};

const DrawerList: React.FC<DrawerContentComponentProps> = memo(props => {
  const initialState: WalletState = {
    wallets: [],
    isFocused: false,
  };

  const navigation = useExtendedNavigation();
  const drawerNavigation = props.navigation;

  const [state, dispatch] = useReducer(walletReducer, initialState);
  const walletsCarousel = useRef<any>(null);
  const { wallets, selectedWalletID } = useStorage();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { isTotalBalanceEnabled } = useSettings();

  const navigationState = useNavigationState(value => value);

  const currentSelectedWalletID = selectedWalletID ? selectedWalletID() : undefined;

  useEffect(() => {
    console.debug('[DrawerList] Navigation state changed, current selectedWalletID:', currentSelectedWalletID);
  }, [navigationState, currentSelectedWalletID]);

  const isWalletsListActive = useMemo(() => {
    const drawerRoute = navigationState?.routes?.find(route => route.name === 'DrawerRoot');
    if (!drawerRoute || !drawerRoute.state) return true;

    const detailStack = drawerRoute.state.routes.find(route => route.name === 'DetailViewStackScreensStack');
    if (!detailStack || !detailStack.state) return true;

    const currentScreenName = detailStack.state.routes[detailStack.state.index || 0]?.name;
    return currentScreenName === 'WalletsList';
  }, [navigationState]);

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
    (item?: TWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        const walletType = item.type;
        dispatch({ type: WalletActionType.SelectWallet, walletID, walletType });
        InteractionManager.runAfterInteractions(() => {
          drawerNavigation.navigate('DetailViewStackScreensStack', {
            screen: 'WalletTransactions',
            params: { walletID, walletType },
          });
          drawerNavigation.closeDrawer();
        });
      }
    },
    [drawerNavigation],
  );

  const handleLongPress = useCallback(() => {
    if (state.wallets.length > 1) {
      drawerNavigation.navigate('DetailViewStackScreensStack', {
        screen: 'ManageWallets',
      });
      drawerNavigation.closeDrawer();
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    }
  }, [state.wallets.length, drawerNavigation]);

  const onNewWalletPress = useCallback(() => {
    drawerNavigation.closeDrawer();

    navigation.navigate('AddWalletRoot');
  }, [navigation, drawerNavigation]);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={stylesHook.root}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <Header leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      {isTotalBalanceEnabled && (
        <View style={stylesHook.root}>
          <TotalWalletsBalance />
        </View>
      )}
      <WalletsCarousel
        data={state.wallets}
        extraData={[state.wallets, currentSelectedWalletID]} // Add currentSelectedWalletID to trigger re-renders
        onPress={handleClick}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        horizontal={false}
        isFlatList={false}
        onNewWalletPress={onNewWalletPress}
        testID="WalletsList"
        selectedWallet={isWalletsListActive ? undefined : currentSelectedWalletID}
        scrollEnabled={state.isFocused}
      />
    </DrawerContentScrollView>
  );
});

export default DrawerList;
