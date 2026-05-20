import { useLocale } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useTheme } from './themes';

const BlueFormLabel: React.FC<TextProps> = props => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  return <Text {...props} style={[styles.blueFormLabel, { color: colors.foregroundColor, writingDirection: direction }]} />;
};

const styles = StyleSheet.create({
  blueFormLabel: {
    fontWeight: '400',
    marginHorizontal: 20,
  },
});

export default BlueFormLabel;
