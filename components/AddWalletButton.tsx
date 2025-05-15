import React from 'react';
import { StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from './themes';

type AddWalletButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
};

const styles = StyleSheet.create({
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
});

const AddWalletButton: React.FC<AddWalletButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  return (
    <TouchableOpacity style={[styles.ball, stylesHook.ball]} onPress={onPress}>
      <Icon name="add" size={22} type="ionicons" color={colors.foregroundColor} />
    </TouchableOpacity>
  );
};

export default AddWalletButton;
