import React, { useCallback, useMemo } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import loc from '../loc';
import { usePressScale } from './ScalePressable';
import { useTheme } from './themes';

export type ClipboardDetectedItemProps = {
  value: string;
  label?: string;
  /** Larger label, used by the send address helper. */
  largeLabel?: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityHint?: string;
};

const ClipboardDetectedItem: React.FC<ClipboardDetectedItemProps> = ({
  value,
  label = loc.wallets.from_clipboard,
  largeLabel = false,
  onPress,
  testID = 'ClipboardDetectedItem',
  accessibilityHint,
}) => {
  const { colors } = useTheme();
  const { scaleStyle, onPressIn, onPressOut, pressHaptic } = usePressScale();
  const handlePress = useCallback(() => {
    pressHaptic();
    onPress();
  }, [onPress, pressHaptic]);

  const stylesHook = useMemo(
    () => ({
      card: {
        backgroundColor: colors.inputBackgroundColor,
      },
      label: {
        color: colors.labelText,
      },
      value: {
        color: colors.alternativeTextColor,
      },
    }),
    [colors],
  );

  return (
    <Animated.View style={[styles.card, stylesHook.card, scaleStyle]} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        android_ripple={{ color: colors.androidRippleColor }}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.labelPressable}
      >
        <Text style={[styles.label, largeLabel && styles.labelLarge, stylesHook.label]}>{label}</Text>
      </Pressable>
      <ScrollView style={styles.valueScroll} nestedScrollEnabled bounces={false} showsVerticalScrollIndicator>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Text style={[styles.value, stylesHook.value]} selectable>
            {value}
          </Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
};

export default ClipboardDetectedItem;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  labelPressable: {
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 18,
  },
  valueScroll: {
    maxHeight: 132,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
