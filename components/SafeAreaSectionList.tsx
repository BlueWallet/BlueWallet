import React, { useMemo } from 'react';
import { StyleSheet, SectionList, SectionListProps } from 'react-native';

import { useTheme } from './themes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SafeAreaSectionList = <ItemT, SectionT>(props: SectionListProps<ItemT, SectionT>) => {
  const { style, contentContainerStyle, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle]);
  return (
    <SectionList
      style={componentStyle}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      automaticallyAdjustsScrollIndicatorInsets
      progressViewOffset={60}
      contentContainerStyle={contentStyle}
      {...otherProps}
    />
  );
};

export default SafeAreaSectionList;
