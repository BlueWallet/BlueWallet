import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation, useNavigationState, ParamListBase, NavigationProp } from '@react-navigation/native';
import { BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { Chain } from '../../models/bitcoinUnits';
import WalletsCarousel from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';

interface SelectWalletProps {
  chainType?: Chain;
  availableWallets?: TWallet[]; // Specify the type for available wallets
  noWalletExplanationText?: string;
  onChainRequireSend?: boolean;
}

const HeaderLeftComponent = ({ onPress, source }: { onPress: () => void; source: ReturnType<typeof Image.resolveAssetSource> }) => (
  <TouchableOpacity accessibilityRole="button" onPress={onPress} testID="NavigationCloseButton">
    <Image source={source} />
  </TouchableOpacity>
);

const SelectWallet: React.FC<SelectWalletProps> = () => {
  const { params } = useRoute() as { params: SelectWalletProps };
  const { chainType, availableWallets, noWalletExplanationText, onChainRequireSend = false } = params;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { wallets } = useContext(BlueStorageContext);
  const { colors, closeImage } = useTheme();
  const isModal = useNavigationState(state => state.routes.length) === 1;
  const routes = useNavigationState(state => state.routes);
  let previousRouteName = '';

  // Check if there are at least two routes in the navigation stack
  if (routes.length > 1) {
    // The previous route is the one before the last in the routes array
    previousRouteName = routes[routes.length - 2].name;
  }

  // Initialize an empty array for filtered wallets
  let filteredWallets: TWallet[] = [];

  // Determine the filtering criteria based on the provided conditions
  if (availableWallets && availableWallets.length > 0) {
    // If there are available wallets specified, use them directly
    filteredWallets = availableWallets;
  } else if (chainType) {
    // If a specific chainType is provided, filter wallets by chainType and their ability to send
    filteredWallets = wallets.filter(wallet => wallet.chain === chainType && wallet.allowSend());
  } else if (onChainRequireSend) {
    // If on-chain transactions are required, filter only wallets that can send and are on-chain
    filteredWallets = wallets.filter(wallet => wallet.chain === Chain.ONCHAIN && wallet.allowSend());
  } else {
    // Otherwise, filter wallets that can send, regardless of the chain
    filteredWallets = wallets.filter(wallet => wallet.allowSend());
  }

  // Use the filtered wallets for further operations
  const data: TWallet[] = filteredWallets;

  const stylesHook = StyleSheet.create({
    contentStyle: {
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      statusBarStyle: isLoading || data.length === 0 ? 'light' : 'auto',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerLeft: () =>
        isModal ? (
          <HeaderLeftComponent
            onPress={() =>
              // @ts-ignore: Fix later
              navigation.getParent()?.pop()
            }
            source={closeImage}
          />
        ) : undefined,
    });
  }, [isLoading, data.length, isModal, closeImage, navigation]);

  const childView = () => {
    if (isLoading) {
      return <ActivityIndicator />;
    } else if (data.length === 0) {
      return (
        <>
          <BlueTextCentered>{loc.wallets.select_no_bitcoin}</BlueTextCentered>
          <BlueSpacing20 />
          <BlueTextCentered>{noWalletExplanationText || loc.wallets.select_no_bitcoin_exp}</BlueTextCentered>
        </>
      );
    }
    return null;
  };

  const onPress = (item: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);

    // @ts-ignore: Fix later
    navigation.navigate({ name: previousRouteName, params: { walletID: item.getID() }, merge: true });
    //
  };

  const keyExtractor = (item: TWallet, index: number) => `${index}`;

  return isLoading || data.length === 0 ? (
    <ScrollView centerContent contentContainerStyle={[styles.center, stylesHook.contentStyle]}>
      {childView()}
    </ScrollView>
  ) : (
    // @ts-ignore: Fix later as the WalletsCarousel component is not yet TSX
    <WalletsCarousel data={data} onPress={onPress} testID="WalletsList" keyExtractor={keyExtractor} />
  );
};

export default SelectWallet;

const styles = StyleSheet.create({
  center: {
    paddingHorizontal: 16,
  },
});
