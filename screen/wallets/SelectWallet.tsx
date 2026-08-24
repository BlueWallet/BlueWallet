import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigation, useNavigationState, useRoute, RouteProp } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueText from '../../components/BlueText';
import SafeArea from '../../components/SafeArea';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import WalletsCarousel, { CarouselListRefType } from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';
import { pop } from '../../NavigationService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { BlueSpacing20 } from '../../components/BlueSpacing';

type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'SelectWallet'>;

type RouteProps = RouteProp<SendDetailsStackParamList, 'SelectWallet'>;

const SelectWallet: React.FC = () => {
  const route = useRoute<RouteProps>();
  const {
    chainType,
    onWalletSelect,
    availableWallets,
    noWalletExplanationText,
    onChainRequireSend = false,
    selectedWalletID,
  } = route.params;
  const navigation = useNavigation<NavigationProps>();
  const { wallets } = useStorage();
  const isModal = useNavigationState(state => state.routes.length > 1);
  const walletsCarousel = useRef<CarouselListRefType>(null);
  const previousRouteName = useNavigationState(state => state.routes[state.routes.length - 2]?.name);

  const filteredWallets = useMemo(() => {
    if (availableWallets && availableWallets.length > 0) {
      return availableWallets;
    }

    if (!onChainRequireSend && chainType === Chain.ONCHAIN) {
      return wallets.filter(item => item.chain === Chain.ONCHAIN);
    }

    if (chainType) {
      return wallets.filter(item => item.chain === chainType && item.allowSend());
    }

    return wallets.filter(item => item.allowSend());
  }, [availableWallets, chainType, onChainRequireSend, wallets]);

  // Scroll to the selected wallet if provided
  useEffect(() => {
    if (selectedWalletID && walletsCarousel.current) {
      const walletIndex = filteredWallets.findIndex(wallet => wallet.getID() === selectedWalletID);

      if (walletIndex !== -1) {
        const timeout = setTimeout(() => {
          if (walletsCarousel.current) {
            walletsCarousel.current.scrollToIndex({
              index: walletIndex,
              animated: true,
              viewPosition: 0.5, // Center the item
            });

            console.log(`Scrolled to wallet index ${walletIndex} with ID ${selectedWalletID}`);
          }
        }, 200);
        return () => clearTimeout(timeout);
      } else {
        console.log(`Wallet with ID ${selectedWalletID} not found in filtered wallets`);
      }
    }
  }, [selectedWalletID, filteredWallets]);

  useEffect(() => {
    navigation.setOptions({
      statusBarStyle: filteredWallets.length === 0 ? 'light' : 'auto',
    });
  }, [filteredWallets.length, navigation]);

  useEffect(() => {
    if (!isModal) {
      navigation.setOptions({ headerBackVisible: false });
    }
  }, [isModal, navigation]);

  const onPress = (item: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    if (onWalletSelect) {
      // @ts-ignore idk how to fix
      onWalletSelect(item, { navigation: { pop, navigate: navigation.navigate } });
    } else {
      // @ts-ignore: fix later
      navigation.popTo(previousRouteName, { walletID: item.getID(), merge: true });
    }
  };

  if (filteredWallets.length <= 0) {
    return (
      <SafeArea>
        <View style={styles.noWallets}>
          <BlueText style={styles.center}>{loc.wallets.select_no_bitcoin}</BlueText>
          <BlueSpacing20 />
          <BlueText style={styles.center}>{noWalletExplanationText || loc.wallets.select_no_bitcoin_exp}</BlueText>
        </View>
      </SafeArea>
    );
  }

  return (
    <WalletsCarousel
      data={filteredWallets}
      scrollEnabled
      onPress={onPress}
      ref={walletsCarousel}
      testID="SelectWalletsList"
      horizontal={false}
      style={styles.walletsCarousel}
      animateChanges={true}
    />
  );
};

export default SelectWallet;

const styles = StyleSheet.create({
  noWallets: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  center: {
    textAlign: 'center',
  },
  walletsCarousel: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
