import React from 'react';
import { Platform, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import WalletGradient from '../../class/wallet-gradient';
import { DetailViewStackParamList } from '../DetailViewStackParamList';
import { navigationRef } from '../../NavigationService';
import { RouteProp } from '@react-navigation/native';
import { isDesktop } from '../../blue_modules/environment';
import { isIOS26OrHigher } from '../../components/platform';
import loc from '../../loc';

export type WalletTransactionsRouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

const HERO_HEADER_ICON_COLOR = '#FFFFFF';

const navigateToWalletDetails = (walletID: string) => {
  navigationRef.navigate('WalletDetails', {
    walletID,
  });
};

/** Material "more" button for WalletTransactions header (pre–iOS 26 and Android). */
export const createWalletDetailsHeaderRight = ({
  walletID,
  isLoading = false,
  iconColor = HERO_HEADER_ICON_COLOR,
}: {
  walletID: string;
  isLoading?: boolean;
  iconColor?: string;
}): (() => React.ReactElement) => {
  return () => (
    <TouchableOpacity
      accessibilityRole="button"
      testID="WalletDetails"
      disabled={isLoading}
      style={styles.walletDetails}
      onPress={() => navigateToWalletDetails(walletID)}
    >
      <Icon name="more-horiz" type="material" size={22} color={iconColor} />
    </TouchableOpacity>
  );
};

/** Native toolbar ellipsis for WalletTransactions on iOS 26+. */
export const createWalletDetailsHeaderRightItems = ({
  isLoading = false,
  walletID,
}: {
  isLoading?: boolean;
  walletID: string;
}): (() => NativeStackHeaderItem[]) => {
  return () => [
    {
      type: 'button',
      label: loc.wallets.details_title,
      icon: { type: 'sfSymbol', name: 'ellipsis' },
      identifier: 'WalletDetails',
      sharesBackground: false,
      onPress: () => navigateToWalletDetails(walletID),
      disabled: isLoading,
    },
  ];
};

/** Whether a solid #RRGGBB header background is dark enough to prefer dark bar chrome on iOS 26+. */
function prefersDarkHeaderChrome(backgroundColor: string): boolean {
  const hex = backgroundColor.replace(/^#/, '');
  if (hex.length !== 6) {
    return true;
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return true;
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

const getWalletTransactionsOptions = ({ route }: { route: WalletTransactionsRouteProps }): NativeStackNavigationOptions => {
  const { isLoading = false, walletID, walletType } = route.params;

  const backgroundColor = WalletGradient.headerColorFor(walletType);

  const base: NativeStackNavigationOptions = {
    title: '',
    headerBackTitleStyle: { fontSize: 0 },
    headerTransparent: true,
    headerStyle: {
      backgroundColor: 'transparent',
    },
    headerBackButtonDisplayMode: 'minimal',
    headerShadowVisible: false,
    headerTintColor: HERO_HEADER_ICON_COLOR,
    headerBlurEffect: undefined,
    statusBarStyle: 'light',
    headerBackTitle: undefined,
    headerRight: createWalletDetailsHeaderRight({ walletID, isLoading, iconColor: HERO_HEADER_ICON_COLOR }),
  };

  if (Platform.OS === 'ios' && isIOS26OrHigher && !isDesktop) {
    const darkChrome = prefersDarkHeaderChrome(backgroundColor);
    return {
      ...base,
      headerRight: undefined,
      ...(darkChrome ? { experimental_userInterfaceStyle: 'dark' as const } : {}),
      unstable_headerRightItems: createWalletDetailsHeaderRightItems({ isLoading, walletID }),
    };
  }

  return base;
};

const styles = StyleSheet.create({
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});

export default getWalletTransactionsOptions;
