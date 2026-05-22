import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useTheme } from './themes';

interface AddressLabelBadgeProps {
  label: string;
  style: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const AddressLabelBadge: React.FC<AddressLabelBadgeProps> = ({ label, style, onPress, accessibilityLabel }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    badge: { backgroundColor: colors.success },
    text: { color: colors.successCheck },
  });

  const content = (
    <Text style={[styles.text, stylesHook.text]} numberOfLines={1}>
      {label}
    </Text>
  );

  return onPress ? (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.badge, stylesHook.badge, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </TouchableOpacity>
  ) : (
    <View style={[styles.badge, stylesHook.badge, style]}>{content}</View>
  );
};

export default AddressLabelBadge;

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
  },
});
