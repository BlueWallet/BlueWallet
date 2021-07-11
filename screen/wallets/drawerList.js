import React, { useContext, useEffect, useRef, useState } from 'react';
import { StatusBar, View, StyleSheet, Alert } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { useIsFocused, useTheme } from '@react-navigation/native';

import { BlueHeaderDefaultMain, BlueSpacing20 } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import { PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { BlurView } from '@react-native-community/blur';

const DrawerList = props => {
  console.log('drawerList rendering...');
  const walletsCarousel = useRef();
  const { wallets, selectedWallet, pendingWallets, isDrawerListBlurred } = useContext(BlueStorageContext);
  const [carouselData, setCarouselData] = useState([]);
  const { colors } = useTheme();
  const walletsCount = useRef(wallets.length);
  const isFocused = useIsFocused();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.brandingColor,
    },
  });

  useEffect(() => {
    const allWallets = wallets.concat(pendingWallets);
    setCarouselData(allWallets.concat(false));
    const newCarouselData = allWallets.concat(false);
    setCarouselData(newCarouselData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, pendingWallets]);

  useEffect(() => {
    if (walletsCount.current < wallets.length) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current] });
    }
    walletsCount.current = wallets.length;
  }, [wallets]);

  useEffect(() => {
    if (pendingWallets.length > 0) {
      walletsCarousel.current?.scrollToItem(carouselData.length - pendingWallets.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingWallets]);

  const handleClick = index => {
    console.log('click', index);
    const wallet = carouselData[index];
    if (wallet) {
      if (wallet.type === PlaceholderWallet.type) {
        Alert.alert(
          loc.wallets.add_details,
          loc.wallets.list_import_problem,
          [
            {
              text: loc.wallets.details_delete,
              onPress: () => {
                WalletImport.removePlaceholderWallet();
              },
              style: 'destructive',
            },
            {
              text: loc.wallets.list_tryagain,
              onPress: () => {
                props.navigation.navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: wallet.getSecret() } });
                WalletImport.removePlaceholderWallet();
              },
              style: 'default',
            },
          ],
          { cancelable: false },
        );
      } else {
        props.navigation.navigate('WalletTransactions', {
          walletID: wallet.getID(),
          walletType: wallet.type,
          key: `WalletTransactions-${wallet.getID()}`,
        });
      }
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      if (!carouselData.some(wallet => wallet.type === PlaceholderWallet.type)) {
        props.navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
      }
    }
  };

  const handleLongPress = () => {
    if (carouselData.length > 1 && !carouselData.some(wallet => wallet.type === PlaceholderWallet.type)) {
      props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const onNewWalletPress = () => {
    return !carouselData.some(wallet => wallet.type === PlaceholderWallet.type) ? props.navigation.navigate('AddWalletRoot') : null;
  };

  const ListHeaderComponent = () => {
    return (
      <>
        <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
        <BlueSpacing20 />
      </>
    );
  };

  const renderWalletsCarousel = (
    <WalletsCarousel
      data={carouselData}
      extraData={carouselData}
      onPress={handleClick}
      handleLongPress={handleLongPress}
      ref={walletsCarousel}
      testID="WalletsList"
      vertical
      selectedWallet={selectedWallet}
      ListHeaderComponent={ListHeaderComponent}
      scrollEnabled={isFocused}
    />
  );

  return (
    <DrawerContentScrollView {...props}>
      <View styles={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="default" />
        {renderWalletsCarousel}
      </View>
      {isDrawerListBlurred && (
        <BlurView style={styles.absolute} blurType="light" blurAmount={10} reducedTransparencyFallbackColor="white" />
      )}
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
