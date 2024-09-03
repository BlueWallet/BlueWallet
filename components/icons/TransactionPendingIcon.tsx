import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
  } as ViewStyle,
  icon: {
    left: 0,
    top: 7,
  },
});

const TransactionPendingIcon: React.FC = () => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ball, stylesHook.ball]}>
        <Icon name="more-horiz" type="material" size={16} color={colors.foregroundColor} iconStyle={styles.icon} />
      </View>
    </View>
  );
};

export default TransactionPendingIcon;
