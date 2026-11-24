import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
  /** Circle and icon colours of this action, when it stands out (an on state, a feature colour). */
  fill?: string;
  tint?: string;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Round quick actions: under the balance (send, receive, addresses, copy),
 * and wherever a screen offers a few like them. `circleColor` sets the
 * circles on a ground that is not the home's.
 */
const HomeActions: React.FC<{ actions: HomeAction[]; circleColor?: string }> = ({ actions, circleColor }) => {
  const p = useHomePalette();
  return (
    <View style={styles.row}>
      {actions.map(action => {
        const tint = action.disabled ? p.muted : (action.tint ?? p.ink);
        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            onLongPress={action.onLongPress}
            disabled={action.disabled || action.loading}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.disabled, busy: !!action.loading }}
            testID={action.testID}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <View style={[styles.circle, { backgroundColor: action.fill ?? circleColor ?? p.card }]}>
              {action.loading ? <ActivityIndicator color={tint} /> : <Icon name={action.icon} type="material" size={24} color={tint} />}
            </View>
            <Text style={[styles.label, { color: action.disabled ? p.muted : p.ink }]} numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingTop: 18 },
  action: { flex: 1, alignItems: 'center', rowGap: 8, maxWidth: 96 },
  pressed: { opacity: 0.6 },
  circle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
});

export default HomeActions;
