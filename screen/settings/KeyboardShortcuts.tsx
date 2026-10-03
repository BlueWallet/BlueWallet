import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { usesHeaderMenu } from '../../components/HeaderMenu';
import { headerMenuShortcutHelp } from '../../blue_modules/headerMenuShortcuts';
import { menuShortcuts } from '../../blue_modules/menuActions';

export default function KeyboardShortcuts() {
  const { colors } = useTheme();
  const modifier = Platform.OS === 'ios' ? '⌘' : 'Ctrl+';
  const screenShortcuts = usesHeaderMenu
    ? headerMenuShortcutHelp().map(item => ({
        ...item,
        key: Platform.OS === 'android' ? item.key.replace('Option+', 'Alt+').replace('Return', 'Enter') : item.key,
      }))
    : [];
  const shortcuts = [
    ...menuShortcuts,
    ...screenShortcuts,
    ...(Platform.OS === 'android' ? [{ title: loc._.menu_open, key: 'M', where: loc._.menu_unlocked_scope }] : []),
  ];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} testID="KeyboardShortcuts">
      <Text style={[styles.description, { color: colors.foregroundColor }]}>
        {usesHeaderMenu ? loc._.menu_shortcut_availability : loc._.menu_shortcut_current}
      </Text>
      {shortcuts.map(item => {
        const apple = Platform.OS === 'ios';
        const displayKey = apple
          ? item.key.replace('Shift+', '⇧').replace('Option+', '⌥').replace('Return', '↩').replace('Esc', '⎋')
          : item.key;
        const spokenKey = item.key
          .replace('Shift+', `${loc._.menu_key_shift} `)
          .replace('Option+', `${loc._.menu_key_option} `)
          .replace('Alt+', `${loc._.menu_key_alt} `)
          .replace('Return', loc._.menu_key_return)
          .replace('Enter', loc._.menu_key_enter)
          .replace(' / Esc', ` ${loc._.menu_key_or} ${loc._.menu_key_escape}`);
        return (
          <View
            key={`${item.title}:${item.key}`}
            style={styles.row}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${item.title}, ${apple ? loc._.menu_key_command : loc._.menu_key_control} ${spokenKey}. ${item.where}`}
          >
            <View style={styles.label}>
              <Text style={[styles.title, { color: colors.foregroundColor }]}>{item.title}</Text>
              <Text style={{ color: colors.alternativeTextColor }}>{item.where}</Text>
            </View>
            <Text style={[styles.shortcut, { color: colors.foregroundColor }]}>
              {modifier}
              {displayKey}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' },
  description: { marginBottom: 16, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 16 },
  label: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  shortcut: { fontSize: 16, fontWeight: '600' },
});
