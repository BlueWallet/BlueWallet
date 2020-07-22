import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from 'app/components';

interface Props {
  mnemonic: string;
}

export const Mnemonic = ({ mnemonic }: Props) => (
  <View style={styles.mnemonicPhraseContainer}>
    {mnemonic.split(' ').map((word, index) => (
      <Chip key={word} label={`${index + 1}. ${word}`} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  mnemonicPhraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
