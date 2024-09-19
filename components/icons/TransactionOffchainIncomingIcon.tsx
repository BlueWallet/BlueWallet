import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ballIncomingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
  } as ViewStyle,
  icon: {
    left: 0,
    marginTop: 6,
  },
});

const TransactionOffchainIncomingIcon: React.FC = () => {
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
    ballIncomingWithoutRotate: {
      backgroundColor: colors.ballReceive,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballIncomingWithoutRotate, stylesHooks.ballIncomingWithoutRotate]}>
        <Icon name="bolt" size={16} type="font-awesome" color={colors.incomingForegroundColor} iconStyle={styles.icon} />
      </View>
    </View>
  );
};

export default TransactionOffchainIncomingIcon;
