import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@rneui/themed';

export const BlurredBalanceView = () => {
  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Icon name="eye-slash" type="font-awesome" color="#FFFFFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
  },
  background: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    height: 30,
    width: 110,
    marginRight: 8,
    borderRadius: 9,
  },
});
