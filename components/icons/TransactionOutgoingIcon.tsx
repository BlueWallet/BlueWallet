import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import FontAwesome6Icon from 'react-native-vector-icons/FontAwesome6';

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
    alignItems: 'center',
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
        <FontAwesome6Icon name="arrow-down" size={16} color={colors.outgoingForegroundColor} />
      </View>
    </View>
  );
};

export default TransactionOutgoingIcon;
