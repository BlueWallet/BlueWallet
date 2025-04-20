import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ballOutgoingExpired: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
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
        <Icon name="clock" size={16} color="#9AA0AA" />
      </View>
    </View>
  );
};

export default TransactionExpiredIcon;
