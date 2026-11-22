import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loc from '../../loc';
import type { MaterialIconName } from '../Icon';
import Icon from '../Icon';
import { useHomePalette } from './homeTheme';

export type HomeTab = 'home' | 'assets' | 'depin' | 'privacy';

const BAR_HEIGHT = 62;
const BAR_GAP = 12;

/** Bottom padding a section needs so its last row clears the floating bar. */
export function homeTabBarSpace(bottomInset: number): number {
  return BAR_HEIGHT + BAR_GAP + bottomInset + 12;
}

/** True while the software keyboard is up: the bar steps aside so it never rides on top of it. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

interface HomeTabBarProps {
  tab: HomeTab;
  onSelect: (tab: HomeTab) => void;
  onScan: () => void;
  onScanLongPress?: () => void;
  /** New DePIN traffic: a green dot on the DePIN item. */
  depinUnread?: boolean;
  hidden?: boolean;
}

const ITEMS: { tab: HomeTab; icon: MaterialIconName; label: () => string }[] = [
  { tab: 'home', icon: 'home', label: () => loc.home.tab_home },
  { tab: 'assets', icon: 'layers', label: () => loc.home.tab_assets },
  { tab: 'depin', icon: 'chat-bubble-outline', label: () => loc.home.tab_depin },
  { tab: 'privacy', icon: 'shield', label: () => loc.home.tab_privacy },
];

/**
 * Floating bar with the wallet's sections and the scan button in the middle.
 * The sections are the ones the wallet screen used to have as tabs.
 */
const HomeTabBar: React.FC<HomeTabBarProps> = ({ tab, onSelect, onScan, onScanLongPress, depinUnread, hidden }) => {
  const p = useHomePalette();
  const insets = useSafeAreaInsets();
  if (hidden) return null;

  const renderItem = (item: (typeof ITEMS)[number]) => {
    const active = item.tab === tab;
    const color = active ? p.ink : p.mutedOnCard;
    return (
      <Pressable
        key={item.tab}
        onPress={() => onSelect(item.tab)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label()}
        testID={`HomeTab-${item.tab}`}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <View>
          <Icon name={item.icon} type="material" size={22} color={color} />
          {item.tab === 'depin' && depinUnread && (
            <View style={[styles.dot, { backgroundColor: p.unread, borderColor: p.card }]} testID="DepinTabUnreadDot" />
          )}
        </View>
        <Text style={[styles.label, active ? styles.labelActive : null, { color }]} numberOfLines={1}>
          {item.label()}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={loc.home.sections}
      style={[styles.bar, { bottom: insets.bottom + BAR_GAP, backgroundColor: p.card, shadowColor: p.shadow }]}
    >
      {renderItem(ITEMS[0])}
      {renderItem(ITEMS[1])}
      <View style={styles.item}>
        <Pressable
          onPress={onScan}
          onLongPress={onScanLongPress}
          accessibilityRole="button"
          accessibilityLabel={loc.home.scan}
          testID="HomeScreenScanButton"
          style={({ pressed }) => [styles.scan, { backgroundColor: p.accent }, pressed && styles.pressed]}
        >
          <Icon name="qr-code-scanner" type="material" size={22} color={p.onAccent} />
        </Pressable>
      </View>
      {renderItem(ITEMS[2])}
      {renderItem(ITEMS[3])}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  item: { flex: 1, height: BAR_HEIGHT - 4, alignItems: 'center', justifyContent: 'center', rowGap: 3 },
  pressed: { opacity: 0.6 },
  label: { fontSize: 11, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
  dot: { position: 'absolute', top: -2, right: -5, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  scan: { width: 56, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

export default HomeTabBar;
