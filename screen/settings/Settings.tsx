import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getVersion } from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { connectSessions, onConnectSessionsChanged } from '../../blue_modules/neurai/connect/client';
import Icon, { MaterialIconName } from '../../components/Icon';
import { securityScore } from '../../components/settings/securityScore';
import {
  biometricLabel,
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { BackendStatus, useBackendStatus } from '../../hooks/useBackendStatus';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { connectedSites } from '../connect/logic';
import { AvailableLanguages } from '../../loc/languages';

const NEURAI_LOGO = require('../../img/addWallet/neurai.png');

/** "Not now" on the security warning, kept across launches. */
const NUDGE_DISMISSED_KEY = 'SettingsSecurityNudgeDismissed';

/** "Español (Spain) (es_ES)" -> "Español": the row has little room. */
const languageLabel = (value: string): string => {
  const found = AvailableLanguages.find(l => l.value === value);
  return (found?.label ?? value).replace(/\s*\(.*$/, '');
};

const StatusPill: React.FC<{ label: string; status: BackendStatus }> = ({ label, status }) => {
  const p = useSettingsPalette();
  const tone = status.state === 'ok' ? p.ok : status.state === 'fail' ? p.fail : p.idle;
  const detail =
    status.state === 'ok'
      ? `${status.ms} ms`
      : status.state === 'fail'
        ? loc.settings.network_status_offline
        : loc.settings.network_status_checking;
  const spoken =
    status.state === 'ok'
      ? `${label}, ${loc.formatString(loc.settings.network_backend_height, { height: status.height })}, ${detail}`
      : `${label}, ${detail}`;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]} accessible accessibilityLabel={spoken}>
      <View style={[styles.pillDot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.pillText, { color: tone.fg }]} numberOfLines={1}>
        {label} · {detail}
      </Text>
    </View>
  );
};

interface QuickTileProps {
  icon: MaterialIconName;
  label: string;
  state: string;
  on: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

/** Square toggle of the "Quick settings" row. */
const QuickTile: React.FC<QuickTileProps> = ({ icon, label, state, on, disabled, onPress, testID }) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityValue={{ text: state }}
      testID={testID}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: on ? p.accentSoft : p.card, borderColor: on ? p.accent : p.card },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} type="material" size={22} color={on ? p.accentText : disabled ? p.mutedOnCard : p.ink} />
      <View style={styles.tileTexts}>
        <Text style={[styles.tileLabel, { color: p.ink }]}>{label}</Text>
        <Text style={[styles.tileState, { color: on ? p.onText : p.mutedOnCard }]} numberOfLines={1}>
          {state}
        </Text>
      </View>
    </Pressable>
  );
};

