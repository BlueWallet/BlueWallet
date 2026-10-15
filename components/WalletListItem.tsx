import React, { ReactNode, useMemo, useState } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  Pressable,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
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
  onLongPressDrag?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onFocus?: () => void;
  isActive?: boolean;
  containerStyle?: ViewStyle;
  balanceColor?: string;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  accessibilityValue?: string;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  trailingAccessory?: ReactNode;
};

const WalletListItem: React.FC<Props> = ({
  wallet,
  iconImage,
  onPress,
  onLongPressDrag,
  onPressIn,
  onPressOut,
  onFocus,
  searchQuery,
  isActive,
  containerStyle,
  borderBottomColor,
  backgroundColor,
  titleColor,
  balanceColor,
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  accessibilityActions,
  onAccessibilityAction,
  trailingAccessory,
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();
  const { width, fontScale } = useWindowDimensions();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const walletLabel = wallet.getLabel();
  const gradientColors = WalletGradient.gradientsFor(wallet.type);

  const resolvedTitleColor = titleColor ?? colors.foregroundColor;
  const resolvedBalanceColor = balanceColor ?? (dark ? colors.alternativeTextColor : colors.secondButtonTextColor);
  const resolvedBorderBottomColor = borderBottomColor ?? colors.lightBorder;
  const resolvedBackgroundColor = backgroundColor ?? colors.background;
  const rowMetrics = useMemo(() => {
    const isRoomyLayout = width >= 700;
    const accessibilityPadding = Math.max(0, Math.min(fontScale, 1.5) - 1) * 4;
    const round = PixelRatio.roundToNearestPixel;

    return {
      horizontalPadding: round(isRoomyLayout ? 20 : 16),
      verticalPadding: round((isRoomyLayout ? 14 : 12) + accessibilityPadding),
      iconSize: round(isRoomyLayout ? 50 : 46),
      iconRadius: round(isRoomyLayout ? 11 : 10),
      contentGap: round(isRoomyLayout ? 16 : 14),
    };
  }, [fontScale, width]);

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
    try {
      const value = Number(wallet.getBalance());
      if (!Number.isFinite(value)) return '';
      return formatBalance(value, wallet.getPreferredBalanceUnit(), true);
    } catch {
      return '';
    }
  }, [wallet]);

  const highlightStyle = useMemo(() => {
    if (dark) {
      return StyleSheet.flatten([styles.highlightDark, { color: resolvedTitleColor }]);
    }

    // On light backgrounds, HighlightedText's default white-ish border can be hard to see.
    return StyleSheet.flatten([styles.highlightLight, { color: resolvedTitleColor }]);
  }, [dark, resolvedTitleColor]);

  return (
    <View
      style={[
        styles.listItemContainer,
        {
          backgroundColor: isActive ? colors.lightButton : resolvedBackgroundColor,
          borderBottomColor: resolvedBorderBottomColor,
        },
        containerStyle,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.listItem,
          {
            paddingHorizontal: rowMetrics.horizontalPadding,
            paddingVertical: rowMetrics.verticalPadding,
          },
          (isHovered || isFocused) && { backgroundColor: colors.lightButton },
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        onLongPress={onLongPressDrag}
        delayLongPress={onLongPressDrag ? 500 : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => setIsFocused(false)}
        focusable
        tabIndex={0}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? walletLabel}
        accessibilityHint={accessibilityHint}
        accessibilityValue={accessibilityValue || balance ? { text: accessibilityValue ?? balance } : undefined}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
        accessibilityState={{ busy: isActive }}
        testID={walletLabel}
      >
        <LinearGradient
          colors={gradientColors}
          style={[
            styles.iconBox,
            {
              width: rowMetrics.iconSize,
              height: rowMetrics.iconSize,
              borderRadius: rowMetrics.iconRadius,
            },
          ]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <ImageBackground
            source={iconImage}
            style={{ width: rowMetrics.iconSize, height: rowMetrics.iconSize }}
            resizeMode="center"
            accessible={false}
          />
        </LinearGradient>
        <View style={[styles.listItemContent, { marginLeft: rowMetrics.contentGap }]}>
          {searchQuery ? (
            <HighlightedText text={walletLabel} query={searchQuery} style={titleTextStyle} highlightStyle={highlightStyle} />
          ) : (
            <Text numberOfLines={1} style={titleTextStyle}>
              {walletLabel}
            </Text>
          )}

          {wallet.hideBalance ? (
            <View style={styles.hiddenBalance} testID="HiddenBalance">
              <View style={styles.hiddenBalanceBar} />
            </View>
          ) : (
            <Text numberOfLines={1} style={balanceTextStyle}>
              {balance}
            </Text>
          )}
        </View>
      </Pressable>
      {trailingAccessory}
    </View>
  );
};

const styles = StyleSheet.create({
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    cursor: 'pointer',
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listItemContent: {
    flex: 1,
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
