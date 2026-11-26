/**
 * Advanced privacy settings behind the gear, as a sheet from the bottom in
 * the settings' style: ZK passphrase and lock, encrypted history backup and
 * restore, proving files, and the pinned pool instance.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showFilePickerAndReadFile, writeFileAndExport } from '../../blue_modules/fs';
import { getArtifactBaseUrl, setArtifactBaseUrl, type ArtifactStatus } from '../../blue_modules/neurai/privacy/artifacts';
import type { C6Runtime } from '../../blue_modules/neurai/privacy/deployment';
import type { C6PrivateWallet } from '../../hooks/useC6PrivateWallet';
import loc from '../../loc';
import { ConnectNoticeCard } from '../ConnectUI';
import { SettingsRow, SettingsSectionLabel, useSettingsPalette } from '../settings/SettingsUI';
import { Card, Chip, ChipRow, Field, Hint, InfoRow, OutlineButton, PrimaryButton, RoundButton } from './C6UI';

/** Largest encrypted journal backup the library accepts. */
const MAX_BACKUP_CHARS = 8_001_000;

function Section({ title, children, rows }: { title: string; children: React.ReactNode; rows?: boolean }) {
  return (
    <View>
      <SettingsSectionLabel>{title}</SettingsSectionLabel>
      {/* Rows bring their own padding and dividers; anything else is spaced out. */}
      {rows ? <Card style={styles.rowsCard}>{children}</Card> : <Card>{children}</Card>}
    </View>
  );
}

