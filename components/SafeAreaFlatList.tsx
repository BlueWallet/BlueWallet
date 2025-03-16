import React, { useMemo } from 'react';
import { StyleSheet, FlatList, FlatListProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

const SafeAreaFlatList = <ItemT,>(props: FlatListProps<ItemT>) => {
  const { style, contentContainerStyle, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle]);

  return <FlatList style={componentStyle} contentContainerStyle={contentStyle} {...otherProps} />;
};

export default SafeAreaFlatList;
