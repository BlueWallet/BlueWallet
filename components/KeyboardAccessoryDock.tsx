import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, StyleSheet, View } from 'react-native';
import { KeyboardState, runOnJS, useAnimatedKeyboard, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import {
  getKeyboardAccessoryDockPaddingHeight,
  KeyboardDockActiveContext,
  KEYBOARD_ACCESSORY_BAR_HEIGHT,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_H,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_RADIUS,
  useKeyboardAccessoryAndroidSeparator,
  useKeyboardAccessoryCapsuleChrome,
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
      backgroundColor: colors.elevated,
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
                useKeyboardAccessoryCapsuleChrome && layoutStyle.chromeCapsule,
                useKeyboardAccessoryAndroidSeparator && layoutStyle.chromeAndroid,
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
 * Android edge-to-edge: useAnimatedKeyboard tracks live IME height (including when the
 * user switches keyboard types). Gate on `active` + OPEN so focus does not reuse a stale
 * height before the keyboard rises.
 */
const AndroidImeDock: React.FC<KeyboardAccessoryDockProps> = ({
  accessory,
  children,
  active = true,
  barHeight = getKeyboardAccessoryDockPaddingHeight(),
}) => {
  const keyboard = useAnimatedKeyboard();
  const activeSv = useSharedValue(active ? 1 : 0);
  const [settledHeight, setSettledHeight] = useState(0);

  useEffect(() => {
    activeSv.value = active ? 1 : 0;
    if (!active) {
      setSettledHeight(0);
    }
  }, [active, activeSv]);

  useAnimatedReaction(
    () => {
      if (activeSv.value !== 1) {
        return 0;
      }
      // Track height whenever the IME is open — including height changes from keyboard-type switches.
      return keyboard.state.value === KeyboardState.OPEN && keyboard.height.value > 0 ? keyboard.height.value : 0;
    },
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
      // Ignore zero-height frame updates while switching keyboards; clear only on didHide.
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

  useEffect(() => {
    if (!active) {
      setKeyboardHeight(0);
    }
  }, [active]);

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