export function C6SettingsSheet(props: {
  visible: boolean;
  onClose: () => void;
  runtime: C6Runtime;
  pool: C6PrivateWallet;
  zkPassphrase: string;
  onZkPassphrase: (value: string) => void;
  onLock: () => void;
  backupName: string;
}) {
  const { pool, runtime } = props;
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<ArtifactStatus | null>(null);
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState('');
  const busy = pool.busy;

  const refresh = useCallback(async () => {
    setFiles(await pool.artifacts.status());
    setUrl(await getArtifactBaseUrl(runtime));
  }, [pool.artifacts, runtime]);
  useEffect(() => {
    if (props.visible) refresh().catch(() => {});
  }, [props.visible, refresh, pool.busy]);

  const mb = (bytes: number) => (bytes / 1048576).toFixed(0);
  const complete = !!files && files.present === files.total;

  const restoreHistory = () =>
    pool.run(loc.privacy.restoring, async () => {
      const { data } = await showFilePickerAndReadFile();
      if (!data) return;
      if (data.length > MAX_BACKUP_CHARS) throw new Error(loc.privacy.error_backup_too_large);
      await pool.unlock({ backup: JSON.parse(data), zkPassphrase: props.zkPassphrase });
    });

  const saveHistory = () =>
    pool.run(loc.privacy.saving_backup, async token => {
      const backup = await pool.requireClient().backup();
      pool.live(token);
      await writeFileAndExport(props.backupName, JSON.stringify(backup));
      pool.setSaved(true);
    });

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={props.onClose}
          accessibilityRole="button"
          accessibilityLabel={loc.privacy.close}
        />
        <View style={[styles.sheet, { backgroundColor: p.ground }]} accessibilityViewIsModal testID="PrivacySettingsSheet">
          <View style={[styles.grabber, { backgroundColor: p.mutedOnCard }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
              {loc.privacy.settings}
            </Text>
            <RoundButton icon="close" label={loc.privacy.close} onPress={props.onClose} surface="card" testID="PrivacySettingsClose" />
          </View>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Section title={loc.privacy.section_wallet}>
              <Field
                label={loc.privacy.zk_passphrase}
                value={props.zkPassphrase}
                onChangeText={props.onZkPassphrase}
                secure
                editable={!pool.open && !busy}
                placeholder={loc.privacy.optional}
              />
              <Hint>{pool.open ? loc.privacy.zk_passphrase_locked : loc.privacy.zk_passphrase_hint}</Hint>
              {pool.open ? <OutlineButton title={loc.privacy.lock} onPress={props.onLock} testID="PrivacyLock" /> : null}
            </Section>

            <Section title={loc.privacy.section_history} rows>
              <View style={styles.rowsHint}>
                <Hint>
                  {pool.historyReady ? (pool.saved ? loc.privacy.backup_saved : loc.privacy.backup_hint) : loc.privacy.no_history}
                </Hint>
              </View>
              <SettingsRow
                icon="file-download"
                title={loc.privacy.save_backup}
                onPress={saveHistory}
                disabled={busy || !pool.historyReady}
                divider
                testID="PrivacySaveBackup"
              />
              <SettingsRow
                icon="restore"
                title={loc.privacy.restore_backup}
                onPress={restoreHistory}
                disabled={busy || !pool.valid}
                divider
                testID="PrivacyRestoreBackup"
              />
              {pool.open && !pool.historyReady ? (
                <SettingsRow
                  icon="add"
                  title={loc.privacy.new_history}
                  onPress={() => pool.run(loc.privacy.opening, () => pool.unlock({ create: true, zkPassphrase: props.zkPassphrase }))}
                  disabled={busy}
                  divider
                  testID="PrivacyNewHistory"
                />
              ) : null}
            </Section>

            <Section title={loc.privacy.section_files}>
              <View style={[styles.table, { backgroundColor: p.ground }]}>
                <InfoRow
                  label={complete ? loc.privacy.files_ready : loc.privacy.files_missing}
                  value={files ? `${files.present}/${files.total} · ${mb(files.bytesPresent)}/${mb(files.bytesTotal)} MB` : '—'}
                />
              </View>
              {progress ? <Hint>{progress}</Hint> : null}
              {!complete ? (
                <PrimaryButton
                  title={loc.privacy.download_files}
                  icon="cloud-download"
                  disabled={busy}
                  busy={!!progress}
                  onPress={() =>
                    pool.run(loc.privacy.stage_downloading, async () => {
                      try {
                        let lastDone = -1;
                        await pool.artifacts.downloadAll(({ file, percent, done }) => {
                          setProgress(`${file} ${percent}%`);
                          if (done !== lastDone) {
                            lastDone = done;
                            pool.artifacts.status().then(setFiles, () => {});
                          }
                        });
                      } finally {
                        setProgress('');
                        await refresh();
                      }
                    })
                  }
                  testID="PrivacyDownloadFiles"
                />
              ) : null}
              <Field label={loc.privacy.files_url} value={url} onChangeText={setUrl} editable={!busy} keyboardType="url" mono />
              <ChipRow>
                <Chip
                  label={loc.privacy.save}
                  icon="save"
                  disabled={busy}
                  onPress={() =>
                    pool.run(loc.privacy.save, async () => {
                      await setArtifactBaseUrl(runtime, url === runtime.defaultArtifactUrl ? null : url);
                      await refresh();
                    })
                  }
                />
                <Chip
                  label={loc.privacy.reset}
                  icon="settings-backup-restore"
                  disabled={busy}
                  onPress={() =>
                    pool.run(loc.privacy.reset, async () => {
                      await setArtifactBaseUrl(runtime, null);
                      await refresh();
                    })
                  }
                />
                <Chip
                  label={loc.privacy.delete_files}
                  icon="delete-outline"
                  disabled={busy || !files?.present}
                  onPress={() =>
                    pool.run(loc.privacy.delete_files, async () => {
                      await pool.artifacts.remove();
                      await refresh();
                    })
                  }
                />
              </ChipRow>
            </Section>

            <Section title={loc.privacy.section_pool}>
              <View style={[styles.table, { backgroundColor: p.ground }]}>
                <InfoRow label={loc.privacy.instance} value={String((runtime.config.manifest as { identity?: string }).identity ?? '')} />
                <InfoRow label={loc.privacy.commitment} value={runtime.config.expectedCommitment} mono divider />
              </View>
            </Section>
            <ConnectNoticeCard tone="warn" text={loc.privacy.test_warning} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, opacity: 0.4, marginBottom: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  body: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  rowsCard: { paddingVertical: 2, rowGap: 0 },
  rowsHint: { paddingTop: 12, paddingBottom: 10 },
  table: { borderRadius: 18, paddingHorizontal: 14 },
});
