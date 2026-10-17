import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../components/themes';
import { menuShortcuts } from '../../blue_modules/menuActions';
import loc from '../../loc';

export default function KeyboardShortcuts() {
  const { colors } = useTheme();
  const modifier = Platform.OS === 'ios' ? '⌘' : 'Ctrl+';
  const shortcuts = (
    Platform.OS === 'android'
      ? [...menuShortcuts, { title: 'Open wallet menu', key: 'M', where: 'Anywhere after unlocking' }]
      : menuShortcuts
  ).filter(item => Platform.OS === 'ios' || !('appleOnly' in item && item.appleOnly));
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} testID="KeyboardShortcuts">
      <Text style={[styles.description, { color: colors.foregroundColor }]}>
        Commands appear when they are available on the current screen.
      </Text>
      {shortcuts.map(item => (
        <View key={'action' in item ? item.action : item.title} style={styles.row}>
          <View style={styles.label}>
            <Text style={[styles.title, { color: colors.foregroundColor }]}>
              {'action' in item && item.action === 'manageWallets' ? `${loc.wallets.manage_title}…` : item.title}
            </Text>
            <Text style={{ color: colors.alternativeTextColor }}>
              {'action' in item && item.action === 'manageWallets' ? loc.wallets.manage_wallets_shortcut_where : item.where}
            </Text>
          </View>
          <Text style={[styles.shortcut, { color: colors.foregroundColor }]}>
            {(!('usesCommand' in item) || item.usesCommand !== false) && modifier}
            {item.key}
          </Text>
        </View>
      ))}
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
