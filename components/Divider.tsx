import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from './themes';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
}

const Divider: React.FC<DividerProps> = ({ style, color }) => {
  const { colors } = useTheme();
  const backgroundColor = color ?? colors.formBorder;

  return <View style={[styles.divider, { backgroundColor }, style]} />;
};

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});

export default Divider;
