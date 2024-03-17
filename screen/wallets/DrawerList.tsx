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
import { AbstractWallet } from '../../class';

// Define action types and state using enums and interfaces
enum WalletActionType {
  SetWallets = 'SET_WALLETS',
  SelectWallet = 'SELECT_WALLET',
  SetFocus = 'SET_FOCUS',
}

interface WalletState {
  wallets: AbstractWallet[];
  selectedWalletID: string | null;
  isFocused: boolean;
}

interface SetWalletsAction {
  type: WalletActionType.SetWallets;
  wallets: AbstractWallet[];
}

interface SelectWalletAction {
  type: WalletActionType.SelectWallet;
  walletID: string;
}

interface SetFocusAction {
  type: WalletActionType.SetFocus;
  isFocused: boolean;
}

type WalletAction = SetWalletsAction | SelectWalletAction | SetFocusAction;

interface DrawerListProps {
  navigation: NavigationProp<ParamListBase>;
}

const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case WalletActionType.SetWallets:
      return { ...state, wallets: action.wallets };
    case WalletActionType.SelectWallet:
      return { ...state, selectedWalletID: action.walletID };
    case WalletActionType.SetFocus:
      return { ...state, isFocused: action.isFocused };
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
  const walletsCarousel = useRef<FlatList<AbstractWallet>>(null);
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
    (item: AbstractWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch({ type: WalletActionType.SelectWallet, walletID });
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate({
            name: 'WalletTransactions',
            params: { walletID, walletType: item.type },
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
    return navigation.navigate('AddWalletRoot');
  }, [navigation]);

  return (
    <DrawerContentScrollView
      {...{ navigation }}
      contentContainerStyle={[styles.root, stylesHook.root]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      <WalletsCarousel
        // @ts-ignore: dealt with in WalletsCarousel later
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
