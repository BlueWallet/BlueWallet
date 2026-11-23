import React, { useCallback, useRef } from 'react';
import { AccessibilityRole, AccessibilityState, Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';

/** Same press-in scale as transaction and coin-control rows. */
export const usePressScale = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.timing(scaleAnim, {
        toValue,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [scaleAnim],
  );

  const onPressIn = useCallback(() => animateTo(0.97), [animateTo]);
  const onPressOut = useCallback(() => animateTo(1), [animateTo]);
  const pressHaptic = useCallback(() => triggerHapticFeedback(HapticFeedbackTypes.ImpactLight), []);
  const scaleStyle = { transform: [{ scale: scaleAnim }] };

  return { scaleStyle, onPressIn, onPressOut, pressHaptic };
};

type ScalePressableProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
};

/** Pressable that scales to 0.97 and fires a light haptic, matching list rows. */
const ScalePressable = ({
  onPress,
  children,
  style,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  testID,
}: ScalePressableProps) => {
  const { scaleStyle, onPressIn, onPressOut, pressHaptic } = usePressScale();

  const handlePress = useCallback(() => {
    pressHaptic();
    onPress();
  }, [onPress, pressHaptic]);

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={testID}
    >
      <Animated.View style={[style, scaleStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

export default ScalePressable;
