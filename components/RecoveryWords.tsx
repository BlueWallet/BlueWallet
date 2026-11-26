/**
 * Recovery words to write down: numbered, two to a row, in a card. The whole
 * phrase is also in a hidden text that the end-to-end tests read.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsCard, useSettingsPalette } from './settings/SettingsUI';

const RecoveryWords: React.FC<{ words: string; testID?: string }> = ({ words, testID = 'Secret' }) => {
  const p = useSettingsPalette();
  const list = words.trim().split(/\s+/);
  return (
    <SettingsCard style={styles.card}>
      <View style={styles.grid}>
        {list.map((word, index) => (
          <View key={`${index}-${word}`} style={[styles.word, { backgroundColor: p.ground }]}>
            <Text style={[styles.index, { color: p.mutedOnCard }]}>{index + 1}</Text>
            <Text style={[styles.text, { color: p.ink }]} numberOfLines={1}>
              {word}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.hidden} testID={testID}>
        {words}
      </Text>
    </SettingsCard>
  );
};

export default RecoveryWords;

const styles = StyleSheet.create({
  card: { paddingVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  word: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  index: { width: 20, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  text: { flex: 1, fontSize: 16, fontWeight: '600' },
  hidden: { height: 0, width: 0 },
});
