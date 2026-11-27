/**
 * The Neurai Connect session manager, in the settings style.
 *
 * spec/session.md section 2 requires the wallet to offer exactly what this
 * screen offers: the list of sessions with their last activity, revocation of
 * a single session, a way to change relay, and "log out everywhere". A session
 * is standing permission granted to a web site, and permission the user cannot
 * see is permission the user cannot withdraw.
 *
 * It also lists the per-domain identities already used. They are not decoration:
 * their derivation indexes are sparse (spec/auth.md section 8.4), so a normal
 * BIP44 scan does not rediscover them after restoring from the 12 words. The
 * list is what makes them recoverable, which is why it is stored with the
 * wallets and why the screen says so (in one line, under the list).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Pairing, Session, UsedIdentity } from '@neuraiproject/neurai-connect-wallet';

import {
  changeRelay,
  connectPairings,
  connectSessions,
  onConnectSessionsChanged,
  RelayInUseError,
  relayHost,
  revokeAllSessions,
  revokeSession,
  startConnect,
} from '../../blue_modules/neurai/connect/client';
import { DEFAULT_RELAY_URL, getRelayUrl, getRelayUrlOverride } from '../../blue_modules/neurai/connect/config';
import { clearConnectHistory, connectHistory, ConnectHistoryEntry } from '../../blue_modules/neurai/connect/history';
import { usedIdentities } from '../../blue_modules/neurai/connect/identity';
import NeuraiUriMatch from '../../class/neurai-uri-match';
import presentAlert from '../../components/Alert';
import { ConnectSiteIcon } from '../../components/ConnectUI';
import Icon, { MaterialIconName } from '../../components/Icon';
import {
  SettingsBadge,
  SettingsCard,
  SettingsIconCircle,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { CONNECT_EMPTY_FIELD, ConnectedSite, connectedSites, describeError, hostOf, isValidRelayUrl } from './logic';
import { appAlert } from '../../components/AppDialog';

const ago = (ms: number | undefined): string => (ms ? dayjs(ms).fromNow() : CONNECT_EMPTY_FIELD);
/** History shows this many at first; "Show more" adds as many again. */
const HISTORY_PAGE = 10;

/** Round icon button at the end of a row. */
const RoundButton: React.FC<{ icon: MaterialIconName; label: string; onPress: () => void; disabled?: boolean; testID?: string }> = ({
  icon,
  label,
  onPress,
  disabled,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [styles.round, { backgroundColor: p.ground }, (pressed || disabled) && styles.pressed]}
    >
      <Icon name={icon} type="material" size={18} color={disabled ? p.mutedOnCard : p.ink} />
    </Pressable>
  );
};

