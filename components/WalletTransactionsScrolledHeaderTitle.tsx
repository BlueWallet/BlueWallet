import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { isIOS26OrHigher } from '../blue_modules/environment';
import { useTheme } from './themes';

/** Horizontal space reserved so the scrolled title does not run under back / header-right actions. */
export const getScrolledHeaderTitleLayout = (screenWidth: number) => {
  const titleInsetLeft = Platform.OS === 'ios' ? (isIOS26OrHigher ? 40 : 56) : 72;
  const titleInsetRight = Platform.OS === 'ios' ? (isIOS26OrHigher ? 96 : 84) : 84;
  return {
    maxWidth: Math.max(0, screenWidth - titleInsetLeft - titleInsetRight),
    titleInsetLeft,
    titleInsetRight,
  };
};

type WalletTransactionsScrolledHeaderTitleProps = {
  walletLabel: string;
  balance: string;
};

/**
 * Compact wallet name + balance shown in the nav bar after scrolling.
 * On iOS the root is full-width for layout; pointerEvents must stay box-none so
 * JS headerRight ("…") remains tappable under a transparent header.
 */
export const WalletTransactionsScrolledHeaderTitle: React.FC<WalletTransactionsScrolledHeaderTitleProps> = ({ walletLabel, balance }) => {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { maxWidth, titleInsetLeft, titleInsetRight } = getScrolledHeaderTitleLayout(screenWidth);

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

  if (Platform.OS === 'ios') {
    return (
      <View testID="WalletTransactionsScrolledHeaderTitle" style={[styles.iosHeaderRoot, { width: screenWidth }]} pointerEvents="box-none">
        <View
          testID="WalletTransactionsScrolledHeaderTitleArea"
          style={[styles.container, styles.iosTitleArea, { left: titleInsetLeft, right: titleInsetRight }]}
          pointerEvents="box-none"
        >
          {titleContent}
        </View>
      </View>
    );
  }

  return <View style={[styles.container, { maxWidth }]}>{titleContent}</View>;
};

const styles = StyleSheet.create({
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
