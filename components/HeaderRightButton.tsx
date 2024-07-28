import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from './themes';

interface HeaderRightButtonProps {
  disabled?: boolean;
  onPress?: () => void;
  title: string;
  testID?: string;
}

const HeaderRightButton: React.FC<HeaderRightButtonProps> = ({ disabled = true, onPress, title, testID }) => {
  const { colors } = useTheme();
  const opacity = disabled ? 0.5 : 1;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.save, { backgroundColor: colors.lightButton }, { opacity }]}
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

export default HeaderRightButton;
