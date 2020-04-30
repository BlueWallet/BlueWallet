import Clipboard from '@react-native-community/clipboard';
import React, { useState } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';

import { typography } from 'app/styles';

import { FlatButton } from './FlatButton';

interface Props {
  textToCopy: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const CopyButton: React.FunctionComponent<Props> = ({ textToCopy, containerStyle }: Props) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = () => {
    setIsCopied(true);
    Clipboard.setString(textToCopy);
  };
  return (
    <FlatButton
      containerStyle={containerStyle}
      titleStyle={styles.titleStyle}
      title={isCopied ? 'Copied!' : 'Copy'}
      onPress={copyToClipboard}
    />
  );
};

const styles = StyleSheet.create({
  titleStyle: {
    ...typography.headline6,
  },
});
