import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../components/themes';
import { menuShortcuts } from '../../blue_modules/menuActions';
import { getMenuActionTitles } from '../../components/menuActionTitles';
import loc from '../../loc';

export default function KeyboardShortcuts() {
  const { colors } = useTheme();
  const titles = getMenuActionTitles();
  const scopes = {
    anywhere: loc.menu.shortcut_scope_anywhere,
    walletOverview: loc.menu.shortcut_scope_wallet_overview,
    sendCapableTransaction: loc.menu.shortcut_scope_send_capable_transaction,
    receiveCapableTransaction: loc.menu.shortcut_scope_receive_capable_transaction,
    transactions: loc.menu.shortcut_scope_transactions,
    receiveAddress: loc.menu.shortcut_scope_receive_address,
    transactionId: loc.menu.shortcut_scope_transaction_id,
    transactionAdvanced: loc.menu.shortcut_scope_transaction_advanced,
    transactionRbf: loc.menu.shortcut_scope_transaction_rbf,
    transactionCpfp: loc.menu.shortcut_scope_transaction_cpfp,
    transactionExternalAcceleration: loc.menu.shortcut_scope_transaction_external_acceleration,
    transactionCancellation: loc.menu.shortcut_scope_transaction_cancellation,
    onchainTransaction: loc.menu.shortcut_scope_onchain_transaction,
    transaction: loc.menu.shortcut_scope_transaction,
    confirmedOnchainTransaction: loc.menu.shortcut_scope_confirmed_onchain_transaction,
    walletDetails: loc.menu.shortcut_scope_wallet_details,
    sendDetails: loc.menu.shortcut_scope_send_details,
  } as const;
  const platformShortcuts = menuShortcuts
    .filter(item => !item.platform || item.platform === Platform.OS)
    .map(item => ({ ...item, title: titles[item.action], where: scopes[item.scope] }));
  const shortcuts =
    Platform.OS === 'android'
      ? [
          ...platformShortcuts,
          {
            action: 'manageWallets' as const,
            title: loc.menu.open_wallet_menu,
            key: 'M',
            where: loc.menu.shortcut_scope_anywhere,
          },
        ]
      : platformShortcuts;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} testID="KeyboardShortcuts">
      <Text style={[styles.description, { color: colors.foregroundColor }]}>{loc.menu.shortcut_description}</Text>
      {shortcuts.map(item => (
        <View key={`${item.action}-${item.key}`} style={styles.row}>
          <View style={styles.label}>
            <Text style={[styles.title, { color: colors.foregroundColor }]}>{item.title}</Text>
            <Text style={{ color: colors.alternativeTextColor }}>{item.where}</Text>
          </View>
          <Text style={[styles.shortcut, { color: colors.foregroundColor }]}>{formatShortcut(item.key)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const formatShortcut = (key: string) => {
  if (Platform.OS !== 'ios') return `Ctrl+${key}`;
  const parts = key.split('+');
  const input = parts.pop();
  const modifiers = `${parts.includes('Alt') ? '⌥' : ''}${parts.includes('Shift') ? '⇧' : ''}⌘`;
  return `${modifiers}${input}`;
};
const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 48,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  description: { marginBottom: 16, fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  label: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  shortcut: { fontSize: 16, fontWeight: '600' },
});
