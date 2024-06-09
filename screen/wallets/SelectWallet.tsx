import React, { useEffect, useState, useRef } from 'react';
import { useNavigationState, useRoute, RouteProp } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueSpacing20, BlueText } from '../../BlueComponents';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import WalletsCarousel from '../../components/WalletsCarousel';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { TWallet } from '../../class/wallets/types';
import { CloseButtonPosition } from '../../components/navigationStyle';
import { pop } from '../../NavigationService';

type SelectWalletRouteProp = RouteProp<
  {
    SelectWallet: {
      chainType?: Chain;
      onWalletSelect?: (wallet: TWallet, navigation: any) => void;
      availableWallets?: TWallet[];
      noWalletExplanationText?: string;
      onChainRequireSend?: boolean;
    };
  },
  'SelectWallet'
>;

const SelectWallet: React.FC = () => {
  const route = useRoute<SelectWalletRouteProp>();
  const { chainType, onWalletSelect, availableWallets, noWalletExplanationText, onChainRequireSend = false } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useExtendedNavigation();
  const { navigate, setOptions } = navigation;
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const isModal = useNavigationState(state => state.routes.length === 1);
  const walletsCarousel = useRef(null);
  const previousRouteName = useNavigationState(state => state.routes[state.routes.length - 2]?.name);

  let data = !onChainRequireSend
    ? wallets.filter(item => item.chain === Chain.ONCHAIN)
    : chainType
      ? wallets.filter(item => item.chain === chainType && item.allowSend())
      : wallets.filter(item => item.allowSend());

  if (availableWallets && availableWallets.length > 0) {
    data = availableWallets;
  }

  const stylesHook = StyleSheet.create({
    loading: {
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    console.log('SelectWallet - useEffect');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setOptions({
      statusBarStyle: isLoading || data.length === 0 ? 'light' : 'auto',
    });
  }, [isLoading, data.length, setOptions]);

  useEffect(() => {
    if (!isModal) {
      setOptions({ CloseButtonPosition: CloseButtonPosition.None });
    }
  }, [isModal, setOptions]);

  const onPress = (item: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    if (isModal) {
      onWalletSelect?.(item, { navigation: { pop, navigate } });
    } else {
      navigate(previousRouteName, { walletID: item.getID(), merge: true });
    }
  };

  const handleLongPress = (item: TWallet) => {
    // place holder. remove once WalletsCarousel is TSX
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, stylesHook.loading]}>
        <ActivityIndicator />
      </View>
    );
  } else if (data.length <= 0) {
    return (
      <SafeArea>
        <View style={styles.noWallets}>
          <BlueText style={styles.center}>{loc.wallets.select_no_bitcoin}</BlueText>
          <BlueSpacing20 />
          <BlueText style={styles.center}>{noWalletExplanationText || loc.wallets.select_no_bitcoin_exp}</BlueText>
        </View>
      </SafeArea>
    );
  } else {
    return (
      <WalletsCarousel
        // @ts-ignore: refactor later
        data={data}
        onPress={onPress}
        handleLongPress={handleLongPress}
        ref={walletsCarousel}
        testID="WalletsList"
        horizontal={false}
      />
    );
  }
};

export default SelectWallet;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    paddingTop: 20,
  },
  noWallets: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  center: {
    textAlign: 'center',
  },
});
