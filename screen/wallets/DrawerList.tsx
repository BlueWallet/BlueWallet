import { DrawerContentScrollView } from '@react-navigation/drawer';
import { NavigationProp, ParamListBase, useIsFocused } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { InteractionManager, LayoutAnimation, StyleSheet, View, ViewStyle } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { TWallet } from '../../class/wallets/types';
import { Header } from '../../components/Header';
import { useTheme } from '../../components/themes';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import { useSettings } from '../../hooks/context/useSettings';

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

const DrawerList: React.FC<DrawerListProps> = memo(({ navigation }) => {
  const initialState: WalletState = {
    wallets: [],
    isFocused: false,
  };

  const [state, dispatch] = useReducer(walletReducer, initialState);
  const walletsCarousel = useRef(null);
  const { wallets, selectedWalletID } = useStorage();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { isTotalBalanceEnabled } = useSettings();

  const stylesHook = useMemo(
    () =>
      StyleSheet.create({
        root: { backgroundColor: colors.elevated } as ViewStyle,
      }),
    [colors.elevated],
  );

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dispatch({ type: WalletActionType.SetWallets, wallets });
    dispatch({ type: WalletActionType.SetFocus, isFocused });
  }, [wallets, isFocused]);

  const handleClick = useCallback(
    (item?: TWallet) => {
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
        navigation.navigate('AddWalletRoot');
      }
    },
    [navigation],
  );

  const handleLongPress = useCallback(() => {
    if (state.wallets.length > 1) {
      navigation.navigate('ManageWallets');
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
      <Header leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      {isTotalBalanceEnabled && (
        <View style={stylesHook.root}>
          <TotalWalletsBalance />
        </View>
      )}
      <WalletsCarousel
        data={state.wallets}
        extraData={[state.wallets]}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        horizontal={false}
        isFlatList={false}
        onNewWalletPress={handleClick}
        testID="WalletsList"
        selectedWallet={selectedWalletID}
        scrollEnabled={state.isFocused}
      />
    </DrawerContentScrollView>
  );
});

export default DrawerList;
