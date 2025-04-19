import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import ToolTipMenu from '../TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

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
    <ToolTipMenu onPressMenuItem={onPressMenuItem} actions={actions}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc.settings.default_title}
        testID="SettingsButton"
        style={[style.buttonStyle, { backgroundColor: colors.lightButton }]}
        onPress={onPress}
      >
        <FontAwesome6Icon size={16} name="ellipsis" color={colors.foregroundColor} />
      </TouchableOpacity>
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
});
