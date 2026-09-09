import React, { useMemo } from 'react';
import { StyleSheet, SectionList, SectionListProps, Platform, StatusBar } from 'react-native';

import { useTheme } from './themes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaSectionListProps<ItemT, SectionT> extends SectionListProps<ItemT, SectionT> {
  floatingButtonHeight?: number;
  ignoreTopInset?: boolean;
  headerHeight?: number; // Additional header height to account for (e.g., when headerTransparent is true)
}

const SafeAreaSectionList = <ItemT, SectionT>(props: SafeAreaSectionListProps<ItemT, SectionT>) => {
  const { style, contentContainerStyle, floatingButtonHeight = 0, ignoreTopInset = false, headerHeight = 0, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    // Calculate top padding
    const topPadding = (() => {
      // If ignoreTopInset is true, don't apply any top padding
      if (ignoreTopInset) {
        return 0;
      }
      // If explicit headerHeight is provided, use it
      if (headerHeight > 0) {
        return headerHeight;
      }
      // On Android with transparent headers, we need to account for header height
      if (Platform.OS === 'android' && insets.top > 0) {
        return 56 + (StatusBar.currentHeight || insets.top);
      }
      // iOS safe area
      return insets.top;
    })();

    return StyleSheet.compose(
      {
        paddingBottom: insets.bottom + floatingButtonHeight, // Add extra padding for the floating button
        paddingRight: insets.right,
        paddingLeft: insets.left,
        paddingTop: topPadding,
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle, floatingButtonHeight, ignoreTopInset, headerHeight]);

  return (
    <SectionList
      style={componentStyle}
      // `automaticallyAdjustKeyboardInsets` is opt-in: RN's keyboard handler also fires for screens below the
      // stack top and clamps their offset (RCTScrollViewComponentView `_keyboardWillChangeFrame` / `scrollTo:`),
      // scrolling the previous screen. Screens with text inputs pass the prop explicitly.
      // `scrollToOverflowEnabled` works around the same handler for screens that do opt in: it re-applies the current
      // offset via `scrollTo:`, which clamps to the raw `contentInset` instead of `adjustedContentInset`, so content under
      // a large-title header jumps up by the header height when the keyboard opens.
      // Upstream fix: https://github.com/react/react-native/pull/56189
      contentInsetAdjustmentBehavior="automatic"
      scrollToOverflowEnabled
      automaticallyAdjustContentInsets
      automaticallyAdjustsScrollIndicatorInsets
      contentContainerStyle={contentStyle}
      {...otherProps}
    />
  );
};

export default SafeAreaSectionList;
