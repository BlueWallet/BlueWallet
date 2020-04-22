import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

import { typography, palette } from 'app/styles';

interface Props {
  children: React.ReactNode;
  label: string;
}

export const LabeledSettingsRow = ({ children, label }: Props) => {
  return (
    <View>
      <View style={styles.greyLine}></View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    paddingBottom: 16,
    ...typography.caption,
    color: palette.textGrey,
  },
  greyLine: {
    marginVertical: 24,
    borderColor: palette.grey,
    width: '120%',
    borderWidth: StyleSheet.hairlineWidth,
    left: -20,
  },
});
