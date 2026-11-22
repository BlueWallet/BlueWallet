import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DepinChatIdentity } from '../../blue_modules/neurai/depinChatIdentity';
import loc from '../../loc';
import QRCode from '../QRCode';

interface DepinChatAddressCardProps {
  gearButton: ReactNode;
  identity: DepinChatIdentity;
  isReady: boolean;
  onCopy: () => void;
  onToggleQr: () => void;
  showQr: boolean;
  stylesHook: any;
}

const DepinChatAddressCard = ({ gearButton, identity, isReady, onCopy, onToggleQr, showQr, stylesHook }: DepinChatAddressCardProps) => (
  <View style={[styles.addressCard, stylesHook.card]}>
    <View style={[styles.readyBadge, isReady ? styles.readyBadgeOk : styles.readyBadgeNo]}>
      <Text style={styles.readyBadgeText}>{loc.depin.ready_badge}</Text>
    </View>
    <View style={styles.cardTitleRow}>
      <Text style={[styles.title, stylesHook.text]}>{loc.depin.title}</Text>
      <Text style={[styles.experimental, stylesHook.subtext]}>{` — ${loc.depin.experimental}`}</Text>
    </View>
    <Text style={[styles.addressLabel, stylesHook.subtext]}>{loc.depin.address_label}</Text>
    {/* Whole, wrapping as needed: on Android a selectable Text ignores the
        one-line ellipsis and draws a clipped second line under the buttons.
        An address is also something people check character by character. */}
    <Text style={[styles.addressText, stylesHook.text]} selectable>
      {identity.address}
    </Text>
    <View style={styles.addressActions}>
      <Pressable onPress={onCopy} style={[styles.smallBtn, stylesHook.chip]} testID="DepinCopyAddress">
        <Text style={[styles.smallBtnText, stylesHook.chipText]}>{loc.depin.copy}</Text>
      </Pressable>
      <Pressable onPress={onToggleQr} style={[styles.smallBtn, stylesHook.chip]}>
        <Text style={[styles.smallBtnText, stylesHook.chipText]}>{loc.depin.show_qr}</Text>
      </Pressable>
    </View>
    {showQr && (
      <View style={styles.qrWrap}>
        <QRCode value={identity.address} size={180} />
      </View>
    )}
    <View style={styles.hintRow}>
      <Text style={[styles.hint, stylesHook.subtext, styles.flex]}>{`${loc.depin.derivation_label}: ${identity.path}`}</Text>
      {gearButton}
    </View>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  addressCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', columnGap: 8 },
  experimental: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  readyBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBadgeOk: { backgroundColor: '#16a34a' },
  readyBadgeNo: { backgroundColor: '#dc2626' },
  readyBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  addressLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  addressText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  addressActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  smallBtnText: { fontSize: 13, fontWeight: '600' },
  qrWrap: { alignItems: 'center', marginTop: 14 },
  hint: { fontSize: 12, marginTop: 10, lineHeight: 18 },
});

export default DepinChatAddressCard;
