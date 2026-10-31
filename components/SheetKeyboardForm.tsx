import React, { useState } from 'react';
import { ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboard } from '../hooks/useKeyboard';

/** Grabber, header, and bottom padding that sit outside this scroller. */
const SHEET_CHROME = 140;

interface SheetKeyboardFormProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Form body for a `fitToContents` form sheet whose controls must stay reachable above the keyboard.
 *
 * One scroller on every platform. Its height is the form, capped to the space above the keyboard. `maxHeight` alone
 * makes an iOS ScrollView report that cap as its height, so fitToContents opens a full sheet and the prompt lands at
 * the bottom. `flexGrow: 0` so Android `fitToContents` stays content-sized. The first child keeps this ScrollView out
 * of the chain react-native-screens switches to automatic content insets.
 */
const SheetKeyboardForm: React.FC<SheetKeyboardFormProps> = ({ style, children }) => {
  const { height: windowHeight } = useWindowDimensions();
  const { height: keyboardHeight, isVisible: isKeyboardVisible } = useKeyboard();
  const insets = useSafeAreaInsets();
  const [contentHeight, setContentHeight] = useState(0);

  // Edge-to-edge Android keeps the window size when the keyboard opens, so the keyboard is subtracted once.
  const spaceAboveKeyboard = windowHeight - (isKeyboardVisible ? keyboardHeight : 0) - insets.top - SHEET_CHROME;
  const maxHeight = Math.max(spaceAboveKeyboard, 0);
  const scrollHeight = contentHeight > 0 ? Math.min(contentHeight, maxHeight) : undefined;
  const stylesHook = StyleSheet.create({
    scroll: {
      // ScrollView's own style is flexGrow 1, which makes Android fitToContents full height.
      flexGrow: 0,
      flexShrink: 0,
      ...(scrollHeight !== undefined ? { height: scrollHeight } : {}),
    },
  });

  return (
    <View>
      <View collapsable={false} pointerEvents="none" style={styles.scrollGuard} />
      <ScrollView
        style={stylesHook.scroll}
        contentContainerStyle={style}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={contentHeight > maxHeight}
        onContentSizeChange={(_width, height) => {
          if (height > 0) setContentHeight(current => (Math.abs(current - height) < 1 ? current : height));
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollGuard: {
    height: 1,
    opacity: 0,
  },
});

export default SheetKeyboardForm;
