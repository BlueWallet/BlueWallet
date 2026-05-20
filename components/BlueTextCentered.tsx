import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useTheme } from './themes';

const BlueTextCentered: React.FC<TextProps> = props => {
  const { colors } = useTheme();
  return <Text {...props} style={[styles.blueTextCentered, { color: colors.foregroundColor }]} />;
};

const styles = StyleSheet.create({
  blueTextCentered: {
    textAlign: 'center',
  },
});

export default BlueTextCentered;
