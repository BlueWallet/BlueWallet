import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
}

const Divider: React.FC<DividerProps> = ({ style }) => {
  return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'stretch',
  },
});

export default Divider;
