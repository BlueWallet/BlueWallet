import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../themes';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

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
    alignItems: 'center',
  } as ViewStyle,
});

const TransactionOnchainIcon: React.FC = () => {
  const { colors } = useTheme();

  const stylesBlueIconHooks = StyleSheet.create({
    ballIncoming: {
      backgroundColor: colors.ballReceive,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballIncoming, stylesBlueIconHooks.ballIncoming]}>
        <FontAwesome6Icon name="link" size={16} color={colors.incomingForegroundColor} />
      </View>
    </View>
  );
};

export default TransactionOnchainIcon;
