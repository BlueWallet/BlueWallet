import React, { useContext, useEffect, useRef } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { useIsFocused, useTheme } from '@react-navigation/native';

import { BlueHeaderDefaultMain } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const DrawerList = props => {
  const walletsCarousel = useRef();
  const { wallets, selectedWallet } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const walletsCount = useRef(wallets.length);
  const isFocused = useIsFocused();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.brandingColor,
    },
  });

  useEffect(() => {
    if (walletsCount.current < wallets.length) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current] });
    }
    walletsCount.current = wallets.length;
  }, [wallets]);

  const handleClick = index => {
    console.log('click', index);
    if (index <= wallets.length - 1) {
      const wallet = wallets[index];
      const walletID = wallet.getID();
      props.navigation.navigate('WalletTransactions', {
        walletID: wallet.getID(),
        walletType: wallet.type,
        key: `WalletTransactions-${walletID}`,
      });
    } else {
      props.navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
    }
  };

  const handleLongPress = () => {
    if (wallets.length > 1) {
      props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const onNewWalletPress = () => {
    return props.navigation.navigate('AddWalletRoot');
  };

  const ListHeaderComponent = () => {
    return (
      <>
        <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
      </>
    );
  };

  const renderWalletsCarousel = (
    <WalletsCarousel
      data={wallets.concat(false)}
      extraData={[wallets]}
      onPress={handleClick}
      handleLongPress={handleLongPress}
      ref={walletsCarousel}
      testID="WalletsList"
      selectedWallet={selectedWallet}
      ListHeaderComponent={ListHeaderComponent}
      scrollEnabled={isFocused}
    />
  );

  return (
    <DrawerContentScrollView {...props} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      <View styles={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="default" />
        {renderWalletsCarousel}
      </View>
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
