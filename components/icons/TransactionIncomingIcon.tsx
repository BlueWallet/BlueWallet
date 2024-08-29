import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ballIncoming: {
    width: 30,
    height: 30,
    borderRadius: 15,
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
  } as ViewStyle,
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
