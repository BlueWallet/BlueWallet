import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

const BlueCard: React.FC<ViewProps> = props => {
  return <View {...props} style={styles.blueCard} />;
};

const styles = StyleSheet.create({
  blueCard: {
    padding: 20,
  },
});

export default BlueCard;
