import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, StyleSheet, View } from 'react-native';
import { KeyboardState, runOnJS, useAnimatedKeyboard, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import { KEYBOARD_ACCESSORY_BAR_HEIGHT } from './DoneAndDismissKeyboardInputAccessory';
import { useTheme } from './themes';

interface AndroidKeyboardAccessoryDockProps {
  accessory: React.ReactNode;
  children: React.ReactNode;
  /** When false, hide the dock even if the IME height hook is stale (e.g. input not focused). */
  active?: boolean;
}

interface DockShellProps {
  accessory: React.ReactNode;
  children: React.ReactNode;
  settledHeight: number;
}

const DockShell: React.FC<DockShellProps> = ({ accessory, children, settledHeight }) => {
  const { colors } = useTheme();

  const layoutStyle = StyleSheet.create({
    shell: {
      flex: 1,
      backgroundColor: colors.elevated,
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

/**
 * useAnimatedKeyboard reports the final IME height as soon as it is OPEN, while the
 * keyboard is still rising. Wait for keyboardDidShow before using that height, or the
 * bar appears above the keyboard and then jumps down.
 */
export function androidSettledHeight(active: boolean, keyboardShown: boolean, isOpen: boolean, height: number): number {
  'worklet';
  if (!active || !keyboardShown || !isOpen || height <= 0) {
    return 0;
  }
  return height;
}

/**
 * Android edge-to-edge: useAnimatedKeyboard matches the IME. Only snap once the show
 * event has fired, so a leading OPEN height cannot place the bar early.
 */
const AndroidImeDock: React.FC<AndroidKeyboardAccessoryDockProps> = ({ accessory, children, active = true }) => {
  const keyboard = useAnimatedKeyboard();
  const activeSv = useSharedValue(active ? 1 : 0);
  const keyboardShownSv = useSharedValue(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [settledHeight, setSettledHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (activeRef.current) {
        keyboardShownSv.value = 1;
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardShownSv.value = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShownSv]);

  useEffect(() => {
    activeRef.current = active;
    activeSv.value = active ? 1 : 0;
    if (!active) {
      keyboardShownSv.value = 0;
      setSettledHeight(0);
      return;
    }
    // Refocus while the IME is already up does not emit another didShow.
    keyboardShownSv.value = Keyboard.isVisible() ? 1 : 0;
  }, [active, activeSv, keyboardShownSv]);

  useAnimatedReaction(
    () =>
      androidSettledHeight(
        activeSv.value === 1,
        keyboardShownSv.value === 1,
        keyboard.state.value === KeyboardState.OPEN,
        keyboard.height.value,
      ),
    (height, previous) => {
      if (height !== previous) {
        runOnJS(setSettledHeight)(height);
      }
    },
  );

  return (
    <DockShell accessory={accessory} settledHeight={settledHeight}>
      {children}
    </DockShell>
  );
};

/**
 * iOS: use didShow/didHide so the bar appears with the keyboard up, not on willShow
 * (which jumps the bar to its final Y while the keyboard is still animating).
 */
const IOSKeyboardDock: React.FC<AndroidKeyboardAccessoryDockProps> = ({ accessory, children, active = true }) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setKeyboardHeight(0);
    }
  }, [active]);

  const settledHeight = active && keyboardHeight > 0 ? keyboardHeight : 0;

  return (
    <DockShell accessory={accessory} settledHeight={settledHeight}>
      {children}
    </DockShell>
  );
};

/** Docks the import suggestions bar above the IME on both platforms. */
const AndroidKeyboardAccessoryDock: React.FC<AndroidKeyboardAccessoryDockProps> = props => {
  return Platform.OS === 'android' ? <AndroidImeDock {...props} /> : <IOSKeyboardDock {...props} />;
};

export default AndroidKeyboardAccessoryDock;
