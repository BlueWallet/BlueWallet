import React, { useEffect, useState, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View, ActivityIndicator } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import { Header } from '../../components/Header';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { BlueSpacing20 } from '../../BlueComponents';
import { triggerErrorHapticFeedback, triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';

enum SettingsPrivacySection {
  None,
  All,
  ReadClipboard,
  QuickActions,
  Widget,
  TemporaryScreenshots,
  TotalBalance,
}

const SettingsPrivacy: React.FC = React.memo(() => {
  const { colors } = useTheme();
  const { isStorageEncrypted, wallets } = useStorage();
  const {
    isDoNotTrackEnabled,
    setDoNotTrackStorage,
    isPrivacyBlurEnabled,
    setIsPrivacyBlurEnabledState,
    isWidgetBalanceDisplayAllowed,
    setIsWidgetBalanceDisplayAllowedStorage,
    isClipboardGetContentEnabled,
    setIsClipboardGetContentEnabledStorage,
    isQuickActionsEnabled,
    setIsQuickActionsEnabledStorage,
    isTotalBalanceEnabled,
    setIsTotalBalanceEnabledStorage,
  } = useSettings();
  const [isLoading, setIsLoading] = useState<SettingsPrivacySection>(SettingsPrivacySection.All);

  const [storageIsEncrypted, setStorageIsEncrypted] = useState<boolean>(true);
  const styleHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const encrypted = await isStorageEncrypted();
        if (isMounted) {
          setStorageIsEncrypted(encrypted);
        }
      } catch (e) {
        console.error('Error checking storage encryption:', e);
      } finally {
        if (isMounted) {
          setIsLoading(SettingsPrivacySection.None);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isStorageEncrypted]);

  const onDoNotTrackValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.All);
      try {
        await setDoNotTrackStorage(value);
        A.setOptOut(value);
        triggerSelectionHapticFeedback();
      } catch (e) {
        console.error('Error updating Do Not Track:', e);
        triggerErrorHapticFeedback();
      } finally {
        setIsLoading(SettingsPrivacySection.None);
      }
    },
    [setDoNotTrackStorage],
  );

  const onQuickActionsValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.QuickActions);
      try {
        await setIsQuickActionsEnabledStorage(value);
        triggerSelectionHapticFeedback();
      } catch (e) {
        console.error('Error updating Quick Actions:', e);
        triggerErrorHapticFeedback();
      } finally {
        setIsLoading(SettingsPrivacySection.None);
      }
    },
    [setIsQuickActionsEnabledStorage],
  );

  const onWidgetsTotalBalanceValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.Widget);
      try {
        await setIsWidgetBalanceDisplayAllowedStorage(value);
        triggerSelectionHapticFeedback();
      } catch (e) {
        console.error('Error updating Widget Balance Display:', e);
        triggerErrorHapticFeedback();
      } finally {
        setIsLoading(SettingsPrivacySection.None);
      }
    },
    [setIsWidgetBalanceDisplayAllowedStorage],
  );

  const onTotalBalanceEnabledValueChange = useCallback(
    async (value: boolean) => {
      setIsLoading(SettingsPrivacySection.TotalBalance);
      try {
        await setIsTotalBalanceEnabledStorage(value);
        triggerSelectionHapticFeedback();
      } catch (e) {
        console.error('Error updating Total Balance:', e);
        triggerErrorHapticFeedback();
      } finally {
        setIsLoading(SettingsPrivacySection.None);
      }
    },
    [setIsTotalBalanceEnabledStorage],
  );

  const onTemporaryScreenshotsValueChange = useCallback(
    (value: boolean) => {
      setIsLoading(SettingsPrivacySection.TemporaryScreenshots);
      try {
        setIsPrivacyBlurEnabledState(!value);
        triggerSelectionHapticFeedback();
      } catch (e) {
        console.error('Error updating Temporary Screenshots:', e);
        triggerErrorHapticFeedback();
      } finally {
        setIsLoading(SettingsPrivacySection.None);
      }
    },
    [setIsPrivacyBlurEnabledState],
  );

  const openApplicationSettings = useCallback(() => {
    openSettings();
  }, []);

  return (
    <ScrollView style={[styles.root, styleHooks.root]} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      {isLoading !== SettingsPrivacySection.None && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {Platform.OS === 'android' ? (
        <View style={styles.headerContainer}>
          <Header leftText={loc.settings.general} />
        </View>
      ) : null}

      <ListItem
        title={loc.settings.privacy_read_clipboard}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: setIsClipboardGetContentEnabledStorage,
          value: isClipboardGetContentEnabled,
          disabled: isLoading !== SettingsPrivacySection.None,
          testID: 'ClipboardSwitch',
        }}
        subtitle={loc.settings.privacy_clipboard_explanation}
      />

      <ListItem
        title={loc.settings.privacy_quickactions}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: onQuickActionsValueChange,
          value: storageIsEncrypted ? false : isQuickActionsEnabled,
          disabled: isLoading !== SettingsPrivacySection.None || storageIsEncrypted,
          testID: 'QuickActionsSwitch',
        }}
        subtitle={
          <>
            <Text style={styles.subtitleText}>{loc.settings.privacy_quickactions_explanation}</Text>
            {storageIsEncrypted && <Text style={styles.subtitleText}>{loc.settings.encrypted_feature_disabled}</Text>}
          </>
        }
      />

      <ListItem
        title={loc.total_balance_view.title}
        Component={PressableWrapper}
        switch={{
          onValueChange: onTotalBalanceEnabledValueChange,
          value: isTotalBalanceEnabled,
          disabled: isLoading !== SettingsPrivacySection.None || wallets.length < 2,
          testID: 'TotalBalanceSwitch',
        }}
        subtitle={<Text style={styles.subtitleText}>{loc.total_balance_view.explanation}</Text>}
      />

      <ListItem
        title={loc.settings.privacy_temporary_screenshots}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: onTemporaryScreenshotsValueChange,
          value: !isPrivacyBlurEnabled,
          disabled: isLoading !== SettingsPrivacySection.None,
        }}
        subtitle={<Text style={styles.subtitleText}>{loc.settings.privacy_temporary_screenshots_instructions}</Text>}
      />

      <ListItem
        title={loc.settings.privacy_do_not_track}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: onDoNotTrackValueChange,
          value: isDoNotTrackEnabled,
          disabled: isLoading !== SettingsPrivacySection.None,
          testID: 'DoNotTrackSwitch',
        }}
        subtitle={<Text style={styles.subtitleText}>{loc.settings.privacy_do_not_track_explanation}</Text>}
      />

      {Platform.OS === 'ios' && (
        <>
          <BlueSpacing20 />
          <Header leftText={loc.settings.widgets} />
          <ListItem
            title={loc.settings.total_balance}
            Component={TouchableWithoutFeedback}
            switch={{
              onValueChange: onWidgetsTotalBalanceValueChange,
              value: storageIsEncrypted ? false : isWidgetBalanceDisplayAllowed,
              disabled: isLoading !== SettingsPrivacySection.None || storageIsEncrypted,
              testID: 'TotalBalanceWidgetSwitch',
            }}
            subtitle={
              <>
                <Text style={styles.subtitleText}>{loc.settings.total_balance_explanation}</Text>
                {storageIsEncrypted && <Text style={styles.subtitleText}>{loc.settings.encrypted_feature_disabled}</Text>}
              </>
            }
          />
        </>
      )}

      <ListItem title={loc.settings.privacy_system_settings} chevron onPress={openApplicationSettings} testID="PrivacySystemSettings" />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerContainer: {
    paddingVertical: 16,
  },
  subtitleText: {
    fontSize: 14,
    marginTop: 5,
  },
});

export default SettingsPrivacy;
