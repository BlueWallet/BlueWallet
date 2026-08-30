import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';

enum SettingsPrivacySection {
  None,
  All,
  ReadClipboard,
  QuickActions,
  Widget,
  TemporaryScreenshots,
  TotalBalance,
}

const GeneralSettings: React.FC = () => {
  const { wallets, isStorageEncrypted } = useStorage();

  const {
    isDoNotTrackEnabled,
    setDoNotTrackStorage,
    isPrivacyBlurEnabled,
    setIsPrivacyBlurEnabled,
    isWidgetBalanceDisplayAllowed,
    setIsWidgetBalanceDisplayAllowedStorage,
    isClipboardGetContentEnabled,
    setIsClipboardGetContentEnabledStorage,
    isQuickActionsEnabled,
    setIsQuickActionsEnabledStorage,
    isTotalBalanceEnabled,
    setIsTotalBalanceEnabledStorage,
    isHandOffUseEnabled,
    setIsHandOffUseEnabledAsyncStorage,
  } = useSettings();
  const [isLoading, setIsLoading] = useState<number>(SettingsPrivacySection.All);
  const [storageIsEncrypted, setStorageIsEncrypted] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        setStorageIsEncrypted(await isStorageEncrypted());
      } catch (e) {
        console.log(e);
      }
      setIsLoading(SettingsPrivacySection.None);
    })();
  }, [isStorageEncrypted]);

  const onDoNotTrackValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.All);
      try {
        setDoNotTrackStorage(value);
        A.setOptOut(value);
      } catch (e) {
        console.debug('onDoNotTrackValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setDoNotTrackStorage],
  );

  const onQuickActionsValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.QuickActions);
      try {
        setIsQuickActionsEnabledStorage(value);
      } catch (e) {
        console.debug('onQuickActionsValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsQuickActionsEnabledStorage],
  );

  const onWidgetsTotalBalanceValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.Widget);
      try {
        setIsWidgetBalanceDisplayAllowedStorage(value);
      } catch (e) {
        console.debug('onWidgetsTotalBalanceValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsWidgetBalanceDisplayAllowedStorage],
  );

  const onTotalBalanceEnabledValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.TotalBalance);
      try {
        setIsTotalBalanceEnabledStorage(value);
      } catch (e) {
        console.debug('onTotalBalanceEnabledValueChange catch', e);
      }
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsTotalBalanceEnabledStorage],
  );

  const onTemporaryScreenshotsValueChange = useCallback(
    (value: boolean) => {
      setIsLoading(SettingsPrivacySection.TemporaryScreenshots);
      setIsPrivacyBlurEnabled(!value);
      setIsLoading(SettingsPrivacySection.None);
    },
    [setIsPrivacyBlurEnabled],
  );

  const openApplicationSettings = useCallback(() => {
    openSettings();
  }, []);

  const onHandOffUseEnabledChange = useCallback(
    async (value: boolean) => {
      await setIsHandOffUseEnabledAsyncStorage(value);
    },
    [setIsHandOffUseEnabledAsyncStorage],
  );

  const encryptedDisabledNote = storageIsEncrypted ? `\n${loc.settings.encrypted_feature_disabled}` : '';

  return (
    <SettingsScrollView testID="GeneralSettingsScreen">
      <SettingsSection title={loc.settings.privacy}>
        <SettingsListItem
          title={loc.settings.privacy_read_clipboard}
          subtitle={loc.settings.privacy_clipboard_explanation}
          switch={{
            value: isClipboardGetContentEnabled,
            onValueChange: setIsClipboardGetContentEnabledStorage,
            disabled: isLoading === SettingsPrivacySection.All,
          }}
          switchTestID="ClipboardSwitch"
        />
        <SettingsListItem
          title={loc.settings.privacy_quickactions}
          subtitle={`${loc.settings.privacy_quickactions_explanation}${encryptedDisabledNote}`}
          switch={{
            value: storageIsEncrypted ? false : isQuickActionsEnabled,
            onValueChange: onQuickActionsValueChange,
            disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
          }}
          switchTestID="QuickActionsSwitch"
        />
        <SettingsListItem
          title={loc.total_balance_view.title}
          subtitle={loc.total_balance_view.explanation}
          switch={{
            value: isTotalBalanceEnabled,
            onValueChange: onTotalBalanceEnabledValueChange,
            disabled: isLoading === SettingsPrivacySection.All || wallets.length < 2,
          }}
          switchTestID="TotalBalanceSwitch"
        />
        {!isDesktop && (
          <SettingsListItem
            title={loc.settings.privacy_temporary_screenshots}
            subtitle={loc.settings.privacy_temporary_screenshots_instructions}
            switch={{
              value: !isPrivacyBlurEnabled,
              onValueChange: onTemporaryScreenshotsValueChange,
              disabled: isLoading === SettingsPrivacySection.All,
            }}
          />
        )}
        <SettingsListItem
          title={loc.settings.privacy_do_not_track}
          subtitle={loc.settings.privacy_do_not_track_explanation}
          switch={{
            value: isDoNotTrackEnabled,
            onValueChange: onDoNotTrackValueChange,
            disabled: isLoading === SettingsPrivacySection.All,
          }}
          bottomDivider={false}
        />
      </SettingsSection>

      {Platform.OS === 'ios' && (
        <>
          <SettingsSection title={loc.settings.widgets}>
            <SettingsListItem
              title={loc.settings.total_balance}
              subtitle={`${loc.settings.total_balance_explanation}${encryptedDisabledNote}`}
              switch={{
                value: storageIsEncrypted ? false : isWidgetBalanceDisplayAllowed,
                onValueChange: onWidgetsTotalBalanceValueChange,
                disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
              }}
              bottomDivider={false}
            />
          </SettingsSection>

          <SettingsSection title={loc.settings.general_continuity}>
            <SettingsListItem
              title={loc.settings.general_continuity}
              subtitle={loc.settings.general_continuity_e}
              switch={{
                value: isHandOffUseEnabled,
                onValueChange: onHandOffUseEnabledChange,
              }}
              bottomDivider={false}
            />
          </SettingsSection>
        </>
      )}

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.privacy_system_settings}
          onPress={openApplicationSettings}
          testID="PrivacySystemSettings"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default GeneralSettings;
