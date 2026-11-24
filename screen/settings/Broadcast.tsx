/**
 * Raw transaction broadcaster for Neurai, opened from Settings → Network.
 *
 * The user pastes or scans a signed transaction hex, picks a network (testnet
 * by default), and we relay it through the default Neurai backend
 * (`createDefaultBackend`). On success we surface the txid the node accepts;
 * on failure we show the backend error verbatim so users debugging a build can
 * see *why* the node rejected it. Useful for a transaction signed elsewhere
 * (offline, another wallet) or one that has to be sent again.
 */
import React, { useCallback, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { createDefaultBackend, NeuraiNetwork } from '../../blue_modules/neurai';
import presentAlert, { AlertType } from '../../components/Alert';
import { ConnectFooter, ConnectInfoRow } from '../../components/ConnectUI';
import Icon, { MaterialIconName } from '../../components/Icon';
import {
  SettingsCard,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegment,
  SettingsSegmented,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';

const networkName = (network: NeuraiNetwork): string =>
  network === 'mainnet' ? loc.wallets.neurai_network_mainnet : loc.wallets.neurai_network_testnet;

const NETWORKS: SettingsSegment<NeuraiNetwork>[] = [
  { value: 'mainnet', label: networkName('mainnet'), icon: 'public', testID: 'BroadcastMainnet' },
  { value: 'testnet', label: networkName('testnet'), icon: 'science', testID: 'BroadcastTestnet' },
];

/** Small round-ended button under the text field. */
const Pill: React.FC<{ icon: MaterialIconName; title: string; onPress: () => void; disabled?: boolean; testID?: string }> = ({
  icon,
  title,
  onPress,
  disabled,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [styles.pill, { backgroundColor: p.ground }, (pressed || disabled) && styles.pressed]}
    >
      <Icon name={icon} type="material" size={18} color={p.ink} />
      <Text style={[styles.pillText, { color: p.ink }]}>{title}</Text>
    </Pressable>
  );
};

const Broadcast: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const [rawHex, setRawHex] = useState('');
  const [network, setNetwork] = useState<NeuraiNetwork>('testnet');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [resultTxid, setResultTxid] = useState<string | null>(null);

  const onBroadcast = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = rawHex.trim().toLowerCase();
    if (!/^[0-9a-f]+$/.test(trimmed) || trimmed.length < 20) {
      presentAlert({ message: loc.settings.broadcast_invalid });
      return;
    }
    setIsBroadcasting(true);
    setResultTxid(null);
    try {
      const backend = createDefaultBackend(network, 'legacy');
      const txid = await backend.broadcast(trimmed);
      setResultTxid(txid);
    } catch (err: any) {
      presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setIsBroadcasting(false);
    }
  }, [rawHex, network]);

  const pasteFromClipboard = useCallback(async () => {
    const text = (await Clipboard.getString()) ?? '';
    if (text) setRawHex(text.trim());
  }, []);

  const scan = useCallback(async () => {
    const scanned = await scanQrHelper();
    if (scanned) setRawHex(scanned.trim());
  }, []);

  const copyTxid = useCallback(() => {
    if (!resultTxid) return;
    Clipboard.setString(resultTxid);
    presentAlert({ message: loc._.clipboard, type: AlertType.Toast });
  }, [resultTxid]);

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="BroadcastScreen">
      <SettingsScreenHeader title={loc.settings.network_broadcast} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <SettingsSectionLabel>{loc.settings.network}</SettingsSectionLabel>
          <SettingsCard style={styles.padded}>
            <SettingsSegmented segments={NETWORKS} value={network} onChange={setNetwork} testID="BroadcastNetwork" />
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.broadcast_tx_label}</SettingsSectionLabel>
          <SettingsCard style={styles.padded}>
            <TextInput
              testID="TxHexInput"
              value={rawHex}
              placeholder={loc.settings.broadcast_placeholder}
              placeholderTextColor={p.mutedOnCard}
              multiline
              onChangeText={setRawHex}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBroadcasting}
              style={[styles.input, { backgroundColor: p.ground, color: p.ink }]}
              underlineColorAndroid="transparent"
            />
            <View style={styles.pills}>
              <Pill icon="content-paste" title={loc.send.input_paste} onPress={pasteFromClipboard} disabled={isBroadcasting} />
              <Pill icon="qr-code-scanner" title={loc.settings.broadcast_scan} onPress={scan} disabled={isBroadcasting} />
            </View>
          </SettingsCard>
          <Text style={[styles.note, { color: p.muted }]}>
            {String(loc.formatString(loc.settings.network_broadcast_explanation, { network: networkName(network) }))}
          </Text>
        </View>

        {resultTxid && (
          <SettingsCard testID="BroadcastResult">
            <ConnectInfoRow
              tone="ok"
              icon="check"
              title={loc.settings.broadcast_sent}
              subtitle={loc.transactions.txid}
              detail={resultTxid}
            />
            <View style={[styles.copyRow, { borderTopColor: p.divider }]}>
              <Pill icon="content-copy" title={loc.transactions.details_copy} onPress={copyTxid} />
            </View>
          </SettingsCard>
        )}
      </ScrollView>

      <ConnectFooter
        primary={{
          title: loc.send.broadcastButton,
          onPress: onBroadcast,
          disabled: rawHex.trim().length === 0,
          loading: isBroadcasting,
          testID: 'BroadcastButton',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  padded: { paddingVertical: 14, rowGap: 12 },
  input: {
    minHeight: 140,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'monospace',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  pills: { flexDirection: 'row', columnGap: 8 },
  pill: { height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  pillText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
  copyRow: { flexDirection: 'row', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});

export default Broadcast;
