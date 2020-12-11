import Clipboard from '@react-native-community/clipboard';
import React, { useState } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';

import { typography } from 'app/styles';

import { FlatButton } from './FlatButton';

const i18n = require('../../loc');

interface Props {
  textToCopy: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CopyButton: React.FunctionComponent<Props> = ({ textToCopy, testID, containerStyle }: Props) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = () => {
    setIsCopied(true);
    Clipboard.setString(textToCopy);
  };
  return (
    <FlatButton
      testID={testID}
      containerStyle={containerStyle}
      titleStyle={styles.titleStyle}
      title={isCopied ? i18n._.copied : i18n._.copy}
      onPress={copyToClipboard}
    />
  );
};

const styles = StyleSheet.create({
  titleStyle: {
    ...typography.headline6,
  },
});
