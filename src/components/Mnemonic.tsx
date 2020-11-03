import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from 'app/components';

interface Props {
  mnemonic: string;
}

export const Mnemonic = ({ mnemonic }: Props) => (
  <View style={styles.mnemonicPhraseContainer}>
    {mnemonic.split(' ').map((word, index) => (
      <View style={styles.chipContainer} key={index + word}>
        <Chip label={`${index + 1}. ${word}`} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  chipContainer: {
    marginEnd: 16,
    marginBottom: 16,
  },
  mnemonicPhraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
