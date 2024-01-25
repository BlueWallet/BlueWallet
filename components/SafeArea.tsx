import React, { useMemo } from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from './themes';

const SafeArea = (props: ViewProps) => {
  const { style, ...otherProps } = props;
  const { colors } = useTheme();

  const componentStyle = useMemo(() => {
    return StyleSheet.compose({ flex: 1, backgroundColor: colors.background }, style);
  }, [colors.background, style]);

  return <SafeAreaView style={componentStyle} {...otherProps} />;
};

export default SafeArea;
