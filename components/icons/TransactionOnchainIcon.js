import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ballIncoming: {
    width: 30,
    height: 30,
    borderRadius: 15,
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
  },
  icon: {
    left: 0,
    top: 0,
    transform: [{ rotate: '-45deg' }],
  },
});

const TransactionOnchainIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballIncoming: {
      backgroundColor: colors.ballReceive,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballIncoming, stylesBlueIconHooks.ballIncoming]}>
        <Icon name="link" size={16} type="font-awesome" color={colors.incomingForegroundColor} iconStyle={styles.icon} />
      </View>
    </View>
  );
};

export default TransactionOnchainIcon;
