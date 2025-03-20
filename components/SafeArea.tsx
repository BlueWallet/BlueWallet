import React, { useMemo } from 'react';
import { StyleSheet, ViewProps, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

interface SafeAreaProps extends ViewProps {
  floatingButtonHeight?: number;
}

const SafeArea = (props: SafeAreaProps) => {
  const { style, floatingButtonHeight = 70, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + (floatingButtonHeight > 0 ? floatingButtonHeight : 0),
        paddingLeft: insets.left,
        paddingRight: insets.right,
        width,
      },
      style,
    );
  }, [colors.background, style, insets, floatingButtonHeight, width]);

  return <View style={componentStyle} {...otherProps} />;
};

export default SafeArea;
