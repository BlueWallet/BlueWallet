/**
 * Head of the DePIN section: what DePIN is here, whether the chat is ready
 * (in words, not only a colour), the DePIN address with copy and QR, and the
 * button to the DePIN server settings.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import type { DepinChatIdentity } from '../../blue_modules/neurai/depinChatIdentity';
import loc from '../../loc';
import QRCode from '../QRCode';
import QrStaggerReveal from '../QrStaggerReveal';
import { SettingsBadge, SettingsCard, SettingsIconCircle, useSettingsPalette } from '../settings/SettingsUI';
import { DepinStatusTone, PillButton, RoundIconButton, StatusLine } from './DepinUI';

const QR_SIZE = 200;
const COPIED_MS = 1_600;

export type DepinReadiness = 'ready' | 'checking' | 'needs_reveal' | 'server_off';

const READINESS: Record<DepinReadiness, { tone: DepinStatusTone; text: () => string }> = {
  ready: { tone: 'ok', text: () => loc.depin.status_ready },
  checking: { tone: 'idle', text: () => loc.depin.status_checking },
  needs_reveal: { tone: 'fail', text: () => loc.depin.status_needs_reveal },
  server_off: { tone: 'fail', text: () => loc.depin.status_server_off },
};

interface DepinChatAddressCardProps {
  identity: DepinChatIdentity;
  readiness: DepinReadiness;
  onOpenServer: () => void;
}

const DepinChatAddressCard = ({ identity, readiness, onOpenServer }: DepinChatAddressCardProps) => {
  const p = useSettingsPalette();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copy = () => {
    Clipboard.setString(identity.address);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility(loc.depin.address_copied);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  const status = READINESS[readiness];
  return (
    <SettingsCard style={styles.card} testID="DepinIdentityCard">
      <View style={styles.head}>
        <SettingsIconCircle icon="hub" />
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
              {loc.depin.title}
            </Text>
            <SettingsBadge label={loc.depin.experimental} />
          </View>
          <StatusLine tone={status.tone} text={status.text()} busy={readiness === 'checking'} testID="DepinReadiness" />
        </View>
        <RoundIconButton icon="settings" label={loc.depin.server_title} onPress={onOpenServer} surface="ground" testID="DepinChatConfig" />
      </View>

      <View style={[styles.addressBlock, { borderTopColor: p.divider }]}>
        <Text style={[styles.label, { color: p.mutedOnCard }]}>{loc.depin.address_label}</Text>
        {/* Whole, wrapping as needed: on Android a selectable Text ignores the
            one-line ellipsis and draws a clipped second line. An address is
            also something people check character by character. */}
        <Text style={[styles.address, { color: p.ink }]} selectable testID="DepinAddress">
          {identity.address}
        </Text>
        <Text style={[styles.path, { color: p.mutedOnCard }]}>{`${loc.depin.derivation_label}: ${identity.path}`}</Text>
        <View style={styles.actions}>
          <PillButton
            icon={copied ? 'check' : 'content-copy'}
            title={copied ? loc.depin.copied : loc.depin.copy}
            onPress={copy}
            testID="DepinCopyAddress"
          />
          <PillButton
            icon="qr-code-2"
            title={showQr ? loc.depin.hide_qr : loc.depin.show_qr}
            onPress={() => setShowQr(value => !value)}
            testID="DepinToggleQr"
          />
        </View>
        {showQr && (
          <View style={[styles.qrPanel, { backgroundColor: p.ground }]}>
            <View style={styles.qrTile} accessible accessibilityLabel={`${loc.depin.show_qr}: ${identity.address}`}>
              <QrStaggerReveal size={QR_SIZE} maskColor="#FFFFFF" runKey={identity.address}>
                <QRCode value={identity.address} size={QR_SIZE} />
              </QrStaggerReveal>
            </View>
          </View>
        )}
      </View>
    </SettingsCard>
  );
};

const styles = StyleSheet.create({
  card: { paddingVertical: 16, rowGap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  texts: { flex: 1, rowGap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  addressBlock: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 14, rowGap: 6 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  address: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  path: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  qrPanel: { alignItems: 'center', borderRadius: 20, paddingVertical: 16, marginTop: 6 },
  qrTile: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 8 },
});

export default DepinChatAddressCard;
