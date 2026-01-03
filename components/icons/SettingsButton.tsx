import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@rneui/themed';
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
    alignContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  iconContainer: {
    padding: 0,
    margin: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  icon: {
    padding: 0,
    margin: 0,
    lineHeight: 22,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});
