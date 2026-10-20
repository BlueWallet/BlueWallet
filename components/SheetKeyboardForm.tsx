import React from 'react';
import { Platform, ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboard } from '../hooks/useKeyboard';

/** Grabber, in-content header and bottom padding of a compact Android form sheet, kept clear of the keyboard. */
const ANDROID_SHEET_CHROME = 140;
/** Never collapse the scroller: at this height part of the form is always on screen and the rest can be scrolled to. */
const MIN_FORM_HEIGHT = 160;

interface SheetKeyboardFormProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Form body for a `fitToContents` form sheet whose controls must stay reachable above the keyboard.
 *
 * iOS: a plain View. A ScrollView inside an iOS `fitToContents` form sheet renders the form at the bottom of the
 * sheet, and iOS already moves the sheet with the keyboard and offers the Done accessory.
 *
 * Android: react-native-screens lifts the sheet above the keyboard only as far as the screen allows, and there is
 * no keyboard accessory. The form scrolls inside a ScrollView capped to the space above the keyboard, so the sheet
 * shrinks to fit and the controls under a tall field can be scrolled into view. No `flex: 1`/`flexGrow: 1`, which
 * would make Android `fitToContents` full height.
 */
const SheetKeyboardForm: React.FC<SheetKeyboardFormProps> = ({ style, children }) => {
  const { height: windowHeight } = useWindowDimensions();
  const { height: keyboardHeight, isVisible: isKeyboardVisible } = useKeyboard();
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'android') {
    return <View style={style}>{children}</View>;
  }

  // Edge-to-edge Android keeps the window size when the keyboard opens (insets change instead), so the keyboard is
  // subtracted once. If a device does shrink the window, the cap is just smaller, never below MIN_FORM_HEIGHT.
  const spaceAboveKeyboard = windowHeight - (isKeyboardVisible ? keyboardHeight : 0) - insets.top - ANDROID_SHEET_CHROME;
  const maxHeight = Math.max(spaceAboveKeyboard, MIN_FORM_HEIGHT);
  const sizeStyle = StyleSheet.create({ cap: { maxHeight } });

  return (
    <ScrollView style={[styles.scroll, sizeStyle.cap]} contentContainerStyle={style} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
});

export default SheetKeyboardForm;
