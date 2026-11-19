import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, StyleSheet, View } from 'react-native';
import { KeyboardState, runOnJS, useAnimatedKeyboard, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import {
  getKeyboardAccessoryDockPaddingHeight,
  KeyboardDockActiveContext,
  KEYBOARD_ACCESSORY_BAR_HEIGHT,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_H,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_RADIUS,
  keyboardAccessoryUsesAndroidSeparator,
  keyboardAccessoryUsesCapsuleChrome,
} from './keyboardAccessory';
import { useTheme } from './themes';

export interface KeyboardAccessoryDockProps {
  accessory: React.ReactNode;
  children: React.ReactNode;
  /** When false, hide the dock even if the IME height hook is stale (e.g. input not focused). */
  active?: boolean;
  /** Height reserved for the accessory chrome (bar + platform margins). Defaults to shared padding height. */
  barHeight?: number;
}

interface DockShellProps {
  accessory: React.ReactNode;
  children: React.ReactNode;
  /** Live IME height — updates when the keyboard type/size changes. */
  settledHeight: number;
  barHeight: number;
}

const DockShell: React.FC<DockShellProps> = ({ accessory, children, settledHeight, barHeight }) => {
  const { colors } = useTheme();

  const layoutStyle = StyleSheet.create({
    shell: {
      flex: 1,
      // Capsule margins must show the screen, not the elevated fill. Full-bleed bars keep the elevated shell.
      backgroundColor: keyboardAccessoryUsesCapsuleChrome ? 'transparent' : colors.elevated,
      paddingBottom: settledHeight > 0 ? settledHeight + barHeight : 0,
    },
    dock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: settledHeight,
      zIndex: 10,
      elevation: 10,
    },
    chrome: {
      height: KEYBOARD_ACCESSORY_BAR_HEIGHT,
      maxHeight: KEYBOARD_ACCESSORY_BAR_HEIGHT,
      overflow: 'hidden',
      backgroundColor: colors.inputBackgroundColor,
      justifyContent: 'center',
    },
    chromeCapsule: {
      marginHorizontal: KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_H,
      marginBottom: KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM,
      borderRadius: KEYBOARD_ACCESSORY_IOS_CAPSULE_RADIUS,
    },
    chromeAndroid: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.formBorder,
    },
  });

  return (
    <KeyboardDockActiveContext.Provider value={settledHeight > 0}>
      <View style={layoutStyle.shell}>
        {children}
        {settledHeight > 0 && (
          <View pointerEvents="box-none" style={layoutStyle.dock}>
            <View
              style={[
                layoutStyle.chrome,
                keyboardAccessoryUsesCapsuleChrome && layoutStyle.chromeCapsule,
                keyboardAccessoryUsesAndroidSeparator && layoutStyle.chromeAndroid,
              ]}
            >
              {accessory}
            </View>
          </View>
        )}
      </View>
    </KeyboardDockActiveContext.Provider>
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
 * Android edge-to-edge: useAnimatedKeyboard tracks live IME height (including when the
 * user switches keyboard types). Only snap once the show event has fired, so a leading
 * OPEN height cannot place the bar early.
 */
const AndroidImeDock: React.FC<KeyboardAccessoryDockProps> = ({
  accessory,
  children,
  active = true,
  barHeight = getKeyboardAccessoryDockPaddingHeight(),
}) => {
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
    <DockShell accessory={accessory} settledHeight={settledHeight} barHeight={barHeight}>
      {children}
    </DockShell>
  );
};

/**
 * iOS: didShow/didHide gate visibility (avoid willShow jump). didChangeFrame keeps the
 * dock pinned when switching keyboard types (emoji, numbers, languages) changes height.
 */
const IOSKeyboardDock: React.FC<KeyboardAccessoryDockProps> = ({
  accessory,
  children,
  active = true,
  barHeight = getKeyboardAccessoryDockPaddingHeight(),
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const applyHeight = (event: KeyboardEvent) => {
      const nextHeight = event.endCoordinates.height;
      // Ignore zero-height frame updates while switching keyboards; clear only on hide.
      if (nextHeight > 0) {
        setKeyboardHeight(nextHeight);
      }
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', applyHeight);
    const changeSub = Keyboard.addListener('keyboardDidChangeFrame', applyHeight);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, []);

  // Keep the last non-zero height. Blur then focus of the next field does not emit keyboardDidShow again,
  // so clearing here hides the bar until the keyboard is dismissed and shown.
  const settledHeight = active && keyboardHeight > 0 ? keyboardHeight : 0;

  return (
    <DockShell accessory={accessory} settledHeight={settledHeight} barHeight={barHeight}>
      {children}
    </DockShell>
  );
};

/** Docks an accessory bar above the IME on both platforms, with shared chrome styling. */
const KeyboardAccessoryDock: React.FC<KeyboardAccessoryDockProps> = props => {
  return Platform.OS === 'android' ? <AndroidImeDock {...props} /> : <IOSKeyboardDock {...props} />;
};

export default KeyboardAccessoryDock;
