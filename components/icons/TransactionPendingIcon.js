import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  icon: {
    left: 0,
    top: 7,
  },
});

const TransactionPendingIcon = props => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ball, stylesHook.ball]}>
        <Icon name="kebab-horizontal" size={16} type="octicon" color={colors.foregroundColor} iconStyle={styles.icon} />
      </View>
    </View>
  );
};

export default TransactionPendingIcon;
