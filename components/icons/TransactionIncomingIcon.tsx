import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../Icon';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ballIncoming: {
    width: 36,
    height: 36,
    borderRadius: 18,
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const TransactionIncomingIcon: React.FC = () => {
  const { colors } = useTheme();

  const stylesHooks = StyleSheet.create({
    ballIncoming: {
      backgroundColor: colors.ballReceive,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballIncoming, stylesHooks.ballIncoming]}>
        <Icon name="arrow-down" size={16} type="font-awesome" color={colors.incomingForegroundColor} />
      </View>
    </View>
  );
};

export default TransactionIncomingIcon;