const Settings: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { preferredFiatCurrency, language, isPrivacyBlurEnabled, setIsPrivacyBlurEnabled } = useSettings();
  const { wallets, saveToDisk, isStorageEncrypted } = useStorage();
  const { isDeviceBiometricCapable, isBiometricUseEnabled, isBiometricUseCapableAndEnabled, setBiometricUseEnabled, deviceBiometricType } =
    useBiometrics();
  const backends = useBackendStatus();

  const [encrypted, setEncrypted] = useState<boolean | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [allHidden, setAllHidden] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(true);
  const [sessions, setSessions] = useState(0);
  const [busy, setBusy] = useState(false);

  // Security can change in the screens this one opens: read it on every focus.
  const readState = useCallback(async () => {
    const [isEncrypted, available, enabled, dismissed] = await Promise.all([
      isStorageEncrypted(),
      isDeviceBiometricCapable(),
      isBiometricUseEnabled(),
      AsyncStorage.getItem(NUDGE_DISMISSED_KEY).catch(() => null),
    ]);
    setEncrypted(!!isEncrypted);
    setBioAvailable(!!available);
    setBioOn(!!enabled);
    setNudgeDismissed(dismissed === '1');
  }, [isStorageEncrypted, isDeviceBiometricCapable, isBiometricUseEnabled]);

  useFocusEffect(
    useCallback(() => {
      readState().catch(e => console.debug('[Settings] state read failed', e));
      setAllHidden(wallets.length > 0 && wallets.every(w => w.hideBalance));
    }, [readState, wallets]),
  );

  useEffect(() => {
    // Sites with a live session, as the Connect screen lists them.
    const refresh = (): void => setSessions(connectedSites(connectSessions()).length);
    refresh();
    return onConnectSessionsChanged(refresh);
  }, []);

  const toggleBiometrics = useCallback(async () => {
    if (!bioAvailable || busy) return;
    setBusy(true);
    try {
      if (await unlockWithBiometrics()) {
        await setBiometricUseEnabled(!bioOn);
        setBioOn(!bioOn);
      }
    } finally {
      setBusy(false);
    }
  }, [bioAvailable, bioOn, busy, setBiometricUseEnabled]);

  // Hides or shows the balance of every wallet, as the eye on the home does for one.
  const toggleHideBalances = useCallback(async () => {
    if (wallets.length === 0 || busy) return;
    const next = !allHidden;
    setBusy(true);
    try {
      if (!next && (await isBiometricUseCapableAndEnabled()) && !(await unlockWithBiometrics())) return;
      for (const wallet of wallets) wallet.hideBalance = next;
      setAllHidden(next);
      await saveToDisk();
    } catch (e) {
      console.debug('[Settings] balance visibility change failed', e);
    } finally {
      setBusy(false);
    }
  }, [wallets, busy, allHidden, isBiometricUseCapableAndEnabled, saveToDisk]);

  const toggleScreenshots = useCallback(
    () => setIsPrivacyBlurEnabled(!isPrivacyBlurEnabled),
    [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled],
  );

  const dismissNudge = useCallback(() => {
    setNudgeDismissed(true);
    AsyncStorage.setItem(NUDGE_DISMISSED_KEY, '1').catch(e => console.debug('[Settings] nudge save failed', e));
  }, []);

  const openSecurity = useCallback(() => navigation.navigate('EncryptStorage'), [navigation]);

  const score = securityScore({
    biometricsAvailable: bioAvailable,
    biometricsOn: bioOn,
    encrypted: !!encrypted,
    screenshotsBlocked: isPrivacyBlurEnabled,
  });
  const sessionsLabel =
    sessions === 0
      ? undefined
      : sessions === 1
        ? loc.settings.connect_sessions_one
        : String(loc.formatString(loc.settings.connect_sessions_many, { count: sessions }));
  const bioName = biometricLabel(deviceBiometricType);

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="SettingsRoot">
      <SettingsScreenHeader title={loc.settings.header} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SettingsCard style={styles.brandCard}>
          <View style={styles.brandRow}>
            <Image source={NEURAI_LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
            <View style={styles.brandTexts}>
              <Text style={[styles.brand, { color: p.ink }]}>
                <Text style={{ color: p.accentText }}>Neurai</Text> Wallet
              </Text>
              <Text style={[styles.version, { color: p.mutedOnCard }]}>
                {String(loc.formatString(loc.settings.settings_version, { version: getVersion() }))}
              </Text>
            </View>
          </View>
          <View style={styles.pills}>
            <StatusPill label={loc.wallets.neurai_network_mainnet} status={backends.mainnet} />
            <StatusPill label={loc.wallets.neurai_network_testnet} status={backends.testnet} />
          </View>
        </SettingsCard>

        {encrypted === false && !nudgeDismissed && (
          <View style={[styles.nudge, { backgroundColor: p.warnBg, borderColor: p.warnBorder }]}>
            <View style={styles.nudgeTop}>
              <View style={[styles.nudgeIcon, { backgroundColor: p.warnIconBg }]}>
                <Icon name="gpp-maybe" type="material" size={22} color={p.accentText} />
              </View>
              <View style={styles.nudgeTexts}>
                <Text style={[styles.nudgeTitle, { color: p.ink }]} accessibilityRole="header">
                  {loc.settings.security_nudge_title}
                </Text>
                <Text style={[styles.nudgeText, { color: p.muted }]}>{loc.settings.security_nudge_text}</Text>
              </View>
            </View>
            <View style={styles.nudgeActions}>
              <Pressable
                onPress={openSecurity}
                accessibilityRole="button"
                testID="SecurityNudgeReview"
                style={({ pressed }) => [styles.nudgeButton, { backgroundColor: p.button }, pressed && styles.pressed]}
              >
                <Text style={styles.nudgeButtonText}>{loc.settings.security_nudge_action}</Text>
              </Pressable>
              <Pressable
                onPress={dismissNudge}
                accessibilityRole="button"
                testID="SecurityNudgeDismiss"
                style={({ pressed }) => [styles.nudgeLater, pressed && styles.pressed]}
              >
                <Text style={[styles.nudgeLaterText, { color: p.muted }]}>{loc.settings.security_nudge_later}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.settings.settings_quick}</SettingsSectionLabel>
          <View style={styles.quickRow}>
            <QuickTile
              icon="fingerprint"
              label={bioName}
              on={bioAvailable && bioOn}
              state={!bioAvailable ? loc.settings.quick_unavailable : bioOn ? loc.settings.quick_bio_on : loc.settings.quick_bio_off}
              disabled={!bioAvailable || busy}
              onPress={toggleBiometrics}
              testID="QuickBiometrics"
            />
            <QuickTile
              icon="visibility-off"
              label={loc.settings.quick_hide}
              on={allHidden}
              state={allHidden ? loc.settings.quick_on : loc.settings.quick_off}
              disabled={wallets.length === 0 || busy}
              onPress={toggleHideBalances}
              testID="QuickHideBalances"
            />
            <QuickTile
              icon="screenshot"
              label={loc.settings.quick_screenshots}
              on={!isPrivacyBlurEnabled}
              state={isPrivacyBlurEnabled ? loc.settings.quick_screenshots_blocked : loc.settings.quick_screenshots_allowed}
              onPress={toggleScreenshots}
              testID="QuickScreenshots"
            />
          </View>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.settings_all}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsRow
              icon="settings"
              title={loc.settings.general}
              subtitle={loc.settings.general_subtitle}
              onPress={() => navigation.navigate('GeneralSettings')}
              testID="GeneralSettings"
            />
            <SettingsRow
              divider
              icon="payments"
              title={loc.settings.currency}
              value={`${preferredFiatCurrency.endPointKey} (${preferredFiatCurrency.symbol})`}
              onPress={() => navigation.navigate('Currency')}
              testID="Currency"
            />
            <SettingsRow
              divider
              icon="language"
              title={loc.settings.language}
              value={languageLabel(language)}
              onPress={() => navigation.navigate('Language')}
              testID="Language"
            />
            <SettingsRow
              divider
              icon="lock-outline"
              title={loc.settings.encrypt_title}
              subtitle={
                encrypted === null ? undefined : String(loc.formatString(loc.settings.security_score, { on: score.on, total: score.total }))
              }
              badge={encrypted === false ? loc.settings.security_review : undefined}
              onPress={openSecurity}
              testID="SecurityButton"
            />
            <SettingsRow
              divider
              icon="dns"
              title={loc.settings.network}
              subtitle={loc.settings.network_subtitle}
              onPress={() => navigation.navigate('NetworkSettings')}
              testID="NetworkSettings"
            />
            <SettingsRow
              divider
              icon="link"
              title={loc.connect.sessions_screen_title}
              value={sessionsLabel}
              onPress={() => navigation.navigate('ConnectSessions')}
              testID="ConnectSessions"
            />
            <SettingsRow
              divider
              icon="info-outline"
              title={loc.settings.about}
              subtitle={loc.settings.about_subtitle}
              onPress={() => navigation.navigate('About')}
              testID="AboutButton"
            />
          </SettingsCard>
        </View>
      </ScrollView>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 18 },
  pressed: { opacity: 0.6 },
  brandCard: { paddingVertical: 16, rowGap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  logo: { width: 44, height: 44 },
  brandTexts: { flex: 1, rowGap: 2 },
  brand: { fontSize: 16, fontWeight: '700' },
  version: { fontSize: 13 },
  pills: { flexDirection: 'row', columnGap: 8 },
  pill: { flex: 1, height: 36, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  nudge: { borderRadius: 24, borderWidth: 1.5, padding: 16, rowGap: 14 },
  nudgeTop: { flexDirection: 'row', columnGap: 12 },
  nudgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nudgeTexts: { flex: 1, rowGap: 4 },
  nudgeTitle: { fontSize: 16, fontWeight: '600' },
  nudgeText: { fontSize: 13, lineHeight: 18 },
  nudgeActions: { flexDirection: 'row', alignItems: 'center', columnGap: 8, paddingLeft: 52, flexWrap: 'wrap', rowGap: 4 },
  nudgeButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center' },
  nudgeButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  nudgeLater: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  nudgeLaterText: { fontSize: 14, fontWeight: '600' },
  quickRow: { flexDirection: 'row', columnGap: 8 },
  tile: { flex: 1, minHeight: 100, padding: 12, borderRadius: 20, borderWidth: 2, justifyContent: 'space-between', rowGap: 8 },
  tileTexts: { rowGap: 1 },
  tileLabel: { fontSize: 13, fontWeight: '600' },
  tileState: { fontSize: 12 },
});
