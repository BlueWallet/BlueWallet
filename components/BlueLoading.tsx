import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import NeuraiLoader from './NeuraiLoader';

interface BlueLoadingProps extends ViewProps {
  /** `small` for a loader inside a block; the full-screen one otherwise. */
  size?: 'small' | 'large' | number;
  label?: string;
}

/** A screen (or a block) still loading: the Neurai loader, centred. */
export const BlueLoading: React.FC<BlueLoadingProps> = ({ size, label, ...otherProps }) => {
  const side = typeof size === 'number' ? size : size === 'small' ? 36 : 72;
  return (
    <View style={styles.container} {...otherProps}>
      <NeuraiLoader size={side} label={label} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
});
