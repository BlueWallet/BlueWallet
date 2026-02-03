import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export interface BadgeProps {
  value?: string | number | React.ReactNode;
  badgeStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const Badge: React.FC<BadgeProps> = ({ value, badgeStyle, textStyle }) => {
  return (
    <View style={[styles.badge, badgeStyle]}>
      {typeof value === 'string' || typeof value === 'number' ? <Text style={[styles.text, textStyle]}>{value}</Text> : value}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minHeight: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Badge;
