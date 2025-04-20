import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ballIncomingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
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
        <Icon name="bolt" size={16} color={colors.incomingForegroundColor} />
      </View>
    </View>
  );
};

export default TransactionOffchainIncomingIcon;
