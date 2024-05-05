import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from './themes';
import React from 'react';

interface HeaderRightButtonProps {
  disabled: boolean;
  onPress?: () => void;
  title: string;
  testID?: string;
}

export const HeaderRightButton: React.FC<HeaderRightButtonProps> = ({ disabled = true, onPress, title, testID }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.save, { backgroundColor: colors.lightButton }]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={[styles.saveText, { color: colors.buttonTextColor }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 8,
    height: 34,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
