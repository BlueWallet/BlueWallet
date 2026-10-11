import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import { DetailViewStackParamList } from '../DetailViewStackParamList';
import { navigationRef } from '../../NavigationService';
import { RouteProp } from '@react-navigation/native';
import { isDesktop, isIOS26OrHigher } from '../../blue_modules/environment';
import WalletGradient from '../../class/wallet-gradient';
import { useTheme } from '../../components/themes';
import loc from '../../loc';

export type WalletTransactionsRouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

const HERO_HEADER_ICON_COLOR = '#FFFFFF';
const SCROLLED_HEADER_FADE_IN_MS = 180;
const SCROLLED_HEADER_FADE_OUT_MS = 150;
/** iOS 26 glass header (native right items, fading title, no blur). Catalyst reports iOS version but keeps the classic header. */
const usesIos26AnimatedHeader = Platform.OS === 'ios' && isIOS26OrHigher && !isDesktop;

type WalletTransactionsScrolledHeaderOptions = NativeStackNavigationOptions & {
  headerTitleContainerStyle?: StyleProp<ViewStyle>;
};

type WalletTransactionsScrolledHeaderTitleProps = {
  walletLabel: string;
  balance: string;
  isScrolled: boolean;
};

const getScrolledHeaderTitleLayout = (screenWidth: number) => {
  const titleInsetLeft = Platform.OS === 'ios' ? (isIOS26OrHigher ? 40 : 56) : 72;
  const titleInsetRight = Platform.OS === 'ios' ? (isIOS26OrHigher ? 96 : 84) : 84;
  return {
    maxWidth: Math.max(0, screenWidth - titleInsetLeft - titleInsetRight),
    titleInsetLeft,
    titleInsetRight,
  };
};

const buildIos26HeaderTitleLayoutOptions = (
  screenWidth: number,
): Pick<WalletTransactionsScrolledHeaderOptions, 'headerTitleAlign' | 'headerTitleContainerStyle'> => ({
  headerTitleAlign: 'left',
  headerTitleContainerStyle: {
    width: screenWidth,
    maxWidth: screenWidth,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    left: 0,
    flexShrink: 1,
    minWidth: 0,
  },
});

const WalletTransactionsScrolledHeaderTitle: React.FC<WalletTransactionsScrolledHeaderTitleProps> = ({
  walletLabel,
  balance,
  isScrolled,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { maxWidth, titleInsetLeft, titleInsetRight } = getScrolledHeaderTitleLayout(screenWidth);
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: usesIos26AnimatedHeader ? opacity.value : 1,
  }));

  useEffect(() => {
    if (!usesIos26AnimatedHeader) return;
    opacity.value = withTiming(isScrolled ? 1 : 0, {
      duration: isScrolled ? SCROLLED_HEADER_FADE_IN_MS : SCROLLED_HEADER_FADE_OUT_MS,
    });
  }, [isScrolled, opacity]);

  const titleColor = Platform.OS === 'ios' ? colors.foregroundColor : '#FFFFFF';
  const titleContent = (
    <>
      <Text style={[styles.walletLabel, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
        {walletLabel}
      </Text>
      {balance.length > 0 ? (
        <Text style={[styles.balance, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
          {balance}
        </Text>
      ) : null}
    </>
  );

  const headerContent =
    Platform.OS === 'ios' ? (
      <View style={[styles.iosHeaderRoot, { width: screenWidth }]} pointerEvents="box-none">
        <View style={[styles.container, styles.iosTitleArea, { left: titleInsetLeft, right: titleInsetRight }]} pointerEvents="box-none">
          {titleContent}
        </View>
      </View>
    ) : (
      <View style={[styles.container, { maxWidth }]}>{titleContent}</View>
    );

  if (usesIos26AnimatedHeader) {
    return (
      <Animated.View style={[styles.animatedTitleWrapper, { width: screenWidth }, animatedStyle]} pointerEvents="box-none">
        {headerContent}
      </Animated.View>
    );
  }

  return headerContent;
};

const createWalletTransactionsScrolledHeaderTitle = (props: WalletTransactionsScrolledHeaderTitleProps) => () =>
  React.createElement(WalletTransactionsScrolledHeaderTitle, props);

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
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
      accessibilityLabel: 'WalletDetails',
      sharesBackground: false,
      onPress: () => navigateToWalletDetails(walletID),
      disabled: isLoading,
    },
  ];
};

const getWalletTransactionsBaseOptions = (): NativeStackNavigationOptions => ({
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
});

const getWalletTransactionsOptions = ({
  route,
  screenWidth,
  headerTintColor,
  dark,
}: {
  route: WalletTransactionsRouteProps;
  screenWidth: number;
  headerTintColor: string;
  dark: boolean;
}): NativeStackNavigationOptions => {
  const { isLoading = false, walletID } = route.params;
  const isScrolled = route.params.headerIsScrolled ?? false;
  const base = getWalletTransactionsBaseOptions();
  const { titleInsetRight } = getScrolledHeaderTitleLayout(screenWidth);
  const showScrolledTitle = isScrolled || usesIos26AnimatedHeader;
  const options: WalletTransactionsScrolledHeaderOptions = {
    ...base,
    headerTitle: showScrolledTitle
      ? createWalletTransactionsScrolledHeaderTitle({
          walletLabel: route.params.headerWalletLabel ?? '',
          balance: route.params.headerWalletBalance ?? '',
          isScrolled,
        })
      : '',
    ...(Platform.OS === 'ios' && showScrolledTitle
      ? buildIos26HeaderTitleLayoutOptions(screenWidth)
      : isScrolled
        ? {
            headerTitleAlign: 'left' as const,
            headerTitleContainerStyle: {
              paddingRight: titleInsetRight,
              flexShrink: 1,
              minWidth: 0,
              alignItems: 'flex-start' as const,
            },
          }
        : {}),
    ...(isScrolled && Platform.OS !== 'ios'
      ? {
          headerStyle: {
            backgroundColor: WalletGradient.headerColorFor(route.params.walletType),
          },
          headerTintColor: '#ffffff',
        }
      : {}),
    ...(isScrolled && Platform.OS === 'ios'
      ? {
          headerTintColor,
          statusBarStyle: 'light' as const,
          ...(usesIos26AnimatedHeader
            ? {}
            : {
                headerBlurEffect: dark ? ('dark' as const) : ('light' as const),
              }),
        }
      : {}),
  };

  if (usesIos26AnimatedHeader) {
    return {
      ...options,
      headerRight: undefined,
      unstable_headerRightItems: createWalletDetailsHeaderRightItems({
        isLoading,
        walletID,
      }),
    };
  }

  return {
    ...options,
    headerRight: createWalletDetailsHeaderRight({
      walletID,
      isLoading,
      iconColor: isScrolled && Platform.OS === 'ios' ? headerTintColor : HERO_HEADER_ICON_COLOR,
    }),
  };
};

const styles = StyleSheet.create({
  animatedTitleWrapper: {
    alignSelf: 'flex-start',
  },
  iosHeaderRoot: {
    height: 44,
    justifyContent: 'center',
  },
  iosTitleArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    minWidth: 0,
  },
  container: {
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  walletLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.15,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  balance: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 1,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 44,
    minHeight: 44,
  },
});

export default getWalletTransactionsOptions;
