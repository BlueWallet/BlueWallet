import React, { useMemo, forwardRef } from 'react';
import { StyleSheet, ScrollView, ScrollViewProps, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './themes';

const ANDROID_EXTRA_TOP_PADDING = 44;

interface SafeAreaScrollViewProps extends ScrollViewProps {
  floatingButtonHeight?: number;
}

const SafeAreaScrollView = forwardRef<ScrollView, SafeAreaScrollViewProps>((props, ref) => {
  const { style, contentContainerStyle, floatingButtonHeight = 0, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const androidTopPadding = Platform.OS === 'android' ? insets.top + ANDROID_EXTRA_TOP_PADDING : 0;

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    const basePadding: {
      paddingBottom: number;
      paddingTop: number;
      paddingLeft?: number;
      paddingRight?: number;
    } = {
      paddingBottom: insets.bottom + floatingButtonHeight,
      // Add extra padding for Android to account for header overlap
      paddingTop: (insets.top > 0 ? 5 : 0) + androidTopPadding,
    };

    if (!StyleSheet.flatten(contentContainerStyle)?.paddingHorizontal && !StyleSheet.flatten(contentContainerStyle)?.paddingLeft) {
      basePadding.paddingLeft = insets.left;
    }

    if (!StyleSheet.flatten(contentContainerStyle)?.paddingHorizontal && !StyleSheet.flatten(contentContainerStyle)?.paddingRight) {
      basePadding.paddingRight = insets.right;
    }

    return StyleSheet.compose(basePadding, contentContainerStyle);
  }, [insets, contentContainerStyle, floatingButtonHeight, androidTopPadding]);

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
