import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';

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
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [styles.save, { backgroundColor: colors.lightButton }, { opacity }, pressed && styles.pressed]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={[styles.saveText, { color: colors.buttonTextColor }]}>{title}</Text>
    </Pressable>
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
  pressed: {
    opacity: 0.6,
  },
});

export default HeaderRightButton;
