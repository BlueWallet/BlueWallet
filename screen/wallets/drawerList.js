import React, { useContext, useEffect, useRef, useState } from 'react';
import { StatusBar, View, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlueHeaderDefaultMain } from '../../BlueComponents';
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
  const height = useWindowDimensions().height;
  const { colors } = useTheme();
  const walletsCount = useRef(wallets.length);
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
      walletsCarousel.current?.snapToItem(walletsCount.current);
    }
    walletsCount.current = wallets.length;
  }, [wallets]);

  useEffect(() => {
    if (pendingWallets.length > 0) {
      walletsCarousel.current?.snapToItem(carouselData.length - pendingWallets.length);
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

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        removeClippedSubviews={false}
        data={carouselData}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        testID="WalletsList"
        vertical
        itemHeight={190}
        sliderHeight={height}
        contentContainerCustomStyle={styles.contentContainerCustomStyle}
        inactiveSlideOpacity={1.0}
        selectedWallet={selectedWallet}
      />
    );
  };

  const onNewWalletPress = () => {
    return !carouselData.some(wallet => wallet.type === PlaceholderWallet.type) ? props.navigation.navigate('AddWalletRoot') : null;
  };

  return (
    <DrawerContentScrollView {...props} scrollEnabled={false}>
      <View styles={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="default" />
        <SafeAreaView style={styles.root}>
          <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={onNewWalletPress} isDrawerList />
        </SafeAreaView>
        {renderWalletsCarousel()}
      </View>
      {isDrawerListBlurred && (
        <BlurView style={styles.absolute} blurType="light" blurAmount={10} reducedTransparencyFallbackColor="white" />
      )}
    </DrawerContentScrollView>
  );
};

export default DrawerList;

const styles = StyleSheet.create({
  contentContainerCustomStyle: {
    paddingRight: 10,
    paddingLeft: 20,
  },
  root: {
    flex: 1,
  },
  headerTouch: {
    height: 48,
    paddingRight: 16,
    paddingLeft: 32,
    paddingVertical: 10,
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
