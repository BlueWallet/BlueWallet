import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ButtonProps } from 'react-native-elements';

import { palette, typography } from 'app/styles';

export enum ButtonType {
  Standard,
  Warning,
}

interface Props extends ButtonProps {
  buttonType?: ButtonType;
  testID?: string;
}

export const FlatButton = (props: Props) => (
  <Button
    testID={props.testID}
    {...(props as ButtonProps)}
    type={'clear'}
    disabledTitleStyle={styles.disable}
    titleStyle={[
      props.buttonType && props.buttonType === ButtonType.Warning ? styles.warningTitle : styles.standardTitle,
      typography.button,
      props.titleStyle,
    ]}
  />
);

const styles = StyleSheet.create({
  standardTitle: {
    color: palette.secondary,
  },
  disable: {
    color: palette.grey,
  },
  warningTitle: {
    color: palette.textRed,
  },
});
