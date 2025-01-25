import React from 'react';
import { Pressable, Platform } from 'react-native';
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
        style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
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
      isMenuPrimaryAction
      onPressMenuItem={onPressMenuItem}
      actions={menuActions}
      title={title}
    >
      <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} {...styleProps} />
    </ToolTipMenu>
  );
};

export default HeaderMenuButton;
