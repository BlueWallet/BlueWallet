import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../Icon';
import { useTheme } from '../themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import ToolTipMenu from '../TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

const SettingsButton = () => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation();
  const onPress = () => {
    navigate('Settings');
  };

  const onPressMenuItem = useCallback(
    (menuItem: string) => {
      switch (menuItem) {
        case CommonToolTipActions.ManageWallet.id:
          navigate('ManageWallets');
          break;
        default:
          break;
      }
    },
    [navigate],
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
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} iconStyle={style.icon} />
      </View>
    </ToolTipMenu>
  );
};

export default SettingsButton;

const style = StyleSheet.create({
  buttonStyle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {},
});
