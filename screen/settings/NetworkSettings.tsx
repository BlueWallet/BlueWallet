/**
 * Network settings in the home's style: the live status of each network's
 * Neurai service on top, then the servers in use and, last, the block
 * explorer and notifications.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHAIN_PARAMS, getWssUrlOverride, loadOverrides, NeuraiNetwork } from '../../blue_modules/neurai';
import { isNotificationsEnabled } from '../../blue_modules/notifications';
import Icon from '../../components/Icon';
import {
  SettingsBadge,
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { BackendStatus, useBackendStatusDetails } from '../../hooks/useBackendStatus';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';

const NETWORKS: NeuraiNetwork[] = ['mainnet', 'testnet'];
const DEFAULT_URLS: Record<NeuraiNetwork, string> = {
  mainnet: CHAIN_PARAMS.xna.defaultWssUrl,
  testnet: CHAIN_PARAMS['xna-test'].defaultWssUrl,
};
const networkName = (network: NeuraiNetwork): string =>
  network === 'mainnet' ? loc.wallets.neurai_network_mainnet : loc.wallets.neurai_network_testnet;
const stripPort = (url: string): string => url.replace(/:\d+(?=\/|$)/, '');

/** Re-renders every few seconds so "Checked … ago" stays true. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const StatusRow: React.FC<{ network: NeuraiNetwork; status: BackendStatus; divider?: boolean }> = ({ network, status, divider }) => {
  const p = useSettingsPalette();
  const tone = status.state === 'ok' ? p.ok : status.state === 'fail' ? p.fail : p.idle;
  const detail =
    status.state === 'ok'
      ? String(loc.formatString(loc.settings.network_block, { height: status.height.toLocaleString() }))
      : status.state === 'fail'
        ? loc.settings.network_status_offline
        : loc.settings.network_status_checking;
  return (
    <View
      style={[styles.statusRow, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
      accessible
      accessibilityLabel={[networkName(network), detail, status.state === 'ok' ? `${status.ms} ms` : ''].filter(Boolean).join(', ')}
      testID={`NetworkStatus-${network}`}
    >
      <View style={[styles.statusCircle, { backgroundColor: tone.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: tone.dot }]} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.rowTitle, { color: p.ink }]}>{networkName(network)}</Text>
        <Text style={[styles.rowSubtitle, { color: p.mutedOnCard }]}>{detail}</Text>
      </View>
      {status.state === 'ok' && <Text style={[styles.latency, { color: p.ok.fg }]}>{status.ms} ms</Text>}
    </View>
  );
};

const NetworkSettings: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { selectedBlockExplorer } = useSettings();
  const { statuses, checkedAt, recheck } = useBackendStatusDetails();
  const checking = NETWORKS.some(network => statuses[network].state === 'checking');
  const now = useNow(5000);
  const notificationsCapable = Platform.OS !== 'web';

  // Servers and notifications can change in the screens opened from here.
  const [urls, setUrls] = useState<Record<NeuraiNetwork, string>>(DEFAULT_URLS);
  const [notificationsOn, setNotificationsOn] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadOverrides()
        .then(() => {
          if (alive) {
            setUrls({
              mainnet: getWssUrlOverride('mainnet') ?? DEFAULT_URLS.mainnet,
              testnet: getWssUrlOverride('testnet') ?? DEFAULT_URLS.testnet,
            });
          }
        })
        .catch(e => console.debug('[NetworkSettings] overrides', e));
      if (notificationsCapable) {
        isNotificationsEnabled()
          .then(on => alive && setNotificationsOn(!!on))
          .catch(() => alive && setNotificationsOn(null));
      }
      return () => {
        alive = false;
      };
    }, [notificationsCapable]),
  );
  const custom = NETWORKS.some(network => urls[network] !== DEFAULT_URLS[network]);

  // dayjs reads "now" itself; `now` only makes this re-render on a timer.
  const checkedText =
    checkedAt === null || now - checkedAt < 5000
      ? loc.settings.network_checked_now
      : String(loc.formatString(loc.settings.network_checked, { when: dayjs(checkedAt).fromNow() }));

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="NetworkSettingsScreen">
      <SettingsScreenHeader title={loc.settings.network} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SettingsCard style={styles.liveCard}>
          <View style={styles.liveHead}>
            <Text style={[styles.liveTitle, { color: p.ink }]} accessibilityRole="header">
              {loc.settings.network_backend_status_title}
            </Text>
            <Pressable
              onPress={recheck}
              disabled={checking}
              accessibilityRole="button"
              accessibilityState={{ disabled: checking, busy: checking }}
              testID="NetworkRetest"
              style={({ pressed }) => [styles.retest, { backgroundColor: p.ground }, pressed && styles.pressed]}
            >
              {checking ? (
                <ActivityIndicator size="small" color={p.ink} />
              ) : (
                <Icon name="refresh" type="material" size={16} color={p.ink} />
              )}
              <Text style={[styles.retestText, { color: p.ink }]}>{loc.settings.network_backend_retest}</Text>
            </Pressable>
          </View>
          {NETWORKS.map((network, i) => (
            <StatusRow key={network} network={network} status={statuses[network]} divider={i > 0} />
          ))}
          {!checking && <Text style={[styles.checked, { color: p.mutedOnCard }]}>{checkedText}</Text>}
        </SettingsCard>

        <View>
          <SettingsSectionLabel>{loc.settings.network_backend}</SettingsSectionLabel>
          <SettingsCard>
            {NETWORKS.map((network, i) => {
              const isCustom = urls[network] !== DEFAULT_URLS[network];
              return (
                <Pressable
                  key={network}
                  onPress={() => navigation.navigate('NeuraiBackendEdit', { network })}
                  accessibilityRole="button"
                  accessibilityLabel={String(loc.formatString(loc.settings.network_server_edit, { network: networkName(network) }))}
                  accessibilityHint={stripPort(urls[network])}
                  testID={network === 'mainnet' ? 'NeuraiBackendMainnet' : 'NeuraiBackendTestnet'}
                  style={({ pressed }) => [
                    styles.serverRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.texts}>
                    <View style={styles.serverLabelRow}>
                      <Text style={[styles.serverLabel, { color: p.mutedOnCard }]}>{networkName(network)}</Text>
                      {isCustom && <SettingsBadge label={loc.settings.network_server_custom} />}
                    </View>
                    <Text style={[styles.serverUrl, { color: p.ink }]} numberOfLines={1} ellipsizeMode="middle">
                      {stripPort(urls[network])}
                    </Text>
                  </View>
                  <View style={[styles.editButton, { backgroundColor: p.ground }]}>
                    <Icon name="edit" type="material" size={18} color={p.ink} />
                  </View>
                </Pressable>
              );
            })}
          </SettingsCard>
          <Text style={[styles.note, { color: p.muted }]}>
            {custom ? loc.settings.network_server_custom_note : loc.settings.network_server_default_note}
          </Text>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.network_more}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsRow
              icon="explore"
              title={loc.settings.block_explorer}
              value={selectedBlockExplorer.name}
              onPress={() => navigation.navigate('SettingsBlockExplorer')}
              testID="BlockExplorerSettings"
            />
            {notificationsCapable && (
              <SettingsRow
                divider
                icon="notifications-none"
                title={loc.settings.notifications}
                subtitle={loc.settings.network_notifications_hint}
                value={notificationsOn === null ? undefined : notificationsOn ? loc.settings.quick_on : loc.settings.quick_off}
                onPress={() => navigation.navigate('NotificationSettings')}
                testID="NotificationSettings"
              />
            )}
          </SettingsCard>
        </View>

        <SettingsCard>
          <SettingsRow
            icon="cell-tower"
            title={loc.settings.network_broadcast}
            subtitle={loc.settings.broadcast_hint}
            onPress={() => navigation.navigate('Broadcast')}
            testID="Broadcast"
          />
        </SettingsCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  pressed: { opacity: 0.6 },
  liveCard: { paddingVertical: 16, rowGap: 4 },
  liveHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, marginBottom: 6 },
  liveTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  retest: { height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  retestText: { fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingVertical: 10 },
  statusCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  texts: { flex: 1, rowGap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 13 },
  latency: { fontSize: 14, fontWeight: '600' },
  checked: { fontSize: 12 },
  serverRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingVertical: 12 },
  serverLabelRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  serverLabel: { fontSize: 13 },
  serverUrl: { fontSize: 14, fontWeight: '500' },
  editButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
});

export default NetworkSettings;
