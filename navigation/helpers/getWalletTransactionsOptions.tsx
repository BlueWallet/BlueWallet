import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, StyleSheet, Text, View, useWindowDimensions, StyleProp, ViewStyle } from 'react-native';
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import { DetailViewStackParamList } from '../DetailViewStackParamList';
import { navigationRef } from '../../NavigationService';
import { RouteProp } from '@react-navigation/native';
import { isDesktop, isIOS26OrHigher } from '../../blue_modules/environment';
import loc from '../../loc';
import { useTheme } from '../../components/themes';
import WalletGradient from '../../class/wallet-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export type WalletTransactionsRouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

const HERO_HEADER_ICON_COLOR = '#FFFFFF';

const navigateToWalletDetails = (walletID: string) => {
  navigationRef.navigate('WalletDetails', {
    walletID,
  });
};

/** Material "more" button for platforms without native header items. */
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

/** Native toolbar ellipsis for WalletTransactions on iOS 26+, excluding Catalyst. */
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

const SCROLLED_HEADER_FADE_IN_MS = 180;
const SCROLLED_HEADER_FADE_OUT_MS = 150;

const usesIos26AnimatedScrolledHeader = Platform.OS === 'ios' && isIOS26OrHigher && !isDesktop;

/** Native stack options used when scrolled; includes props missing from the published TS types. */
type WalletTransactionsScrolledHeaderOptions = NativeStackNavigationOptions & {
  headerTitleContainerStyle?: StyleProp<ViewStyle>;
};

/** Horizontal space reserved so the scrolled title does not run under back / header-right actions. */
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

type WalletTransactionsScrolledHeaderTitleProps = {
  walletLabel: string;
  balance: string;
};

type WalletTransactionsScrolledHeaderTitleAnimatedProps = WalletTransactionsScrolledHeaderTitleProps & {
  scrolled: boolean;
};

const WalletTransactionsScrolledHeaderTitleAnimated: React.FC<WalletTransactionsScrolledHeaderTitleAnimatedProps> = ({
  scrolled,
  walletLabel,
  balance,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(scrolled ? 1 : 0, {
      duration: scrolled ? SCROLLED_HEADER_FADE_IN_MS : SCROLLED_HEADER_FADE_OUT_MS,
    });
  }, [opacity, scrolled]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[scrolledHeaderTitleStyles.animatedTitleWrapper, { width: screenWidth }, animatedStyle]} pointerEvents="box-none">
      <WalletTransactionsScrolledHeaderTitle walletLabel={walletLabel} balance={balance} />
    </Animated.View>
  );
};

const WalletTransactionsScrolledHeaderTitle: React.FC<WalletTransactionsScrolledHeaderTitleProps> = ({ walletLabel, balance }) => {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { maxWidth, titleInsetLeft, titleInsetRight } = getScrolledHeaderTitleLayout(screenWidth);

  const titleColor = Platform.OS === 'ios' ? colors.foregroundColor : '#FFFFFF';

  const titleContent = (
    <>
      <Text style={[scrolledHeaderTitleStyles.walletLabel, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
        {walletLabel}
      </Text>
      {balance.length > 0 ? (
        <Text style={[scrolledHeaderTitleStyles.balance, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
          {balance}
        </Text>
      ) : null}
    </>
  );

  if (Platform.OS === 'ios') {
    // Full-width root is for layout only; box-none keeps headerRight ("…") tappable.
    return (
      <View style={[scrolledHeaderTitleStyles.iosHeaderRoot, { width: screenWidth }]} pointerEvents="box-none">
        <View
          style={[
            scrolledHeaderTitleStyles.container,
            scrolledHeaderTitleStyles.iosTitleArea,
            { left: titleInsetLeft, right: titleInsetRight },
          ]}
          pointerEvents="box-none"
        >
          {titleContent}
        </View>
      </View>
    );
  }

  return <View style={[scrolledHeaderTitleStyles.container, { maxWidth }]}>{titleContent}</View>;
};

const getWalletTransactionsOptions = ({
  route,
  theme,
  screenWidth,
}: {
  route: WalletTransactionsRouteProps;
  theme: ReturnType<typeof useTheme>;
  screenWidth: number;
}): WalletTransactionsScrolledHeaderOptions => {
  const { isLoading = false, walletID, walletType, headerScrolled = false, walletLabel = '', walletBalance = '' } = route.params;
  const iconColor = headerScrolled && Platform.OS === 'ios' ? theme.colors.foregroundColor : HERO_HEADER_ICON_COLOR;
  const headerTitle = () =>
    usesIos26AnimatedScrolledHeader ? (
      <WalletTransactionsScrolledHeaderTitleAnimated scrolled={headerScrolled} walletLabel={walletLabel} balance={walletBalance} />
    ) : (
      <WalletTransactionsScrolledHeaderTitle walletLabel={walletLabel} balance={walletBalance} />
    );

  const base: WalletTransactionsScrolledHeaderOptions = {
    title: '',
    headerBackTitleStyle: { fontSize: 0 },
    headerTransparent: true,
    headerStyle: {
      backgroundColor: 'transparent',
    },
    headerBackButtonDisplayMode: 'minimal',
    headerShadowVisible: false,
    headerTintColor: iconColor,
    headerBlurEffect: undefined,
    statusBarStyle: 'light',
    headerBackTitle: undefined,
    ...(Platform.OS === 'ios' && isIOS26OrHigher && !isDesktop
      ? { unstable_headerRightItems: createWalletDetailsHeaderRightItems({ isLoading, walletID }) }
      : { headerRight: createWalletDetailsHeaderRight({ walletID, isLoading, iconColor }) }),
  };

  if (headerScrolled || usesIos26AnimatedScrolledHeader) {
    base.headerTitle = headerTitle;
    Object.assign(
      base,
      Platform.OS === 'ios'
        ? buildIos26HeaderTitleLayoutOptions(screenWidth)
        : {
            headerTitleAlign: 'left',
            headerTitleContainerStyle: {
              paddingRight: getScrolledHeaderTitleLayout(screenWidth).titleInsetRight,
              flexShrink: 1,
              minWidth: 0,
              alignItems: 'flex-start',
            },
          },
    );
  }

  if (headerScrolled) {
    if (Platform.OS === 'ios') {
      if (!usesIos26AnimatedScrolledHeader) base.headerBlurEffect = theme.dark ? 'dark' : 'light';
    } else {
      base.headerStyle = { backgroundColor: WalletGradient.headerColorFor(walletType) };
    }
  }

  return base;
};

const styles = StyleSheet.create({
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 44,
    minHeight: 44,
  },
});

export default getWalletTransactionsOptions;

const scrolledHeaderTitleStyles = StyleSheet.create({
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
});
