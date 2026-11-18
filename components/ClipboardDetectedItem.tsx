import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import loc from '../loc';
import { useTheme } from './themes';

export type ClipboardDetectedItemProps = {
  value: string;
  label?: string;
  onPress: () => void;
  testID?: string;
  accessibilityHint?: string;
};

const ClipboardDetectedItem: React.FC<ClipboardDetectedItemProps> = ({
  value,
  label = loc.wallets.from_clipboard,
  onPress,
  testID = 'ClipboardDetectedItem',
  accessibilityHint,
}) => {
  const { colors } = useTheme();

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
      pressed: {
        opacity: 0.7,
      },
    }),
    [colors],
  );

  return (
    <View style={[styles.card, stylesHook.card]} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        android_ripple={{ color: colors.androidRippleColor }}
        onPress={onPress}
        style={({ pressed }) => [styles.labelPressable, pressed && stylesHook.pressed]}
      >
        <Text style={[styles.label, stylesHook.label]}>{label}</Text>
      </Pressable>
      <ScrollView style={styles.valueScroll} nestedScrollEnabled bounces={false} showsVerticalScrollIndicator>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          onPress={onPress}
          style={({ pressed }) => (pressed ? stylesHook.pressed : undefined)}
        >
          <Text style={[styles.value, stylesHook.value]} selectable>
            {value}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
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
  valueScroll: {
    maxHeight: 132,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
