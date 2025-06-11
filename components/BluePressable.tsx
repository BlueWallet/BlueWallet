import React from 'react';
import { Platform, Pressable, StyleProp, ViewStyle, View, StyleSheet } from 'react-native';

type BluePressableProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'button' | 'switch' | 'image';
  androidRippleColor?: string;
  iosOpacity?: number;
  androidRippleBorderRadius?: number;
};

const BluePressable = ({
  onPress,
  children,
  style,
  accessibilityRole,
  androidRippleColor,
  androidRippleBorderRadius,
  iosOpacity,
}: BluePressableProps) => {
  const rippleColor = androidRippleColor ?? '#ccc';
  const opacity = iosOpacity ?? 0.6;

  return (
    <View style={[styles.pressableContainer, { borderRadius: androidRippleBorderRadius }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [style, Platform.OS === 'ios' && pressed ? { opacity } : null]}
      >
        {children}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  pressableContainer: {
    overflow: 'hidden',
  },
});
export default BluePressable;
