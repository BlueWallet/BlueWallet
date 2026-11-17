import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNavigation, useIsFocused, useNavigationState } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shouldUseWideLayout } from '../../blue_modules/layout';
import { TWallet } from '../../class/wallets/types';
import { Header } from '../../components/Header';
import { useTheme } from '../../components/themes';
import WalletsCarousel, { CarouselListRefType } from '../../components/WalletsCarousel';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import { useSettings } from '../../hooks/context/useSettings';
import { SettingsContent, SettingsDestination } from '../settings/Settings';

enum WalletActionType {
  SetWallets = 'SET_WALLETS',
  SelectWallet = 'SELECT_WALLET',
  SetFocus = 'SET_FOCUS',
  Navigate = 'NAVIGATE',
  WalletAdded = 'WALLET_ADDED',
  WalletRemoved = 'WALLET_REMOVED',
}

interface WalletState {
  wallets: TWallet[];
  isFocused: boolean;
  walletAdded: boolean;
  walletRemoved: boolean;
}

interface SelectWalletAction {
  type: WalletActionType.SelectWallet;
  walletID: string;
  walletType: string;
}

interface NavigateAction {
  type: WalletActionType.Navigate;
  screen: string;
  params: Record<string, unknown>;
}

interface SetFocusAction {
  type: WalletActionType.SetFocus;
  isFocused: boolean;
}

interface SetWalletsAction {
  type: WalletActionType.SetWallets;
  wallets: TWallet[];
}

interface WalletAddedAction {
  type: WalletActionType.WalletAdded;
}

interface WalletRemovedAction {
  type: WalletActionType.WalletRemoved;
}

type WalletAction = SetWalletsAction | SelectWalletAction | SetFocusAction | NavigateAction | WalletAddedAction | WalletRemovedAction;

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
    case WalletActionType.WalletAdded: {
      return { ...state, walletAdded: true, walletRemoved: false };
    }
    case WalletActionType.WalletRemoved: {
      return { ...state, walletAdded: false, walletRemoved: true };
    }
    default:
      return state;
  }
};

const DrawerList: React.FC<DrawerContentComponentProps> = memo((props: DrawerContentComponentProps) => {
  const initialState: WalletState = {
    wallets: [],
    isFocused: false,
    walletAdded: false,
    walletRemoved: false,
  };

  const navigation = useNavigation();
  const drawerNavigation = props.navigation;

  const [state, dispatch] = useReducer(walletReducer, initialState);
  const walletsCarousel = useRef<CarouselListRefType>(null);
  const { wallets, selectedWalletID } = useStorage();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { isTotalBalanceEnabled } = useSettings();
  const { height, width } = useWindowDimensions();
  const isDrawerVisible = shouldUseWideLayout(width, height);
  const [sidebarMode, setSidebarMode] = useState<'wallets' | 'settings'>('wallets');
  const prevWalletCount = useRef(wallets.length);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const navigationState = useNavigationState(value => value);
  const currentSelectedWalletID = selectedWalletID ? selectedWalletID() : undefined;

  useEffect(() => {
    console.debug('[DrawerList] Navigation state changed, current selectedWalletID:', currentSelectedWalletID);
  }, [navigationState, currentSelectedWalletID]);

  const prevWalletIds = useRef<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const lastAddedWalletId = useRef<string | null>(null);

  useEffect(() => {
    if (wallets.length !== prevWalletCount.current) {
      const currentWalletIds = wallets.map(wallet => wallet.getID());

      if (wallets.length > prevWalletCount.current) {
        const addedWalletIds = currentWalletIds.filter(id => !prevWalletIds.current.includes(id));
        if (addedWalletIds.length > 0) {
          dispatch({ type: WalletActionType.WalletAdded });
          lastAddedWalletId.current = addedWalletIds[addedWalletIds.length - 1];

          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0.7,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();

          setTimeout(() => {
            if (scrollViewRef.current && lastAddedWalletId.current !== null) {
              const walletIndex = currentWalletIds.indexOf(lastAddedWalletId.current);
              if (walletIndex !== -1) {
                const WALLET_CARD_HEIGHT = 195;
                const scrollPosition = walletIndex * WALLET_CARD_HEIGHT;

                scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
              }
            }
          }, 700);
        }
      } else {
        dispatch({ type: WalletActionType.WalletRemoved });

        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }

      prevWalletCount.current = wallets.length;
      prevWalletIds.current = currentWalletIds;

      setTimeout(() => {
        dispatch({ type: WalletActionType.SetWallets, wallets });
      }, 600);
    } else {
      prevWalletIds.current = wallets.map(wallet => wallet.getID());
    }
  }, [wallets, fadeAnim]);

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
        drawerNavigation.navigate('DetailViewStackScreensStack', {
          screen: 'WalletTransactions',
          params: { walletID, walletType },
        });
      }
    },
    [drawerNavigation],
  );

  const handleLongPress = useCallback(() => {
    drawerNavigation.navigate('DetailViewStackScreensStack', {
      screen: 'ManageWallets',
    });
  }, [drawerNavigation]);

  const onSettingsPress = useCallback(() => {
    setSidebarMode('settings');
  }, []);

  const onSettingsNavigate = useCallback(
    (destination: SettingsDestination) => {
      drawerNavigation.navigate('DetailViewStackScreensStack', {
        screen: destination,
      });
    },
    [drawerNavigation],
  );

  const onWalletsPress = useCallback(() => {
    setSidebarMode('wallets');
    drawerNavigation.navigate('DetailViewStackScreensStack', {
      screen: 'WalletsList',
    });
  }, [drawerNavigation]);

  const onNewWalletPress = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

  if (sidebarMode === 'settings') {
    return (
      <SafeAreaView style={[stylesHook.root, styles.settingsRoot]} edges={['top']}>
        <Header leftText={loc.settings.header} onBackPress={onWalletsPress} isDrawerList />
        <SettingsContent onNavigate={onSettingsNavigate} style={stylesHook.root} />
      </SafeAreaView>
    );
  }

  return (
    <DrawerContentScrollView
      ref={scrollViewRef}
      {...props}
      contentContainerStyle={stylesHook.root}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      directionalLockEnabled
    >
      <Header
        leftText={loc.wallets.list_title}
        onNewWalletPress={onNewWalletPress}
        onSettingsPress={isDrawerVisible ? undefined : onSettingsPress}
        onManageWalletsPress={handleLongPress}
        isDrawerList
      />
      {isTotalBalanceEnabled && (
        <View style={stylesHook.root}>
          <TotalWalletsBalance />
        </View>
      )}
      <Animated.View style={{ opacity: fadeAnim }}>
        <WalletsCarousel
          data={state.wallets}
          extraData={[state.wallets, currentSelectedWalletID, state.walletAdded, state.walletRemoved, lastAddedWalletId.current]}
          onPress={handleClick}
          handleLongPress={handleLongPress}
          ref={walletsCarousel}
          horizontal={false}
          isFlatList={false}
          onNewWalletPress={onNewWalletPress}
          testID="WalletsList"
          selectedWallet={isWalletsListActive ? undefined : currentSelectedWalletID}
          scrollEnabled={state.isFocused}
          animateChanges
        />
      </Animated.View>
    </DrawerContentScrollView>
  );
});

export default DrawerList;

const styles = StyleSheet.create({
  settingsRoot: {
    flex: 1,
  },
});
