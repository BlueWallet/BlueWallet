/**
 * Small pieces the DePIN section shares, in the settings' style: round icon
 * buttons, the unread counter, the sender avatars and the status line.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import loc from '../../loc';
import Icon, { MaterialIconName } from '../Icon';
import { useSettingsPalette } from '../settings/SettingsUI';

/**
 * Unread counters: a deeper green than the marker dot, so white text on it
 * stays readable (5:1) at a counter's small size.
 */
export const UNREAD_BADGE = '#15803d';

/**
 * Avatar colours, one per sender. Every address on a network starts with the
 * same letters, so the colour (with the last four characters) is what tells
 * two senders apart at a glance. All carry white text at 4.5:1 or more.
 */
const AVATAR_COLORS = ['#7c3aed', '#0e7490', '#b45309', '#be123c', '#15803d', '#1d4ed8', '#a21caf', '#4d7c0f'];

export const avatarColor = (address: string): string => {
  let hash = 0;
  for (let index = 0; index < address.length; index++) hash = (hash * 31 + address.charCodeAt(index)) % 2147483647;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/** Last six characters: what the chat calls a sender, everywhere it names one. */
export const addressTag = (address: string): string => address.slice(-6);

/** The avatar's letter: the first of the sender's name, as a capital. */
export const avatarLetter = (address: string): string => addressTag(address).charAt(0).toUpperCase();

export const SenderAvatar: React.FC<{ address: string; size?: number; me?: boolean }> = ({ address, size = 36, me }) => {
  const p = useSettingsPalette();
  const circle = { width: size, height: size, borderRadius: size / 2 };
  if (me) {
    return (
      <View style={[styles.avatar, circle, { backgroundColor: p.accentSoft }]}>
        <Icon name="star" type="material" size={size * 0.5} color={p.accentText} />
      </View>
    );
  }
  return (
    <View style={[styles.avatar, circle, { backgroundColor: avatarColor(address) }]} importantForAccessibility="no-hide-descendants">
      <Text style={[styles.avatarText, size >= 40 ? styles.avatarTextLarge : styles.avatarTextSmall]}>{avatarLetter(address)}</Text>
    </View>
  );
};

export const UnreadBadge: React.FC<{ count: number; style?: object }> = ({ count, style }) =>
  count > 0 ? (
    <View style={[styles.badge, style]} importantForAccessibility="no-hide-descendants">
      <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  ) : null;

/** 44-point round button with an icon, optionally carrying an unread counter. */
export const RoundIconButton: React.FC<{
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
  /** `card` on the screen ground, `ground` inside a card. */
  surface?: 'card' | 'ground';
  badge?: number;
  testID?: string;
}> = ({ icon, label, onPress, surface = 'card', badge = 0, testID }) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${label}, ${loc.formatString(loc.depin.unread_count, { count: badge })}` : label}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [styles.round, { backgroundColor: surface === 'card' ? p.card : p.ground }, pressed && styles.pressed]}
    >
      <Icon name={icon} type="material" size={22} color={p.ink} />
      <UnreadBadge count={badge} style={styles.roundBadge} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '700' },
  avatarTextLarge: { fontSize: 18 },
  avatarTextSmall: { fontSize: 15 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UNREAD_BADGE,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  roundBadge: { position: 'absolute', top: -4, right: -4 },
});
