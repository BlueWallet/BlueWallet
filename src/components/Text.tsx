import React from 'react';
import { Text as BaseText, StyleSheet, TextProps } from 'react-native';

import { palette, typography } from 'app/styles';

type Props = TextProps;

export const Text: React.FunctionComponent<Props> = (props: Props) => (
  <BaseText {...props} style={[styles.text, props.style]} />
);

const styles = StyleSheet.create({
  text: {
    ...typography.body,
    color: palette.textBlack,
  },
});
