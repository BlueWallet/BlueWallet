import React, { useMemo } from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

interface SafeAreaProps extends ViewProps {
  floatingButtonHeight?: number;
  orientation?: 'portrait' | 'landscape';
}

const SafeArea = (props: SafeAreaProps) => {
  const { style, floatingButtonHeight, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const padding = useMemo(
    () =>
      props.orientation === 'portrait'
        ? {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }
        : {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + (floatingButtonHeight ?? 0),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
    [insets, props.orientation, floatingButtonHeight],
  );

  const componentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        flex: 1,
        backgroundColor: colors.background,
        ...padding,
      },
      style,
    );
  }, [colors.background, padding, style]);

  return <View style={componentStyle} {...otherProps} />;
};

export default SafeArea;
