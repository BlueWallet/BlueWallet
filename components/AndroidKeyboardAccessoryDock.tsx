import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardState, runOnJS, useAnimatedKeyboard, useAnimatedReaction } from 'react-native-reanimated';

import { KEYBOARD_ACCESSORY_BAR_HEIGHT } from './DoneAndDismissKeyboardInputAccessory';

interface AndroidKeyboardAccessoryDockProps {
  accessory: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Android has no InputAccessoryView. useAnimatedKeyboard is the height source
 * that actually matches the IME. Wait until the IME is OPEN, then snap the
 * accessory and the scroll lift together so the bar does not appear before
 * the keyboard.
 *
 * Keep this hook mounted for the lifetime of Import Wallet. Unmounting it on
 * blur (Scan is a root modal) does not reliably resubscribe when we return.
 */
const AndroidKeyboardAccessoryDock: React.FC<AndroidKeyboardAccessoryDockProps> = ({ accessory, children }) => {
  const keyboard = useAnimatedKeyboard();
  const [settledHeight, setSettledHeight] = useState(0);

  useAnimatedReaction(
    () => (keyboard.state.value === KeyboardState.OPEN && keyboard.height.value > 0 ? keyboard.height.value : 0),
    (height, previous) => {
      if (height !== previous) {
        runOnJS(setSettledHeight)(height);
      }
    },
  );

  const layoutStyle = StyleSheet.create({
    shell: {
      flex: 1,
      paddingBottom: settledHeight > 0 ? settledHeight + KEYBOARD_ACCESSORY_BAR_HEIGHT : 0,
    },
    dock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: settledHeight,
      zIndex: 10,
      elevation: 10,
    },
  });

  return (
    <View style={layoutStyle.shell}>
      {children}
      {settledHeight > 0 && (
        <View pointerEvents="box-none" style={layoutStyle.dock}>
          {accessory}
        </View>
      )}
    </View>
  );
};

export default AndroidKeyboardAccessoryDock;
