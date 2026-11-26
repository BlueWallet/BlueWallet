/**
 * Privacy tab of a testnet wallet (C7 TEST pool), in the settings' style: a
 * card with the pool's state in words, the private balance and the way to
 * open the private wallet; the private address with copy, QR and a new one;
 * the operations; and the latest activity. The gear opens the advanced
 * settings. Switching pools keeps the others' sessions open. The proving
 * engine (hidden WebView) lives only while this tab is open.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { formatXna } from '@neuraiproject/neurai-privacy/client';

import { DEFAULT_PRIVACY_POOL, PRIVACY_POOLS, type C6Runtime, type PrivacyPoolId } from '../../blue_modules/neurai/privacy/deployment';
import type { PrivacyWallet } from '../../blue_modules/neurai/privacy/wallet';
import { useC6Operations } from '../../hooks/useC6Operations';
import { useC6PrivateWallet } from '../../hooks/useC6PrivateWallet';
import useScrollAboveKeyboard from '../../hooks/useScrollAboveKeyboard';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import Icon, { type MaterialIconName } from '../Icon';
import QRCode from '../QRCode';
import QrStaggerReveal from '../QrStaggerReveal';
import {
  SettingsBadge,
  SettingsButton,
  SettingsCard,
  SettingsIconCircle,
  SettingsPillButton,
  SettingsSegmented,
  SettingsStatusLine,
  type SettingsStatusTone,
  useSettingsPalette,
} from '../settings/SettingsUI';
import { C6OperationsPanel, actionLabel } from './C6OperationsPanel';
import { C6SettingsSheet } from './C6SettingsSheet';
import { Card, Chip, ChipRow, ErrorBox, Hint, Label, PrimaryButton, ProgressLine } from './C6UI';
import { PrivacyHostProvider } from './PrivacyHost';

const poolLabel = (_id: PrivacyPoolId) => 'C7 · XNA';

type PrivacyArea = 'address' | 'operations' | 'activity';
/** Padding of the panel around the QR tile, and of the white tile around the code. */
const QR_PANEL_PAD = 12;
const QR_TILE_PAD = 10;
/** A wide screen (tablet) does not need a QR larger than this to be read. */
const QR_MAX = 420;
const COPIED_MS = 1_600;

const ACTION_ICON: Record<string, MaterialIconName> = {
  deposit: 'login',
  transfer: 'swap-horiz',
  withdraw: 'logout',
  join: 'call-merge',
};

/** Seconds since `busy` turned on. */
function useElapsed(busy: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  return seconds;
}

