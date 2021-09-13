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
  console.log('drawerList rendering...');
  const walletsCarousel = useRef();
  const { wallets, selectedWallet, isImportingWallet } = useContext(BlueStorageContext);
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

  useEffect(() => {
    if (isImportingWallet) {
      walletsCarousel.current?.scrollToItem({ item: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImportingWallet]);

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
    } else if (index >= wallets.length && !isImportingWallet) {
      props.navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
    }
  };

  const handleLongPress = () => {
    if (wallets.length > 1 && !isImportingWallet) {
      props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const onNewWalletPress = () => {
    return !isImportingWallet ? props.navigation.navigate('AddWalletRoot') : null;
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
      extraData={[wallets, isImportingWallet]}
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

  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
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
