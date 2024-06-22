import React from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import loc from '../loc';
import PlusIcon from './icons/PlusIcon';
import { useTheme } from './themes';

interface HeaderProps {
  leftText: string;
  isDrawerList?: boolean;
  onNewWalletPress?: () => void;
  scrollY?: Animated.Value;
  staticText?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ leftText, isDrawerList, onNewWalletPress, scrollY, staticText = false }) => {
  const { colors } = useTheme();
  const styleWithProps = StyleSheet.create({
    root: {
      backgroundColor: isDrawerList ? colors.elevated : colors.background,
      borderTopColor: isDrawerList ? colors.elevated : colors.background,
      borderBottomColor: isDrawerList ? colors.elevated : colors.background,
    },
    text: {
      color: colors.foregroundColor,
    },
  });

  const HEADER_MAX_HEIGHT = 55;
  const HEADER_MIN_HEIGHT = 0;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const headerHeightAnimated = scrollY?.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY?.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.root, styleWithProps.root, !staticText && { height: headerHeightAnimated, opacity: headerOpacity }]}>
      {staticText ? (
        <Text style={[styles.text, styleWithProps.text]}>{leftText}</Text>
      ) : (
        <Animated.Text style={[styles.text, styleWithProps.text]}>{leftText}</Animated.Text>
      )}
      {onNewWalletPress && <PlusIcon accessibilityRole="button" accessibilityLabel={loc.wallets.add_title} onPress={onNewWalletPress} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  text: {
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 34,
  },
});
