import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MaterialIconName } from '../Icon';
import Icon from '../Icon';
import { useHomePalette } from './homeTheme';

export interface HomeAction {
  key: string;
  label: string;
  icon: MaterialIconName;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

/** Round quick actions under the balance (send, receive, addresses, copy). */
const HomeActions: React.FC<{ actions: HomeAction[] }> = ({ actions }) => {
  const p = useHomePalette();
  return (
    <View style={styles.row}>
      {actions.map(action => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          onLongPress={action.onLongPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          testID={action.testID}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={[styles.circle, { backgroundColor: p.card }]}>
            <Icon name={action.icon} type="material" size={24} color={p.ink} />
          </View>
          <Text style={[styles.label, { color: p.ink }]} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingTop: 18 },
  action: { flex: 1, alignItems: 'center', rowGap: 8, maxWidth: 96 },
  pressed: { opacity: 0.6 },
  circle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500' },
});

export default HomeActions;
