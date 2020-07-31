/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { palette, typography } from 'app/styles';

type LabelType = 'warning' | 'success' | 'error' | 'neutral';

interface Props {
  type: LabelType;
  children: React.ReactNode;
}

export const Label = ({ type, children }: Props) => (
  <View style={styles.labelWrapper}>
    <Text style={[styles.label, styles[type]]}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  labelWrapper: {
    display: 'flex',
  },
  label: {
    ...typography.status,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 2,
    textAlign: 'center',
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  warning: {
    backgroundColor: palette.textSecondary,
  },
  success: {
    backgroundColor: palette.green,
  },
  error: {
    backgroundColor: palette.textRed,
  },
  neutral: {
    backgroundColor: palette.mediumGrey,
  },
});
