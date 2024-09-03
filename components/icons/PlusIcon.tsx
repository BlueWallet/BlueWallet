import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from '../themes';
import loc from '../../loc';

type PlusIconProps = {
  onPress: () => void;
};

const styles = StyleSheet.create({
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  } as ViewStyle,
});

const PlusIcon: React.FC<PlusIconProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.ball, stylesHook.ball]}
      accessibilityLabel={loc.wallets.add_title}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Icon name="add" size={22} type="ionicons" color={colors.foregroundColor} />
    </TouchableOpacity>
  );
};

export default PlusIcon;
