/**
 * One of a wallet's addresses in a list, compact: its index in a small round
 * badge, the address in monospace (cut in the middle, or whole with the match
 * marked while searching) and, once it has received or spent, a quiet "Used"
 * with its address dimmed, so fresh and used addresses tell apart at a glance.
 * Tapping it opens the address.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import loc from '../../loc';
import HighlightedText from '../HighlightedText';
import Icon from '../Icon';
import { useSettingsPalette } from '../settings/SettingsUI';

interface AddressRowProps {
  address: string;
  index: number;
  used: boolean;
  onPress: () => void;
  search?: string;
  divider?: boolean;
}

export const AddressRow: React.FC<AddressRowProps> = ({ address, index, used, onPress, search = '', divider }) => {
  const p = useSettingsPalette();
  const color = used ? p.mutedOnCard : p.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={used ? `${index}, ${address}, ${loc.addresses.used}` : `${index}, ${address}`}
      testID={`AddressRow-${index}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.badge, { backgroundColor: p.ground }]}>
        <Text style={[styles.badgeText, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {index}
        </Text>
      </View>
      <View style={styles.texts}>
        {search.length > 0 ? (
          <HighlightedText text={address} query={search} caseSensitive={false} style={[styles.address, { color }]} />
        ) : (
          <Text style={[styles.address, { color }]} numberOfLines={1} ellipsizeMode="middle">
            {address}
          </Text>
        )}
      </View>
      {used && (
        <View style={styles.used} testID={`AddressUsed-${index}`}>
          <View style={[styles.dot, { backgroundColor: p.mutedOnCard }]} />
          <Text style={[styles.usedText, { color: p.mutedOnCard }]}>{loc.addresses.used}</Text>
        </View>
      )}
      <Icon name="chevron-right" type="material" size={18} color={p.mutedOnCard} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: 48, paddingVertical: 6 },
  pressed: { opacity: 0.6 },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  texts: { flex: 1 },
  address: { fontFamily: 'monospace', fontSize: 13, fontWeight: '600' },
  used: { flexDirection: 'row', alignItems: 'center', columnGap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  usedText: { fontSize: 12, fontWeight: '500' },
});
