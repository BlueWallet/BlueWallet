import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import presentAlert from '../../components/Alert';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import loc from '../../loc';
import NotificationPrivacySettings from '../../components/NotificationPrivacySettings';
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

const PrivacyMoreInfo: React.FC<{ url: string; bottomDivider?: boolean }> = ({ url, bottomDivider = true }) => (
  <SettingsListItem
    title={loc.wallets.more_info}
    onPress={() => Linking.openURL(url).catch(error => presentAlert({ message: error.message }))}
    bottomDivider={bottomDivider}
  />
);

const PrivacySettings: React.FC = () => {
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
    <SettingsScrollView testID="PrivacySettingsScreen">
      <SettingsSection>
        <SettingsListItem
          title={loc.total_balance_view.title}
          subtitle={loc.total_balance_view.explanation}
          switch={{
            value: isTotalBalanceEnabled,
            onValueChange: onTotalBalanceEnabledValueChange,
            disabled: isLoading === SettingsPrivacySection.All || wallets.length < 2,
          }}
          switchTestID="TotalBalanceSwitch"
          bottomDivider={false}
        />
      </SettingsSection>

      {!isDesktop && (
        <SettingsSection title={loc.settings.privacy_screen_visibility}>
          <SettingsListItem
            title={loc.settings.privacy_temporary_screenshots}
            subtitle={loc.settings.privacy_temporary_screenshots_instructions}
            switch={{
              value: !isPrivacyBlurEnabled,
              onValueChange: onTemporaryScreenshotsValueChange,
              disabled: isLoading === SettingsPrivacySection.All,
            }}
            bottomDivider={false}
          />
        </SettingsSection>
      )}

      <SettingsSection title={loc.settings.notifications}>
        <NotificationPrivacySettings bottomDivider />
        <PrivacyMoreInfo url="https://bluewallet.io/bluewallet-v8-0-1-private-notifications/" bottomDivider={false} />
      </SettingsSection>

      <SettingsSection title={loc.settings.privacy_device_integrations}>
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
        <PrivacyMoreInfo
          url={
            Platform.OS === 'ios'
              ? 'https://support.apple.com/guide/iphone/perform-quick-actions-iphcc8f419db/ios'
              : 'https://support.google.com/android/answer/9450271'
          }
          bottomDivider={Platform.OS === 'ios'}
        />
        {Platform.OS === 'ios' && (
          <>
            <SettingsListItem
              title={loc.settings.widgets}
              subtitle={`${loc.settings.total_balance_explanation}${encryptedDisabledNote}`}
              switch={{
                value: storageIsEncrypted ? false : isWidgetBalanceDisplayAllowed,
                onValueChange: onWidgetsTotalBalanceValueChange,
                disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
              }}
            />
            <PrivacyMoreInfo url="https://support.apple.com/guide/iphone/add-edit-and-remove-widgets-iphb8f1bf206/ios" />
            <SettingsListItem
              title={loc.settings.general_continuity}
              subtitle={loc.settings.general_continuity_e}
              switch={{
                value: isHandOffUseEnabled,
                onValueChange: onHandOffUseEnabledChange,
              }}
            />
            <PrivacyMoreInfo url="https://www.apple.com/macos/continuity/" bottomDivider={false} />
          </>
        )}
      </SettingsSection>

      <SettingsSection title={loc.settings.privacy_data_sharing}>
        <SettingsListItem
          title={loc.settings.privacy_do_not_track}
          subtitle={loc.settings.privacy_do_not_track_explanation}
          switch={{
            value: isDoNotTrackEnabled,
            onValueChange: onDoNotTrackValueChange,
            disabled: isLoading === SettingsPrivacySection.All,
          }}
        />
        <PrivacyMoreInfo url="https://bluewallet.io/privacy/" bottomDivider={false} />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.privacy_system_settings}
          onPress={openApplicationSettings}
          testID="PrivacySystemSettings"
          bottomDivider={false}
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default PrivacySettings;
