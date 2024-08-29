import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ballOutgoing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    transform: [{ rotate: '225deg' }],
    justifyContent: 'center',
  } as ViewStyle,
});

const TransactionOutgoingIcon: React.FC = () => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballOutgoing: {
      backgroundColor: colors.ballOutgoing,
    },
  });

  return (
    <View style={styles.boxIncoming}>
      <View style={[styles.ballOutgoing, stylesBlueIconHooks.ballOutgoing]}>
        <Icon name="arrow-down" size={16} type="font-awesome" color={colors.outgoingForegroundColor} />
      </View>
    </View>
  );
};

export default TransactionOutgoingIcon;
