import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useIsFocused, useNavigationState } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View, ViewStyle, Animated, ScrollView } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import { Header } from '../../components/Header';
import { useTheme } from '../../components/themes';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import TotalWalletsBalance from '../../components/TotalWalletsBalance';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

const DrawerList: React.FC<DrawerContentComponentProps> = memo((props: DrawerContentComponentProps) => {
  const navigation = useExtendedNavigation();
  const drawerNavigation = props.navigation;

  const walletsCarousel = useRef<any>(null);
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const { isTotalBalanceEnabled } = useSettings();
  const prevWalletCount = useRef(wallets.length);

  const [displayWallets, setDisplayWallets] = useState<TWallet[]>(() => wallets);
  const [walletAdded, setWalletAdded] = useState(false);
  const [walletRemoved, setWalletRemoved] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentSelectedWalletID = useNavigationState(state => {
    // Return a primitive so DrawerList only rerenders when this value changes.
    const drawerRoute: any = state?.routes?.find((r: any) => r.name === 'DrawerRoot');
    const detailStack: any = drawerRoute?.state?.routes?.find((r: any) => r.name === 'DetailViewStackScreensStack');
    const activeRoute: any = detailStack?.state?.routes?.[detailStack?.state?.index ?? 0];
    return activeRoute?.params?.walletID as string | undefined;
  });

  const prevWalletIds = useRef<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const lastAddedWalletId = useRef<string | null>(null);
  const syncWalletsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (wallets.length !== prevWalletCount.current) {
      const currentWalletIds = wallets.map(wallet => wallet.getID());

      if (wallets.length > prevWalletCount.current) {
        const addedWalletIds = currentWalletIds.filter(id => !prevWalletIds.current.includes(id));
        if (addedWalletIds.length > 0) {
          setWalletAdded(true);
          setWalletRemoved(false);
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

          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
          }
          scrollTimerRef.current = setTimeout(() => {
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
        setWalletAdded(false);
        setWalletRemoved(true);

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

      if (syncWalletsTimerRef.current) {
        clearTimeout(syncWalletsTimerRef.current);
      }
      syncWalletsTimerRef.current = setTimeout(() => {
        setDisplayWallets(wallets);
      }, 600);
    } else {
      prevWalletIds.current = wallets.map(wallet => wallet.getID());
      // Keep balances/tx metadata updated without the delayed "add/remove" animation path.
      setDisplayWallets(wallets);
    }
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      if (syncWalletsTimerRef.current) {
        clearTimeout(syncWalletsTimerRef.current);
      }
    };
  }, [wallets, fadeAnim]);

  const stylesHook = useMemo(
    () =>
      StyleSheet.create({
        root: { backgroundColor: colors.elevated } as ViewStyle,
      }),
    [colors.elevated],
  );

  const handleClick = useCallback(
    (item?: TWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        const walletType = item.type;
        InteractionManager.runAfterInteractions(() => {
          drawerNavigation.navigate('DetailViewStackScreensStack', {
            screen: 'WalletTransactions',
            params: { walletID, walletType },
          });
        });
      }
    },
    [drawerNavigation],
  );

  const handleLongPress = useCallback(() => {
    navigation.navigate('DrawerRoot', {
      screen: 'DetailViewStackScreensStack',
      params: {
        screen: 'ManageWallets',
      },
    });
  }, [navigation]);

  const onNewWalletPress = useCallback(() => {
    navigation.navigate('AddWalletRoot');
  }, [navigation]);

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
      <Header leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      {isTotalBalanceEnabled && (
        <View style={stylesHook.root} accessibilityRole="summary" accessibilityLabel={loc.wallets.wallets}>
          <TotalWalletsBalance />
        </View>
      )}
      <Animated.View style={{ opacity: fadeAnim }}>
        <WalletsCarousel
          data={displayWallets}
          extraData={[displayWallets, currentSelectedWalletID, walletAdded, walletRemoved, lastAddedWalletId.current]}
          onPress={handleClick}
          handleLongPress={handleLongPress}
          ref={walletsCarousel}
          horizontal={false}
          isFlatList={false}
          onNewWalletPress={onNewWalletPress}
          testID="WalletsList"
          selectedWallet={currentSelectedWalletID ?? undefined}
          scrollEnabled={isFocused}
          animateChanges
          accessibilityRole="list"
          accessibilityLabel={loc.wallets.wallets}
        />
      </Animated.View>
    </DrawerContentScrollView>
  );
});

export default DrawerList;
