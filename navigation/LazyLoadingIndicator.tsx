import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export const LazyLoadingIndicator = () => (
  <View style={styles.root}>
    <ActivityIndicator size="large" />
  </View>
);

export const withLazySuspense = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => (
    <React.Suspense fallback={<LazyLoadingIndicator />}>
      <Component {...props} />
    </React.Suspense>
  );
  Wrapped.displayName = `WithLazySuspense(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
