import React, { useCallback } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type PressableScaleProps = {
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  /** Pressed scale. Defaults to the app-wide 0.97 pattern. */
  scaleTo?: number;
};

/**
 * Pressable that scales its children on press-in/out (same feel as receive card / wallet carousel).
 */
const PressableScale: React.FC<PressableScaleProps> = ({
  onPress,
  disabled,
  testID,
  style,
  children,
  accessibilityLabel,
  scaleTo = 0.97,
}) => {
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(scaleTo, { duration: 110, easing: Easing.out(Easing.quad) });
  }, [pressScale, scaleTo]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
  }, [pressScale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
    >
      <Animated.View style={pressAnimatedStyle}>{children}</Animated.View>
    </Pressable>
  );
};

export default PressableScale;
