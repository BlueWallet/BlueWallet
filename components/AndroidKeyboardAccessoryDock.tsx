import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { KeyboardState, runOnJS, useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';

interface AndroidKeyboardAccessoryDockProps {
  children: React.ReactNode;
}

/**
 * Android has no InputAccessoryView. RN's keyboardDidShow also fires when the IME
 * *starts* animating, with a stale height, and never emits the settled frame.
 * Reanimated listens to WindowInsetsAnimation, so we wait until the IME is OPEN
 * and then pin to the live inset.
 */
const AndroidKeyboardAccessoryDock: React.FC<AndroidKeyboardAccessoryDockProps> = ({ children }) => {
  const keyboard = useAnimatedKeyboard();
  const [isSettled, setIsSettled] = useState(false);

  useAnimatedReaction(
    () => {
      if (keyboard.state.value === KeyboardState.OPEN && keyboard.height.value > 0) {
        return 1;
      }
      return keyboard.height.value <= 0 ? 0 : -1;
    },
    (phase, previous) => {
      if (phase === previous) {
        return;
      }
      if (phase === 1) {
        runOnJS(setIsSettled)(true);
      } else if (phase === 0) {
        runOnJS(setIsSettled)(false);
      }
    },
  );

  const dockStyle = useAnimatedStyle(() => ({
    bottom: keyboard.height.value,
  }));

  if (!isSettled) {
    return null;
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.dock, dockStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
});

export default AndroidKeyboardAccessoryDock;
