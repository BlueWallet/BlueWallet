import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ButtonProps } from 'react-native-elements';
import { palette, typography } from 'styles';

export enum ButtonType {
  Standard,
  Warning,
}

interface Props extends ButtonProps {
  buttonType?: ButtonType;
}

export const FlatButton = (props: Props) => (
  <Button
    {...(props as ButtonProps)}
    type={'clear'}
    titleStyle={[
      props.buttonType && props.buttonType === ButtonType.Warning ? styles.warningTitle : styles.standardTitle,
      typography.button,
    ]}
  />
);

const styles = StyleSheet.create({
  standardTitle: {
    color: palette.secondary,
  },
  warningTitle: {
    color: palette.textRed,
  },
});
