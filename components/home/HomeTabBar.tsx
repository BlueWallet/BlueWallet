import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loc from '../../loc';
import type { MaterialIconName } from '../Icon';
import Icon from '../Icon';
import { useHomePalette } from './homeTheme';

/** The home's sections. DePIN has no item in the bar: its card on the home opens it. */
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
  /** The app's settings: a screen of their own, not a section. */
  onOpenSettings: () => void;
  onLongPressSettings?: () => void;
  hidden?: boolean;
}

const ITEMS: { tab: HomeTab; icon: MaterialIconName; label: () => string }[] = [
  { tab: 'home', icon: 'home', label: () => loc.home.tab_home },
  { tab: 'assets', icon: 'layers', label: () => loc.home.tab_assets },
  { tab: 'privacy', icon: 'shield', label: () => loc.home.tab_privacy },
];

/**
 * Floating bar: Home and Assets, the scan button in the middle, then Privacy
 * and the app's settings. DePIN is opened from its card on the home.
 */
const HomeTabBar: React.FC<HomeTabBarProps> = ({ tab, onSelect, onScan, onScanLongPress, onOpenSettings, onLongPressSettings, hidden }) => {
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
        <Icon name={item.icon} type="material" size={22} color={color} />
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
      style={[styles.bar, p.dark ? styles.barDark : styles.barLight, { bottom: insets.bottom + BAR_GAP, backgroundColor: p.card }]}
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
      <Pressable
        onPress={onOpenSettings}
        onLongPress={onLongPressSettings}
        accessibilityRole="button"
        accessibilityLabel={loc.home.settings}
        testID="SettingsButton"
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Icon name="tune" type="material" size={22} color={p.mutedOnCard} />
        <Text style={[styles.label, { color: p.mutedOnCard }]} numberOfLines={1}>
          {loc.home.settings}
        </Text>
      </Pressable>
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
  },
  // A soft shadow all round, the top too, so the bar stands apart from the cards scrolling under it;
  // on the dark ground a shadow barely shows, so a faint edge does the rest.
  barLight: { boxShadow: '0px 2px 14px rgba(17, 24, 39, 0.13)' },
  barDark: {
    boxShadow: '0px 2px 16px rgba(0, 0, 0, 0.55)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  item: { flex: 1, height: BAR_HEIGHT - 4, alignItems: 'center', justifyContent: 'center', rowGap: 3 },
  pressed: { opacity: 0.6 },
  label: { fontSize: 11, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
  scan: { width: 56, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

export default HomeTabBar;
