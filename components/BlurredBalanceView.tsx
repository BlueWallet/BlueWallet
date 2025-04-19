import React from 'react';
import { StyleSheet, View } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

export const BlurredBalanceView = () => {
  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <FontAwesome6Icon name="eye-slash" size={16} color="#FFFFFF" />
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
