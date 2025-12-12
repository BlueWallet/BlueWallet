import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  value?: string | number;
  status?: 'primary' | 'success' | 'warning' | 'error';
  badgeStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ value, status = 'primary', badgeStyle, textStyle, containerStyle }) => {
  const statusColors = {
    primary: '#2089dc',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: -4,
      right: -4,
    },
    badge: {
      backgroundColor: statusColors[status],
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

  if (!value) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.badge, badgeStyle]}>
        <Text style={[styles.text, textStyle]}>{value}</Text>
      </View>
    </View>
  );
};
