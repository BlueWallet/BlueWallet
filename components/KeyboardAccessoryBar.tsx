import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  KEYBOARD_ACCESSORY_BAR_HEIGHT,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_H,
  KEYBOARD_ACCESSORY_IOS_CAPSULE_RADIUS,
  keyboardAccessoryUsesAndroidSeparator,
  keyboardAccessoryUsesCapsuleChrome,
} from './keyboardAccessory';
import { useTheme } from './themes';

interface KeyboardAccessoryBarProps {
  children: React.ReactNode;
  /** Side inset. The iOS capsule uses the shared dock margin. Android stays full width. */
  horizontalMargin?: number;
}

/**
 * The dock's bar chrome, without the overlay that pins it to the screen bottom.
 * Form sheets host this on the keyboard (iOS) or in the sheet footer (Android).
 */
const KeyboardAccessoryBar: React.FC<KeyboardAccessoryBarProps> = ({
  children,
  horizontalMargin = keyboardAccessoryUsesCapsuleChrome ? KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_H : 0,
}) => {
  const { colors } = useTheme();

  const layoutStyle = StyleSheet.create({
    chrome: {
      height: KEYBOARD_ACCESSORY_BAR_HEIGHT,
      maxHeight: KEYBOARD_ACCESSORY_BAR_HEIGHT,
      overflow: 'hidden',
      backgroundColor: colors.inputBackgroundColor,
      justifyContent: 'center',
      marginHorizontal: horizontalMargin,
    },
    chromeCapsule: {
      marginBottom: KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM,
      borderRadius: KEYBOARD_ACCESSORY_IOS_CAPSULE_RADIUS,
    },
    chromeAndroid: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.formBorder,
    },
  });

  return (
    <View
      style={[
        layoutStyle.chrome,
        keyboardAccessoryUsesCapsuleChrome && layoutStyle.chromeCapsule,
        keyboardAccessoryUsesAndroidSeparator && layoutStyle.chromeAndroid,
      ]}
    >
      {children}
    </View>
  );
};

export default KeyboardAccessoryBar;
