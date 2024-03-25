import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ballOutgoingExpired: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
  },
  icon: {
    left: 0,
    top: 0,
  },
});

const TransactionExpiredIcon = props => {
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
    ballOutgoingExpired: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballOutgoingExpired, stylesHooks.ballOutgoingExpired]}>
        <Icon name="clock" size={16} type="octicon" color="#9AA0AA" iconStyle={styles.icon} />
      </View>
    </View>
  );
};

export default TransactionExpiredIcon;
