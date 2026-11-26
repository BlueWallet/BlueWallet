/**
 * About a token chat: how the DePIN server keeps its messages (lifetime,
 * sizes, cipher), what the pool holds now, who can read the group, and the
 * way to the DePIN server settings.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PoolStats, RecipientInfo } from '../../hooks/useDePINChat';
import loc from '../../loc';
import { SettingsButton, SettingsIconCircle, SettingsRow, useSettingsPalette } from '../settings/SettingsUI';
import { addressTag, RoundIconButton } from './DepinUI';
import type { DepinServerInfo } from './types';

interface DepinChatInfoModalProps {
  identityAddress: string;
  onClose: () => void;
  onOpenServer: () => void;
  recipients: RecipientInfo[];
  selectedAsset: string;
  serverInfo: DepinServerInfo | null;
  serverUrl: string;
  stats: PoolStats | null;
  visible: boolean;
}

const DepinChatInfoModal = ({
  identityAddress,
  onClose,
  onOpenServer,
  recipients,
  selectedAsset,
  serverInfo,
  serverUrl,
  stats,
  visible,
}: DepinChatInfoModalProps) => {
  const p = useSettingsPalette();
  const rows = (
    [
      [loc.depin.info_ttl, serverInfo?.messageexpiryhours != null ? `${serverInfo.messageexpiryhours} h` : null],
      [loc.depin.info_max_pool, serverInfo?.maxpoolsizemb != null ? `${serverInfo.maxpoolsizemb} MB` : null],
      [loc.depin.info_max_msg_size, serverInfo?.maxmessagesize != null ? `${serverInfo.maxmessagesize} B` : null],
      [loc.depin.info_max_recipients, serverInfo?.maxrecipients ?? null],
      [loc.depin.info_cipher, serverInfo?.cipher ?? null],
      [loc.depin.info_total_messages, stats?.total_messages ?? null],
      [loc.depin.info_expiring, stats?.expiring_in_24h ?? null],
    ] as Array<[string, string | number | null]>
  ).filter((row): row is [string, string | number] => row[1] != null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={loc._.close} />
        <View style={[styles.card, { backgroundColor: p.card }]} accessibilityViewIsModal testID="DepinInfoSheet">
          <View style={styles.head}>
            <SettingsIconCircle icon="info-outline" />
            <View style={styles.headTexts}>
              <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
                {loc.depin.info_title}
              </Text>
              <Text style={[styles.token, { color: p.mutedOnCard }]}>{selectedAsset}</Text>
            </View>
            <RoundIconButton icon="close" label={loc._.close} onPress={onClose} surface="ground" />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {rows.length > 0 && (
              <View style={[styles.table, { backgroundColor: p.ground }]}>
                {rows.map(([label, value], index) => (
                  <View
                    key={label}
                    style={[styles.infoRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
                    accessible
                    accessibilityLabel={`${label}: ${value}`}
                  >
                    <Text style={[styles.infoLabel, { color: p.mutedOnCard }]}>{label}</Text>
                    <Text style={[styles.infoValue, { color: p.ink }]}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: p.mutedOnCard }]} accessibilityRole="header">
              {`${loc.depin.info_members} · ${recipients.length}`}
            </Text>
            <View style={styles.members}>
              {recipients.map(recipient => (
                <View key={recipient.address} style={[styles.member, { backgroundColor: p.ground }]}>
                  <Text style={[styles.memberText, { color: p.ink }]}>
                    {recipient.address === identityAddress ? loc.depin.you : addressTag(recipient.address)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.serverCard, { backgroundColor: p.ground }]}>
              <SettingsRow
                icon="dns"
                title={loc.depin.server_title}
                subtitle={serverUrl}
                onPress={() => {
                  onClose();
                  onOpenServer();
                }}
                testID="DepinInfoServer"
              />
            </View>
          </ScrollView>

          <SettingsButton title={loc._.close} onPress={onClose} testID="DepinInfoClose" />
        </View>
      </View>
    </Modal>
  );
};

export default DepinChatInfoModal;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 28, padding: 18, rowGap: 14, maxHeight: '86%' },
  head: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  headTexts: { flex: 1, rowGap: 2 },
  title: { fontSize: 18, fontWeight: '700' },
  token: { fontSize: 13, fontWeight: '600' },
  scroll: { flexGrow: 0 },
  scrollContent: { rowGap: 14 },
  table: { borderRadius: 18, paddingHorizontal: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    minHeight: 44,
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14, flexShrink: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4 },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  member: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  memberText: { fontFamily: 'monospace', fontSize: 12 },
  serverCard: { borderRadius: 18, paddingHorizontal: 14 },
});
