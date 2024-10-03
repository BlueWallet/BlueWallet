import React from 'react';
import ToolTipMenu from './TooltipMenu';
import { useTheme } from './themes';
import { Icon } from '@rneui/themed';
import { Platform } from 'react-native';
import { Action } from './types';

interface HeaderMenuButtonProps {
  onPressMenuItem: (id: string) => void;
  actions: Action[];
  disabled?: boolean;
}

const HeaderMenuButton: React.FC<HeaderMenuButtonProps> = ({ onPressMenuItem, actions, disabled }) => {
  const { colors } = useTheme();
  const styleProps = Platform.OS === 'android' ? { iconStyle: { transform: [{ rotate: '90deg' }] } } : {};
  return (
    <ToolTipMenu
      testID="HeaderMenuButton"
      disabled={disabled}
      isButton
      isMenuPrimaryAction
      onPressMenuItem={onPressMenuItem}
      actions={actions}
    >
      <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} {...styleProps} />
    </ToolTipMenu>
  );
};

export default HeaderMenuButton;
