import React from 'react';
import { Pressable, Platform, StyleSheet } from 'react-native';
import ToolTipMenu from './TooltipMenu';
import { useTheme } from './themes';
import { Icon } from '@rneui/themed';
import { Action } from './types';

interface HeaderMenuButtonProps {
  onPressMenuItem: (id: string) => void;
  actions?: Action[] | Action[][];
  disabled?: boolean;
  title?: string;
}

const HeaderMenuButton: React.FC<HeaderMenuButtonProps> = ({ onPressMenuItem, actions, disabled, title }) => {
  const { colors } = useTheme();
  const styleProps = Platform.OS === 'android' ? { iconStyle: { transform: [{ rotate: '90deg' }] } } : {};

  if (!actions || actions.length === 0) {
    return (
      <Pressable
        testID="HeaderMenuButton"
        disabled={disabled}
        android_ripple={{ color: colors.lightButton }}
        hitSlop={8}
        style={({ pressed }) => [styles.buttonCenter, pressed && styles.pressed]}
      >
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} {...styleProps} />
      </Pressable>
    );
  }

  const menuActions = Array.isArray(actions[0]) ? (actions as Action[][]) : (actions as Action[]);

  return (
    <ToolTipMenu
      testID="HeaderMenuButton"
      disabled={disabled}
      isButton
      shouldOpenOnLongPress={false}
      onPressMenuItem={onPressMenuItem}
      actions={menuActions}
      title={title}
      buttonStyle={styles.buttonCenter}
    >
      <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} {...styleProps} />
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  buttonCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 44,
    minHeight: 44,
  },
  pressed: { opacity: 0.5 },
});

export default HeaderMenuButton;
