import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { useTheme } from './themes';

export interface HeaderRightButtonProps {
  disabled?: boolean;
  onPress?: () => void;
  title: string;
  testID?: string;
}

type HeaderRightButtonOptions = Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'>;

const HeaderRightButton: React.FC<HeaderRightButtonProps> = ({ disabled, onPress, title, testID }) => {
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

export const createHeaderRightButtonOptions = (props: HeaderRightButtonProps): HeaderRightButtonOptions => ({
  headerRight: () => <HeaderRightButton {...props} />,
  unstable_headerRightItems: () => [
    {
      type: 'button',
      label: props.title,
      icon: { type: 'sfSymbol', name: 'checkmark' },
      onPress: props.onPress ?? (() => undefined),
      ...(props.disabled !== undefined ? { disabled: props.disabled } : {}),
      identifier: props.testID,
      accessibilityLabel: props.title,
    },
  ],
});

const styles = StyleSheet.create({
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    minWidth: 80,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 34,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HeaderRightButton;
