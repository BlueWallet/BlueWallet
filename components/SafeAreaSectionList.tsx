import React, { useMemo } from 'react';
import { StyleSheet, SectionList, SectionListProps } from 'react-native';

import { useTheme } from './themes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaSectionListProps<ItemT, SectionT> extends SectionListProps<ItemT, SectionT> {
  floatingButtonHeight?: number;
}

const SafeAreaSectionList = <ItemT, SectionT>(props: SafeAreaSectionListProps<ItemT, SectionT>) => {
  const { style, contentContainerStyle, floatingButtonHeight = 0, ...otherProps } = props;
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
        paddingTop: insets.top, // Use the actual top inset value from safe area
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle, floatingButtonHeight]);

  return (
    <SectionList
      style={componentStyle}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      automaticallyAdjustsScrollIndicatorInsets
      contentContainerStyle={contentStyle}
      {...otherProps}
    />
  );
};

export default SafeAreaSectionList;
