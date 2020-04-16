import React from 'react';
import { Text, GestureResponderEvent, StyleSheet } from 'react-native';

import { palette, typography } from 'app/styles';

interface Props {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
}

export const StyledText = ({ title, onPress }: Props) => (
  <Text style={styles.styledText} onPress={onPress}>
    {title}
  </Text>
);

const styles = StyleSheet.create({
  styledText: {
    ...typography.headline5,
    color: palette.secondary,
  },
});
