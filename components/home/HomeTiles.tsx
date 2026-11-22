import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MaterialIconName } from '../Icon';
import Icon from '../Icon';
import { useHomePalette } from './homeTheme';

export interface HomeTile {
  key: string;
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  button: string;
  /** Green dot next to the icon (new DePIN traffic). */
  dot?: boolean;
  onPress: () => void;
  testID?: string;
}

/** Two shortcut cards side by side, each with a live line and a button. */
const HomeTiles: React.FC<{ tiles: HomeTile[] }> = ({ tiles }) => {
  const p = useHomePalette();
  return (
    <View style={styles.row}>
      {tiles.map(tile => (
        <View key={tile.key} style={[styles.tile, { backgroundColor: p.card }]}>
          <View style={styles.top}>
            <View style={[styles.iconCircle, { backgroundColor: p.accentSoft }]}>
              <Icon name={tile.icon} type="material" size={20} color={p.accentText} />
            </View>
            {tile.dot && <View style={[styles.dot, { backgroundColor: p.unread }]} />}
          </View>
          <View style={styles.texts}>
            <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
              {tile.title}
            </Text>
            <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
              {tile.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={tile.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${tile.button}: ${tile.title}`}
            testID={tile.testID}
            style={({ pressed }) => [styles.button, { backgroundColor: p.ground }, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonText, { color: p.ink }]}>{tile.button}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', columnGap: 12, paddingHorizontal: 16, paddingTop: 22 },
  tile: { flex: 1, borderRadius: 24, padding: 16, rowGap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  texts: { rowGap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  button: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});

export default HomeTiles;
