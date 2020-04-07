import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { Button, ButtonProps } from 'react-native-elements';
import { palette, typography } from 'styles';

export enum ButtonType {
  Standard,
  Warning,
}

interface Props extends ButtonProps {
  buttonType?: ButtonType;
}

export const FlatButton = (props: Props) => {
  const { buttonType } = props;

  return (
    <Button
      {...props}
      type={'clear'}
      titleStyle={[
        buttonType && buttonType === ButtonType.Warning ? styles.warningTitle : styles.standardTitle,
        typography.button,
        props.titleStyle as TextStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  standardTitle: {
    color: palette.secondary,
  },
  warningTitle: {
    color: palette.textRed,
  },
});
