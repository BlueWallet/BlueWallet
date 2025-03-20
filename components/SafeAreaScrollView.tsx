import React, { useMemo, forwardRef } from 'react';
import { StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

interface SafeAreaScrollViewProps extends ScrollViewProps {
  floatingButtonHeight?: number;
}

const SafeAreaScrollView = forwardRef<ScrollView, SafeAreaScrollViewProps>((props, ref) => {
  const { style, contentContainerStyle, floatingButtonHeight = 70, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        paddingBottom: insets.bottom + floatingButtonHeight, // Add extra padding for the floating button
        paddingRight: insets.right,
        paddingLeft: insets.left,
        // Adding top padding to account for navigation header
        paddingTop: insets.top > 0 ? 5 : 0, // Small padding if we have a safe area at top
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle, floatingButtonHeight]);

  return (
    <ScrollView
      ref={ref}
      style={componentStyle}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      automaticallyAdjustsScrollIndicatorInsets
      contentContainerStyle={contentStyle}
      {...otherProps}
    />
  );
});

export default SafeAreaScrollView;
