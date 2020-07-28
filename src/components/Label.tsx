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
  <View style={{ ...styles.labelWrapper, ...styles[type] }}>
    <Text style={styles.label}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  labelWrapper: {
    borderRadius: 2,
    maxWidth: 75,
  },
  label: {
    ...typography.status,
    paddingVertical: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
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
