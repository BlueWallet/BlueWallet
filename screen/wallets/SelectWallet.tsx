import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  const stylesHook = StyleSheet.create({
    loading: {
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    console.log('SelectWallet - useEffect');
    setIsLoading(false);
  }, []);

  const filterWallets = useCallback(() => {
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

  useEffect(() => {
    setOptions({
      statusBarStyle: isLoading || (availableWallets || filterWallets()).length === 0 ? 'light' : 'auto',
    });
  }, [isLoading, availableWallets, setOptions, filterWallets]);

  useEffect(() => {
    if (!isModal) {
      setOptions({ CloseButtonPosition: CloseButtonPosition.None });
    }
  }, [isModal, setOptions]);

  const onPress = (item: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    if (onWalletSelect) {
      onWalletSelect(item, { navigation: { pop, navigate } });
    } else {
      navigate(previousRouteName, { walletID: item.getID(), merge: true });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, stylesHook.loading]}>
        <ActivityIndicator />
      </View>
    );
  }

  const filteredWallets = filterWallets();

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
    <View style={styles.walletsCarousel}>
      <WalletsCarousel
        data={filteredWallets}
        scrollEnabled
        onPress={onPress}
        ref={walletsCarousel}
        testID="WalletsList"
        horizontal={false}
      />
    </View>
  );
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
  walletsCarousel: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
