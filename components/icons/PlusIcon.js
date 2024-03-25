import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '../themes';

const styles = StyleSheet.create({
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
});

const PlusIcon = props => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  return (
    <TouchableOpacity style={[styles.ball, stylesHook.ball]} onPress={props.onPress}>
      <Icon name="add" size={22} type="ionicons" color={colors.foregroundColor} />
    </TouchableOpacity>
  );
};

export default PlusIcon;
