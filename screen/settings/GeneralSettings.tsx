import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import { usePlatformSearchAvailability } from '../../blue_modules/NativePlatformSearch';
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
  PlatformSearch,
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
    isPlatformSearchEnabled,
    setIsPlatformSearchEnabledStorage,
    isPlatformSearchAddressesEnabled,
    setIsPlatformSearchAddressesEnabledStorage,
  } = useSettings();
  const [isLoading, setIsLoading] = useState<number>(SettingsPrivacySection.All);
  const [storageIsEncrypted, setStorageIsEncrypted] = useState<boolean>(true);
  const supportsSystemSearch = Platform.OS === 'ios' || Platform.OS === 'android' || isDesktop;
  const indexingAvailable = usePlatformSearchAvailability();
  const platformSearchSetup = Platform.OS === 'android' ? loc.settings.android_search_setup : loc.settings.spotlight_search_setup;
  const platformSearchStatus =
    indexingAvailable === null ? loc.settings.platform_search_checking : indexingAvailable ? '' : loc.settings.platform_search_unavailable;
  const platformSearchTitle = Platform.OS === 'android' ? loc.settings.android_system_search : loc.settings.spotlight_search;
  const platformSearchExplanation =
    Platform.OS === 'android' ? loc.settings.android_system_search_explanation : loc.settings.spotlight_search_explanation;
  const platformSearchAddressesExplanation =
    Platform.OS === 'android' ? loc.settings.android_system_search_addresses_explanation : loc.settings.spotlight_addresses_explanation;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        let encrypted = true;
        try {
          encrypted = await isStorageEncrypted();
        } catch (e) {
          console.log(e);
        }
        if (!active) return;
        setStorageIsEncrypted(encrypted);
        setIsLoading(SettingsPrivacySection.None);
      })();

      return () => {
        active = false;
      };
    }, [isStorageEncrypted]),
  );

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

  const openPlatformSearchMoreInfo = useCallback(() => {
    const url =
      Platform.OS === 'android' ? 'https://developer.android.com/develop/ui/views/search/appsearch' : 'https://support.apple.com/102321';
    Linking.openURL(url).catch(error => console.warn('[PlatformSearch] Unable to open platform documentation:', error));
  }, []);

  const onHandOffUseEnabledChange = useCallback(
    async (value: boolean) => {
      await setIsHandOffUseEnabledAsyncStorage(value);
    },
    [setIsHandOffUseEnabledAsyncStorage],
  );

  const onPlatformSearchEnabledChange = useCallback(
    async (value: boolean) => {
      if (indexingAvailable !== true || storageIsEncrypted) return;
      setIsLoading(SettingsPrivacySection.PlatformSearch);
      try {
        await setIsPlatformSearchEnabledStorage(value);
      } finally {
        setIsLoading(SettingsPrivacySection.None);
      }
    },
    [indexingAvailable, storageIsEncrypted, setIsPlatformSearchEnabledStorage],
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

      {supportsSystemSearch && (
        <SettingsSection title={loc.settings.integrations}>
          <SettingsListItem
            title={platformSearchTitle}
            testID="PlatformSearchEnabled"
            subtitle={`${[platformSearchStatus, platformSearchExplanation, platformSearchSetup].filter(Boolean).join('\n\n')}${encryptedDisabledNote}`}
            subtitleNumberOfLines={0}
            switch={{
              value: indexingAvailable === true && !storageIsEncrypted && isPlatformSearchEnabled,
              onValueChange: onPlatformSearchEnabledChange,
              disabled:
                isLoading === SettingsPrivacySection.All ||
                isLoading === SettingsPrivacySection.PlatformSearch ||
                storageIsEncrypted ||
                indexingAvailable !== true,
            }}
          />
          {indexingAvailable === true && isPlatformSearchEnabled && !storageIsEncrypted && (
            <SettingsListItem
              title={loc.settings.platform_search_addresses}
              testID="PlatformSearchAddresses"
              subtitle={platformSearchAddressesExplanation}
              switch={{
                value: isPlatformSearchAddressesEnabled,
                onValueChange: setIsPlatformSearchAddressesEnabledStorage,
                disabled: isLoading === SettingsPrivacySection.All,
              }}
            />
          )}
          <SettingsListItem title={loc.send.open_settings} onPress={openApplicationSettings} testID="PlatformSearchDeviceSettings" />
          <SettingsListItem
            title={loc.wallets.more_info}
            onPress={openPlatformSearchMoreInfo}
            testID="PlatformSearchMoreInfo"
            bottomDivider={false}
          />
        </SettingsSection>
      )}

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
