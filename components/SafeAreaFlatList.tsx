import React, { useMemo } from 'react';
import { StyleSheet, FlatList, FlatListProps, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './themes';

// Android needs more padding to account for the header overlap
const ANDROID_EXTRA_TOP_PADDING = 30;

const SafeAreaFlatList = <ItemT,>(props: FlatListProps<ItemT>) => {
  const { style, contentContainerStyle, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Additional top padding for Android to prevent header overlap
  const androidTopPadding = Platform.OS === 'android' ? ANDROID_EXTRA_TOP_PADDING : 0;

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        // Add extra padding for Android to account for header overlap
        paddingTop: androidTopPadding,
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle, androidTopPadding]);

  return <FlatList style={componentStyle} contentContainerStyle={contentStyle} {...otherProps} />;
};

export default SafeAreaFlatList;
