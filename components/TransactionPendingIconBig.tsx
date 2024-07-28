import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from './themes';

export const TransactionPendingIconBig: React.FC = () => {
  const { colors } = useTheme();

  const hookStyles = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  return (
    <View>
      <View style={styles.boxIncoming}>
        <View style={[styles.ball, hookStyles.ball]}>
          <Icon name="more-horiz" type="material" size={100} color={colors.foregroundColor} iconStyle={styles.iconStyle} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  },
  ball: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  iconStyle: {
    left: 0,
    top: 25,
  },
});
