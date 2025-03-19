import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

const SafeAreaScrollView = (props: ScrollViewProps) => {
  const { style, contentContainerStyle, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  const contentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        paddingRight: insets.right,
      },
      contentContainerStyle,
    );
  }, [insets, contentContainerStyle]);

  return (
    <ScrollView
      style={componentStyle}
      contentContainerStyle={contentStyle}
      {...otherProps}
      automaticallyAdjustKeyboardInsets
      automaticallyAdjustsScrollIndicatorInsets
    />
  );
};

export default SafeAreaScrollView;
