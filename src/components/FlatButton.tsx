import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { Button, ButtonProps } from 'react-native-elements';
import { palette, typography } from 'styles';

export const FlatButton = (props: ButtonProps) => (
  <Button {...props} type={'clear'} titleStyle={[styles.title, props.titleStyle as TextStyle]} />
);

const styles = StyleSheet.create({
  title: {
    color: palette.secondary,
    ...typography.button,
  },
});
