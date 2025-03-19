import React, { useMemo } from 'react';
import { StyleSheet, SectionList, SectionListProps } from 'react-native';

import { useTheme } from './themes';

const SafeAreaSectionList = <ItemT, SectionT>(props: SectionListProps<ItemT, SectionT>) => {
  const { style, contentContainerStyle, ...otherProps } = props;
  const { colors } = useTheme();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  return (
    <SectionList
      style={componentStyle}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      automaticallyAdjustsScrollIndicatorInsets
      progressViewOffset={60} // Adjusted to account for navigation header height
      contentContainerStyle={contentContainerStyle}
      contentInset={{ top: 0, left: 0, bottom: 100, right: 0 }}
      {...otherProps}
    />
  );
};

export default SafeAreaSectionList;
