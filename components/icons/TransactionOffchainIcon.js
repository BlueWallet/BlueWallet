import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ballOutgoingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  icon: {
    left: 0,
    marginTop: 6,
  },
});

const TransactionOffchainIcon = props => {
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
    ballOutgoingWithoutRotate: {
      backgroundColor: colors.ballOutgoing,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballOutgoingWithoutRotate, stylesHooks.ballOutgoingWithoutRotate]}>
        <Icon name="bolt" size={16} type="font-awesome" color={colors.outgoingForegroundColor} iconStyle={styles.icon} />
      </View>
    </View>
  );
};

export default TransactionOffchainIcon;