const ConnectSessions: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [identities, setIdentities] = useState<UsedIdentity[]>([]);
  const [relay, setRelay] = useState<string>(getRelayUrl());
  const [editingRelay, setEditingRelay] = useState(false);
  const [busy, setBusy] = useState(false);
  // Sessions and pairings live on the relay in use, so while there are any the
  // relay cannot be changed (`changeRelay` refuses; this only says so) and
  // "log out everywhere" is the way out — including when the only thing left is
  // a pairing.
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [history, setHistory] = useState<ConnectHistoryEntry[]>([]);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE);

  const reload = useCallback(async () => {
    await startConnect().catch((error: unknown) => console.warn('[neurai-connect] start failed', error));
    setSessions(connectSessions());
    setIdentities(await usedIdentities().catch(() => []));
    setRelay(getRelayUrl());
    setPairings(connectPairings());
    setHistory(await connectHistory().catch(() => []));
  }, []);

  // While a session ends or old pairings are retired in the background, follow
  // along without a full reload: these reads are in memory.
  useEffect(
    () =>
      onConnectSessionsChanged(() => {
        setSessions(connectSessions());
        setPairings(connectPairings());
        connectHistory()
          .then(setHistory)
          .catch(() => {});
      }),
    [],
  );

  useEffect(() => {
    if (!isFocused) return;
    // Re-read on every focus rather than subscribing: a session can be settled
    // or revoked from any of the approval screens, and from the peer's side too.
    reload().catch((error: unknown) => console.warn('[neurai-connect] could not read the session list', error));
  }, [isFocused, reload]);

  /**
   * Changing relay drops the connection and every pending approval on it: the
   * topics we are subscribed to live on the old server, and half of a migration
   * is worse than none. `changeRelay` refuses outright while anything is still
   * there, so nothing is stranded on a relay the wallet no longer talks to.
   */
  const applyRelay = useCallback(
    async (url: string | null, shown: string) => {
      setBusy(true);
      try {
        await changeRelay(url);
        setRelay(shown);
        setEditingRelay(false);
      } catch (error: unknown) {
        presentAlert({
          message:
            error instanceof RelayInUseError
              ? loc.formatString(loc.connect.relay_locked, { relay: relayHost(getRelayUrl()) })
              : describeError(error),
        });
      } finally {
        setBusy(false);
        await reload();
      }
    },
    [reload],
  );

  const onSaveRelay = useCallback(async () => {
    const trimmed = relay.trim();
    if (!isValidRelayUrl(trimmed)) {
      presentAlert({ message: loc.connect.relay_invalid });
      return;
    }
    await applyRelay(trimmed === DEFAULT_RELAY_URL ? null : trimmed, trimmed);
  }, [relay, applyRelay]);

  const onResetRelay = useCallback(() => applyRelay(null, DEFAULT_RELAY_URL), [applyRelay]);

  /** Ends every session of a site. */
  const disconnectSite = useCallback(
    async (site: ConnectedSite) => {
      setBusy(true);
      try {
        for (const topic of site.sessionTopics) await revokeSession(topic);
        await reload();
      } catch (error: unknown) {
        presentAlert({ message: describeError(error) });
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const revokeAll = useCallback(async () => {
    setBusy(true);
    try {
      await revokeAllSessions();
      await reload();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, [reload]);

  const confirm = (title: string, action: string, run: () => void) =>
    appAlert(title, undefined, [
      { text: loc._.cancel, style: 'cancel' },
      { text: action, style: 'destructive', onPress: run },
    ]);

  const clearHistory = useCallback(async () => {
    await clearConnectHistory().catch((error: unknown) => presentAlert({ message: describeError(error) }));
    setHistory([]);
    setHistoryShown(HISTORY_PAGE);
  }, []);

  const onConnectSite = useCallback(async () => {
    const scanned = await scanQrHelper();
    if (!scanned) return;
    const uri = NeuraiUriMatch.connectUriFrom(scanned);
    if (uri) navigation.navigate('ConnectPair', { uri });
    else presentAlert({ message: loc.connect.pair_no_uri });
  }, [navigation]);

  // One rule for both: what exists on this relay is what stops the move and
  // what "log out everywhere" clears.
  const hasConnections = sessions.length > 0 || pairings.length > 0;
  const sites = connectedSites(sessions);
  const pendingCodes = pairings.filter(pairing => !pairing.active && pairing.expiry > Date.now() / 1000).length;
  const customRelay = getRelayUrlOverride() !== undefined;
  const summary =
    sites.length === 0
      ? loc.connect.sessions_empty
      : sites.length === 1
        ? loc.connect.sessions_count_one
        : String(loc.formatString(loc.connect.sessions_count_many, { count: sites.length }));
  const divider = { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider };

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="ConnectSessionsScreen">
      <SettingsScreenHeader title={loc.connect.sessions_screen_title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <SettingsCard style={styles.hero}>
          <View style={styles.heroHead}>
            <View style={[styles.heroIcon, { backgroundColor: p.accentSoft }]}>
              <Icon name="link" type="material" size={28} color={p.accentText} />
            </View>
            <View style={styles.texts}>
              <Text style={[styles.heroTitle, { color: p.ink }]}>{summary}</Text>
              <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{loc.connect.sessions_hint}</Text>
            </View>
          </View>
          <Pressable
            onPress={onConnectSite}
            accessibilityRole="button"
            testID="ConnectScanSite"
            style={({ pressed }) => [styles.primary, { backgroundColor: p.button }, pressed && styles.pressed]}
          >
            <Icon name="qr-code-scanner" type="material" size={20} color="#ffffff" />
            <Text style={styles.primaryText}>{loc.connect.proposal_title}</Text>
          </Pressable>
        </SettingsCard>

        {hasConnections && (
          <View>
            <SettingsSectionLabel>{loc.connect.sessions_title}</SettingsSectionLabel>
            <SettingsCard>
              {sites.map((site, i) => {
                const name = site.name || loc.connect.site_unknown;
                const line = `${site.host} · ${String(loc.formatString(loc.connect.sessions_expires_in, { when: ago(site.expiry * 1000) }))}`;
                const question = String(loc.formatString(loc.connect.sessions_disconnect_q, { name }));
                return (
                  <View key={site.key} style={[styles.row, i > 0 && divider]} testID="ConnectSessionRow">
                    <ConnectSiteIcon icons={site.icons} />
                    <View style={styles.texts} accessible accessibilityLabel={`${name}, ${line}`}>
                      <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                        {line}
                      </Text>
                    </View>
                    <RoundButton
                      icon="link-off"
                      label={question}
                      disabled={busy}
                      onPress={() => confirm(question, loc.connect.sessions_revoke, () => disconnectSite(site))}
                    />
                  </View>
                );
              })}
              {pendingCodes > 0 && (
                <View style={[styles.row, sites.length > 0 && divider]}>
                  <SettingsIconCircle icon="qr-code" muted />
                  <Text style={[styles.title, styles.texts, { color: p.mutedOnCard }]}>
                    {loc.formatString(loc.connect.sessions_pairings, { count: pendingCodes })}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => confirm(loc.connect.sessions_revoke_all_q, loc.connect.sessions_revoke_all, revokeAll)}
                disabled={busy}
                accessibilityRole="button"
                testID="ConnectRevokeAll"
                style={({ pressed }) => [
                  styles.row,
                  (sites.length > 0 || pendingCodes > 0) && divider,
                  (pressed || busy) && styles.pressed,
                ]}
              >
                <View style={[styles.round, { backgroundColor: p.fail.bg }]}>
                  <Icon name="logout" type="material" size={20} color={p.fail.dot} />
                </View>
                <Text style={[styles.title, styles.texts, { color: p.fail.fg }]}>{loc.connect.sessions_revoke_all}</Text>
              </Pressable>
            </SettingsCard>
          </View>
        )}

        {history.length > 0 && (
          <View>
            <SettingsSectionLabel>{loc.connect.history_title}</SettingsSectionLabel>
            <SettingsCard>
              {history.slice(0, historyShown).map((entry, i) => {
                const host = entry.url ? hostOf(entry.url) : CONNECT_EMPTY_FIELD;
                const name = entry.name || host || loc.connect.site_unknown;
                const kind = entry.kind === 'login' ? loc.connect.history_login : loc.connect.history_session;
                const when = `${entry.approximate ? '~' : ''}${dayjs(entry.at).format('D MMM YYYY, HH:mm')}`;
                return (
                  <View
                    key={`${entry.at}-${entry.pairingTopic ?? i}`}
                    style={[styles.row, i > 0 && divider]}
                    accessible
                    accessibilityLabel={[name, host, kind, when, entry.address].filter(Boolean).join(', ')}
                    testID="ConnectHistoryRow"
                  >
                    <ConnectSiteIcon icons={entry.icons} />
                    <View style={styles.texts}>
                      <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                        {`${kind} · ${when}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {history.length > historyShown && (
                <Pressable
                  onPress={() => setHistoryShown(shown => shown + HISTORY_PAGE)}
                  accessibilityRole="button"
                  testID="ConnectHistoryMore"
                  style={({ pressed }) => [styles.row, divider, pressed && styles.pressed]}
                >
                  <SettingsIconCircle icon="expand-more" muted />
                  <Text style={[styles.title, styles.texts, { color: p.ink }]}>
                    {String(loc.formatString(loc.connect.history_more, { count: history.length - historyShown }))}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => confirm(loc.connect.history_clear_q, loc.connect.history_clear, clearHistory)}
                accessibilityRole="button"
                testID="ConnectHistoryClear"
                style={({ pressed }) => [styles.row, divider, pressed && styles.pressed]}
              >
                <SettingsIconCircle icon="delete-outline" muted />
                <Text style={[styles.title, styles.texts, { color: p.mutedOnCard }]}>{loc.connect.history_clear}</Text>
              </Pressable>
            </SettingsCard>
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.connect.relay_title}</SettingsSectionLabel>
          <SettingsCard>
            <View style={styles.row}>
              <SettingsIconCircle icon="hub" />
              <View style={styles.texts}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
                    {relayHost(getRelayUrl())}
                  </Text>
                  {customRelay && <SettingsBadge label={loc.settings.network_server_custom} />}
                </View>
                <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>
                  {hasConnections ? loc.connect.relay_locked_short : loc.connect.relay_hint}
                </Text>
              </View>
              <RoundButton
                icon={editingRelay ? 'close' : 'edit'}
                label={loc.connect.relay_title}
                disabled={busy || (hasConnections && !editingRelay)}
                onPress={() => {
                  setRelay(getRelayUrl());
                  setEditingRelay(open => !open);
                }}
                testID="ConnectRelayEdit"
              />
            </View>
            {editingRelay && (
              <View style={[styles.editor, divider]}>
                <TextInput
                  value={relay}
                  placeholder={DEFAULT_RELAY_URL}
                  placeholderTextColor={p.mutedOnCard}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!busy}
                  onChangeText={setRelay}
                  style={[styles.input, { backgroundColor: p.ground, color: p.ink }]}
                  testID="ConnectRelayInput"
                  underlineColorAndroid="transparent"
                />
                <View style={styles.editorActions}>
                  {customRelay && (
                    <Pressable
                      onPress={onResetRelay}
                      disabled={busy || hasConnections}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.pill, { backgroundColor: p.ground }, pressed && styles.pressed]}
                    >
                      <Icon name="restart-alt" type="material" size={18} color={p.ink} />
                      <Text style={[styles.pillText, { color: p.ink }]}>{loc.connect.relay_reset}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={onSaveRelay}
                    disabled={busy || hasConnections}
                    accessibilityRole="button"
                    testID="ConnectRelaySave"
                    style={({ pressed }) => [styles.pill, { backgroundColor: p.button }, pressed && styles.pressed]}
                  >
                    <Text style={[styles.pillText, styles.onButton]}>{loc.connect.relay_save}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </SettingsCard>
        </View>

        {identities.length > 0 && (
          <View>
            <SettingsSectionLabel>{loc.connect.identities_title}</SettingsSectionLabel>
            <SettingsCard>
              {identities.map((identity, i) => (
                <View
                  key={identity.domain}
                  style={[styles.row, i > 0 && divider]}
                  accessible
                  accessibilityLabel={`${identity.domain}, ${identity.address}, ${loc.connect.identities_last_used} ${ago(identity.lastUsedAt)}`}
                >
                  <SettingsIconCircle icon="badge" />
                  <View style={styles.texts}>
                    <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
                      {identity.domain}
                    </Text>
                    <Text style={[styles.mono, { color: p.mutedOnCard }]} numberOfLines={1} ellipsizeMode="middle">
                      {identity.address}
                    </Text>
                  </View>
                  <Text style={[styles.when, { color: p.mutedOnCard }]}>{ago(identity.lastUsedAt)}</Text>
                </View>
              ))}
            </SettingsCard>
            <Text style={[styles.note, { color: p.muted }]}>{loc.connect.identities_backup_note}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16, rowGap: 16 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '600' },
  primary: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 8 },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  texts: { flex: 1, rowGap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  title: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  when: { fontSize: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  editor: { paddingVertical: 12, rowGap: 10 },
  input: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', columnGap: 8 },
  pill: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  pillText: { fontSize: 14, fontWeight: '600' },
  onButton: { color: '#ffffff' },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
});

export default ConnectSessions;
