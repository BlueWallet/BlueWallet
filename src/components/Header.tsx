import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { GradientView } from './GradientView';
import { getStatusBarHeight, palette, typography } from 'styles';

export const Header = ({ title }: { title: string }) => {
  return (
    <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: getStatusBarHeight() + 11, paddingBottom: 11 },
  title: {
    ...typography.headline4,
    color: palette.white,
    textAlign: 'center',
  },
});
