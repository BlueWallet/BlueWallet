import React, { useMemo } from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

const SafeArea = (props: ViewProps) => {
  const { style, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
      style,
    );
  }, [colors.background, style, insets]);

  return <View style={componentStyle} {...otherProps} />;
};

export default SafeArea;
