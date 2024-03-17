import React, { memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, LayoutAnimation, FlatList } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useIsFocused, NavigationProp, ParamListBase } from '@react-navigation/native';
import { BlueHeaderDefaultMain } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { AbstractWallet } from '../../class';

interface DrawerListProps {
  navigation: NavigationProp<ParamListBase>;
  // include other props as necessary
}

const DrawerList: React.FC<DrawerListProps> = memo(props => {
  const walletsCarousel = useRef<FlatList>();
  const { wallets, selectedWalletID, setSelectedWalletID } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const walletsCount = useRef(wallets.length);
  const isFocused = useIsFocused();

  const stylesHook = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: colors.elevated,
        },
      }),
    [colors.elevated],
  );

  useEffect(() => {
    if (walletsCount.current < wallets.length) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current] });
    }
    walletsCount.current = wallets.length;
  }, [wallets]);

  const handleClick = useCallback(
    (item: AbstractWallet) => {
      if (item?.getID) {
        const walletID = item.getID();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedWalletID(walletID);
        props.navigation.navigate({
          name: 'WalletTransactions',
          params: { walletID, walletType: item.type },
        });
      } else {
        props.navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
      }
    },
    [props.navigation, setSelectedWalletID],
  );

  const handleLongPress = useCallback(() => {
    if (wallets.length > 1) {
      props.navigation.navigate('ReorderWallets');
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    }
  }, [wallets.length, props.navigation]);

  const onNewWalletPress = useCallback(() => {
    return props.navigation.navigate('AddWalletRoot');
  }, [props.navigation]);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.root, stylesHook.root]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      <WalletsCarousel
        // @ts-ignore: Refactor WalletsCarousel to TSX later
        data={wallets.concat(false)}
        extraData={[wallets]}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        testID="WalletsList"
        selectedWallet={selectedWalletID}
        scrollEnabled={isFocused}
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
