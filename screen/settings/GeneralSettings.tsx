/**
 * General settings in the home's style: the theme as three buttons, then the
 * switches grouped by what they touch (privacy, widgets on iOS, addresses)
 * and a separate card that leaves for the system settings.
 */
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openSettings } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDesktop } from '../../blue_modules/environment';
import { ThemeMode } from '../../components/Context/SettingsProvider';
import {
  SettingsCard,
  SettingsIconCircle,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegment,
  SettingsSegmented,
  SettingsStaticRow,
  SettingsSwitchRow,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';

const GeneralSettings: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { isStorageEncrypted } = useStorage();
  const {
    isPrivacyBlurEnabled,
    setIsPrivacyBlurEnabled,
    isWidgetBalanceDisplayAllowed,
    setIsWidgetBalanceDisplayAllowedStorage,
    isClipboardGetContentEnabled,
    setIsClipboardGetContentEnabledStorage,
    isQuickActionsEnabled,
    setIsQuickActionsEnabledStorage,
    isHandOffUseEnabled,
    setIsHandOffUseEnabledAsyncStorage,
    themeMode,
    setThemeModeStorage,
    isSingleAddressEnabled,
    setIsSingleAddressEnabledStorage,
  } = useSettings();

  // Shortcuts and widgets would show balances outside the lock, so encrypted
  // storage turns them off. Until it is read, those switches wait.
  const [encrypted, setEncrypted] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    isStorageEncrypted()
      .then(value => alive && setEncrypted(value))
      .catch(e => {
        console.log(e);
        if (alive) setEncrypted(true);
      });
    return () => {
      alive = false;
    };
  }, [isStorageEncrypted]);
  const ready = encrypted !== null;
  const withEncryptedNote = (text: string) => (encrypted ? `${text} ${loc.settings.encrypted_feature_disabled}` : text);

  const themes: SettingsSegment<ThemeMode>[] = [
    { value: 'system', label: loc.settings.theme_system, icon: 'smartphone', testID: 'ThemeSystem' },
    { value: 'light', label: loc.settings.theme_light, icon: 'light-mode', testID: 'ThemeLight' },
    { value: 'dark', label: loc.settings.theme_dark, icon: 'dark-mode', testID: 'ThemeDark' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="GeneralSettingsScreen">
      <SettingsScreenHeader title={loc.settings.general} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View>
          <SettingsSectionLabel>{loc.settings.appearance}</SettingsSectionLabel>
          <SettingsCard style={styles.themeCard}>
            <View style={styles.themeHead}>
              <SettingsIconCircle icon="contrast" />
              <View style={styles.themeTexts}>
                <Text style={[styles.themeTitle, { color: p.ink }]}>{loc.settings.theme}</Text>
                <Text style={[styles.themeHint, { color: p.mutedOnCard }]}>{loc.settings.theme_explanation}</Text>
              </View>
            </View>
            <SettingsSegmented segments={themes} value={themeMode} onChange={setThemeModeStorage} testID="ThemeModeSetting" />
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.privacy}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsSwitchRow
              icon="content-paste"
              title={loc.settings.privacy_read_clipboard}
              subtitle={loc.settings.privacy_clipboard_explanation}
              value={isClipboardGetContentEnabled}
              onValueChange={setIsClipboardGetContentEnabledStorage}
              disabled={!ready}
              switchTestID="ClipboardSwitch"
            />
            <SettingsSwitchRow
              divider
              icon="bolt"
              title={loc.settings.privacy_quickactions}
              subtitle={withEncryptedNote(loc.settings.privacy_quickactions_explanation)}
              value={encrypted ? false : isQuickActionsEnabled}
              onValueChange={setIsQuickActionsEnabledStorage}
              disabled={!ready || !!encrypted}
              switchTestID="QuickActionsSwitch"
            />
            {!isDesktop && (
              <SettingsSwitchRow
                divider
                icon="screenshot"
                title={loc.settings.privacy_temporary_screenshots}
                subtitle={loc.settings.privacy_temporary_screenshots_instructions}
                value={!isPrivacyBlurEnabled}
                onValueChange={allow => setIsPrivacyBlurEnabled(!allow)}
                switchTestID="TemporaryScreenshotsSwitch"
              />
            )}
          </SettingsCard>
        </View>

        {Platform.OS === 'ios' && (
          <View>
            <SettingsSectionLabel>{loc.settings.widgets}</SettingsSectionLabel>
            <SettingsCard>
              <SettingsSwitchRow
                icon="widgets"
                title={loc.settings.total_balance}
                subtitle={withEncryptedNote(loc.settings.total_balance_explanation)}
                value={encrypted ? false : isWidgetBalanceDisplayAllowed}
                onValueChange={setIsWidgetBalanceDisplayAllowedStorage}
                disabled={!ready || !!encrypted}
                switchTestID="WidgetTotalBalanceSwitch"
              />
            </SettingsCard>
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.addresses.addresses_title}</SettingsSectionLabel>
          <SettingsCard>
            {/* Mandatory for now: a label says so, instead of a switch that does nothing. */}
            <SettingsStaticRow
              icon="repeat"
              title={loc.settings.pq_address_reuse}
              subtitle={loc.settings.pq_address_reuse_explanation}
              badge={loc.settings.always_on}
              badgeTone="ok"
              testID="PQAddressReuse"
            />
            <SettingsSwitchRow
              divider
              icon="place"
              title={loc.settings.single_address}
              subtitle={loc.settings.single_address_explanation}
              value={isSingleAddressEnabled}
              onValueChange={setIsSingleAddressEnabledStorage}
              disabled={!ready}
              switchTestID="SingleAddressSwitch"
            />
          </SettingsCard>
        </View>

        {Platform.OS === 'ios' && (
          <View>
            <SettingsSectionLabel>{loc.settings.general_continuity}</SettingsSectionLabel>
            <SettingsCard>
              <SettingsSwitchRow
                icon="devices"
                title={loc.settings.general_continuity}
                subtitle={loc.settings.general_continuity_e}
                value={isHandOffUseEnabled}
                onValueChange={setIsHandOffUseEnabledAsyncStorage}
              />
            </SettingsCard>
          </View>
        )}

        <SettingsCard>
          <SettingsRow
            external
            icon="open-in-new"
            title={loc.settings.privacy_system_settings}
            subtitle={loc.settings.privacy_system_settings_hint}
            onPress={() => openSettings()}
            testID="PrivacySystemSettings"
          />
        </SettingsCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  themeCard: { paddingVertical: 16, rowGap: 14 },
  themeHead: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  themeTexts: { flex: 1, rowGap: 2 },
  themeTitle: { fontSize: 15, fontWeight: '600' },
  themeHint: { fontSize: 13, lineHeight: 18 },
});

export default GeneralSettings;
