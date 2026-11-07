import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../Icon';
import { useTheme } from '../themes';
import loc from '../../loc';
import ToolTipMenu from '../TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

type SettingsButtonProps = {
  onPress: () => void;
  onManageWalletPress: () => void;
};

const SettingsButton = ({ onPress, onManageWalletPress }: SettingsButtonProps) => {
  const { colors } = useTheme();

  const onPressMenuItem = useCallback(
    (menuItem: string) => {
      switch (menuItem) {
        case CommonToolTipActions.ManageWallet.id:
          onManageWalletPress();
          break;
        default:
          break;
      }
    },
    [onManageWalletPress],
  );

  const actions = useMemo(() => [CommonToolTipActions.ManageWallet], []);
  return (
    <ToolTipMenu
      isButton
      onPress={onPress}
      buttonStyle={[style.buttonStyle, { backgroundColor: colors.lightButton }]}
      accessibilityRole="button"
      accessibilityLabel={loc.settings.default_title}
      testID="SettingsButton"
      onPressMenuItem={onPressMenuItem}
      actions={actions}
      shouldOpenOnLongPress
    >
      <View style={style.iconContainer}>
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
      </View>
    </ToolTipMenu>
  );
};

export default SettingsButton;

const style = StyleSheet.create({
  buttonStyle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
