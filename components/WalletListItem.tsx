import React, { useMemo } from 'react';
import { ImageBackground, ImageSourcePropType, StyleSheet, Text, View, ViewStyle, TextStyle, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useLocale } from '@react-navigation/native';
import { useTheme } from './themes';
import HighlightedText from './HighlightedText';
import { TWallet } from '../class/wallets/types';
import WalletGradient from '../class/wallet-gradient';
import { formatBalance } from '../loc';

type Props = {
  wallet: TWallet;
  iconImage: ImageSourcePropType;
  onPress: () => void;
  searchQuery: string;
  borderBottomColor: string;
  backgroundColor: string;
  titleColor: string;
  onLongPress?: () => void;
  delayLongPress?: number;
  onPressIn?: () => void;
  onPressOut?: () => void;
  isActive?: boolean;
  containerStyle?: ViewStyle;
  balanceColor?: string;
};

const WalletListItem: React.FC<Props> = ({
  wallet,
  iconImage,
  onPress,
  onLongPress,
  delayLongPress = 120,
  onPressIn,
  onPressOut,
  searchQuery,
  isActive,
  containerStyle,
  borderBottomColor,
  backgroundColor,
  titleColor,
  balanceColor,
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();

  const walletLabel = wallet.getLabel();
  const gradientColors = WalletGradient.gradientsFor(wallet.type);

  const resolvedTitleColor = titleColor ?? (dark ? colors.foregroundColor : colors.darkGray);
  const resolvedBalanceColor = balanceColor ?? colors.alternativeTextColor;
  const resolvedBorderBottomColor = borderBottomColor ?? colors.lightBorder;
  const resolvedBackgroundColor = backgroundColor ?? colors.background;

  const titleTextStyle = useMemo(
    () => [styles.listItemLabel, { color: resolvedTitleColor, writingDirection: direction }] as TextStyle[],
    [direction, resolvedTitleColor],
  );
  const balanceTextStyle = useMemo(
    () => [styles.listItemBalance, { color: resolvedBalanceColor, writingDirection: direction }] as TextStyle[],
    [direction, resolvedBalanceColor],
  );

  const balance = useMemo(() => {
    if (wallet.hideBalance) return '';
    return formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true);
  }, [wallet]);

  const highlightStyle = useMemo(() => {
    if (dark) {
      return StyleSheet.flatten([styles.highlightDark, { color: resolvedTitleColor }]);
    }

    // On light backgrounds, HighlightedText's default white-ish border can be hard to see.
    return StyleSheet.flatten([styles.highlightLight, { color: resolvedTitleColor }]);
  }, [dark, resolvedTitleColor]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        {
          backgroundColor: isActive ? colors.lightButton : resolvedBackgroundColor,
          borderBottomColor: resolvedBorderBottomColor,
        },
        pressed && styles.pressed,
        containerStyle,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? delayLongPress : undefined}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      testID={walletLabel}
    >
      <LinearGradient colors={gradientColors} style={styles.iconBox}>
        <ImageBackground source={iconImage} style={styles.iconImage} />
      </LinearGradient>
      <View style={styles.listItemContent}>
        {searchQuery ? (
          <HighlightedText text={walletLabel} query={searchQuery} style={titleTextStyle} highlightStyle={highlightStyle} />
        ) : (
          <Text numberOfLines={1} style={titleTextStyle}>
            {walletLabel}
          </Text>
        )}

        {wallet.hideBalance ? (
          <View style={styles.hiddenBalance}>
            <View style={styles.hiddenBalanceBar} />
          </View>
        ) : (
          <Text numberOfLines={1} style={balanceTextStyle}>
            {balance}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 46,
    height: 46,
    resizeMode: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  listItemLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemBalance: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  hiddenBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  hiddenBalanceBar: {
    backgroundColor: 'rgba(150, 150, 150, 0.25)',
    height: 10,
    width: 66,
    borderRadius: 5,
  },
  highlightDark: {
    backgroundColor: 'rgba(255, 245, 192, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  highlightLight: {
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
});

export default WalletListItem;
