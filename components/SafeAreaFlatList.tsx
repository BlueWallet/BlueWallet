import React, { useMemo } from 'react';
import { StyleSheet, FlatList, FlatListProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

interface SafeAreaFlatListProps<ItemT> extends FlatListProps<ItemT> {
  headerHeight?: number;
  floatingButtonHeight?: number;
}

const SafeAreaFlatList = <ItemT,>(props: SafeAreaFlatListProps<ItemT>) => {
  const { style, contentContainerStyle, headerHeight = 0, floatingButtonHeight = 0, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    // Calculate top padding
    const topPadding = (() => {
      // If explicit headerHeight is provided, use it
      if (headerHeight > 0) {
        return headerHeight;
      }
      // iOS safe area handling is done via ListHeaderComponent typically
      // Android screens should explicitly pass headerHeight if needed
      return 0;
    })();

    return StyleSheet.compose(
      {
        paddingBottom: insets.bottom + floatingButtonHeight,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingTop: topPadding,
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle, headerHeight, floatingButtonHeight]);

  return <FlatList style={componentStyle} contentContainerStyle={contentStyle} {...otherProps} />;
};

export default SafeAreaFlatList;
