import React from 'react';
import { Pressable, Platform } from 'react-native';
import ToolTipMenu from './TooltipMenu';
import { useTheme } from './themes';
import { Action } from './types';
import FontAwesome6Icon from 'react-native-vector-icons/FontAwesome6';

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
        <FontAwesome6Icon size={16} name="ellipsis" color={colors.foregroundColor} {...styleProps} />
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
      <FontAwesome6Icon size={16} name="ellipsis" color={colors.foregroundColor} {...styleProps} />
    </ToolTipMenu>
  );
};

export default HeaderMenuButton;
