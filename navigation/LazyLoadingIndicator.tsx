import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export const LazyLoadingIndicator = () => (
  <View style={styles.root}>
    <ActivityIndicator size="large" />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
