import React, { useState } from 'react';
import { StyleSheet, Clipboard } from 'react-native';

import { typography } from 'app/styles';

import { FlatButton } from './FlatButton';

interface Props {
  textToCopy: string;
}

export const CopyButton = ({ textToCopy }: Props) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = async () => {
    setIsCopied(true);
    await Clipboard.setString(textToCopy);
  };
  return <FlatButton titleStyle={styles.titleStyle} title={isCopied ? 'Copied!' : 'Copy'} onPress={copyToClipboard} />;
};

const styles = StyleSheet.create({
  titleStyle: {
    ...typography.headline6,
  },
});
