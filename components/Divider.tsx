import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface DividerProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
  orientation?: 'horizontal' | 'vertical';
  width?: number;
}

export const Divider: React.FC<DividerProps> = ({ style, color = '#E1E8EE', orientation = 'horizontal', width = 1 }) => {
  const styles = StyleSheet.create({
    divider: {
      backgroundColor: color,
      ...(orientation === 'horizontal'
        ? { height: width, width: '100%' }
        : { width, height: '100%' }),
    },
  });

  return <View style={[styles.divider, style]} />;
};
