/**
 * The DePIN section's two cards about the identity:
 *
 * - `DepinHeaderCard`, at the top: what DePIN is here, whether the chat is
 *   ready (in words, not only a colour) and, in its corner, the way to the
 *   DePIN server settings.
 * - `DepinAddressPanel`, under the Address tab: the DePIN address, its
 *   derivation path, copy, and a QR as wide as the card.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import type { DepinChatIdentity } from '../../blue_modules/neurai/depinChatIdentity';
import loc from '../../loc';
import Icon from '../Icon';
import QRCode from '../QRCode';
import QrStaggerReveal from '../QrStaggerReveal';
import {
  SettingsBadge,
  SettingsCard,
  SettingsIconCircle,
  SettingsPillButton,
  SettingsStatusLine,
  SettingsStatusTone,
  useSettingsPalette,
} from '../settings/SettingsUI';

const COPIED_MS = 1_600;
/** Padding of the panel around the QR tile, and of the white tile around the code. */
const QR_PANEL_PAD = 12;
const QR_TILE_PAD = 10;
/** A wide screen (tablet) does not need a QR larger than this to be read. */
const QR_MAX = 420;

export type DepinReadiness = 'ready' | 'checking' | 'needs_reveal' | 'server_off' | 'server_incompatible';

const READINESS: Record<DepinReadiness, { tone: SettingsStatusTone; text: () => string }> = {
  ready: { tone: 'ok', text: () => loc.depin.status_ready },
  checking: { tone: 'idle', text: () => loc.depin.status_checking },
  needs_reveal: { tone: 'fail', text: () => loc.depin.status_needs_reveal },
  server_off: { tone: 'fail', text: () => loc.depin.status_server_off },
  server_incompatible: { tone: 'fail', text: () => loc.depin.status_server_incompatible },
};

export const DepinHeaderCard = ({ readiness, onOpenServer }: { readiness: DepinReadiness; onOpenServer: () => void }) => {
  const p = useSettingsPalette();
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
          <SettingsStatusLine tone={status.tone} text={status.text()} busy={readiness === 'checking'} compact testID="DepinReadiness" />
        </View>
      </View>
      {/* Out of the way in the corner: the server is seldom changed. */}
      <Pressable
        onPress={onOpenServer}
        accessibilityRole="button"
        accessibilityLabel={loc.depin.server_title}
        hitSlop={8}
        testID="DepinChatConfig"
        style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
      >
        <Icon name="settings" type="material" size={20} color={p.mutedOnCard} />
      </Pressable>
    </SettingsCard>
  );
};

export const DepinAddressPanel = ({ identity }: { identity: DepinChatIdentity }) => {
  const p = useSettingsPalette();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSpace, setQrSpace] = useState(0);
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

  // As wide as the card allows: the panel's width less its padding and the tile's.
  const qrSize = Math.min(QR_MAX, Math.floor(qrSpace - 2 * QR_PANEL_PAD - 2 * QR_TILE_PAD));

  return (
    <SettingsCard style={styles.card} testID="DepinAddressCard">
      <Text style={[styles.label, { color: p.mutedOnCard }]}>{loc.depin.address_label}</Text>
      {/* Whole, wrapping as needed: on Android a selectable Text ignores the
          one-line ellipsis and draws a clipped second line. An address is
          also something people check character by character. */}
      <Text style={[styles.address, { color: p.ink }]} selectable testID="DepinAddress">
        {identity.address}
      </Text>
      <Text style={[styles.path, { color: p.mutedOnCard }]}>{`${loc.depin.derivation_label}: ${identity.path}`}</Text>
      <View style={styles.actions}>
        <SettingsPillButton
          icon={copied ? 'check' : 'content-copy'}
          title={copied ? loc.depin.copied : loc.depin.copy}
          onPress={copy}
          testID="DepinCopyAddress"
        />
        <SettingsPillButton
          icon="qr-code-2"
          title={showQr ? loc.depin.hide_qr : loc.depin.show_qr}
          onPress={() => setShowQr(value => !value)}
          testID="DepinToggleQr"
        />
      </View>
      {showQr && (
        <View style={[styles.qrPanel, { backgroundColor: p.ground }]} onLayout={event => setQrSpace(event.nativeEvent.layout.width)}>
          {qrSize > 0 ? (
            <View style={styles.qrTile} accessible accessibilityLabel={`${loc.depin.show_qr}: ${identity.address}`} testID="DepinQr">
              <QrStaggerReveal size={qrSize} maskColor="#FFFFFF" runKey={`${identity.address}|${qrSize}`}>
                <QRCode value={identity.address} size={qrSize} />
              </QrStaggerReveal>
            </View>
          ) : null}
        </View>
      )}
    </SettingsCard>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  card: { paddingVertical: 16, rowGap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingRight: 28 },
  texts: { flex: 1, rowGap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  gear: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  address: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  path: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  qrPanel: { alignItems: 'center', borderRadius: 20, padding: QR_PANEL_PAD, marginTop: 6 },
  qrTile: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: QR_TILE_PAD },
});
