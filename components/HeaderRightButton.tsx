import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from './themes';

interface HeaderRightButtonProps {
  disabled?: boolean;
  onPress?: () => void;
  title: string;
  testID?: string;
  isTransparentBackground?: boolean;
  isTitleBold?: boolean;
}

const HeaderRightButton: React.FC<HeaderRightButtonProps> = ({
  disabled = true,
  onPress,
  title,
  testID,
  isTransparentBackground,
  isTitleBold,
}) => {
  const { colors } = useTheme();
  const opacity = disabled ? 0.5 : 1;
  const styleHook = StyleSheet.create({
    title: { color: colors.buttonTextColor, fontWeight: isTitleBold ? 'bold' : '600' },
    button: { backgroundColor: isTransparentBackground ? 'transparent' : colors.lightButton },
  });
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.save, styleHook.button, { opacity }]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={[styles.saveText, styleHook.title]}>{title}</Text>
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
    fontSize: 16,
  },
});

export default HeaderRightButton;
