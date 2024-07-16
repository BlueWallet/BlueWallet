import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from '../themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';

const SettingsButton = () => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation();
  const onPress = () => {
    navigate('Settings');
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={loc.settings.default_title}
      testID="SettingsButton"
      style={[style.buttonStyle, { backgroundColor: colors.lightButton }]}
      onPress={onPress}
    >
      <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
    </TouchableOpacity>
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
  },
});
