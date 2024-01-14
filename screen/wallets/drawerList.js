import React, { useContext, useEffect, useRef } from 'react';
import { StyleSheet, LayoutAnimation } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import PropTypes from 'prop-types';
import { useIsFocused } from '@react-navigation/native';
import { BlueHeaderDefaultMain } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';

const DrawerList = props => {
  const walletsCarousel = useRef();
  const { wallets, selectedWalletID, setSelectedWalletID } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const walletsCount = useRef(wallets.length);
  const isFocused = useIsFocused();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useEffect(() => {
    if (walletsCount.current < wallets.length) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current] });
    }
    walletsCount.current = wallets.length;
  }, [wallets]);

  const handleClick = item => {
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
  };

  const handleLongPress = () => {
    if (wallets.length > 1) {
      props.navigation.navigate('ReorderWallets');
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    }
  };

  const onNewWalletPress = () => {
    return props.navigation.navigate('AddWalletRoot');
  };

  return (
    <DrawerContentScrollView
      {...props}
      drawerContentContainerStyle={[styles.root, stylesHook.root]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      <WalletsCarousel
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
};

export default DrawerList;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

DrawerList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    addListener: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.object,
  }),
};
