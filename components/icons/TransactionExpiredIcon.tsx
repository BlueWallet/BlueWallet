import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../Icon';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ballOutgoingExpired: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const TransactionExpiredIcon: React.FC = () => {
  const { colors } = useTheme();

  const stylesHooks = StyleSheet.create({
    ballOutgoingExpired: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballOutgoingExpired, stylesHooks.ballOutgoingExpired]}>
        <Icon name="clock" size={16} type="font-awesome-6" color="#9AA0AA" />
      </View>
    </View>
  );
};

export default TransactionExpiredIcon;
