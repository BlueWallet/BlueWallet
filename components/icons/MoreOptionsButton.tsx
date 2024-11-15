import React from 'react';
import { StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from '../themes';
import ToolTipMenu from '../TooltipMenu';
import { Action } from '../types';

interface MoreOptionsButtonProps {
  onPressMenuItem: (id: string) => void;
  onPress?: () => void;
  actions: Action[] | Action[][];
  testID?: string;
  isMenuPrimaryAction: boolean;
}

const MoreOptionsButton: React.FC<MoreOptionsButtonProps> = ({
  onPressMenuItem,
  onPress,
  actions,
  testID = 'MoreOptionsButton',
  isMenuPrimaryAction = false,
}) => {
  const { colors } = useTheme();

  return (
    <ToolTipMenu
      onPressMenuItem={onPressMenuItem}
      actions={actions}
      isMenuPrimaryAction={isMenuPrimaryAction}
      testID={testID}
      
    >
      <Icon
      containerStyle={[style.buttonStyle, { backgroundColor: colors.lightButton }]}
      size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
    </ToolTipMenu>
  );
};

export default MoreOptionsButton;

const style = StyleSheet.create({
  buttonStyle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
});