function PoolView({
  wallet,
  runtime,
  poolId,
  onPool,
  hidden,
}: {
  wallet: PrivacyWallet;
  runtime: C6Runtime;
  poolId: PrivacyPoolId;
  onPool: (id: PrivacyPoolId) => void;
  hidden: boolean;
}) {
  const p = useSettingsPalette();
  const pool = useC6PrivateWallet(wallet, runtime, hidden);
  const ops = useC6Operations(wallet, runtime, pool);
  const [zkPassphrase, setZkPassphrase] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [qrSpace, setQrSpace] = useState(0);
  const [settings, setSettings] = useState(false);
  // One area at a time under the balance, so the page fits on one screen.
  const [area, setArea] = useState<PrivacyArea>('operations');
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );
  // The settings sheet is a modal with its own fields: leave its keyboard alone.
  const keyboard = useScrollAboveKeyboard(!hidden && !settings);

  const busy = pool.busy;
  const unit = ops.unit;
  const pending = !!ops.preview || !!ops.fundingPreview;
  const address = pool.receiving?.current?.address ?? '';
  const elapsed = useElapsed(busy);

  const unlock = useCallback(() => pool.run(loc.privacy.opening, () => pool.unlock({ zkPassphrase })), [pool, zkPassphrase]);
  const lock = useCallback(() => {
    pool.lock();
    setShowQr(false);
  }, [pool]);
  const startNewHistory = () => pool.run(loc.privacy.opening, () => pool.unlock({ create: true, zkPassphrase }));
  const newAddress = () =>
    pool.run(loc.privacy.new_address, async token => {
      pool.update(await pool.requireClient().newAddress());
      pool.live(token);
      pool.setSaved(false);
    });
  const copyAddress = () => {
    Clipboard.setString(address);
    AccessibilityInfo.announceForAccessibility(loc.privacy.address_copied);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  // The journal keeps a published but unconfirmed operation as `prepared`.
  const published = new Set(ops.publishedTxids);
  const opStatus = (op: { outcome: string | null; phase: string; txid: string | null }) =>
    op.outcome ?? (published.has(op.txid ?? '') ? loc.privacy.pending : op.phase);

  const state: { tone: SettingsStatusTone; text: string } = pool.error
    ? { tone: 'fail', text: loc.privacy.badge_error }
    : busy
      ? { tone: 'idle', text: loc.privacy.badge_working }
      : !pool.open
        ? { tone: 'idle', text: loc.privacy.badge_locked }
        : pool.historyReady
          ? { tone: 'ok', text: loc.privacy.badge_ready }
          : { tone: 'idle', text: loc.privacy.badge_read_only };

  const summary = pool.open ? pool.summary : null;
  const pools = PRIVACY_POOLS.filter(entry => entry.runtime);
  // The state and, once synced, how far: one line under the title.
  const stateLine =
    summary?.tip && !busy
      ? `${state.text} · ${pool.sync.syncing ? loc.privacy.refreshing : `${loc.privacy.block} ${summary.tip.height}`}`
      : state.text;

  // Progress and errors go where the user is looking: with the operation step
  // once the private wallet is open, in the card above while it opens.
  const progress = busy ? <ProgressLine text={pool.phase} seconds={elapsed} onCancel={lock} cancelLabel={loc.privacy.cancel} /> : null;
  const error = pool.error ? <ErrorBox message={pool.error} /> : null;

  // Where the operations panel starts in the scrolled content, to bring a new step into view.
  const operationsY = useRef(0);
  const revealStep = useCallback(
    (y: number) => keyboard.scrollRef.current?.scrollTo({ y: Math.max(0, operationsY.current + y - 12), animated: true }),
    [keyboard.scrollRef],
  );

  // As wide as the card allows: the panel's width less its padding and the tile's.
  const qrSize = Math.min(QR_MAX, Math.floor(qrSpace - 2 * QR_PANEL_PAD - 2 * QR_TILE_PAD));

  return (
    <ScrollView
      ref={keyboard.scrollRef}
      style={[styles.flex, { backgroundColor: p.ground, marginBottom: keyboard.bottomInset }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onLayout={keyboard.onLayout}
      onScroll={keyboard.onScroll}
      scrollEventThrottle={16}
    >
      <Card testID="PrivacyHero">
        <View style={styles.head}>
          <SettingsIconCircle icon="shield" />
          <View style={styles.headTexts}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
                {loc.privacy.title}
              </Text>
              <SettingsBadge label="TEST" />
            </View>
            <SettingsStatusLine tone={state.tone} text={stateLine} busy={busy} compact testID="PrivacyState" />
          </View>
        </View>
        {/* Out of the way in the corner: the advanced settings are seldom needed. */}
        <Pressable
          onPress={() => setSettings(true)}
          accessibilityRole="button"
          accessibilityLabel={loc.privacy.settings}
          hitSlop={8}
          testID="PrivacySettings"
          style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
        >
          <Icon name="settings" type="material" size={20} color={p.mutedOnCard} />
        </Pressable>

        {pools.length > 1 ? (
          <ChipRow>
            {pools.map(entry => (
              <Chip
                key={entry.id}
                label={poolLabel(entry.id)}
                active={entry.id === poolId}
                disabled={busy || pending}
                onPress={() => onPool(entry.id)}
                testID={`PrivacyPool-${entry.id}`}
              />
            ))}
          </ChipRow>
        ) : null}

        <View style={[styles.balanceBlock, { borderTopColor: p.divider }]}>
          <Label>{`${loc.privacy.private_balance} · ${runtime.generation}`}</Label>
          <Text
            style={[styles.balance, { color: summary ? p.ink : p.mutedOnCard }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            testID="PrivacyBalance"
          >
            {summary ? `${formatXna(summary.balanceAtomic)} ${unit}` : '— —'}
          </Text>
          {summary ? (
            <Hint
              lines={1}
            >{`${loc.privacy.available} ${formatXna(summary.spendableAtomic)} ${unit} · ${summary.notes.length} ${loc.privacy.notes_count}`}</Hint>
          ) : (
            <Hint>{loc.privacy.locked_hint}</Hint>
          )}
        </View>

        {pool.open ? null : progress}
        {!pool.open ? (
          <PrimaryButton
            title={loc.privacy.open_wallet}
            icon="lock-open"
            onPress={unlock}
            disabled={!pool.valid}
            busy={busy}
            testID="PrivacyOpen"
          />
        ) : null}
        {pool.blockedReason ? <ErrorBox message={pool.blockedReason} /> : null}
        {pool.open ? null : error}
      </Card>

      {pool.open && !pool.historyReady ? (
        <View style={[styles.notice, { backgroundColor: p.warnBg, borderColor: p.warnBorder }]} accessibilityLiveRegion="polite">
          <View style={styles.noticeHead}>
            <View style={[styles.noticeIcon, { backgroundColor: p.warnIconBg }]}>
              <Icon name="history" type="material" size={20} color={p.accentText} />
            </View>
            <Text style={[styles.noticeText, { color: p.ink }]}>{loc.privacy.no_history}</Text>
          </View>
          <View style={styles.noticeButtons}>
            <View style={styles.flex}>
              <SettingsButton
                title={loc.privacy.restore_backup}
                onPress={() => setSettings(true)}
                disabled={busy}
                variant="secondary"
                icon="restore"
              />
            </View>
            <View style={styles.flex}>
              <SettingsButton title={loc.privacy.new_history} onPress={startNewHistory} disabled={busy} icon="add" />
            </View>
          </View>
        </View>
      ) : null}

      {pool.open ? (
        <SettingsSegmented<PrivacyArea>
          segments={[
            { value: 'operations', label: loc.privacy.operations, icon: 'swap-vert', testID: 'PrivacyAreaOperations' },
            { value: 'address', label: loc.privacy.area_address, icon: 'qr-code-2', testID: 'PrivacyAreaAddress' },
            { value: 'activity', label: loc.privacy.activity, icon: 'history', testID: 'PrivacyAreaActivity' },
          ]}
          value={area}
          onChange={setArea}
          testID="PrivacyAreas"
        />
      ) : null}

      {pool.open && area === 'address' ? (
        <View>
          <Card testID="PrivacyAddressCard">
            <Label>{loc.privacy.private_address}</Label>
            <Text style={[styles.address, { color: address ? p.ink : p.mutedOnCard }]} selectable testID="PrivacyAddress">
              {address || '—'}
            </Text>
            <View style={styles.actions}>
              <SettingsPillButton
                icon={copied ? 'check' : 'content-copy'}
                title={copied ? loc.privacy.copied : loc.privacy.copy}
                onPress={copyAddress}
                disabled={!address}
                testID="PrivacyCopyAddress"
              />
              <SettingsPillButton
                icon="qr-code-2"
                title={showQr ? loc.privacy.hide_qr : loc.privacy.show_qr}
                onPress={() => setShowQr(value => !value)}
                disabled={!address}
                testID="PrivacyToggleQr"
              />
              <SettingsPillButton
                icon="autorenew"
                title={loc.privacy.new_address}
                onPress={newAddress}
                disabled={busy || !pool.historyReady}
                testID="PrivacyNewAddress"
              />
            </View>
            {showQr && address ? (
              <View style={[styles.qrPanel, { backgroundColor: p.ground }]} onLayout={event => setQrSpace(event.nativeEvent.layout.width)}>
                {qrSize > 0 ? (
                  <View style={styles.qrTile} accessible accessibilityLabel={`${loc.privacy.show_qr}: ${address}`} testID="PrivacyQr">
                    <QrStaggerReveal size={qrSize} maskColor="#FFFFFF" runKey={`${address}|${qrSize}`}>
                      <QRCode value={address} size={qrSize} />
                    </QrStaggerReveal>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}

      {pool.open && area === 'operations' ? (
        <View onLayout={event => (operationsY.current = event.nativeEvent.layout.y)}>
          <C6OperationsPanel
            wallet={wallet}
            pool={pool}
            ops={ops}
            progress={progress}
            error={error}
            onReveal={revealStep}
            onShowActivity={() => setArea('activity')}
          />
        </View>
      ) : null}

      {pool.open && area === 'activity' && !pool.operations.length ? (
        <Card testID="PrivacyActivityEmpty">
          <View style={styles.emptyRow}>
            <SettingsIconCircle icon="history" muted />
            <Text style={[styles.emptyText, { color: p.mutedOnCard }]}>{loc.privacy.activity_empty}</Text>
          </View>
        </Card>
      ) : null}

      {pool.open && area === 'activity' && pool.operations.length ? (
        <View>
          <SettingsCard testID="PrivacyActivity">
            {pool.operations
              .slice()
              .reverse()
              .slice(0, 8)
              .map((op, index) => {
                const canResume = !op.outcome && op.phase === 'prepared' && !published.has(op.txid ?? '');
                const canRelease = !op.outcome && op.phase === 'draft';
                const status = opStatus(op);
                return (
                  <View
                    key={op.id}
                    style={[styles.activityRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
                  >
                    <SettingsIconCircle icon={ACTION_ICON[op.action] ?? 'sync-alt'} muted={!!op.outcome} />
                    <View style={styles.flex} accessible accessibilityLabel={`${actionLabel(op.action)}, ${status}`}>
                      <Text style={[styles.activityTitle, { color: p.ink }]}>{actionLabel(op.action)}</Text>
                      <Text style={[styles.activityStatus, { color: p.mutedOnCard }]} numberOfLines={1}>
                        {status}
                      </Text>
                      <Text style={[styles.activityId, { color: p.mutedOnCard }]} numberOfLines={1} ellipsizeMode="middle">
                        {op.txid ?? op.id}
                      </Text>
                    </View>
                    {canResume ? (
                      <Chip
                        label={loc.privacy.resume}
                        icon="play-arrow"
                        disabled={busy || pending}
                        onPress={() => {
                          // Its review comes up in the operations.
                          setArea('operations');
                          ops.resumeXna(op.id);
                        }}
                      />
                    ) : null}
                    {canRelease ? (
                      <Chip label={loc.privacy.release} icon="undo" disabled={busy} onPress={() => ops.releaseDraft(op.id)} />
                    ) : null}
                  </View>
                );
              })}
          </SettingsCard>
        </View>
      ) : null}

      <C6SettingsSheet
        visible={settings}
        onClose={() => setSettings(false)}
        runtime={runtime}
        pool={pool}
        zkPassphrase={zkPassphrase}
        onZkPassphrase={setZkPassphrase}
        onLock={lock}
        backupName={`neurai-${runtime.generation.toLowerCase()}-private.encrypted.json`}
      />
    </ScrollView>
  );
}

/**
 * `hidden`: the section stays mounted behind another wallet tab or screen so an
 * opened private wallet stays open; meanwhile its background scans wait.
 */
export default function PrivacySection({ walletID, hidden = false }: { walletID: string; hidden?: boolean }) {
  // The wallet itself, not the screen's subscription proxy: that proxy is
  // replaced after every transaction fetch, which would lock the private wallet.
  const { wallets } = useStorage();
  const found = wallets.find(w => w.getID() === walletID);
  const wallet = isNeuraiWallet(found) ? (found as unknown as PrivacyWallet) : undefined;
  const [poolId, setPoolId] = useState<PrivacyPoolId>(DEFAULT_PRIVACY_POOL);
  // Every pool shown in this tab stays mounted behind the selected one, so a
  // private wallet opened there stays open; its background scans wait.
  const [visited, setVisited] = useState<PrivacyPoolId[]>([DEFAULT_PRIVACY_POOL]);
  const selectPool = useCallback((id: PrivacyPoolId) => {
    setPoolId(id);
    setVisited(current => (current.includes(id) ? current : [...current, id]));
  }, []);
  const pools = PRIVACY_POOLS.flatMap(p => (p.runtime && visited.includes(p.id) ? [{ id: p.id, runtime: p.runtime }] : []));
  return (
    <PrivacyHostProvider>
      {wallet
        ? pools.map(p => (
            <View key={`${walletID}:${p.runtime.id}`} style={p.id === poolId ? styles.flex : styles.hidden}>
              <PoolView wallet={wallet} runtime={p.runtime} poolId={p.id} onPool={selectPool} hidden={hidden || p.id !== poolId} />
            </View>
          ))
        : null}
    </PrivacyHostProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: 'none' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  pressed: { opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingRight: 28 },
  gear: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  emptyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  headTexts: { flex: 1, rowGap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  balanceBlock: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 14, rowGap: 4 },
  balance: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  notice: { borderRadius: 24, borderWidth: 1, padding: 16, rowGap: 14 },
  noticeHead: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12 },
  noticeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  noticeButtons: { flexDirection: 'row', columnGap: 10 },
  address: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qrPanel: { alignItems: 'center', borderRadius: 20, padding: QR_PANEL_PAD },
  qrTile: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: QR_TILE_PAD },
  activityRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 68, paddingVertical: 10 },
  activityTitle: { fontSize: 15, fontWeight: '600' },
  activityStatus: { fontSize: 13, marginTop: 1 },
  activityId: { fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
});
