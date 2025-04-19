import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ballOutgoingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
});

const TransactionOffchainIcon: React.FC = () => {
  const { colors } = useTheme();

  const stylesHooks = StyleSheet.create({
    ballOutgoingWithoutRotate: {
      backgroundColor: colors.ballOutgoing,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballOutgoingWithoutRotate, stylesHooks.ballOutgoingWithoutRotate]}>
        <FontAwesome6Icon name="bolt" size={16} color={colors.outgoingForegroundColor} />
      </View>
    </View>
  );
};

export default TransactionOffchainIcon;
