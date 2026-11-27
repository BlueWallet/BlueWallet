/**
 * H08 · Moves the bucket this session opened from the old CryptoJS format to
 * `nw2:` (argon2id + XChaCha20-Poly1305). Offered after an unlock that opened
 * an old bucket, and from Settings › Security. The user may keep the password
 * or choose a new one; closing the sheet is "later" and the offer comes back
 * on the next start.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { PasswordInUseError, StorageWriteError } from '../class/storage-errors';
import presentAlert from '../components/Alert';
import Icon from '../components/Icon';
import { MIN_NEW_PASSWORD_LENGTH, passwordStrength, type PasswordStrength } from '../components/settings/passwordStrength';
import { SettingsButton, useSettingsPalette } from '../components/settings/SettingsUI';
import { useStorage } from '../hooks/context/useStorage';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import loc from '../loc';

type Step = 'intro' | 'choose' | 'new';

const STRENGTH_BARS: Record<PasswordStrength, number> = { weak: 1, fair: 2, strong: 3 };

const EncryptionUpgradeSheet: React.FC = () => {
  const navigation = useExtendedNavigation();
  const { upgradeEncryption, hasOlderBackupCopies } = useStorage();
  const p = useSettingsPalette();
  const [step, setStep] = useState<Step>('intro');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  // Older copies kept for recovery are not rewritten: say so, only when there are any.
  const [olderCopies, setOlderCopies] = useState(false);

  useEffect(() => {
    let live = true;
    hasOlderBackupCopies()
      .then(found => live && setOlderCopies(found))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [hasOlderBackupCopies]);

  const strength = passwordStrength(password);
  const longEnough = Array.from(password).length >= MIN_NEW_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSave = longEnough && confirm === password && !busy;
  const strengthColor = strength === 'strong' ? p.ok.dot : strength === 'fair' ? p.accent : p.fail.dot;
  const strengthLabel =
    strength === 'strong'
      ? loc.settings.password_strength_strong
      : strength === 'fair'
        ? loc.settings.password_strength_fair
        : loc.settings.password_strength_weak;

  const upgrade = useCallback(
    async (newPassword?: string) => {
      Keyboard.dismiss();
      setBusy(true);
      // The key derivation holds the JS thread for a moment: let the spinner draw first.
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        await upgradeEncryption(newPassword);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        presentAlert({ tone: 'success', title: loc.settings.encryption_upgrade_done, message: loc.settings.encryption_upgrade_done_text });
        navigation.goBack();
      } catch (error) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        if (error instanceof PasswordInUseError) {
          presentAlert({ tone: 'warning', message: loc.settings.encryption_upgrade_in_use });
        } else if (error instanceof StorageWriteError) {
          presentAlert({ tone: 'error', message: loc.settings.storage_save_failed });
        } else {
          presentAlert({ tone: 'error', message: (error as Error)?.message ?? String(error) });
        }
        setBusy(false);
      }
    },
    [upgradeEncryption, navigation],
  );

  const inputStyle = [styles.input, { backgroundColor: p.ground, color: p.ink }];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: p.card }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.iconCircle, { backgroundColor: p.accentSoft }]}>
          <Icon name="enhanced-encryption" type="material" size={30} color={p.accentText} />
        </View>
        <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
          {loc.settings.encryption_upgrade_title}
        </Text>

        {step === 'intro' && (
          <>
            <Text style={[styles.text, { color: p.mutedOnCard }]}>{loc.settings.encryption_upgrade_text}</Text>
            <View style={styles.buttons}>
              <SettingsButton title={loc.settings.encryption_upgrade_now} onPress={() => setStep('choose')} testID="EncryptionUpgradeNow" />
              <SettingsButton
                title={loc.settings.encryption_upgrade_later}
                variant="secondary"
                onPress={() => navigation.goBack()}
                testID="EncryptionUpgradeLater"
              />
            </View>
          </>
        )}

        {step === 'choose' && (
          <>
            <Text style={[styles.text, { color: p.mutedOnCard }]}>{loc.settings.encryption_upgrade_password_text}</Text>
            {olderCopies ? (
              <Text style={[styles.note, styles.centeredNote, { color: p.mutedOnCard }]} testID="EncryptionUpgradeOlderCopies">
                {loc.settings.encryption_upgrade_older_copies}
              </Text>
            ) : null}
            <View style={styles.buttons}>
              <SettingsButton
                title={loc.settings.encryption_upgrade_keep}
                icon="lock"
                onPress={() => upgrade()}
                loading={busy}
                testID="EncryptionUpgradeKeep"
              />
              <SettingsButton
                title={loc.settings.encryption_upgrade_new}
                icon="password"
                variant="secondary"
                onPress={() => setStep('new')}
                disabled={busy}
                testID="EncryptionUpgradeNew"
              />
            </View>
          </>
        )}

        {step === 'new' && (
          <>
            <Text style={[styles.text, { color: p.mutedOnCard }]}>
              {loc.formatString(loc.settings.encryption_upgrade_new_hint, { min: MIN_NEW_PASSWORD_LENGTH })}
            </Text>
            <TextInput
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder={loc.settings.encryption_upgrade_new}
              placeholderTextColor={p.mutedOnCard}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              autoFocus
              editable={!busy}
              testID="EncryptionUpgradePassword"
            />
            <View style={styles.meter} accessible accessibilityLabel={`${loc.settings.password_strength}: ${strengthLabel}`}>
              <View style={styles.bars}>
                {[1, 2, 3].map(bar => (
                  <View
                    key={bar}
                    style={[styles.bar, { backgroundColor: password && bar <= STRENGTH_BARS[strength] ? strengthColor : p.switchOff }]}
                  />
                ))}
              </View>
              <Text style={[styles.meterText, { color: password ? strengthColor : p.mutedOnCard }]} testID="EncryptionUpgradeStrength">
                {password ? strengthLabel : ' '}
              </Text>
            </View>
            <TextInput
              style={inputStyle}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={loc.settings.encryption_upgrade_confirm}
              placeholderTextColor={p.mutedOnCard}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              editable={!busy}
              testID="EncryptionUpgradeConfirm"
            />
            {mismatch ? <Text style={[styles.note, { color: p.fail.fg }]}>{loc.settings.encryption_upgrade_mismatch}</Text> : null}
            <Text style={[styles.note, { color: p.mutedOnCard }]}>{loc.settings.encryption_upgrade_forget_warning}</Text>
            <View style={styles.buttons}>
              <SettingsButton
                title={loc.settings.encryption_upgrade_now}
                onPress={() => upgrade(password)}
                disabled={!canSave}
                loading={busy}
                testID="EncryptionUpgradeSave"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EncryptionUpgradeSheet;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 22, rowGap: 14 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  buttons: { rowGap: 10, marginTop: 8 },
  input: { height: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  meter: { flexDirection: 'row', alignItems: 'center', columnGap: 10, marginTop: -4 },
  bars: { flexDirection: 'row', columnGap: 6, flex: 1 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  meterText: { fontSize: 13, fontWeight: '600', minWidth: 72, textAlign: 'right' },
  note: { fontSize: 13, lineHeight: 18 },
  centeredNote: { textAlign: 'center' },
});
