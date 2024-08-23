import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { openSettings } from 'react-native-permissions';
import A from '../../blue_modules/analytics';
import { BlueCard, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import { Header } from '../../components/Header';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import { setBalanceDisplayAllowed } from '../../components/WidgetCommunication';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';

enum SettingsPrivacySection {
  None,
  All,
  ReadClipboard,
  QuickActions,
  Widget,
  TemporaryScreenshots,
  TotalBalance,
}

const SettingsPrivacy: React.FC = () => {
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
  const [isLoading, setIsLoading] = useState<number>(SettingsPrivacySection.All);

  const [storageIsEncrypted, setStorageIsEncrypted] = useState<boolean>(true);
  const styleHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    widgetsHeader: {
      color: colors.foregroundColor,
    },
  });

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

  const onDoNotTrackValueChange = async (value: boolean) => {
    setIsLoading(SettingsPrivacySection.All);
    try {
      setDoNotTrackStorage(value);
      A.setOptOut(value);
    } catch (e) {
      console.debug('onDoNotTrackValueChange catch', e);
    }
    setIsLoading(SettingsPrivacySection.None);
  };

  const onQuickActionsValueChange = async (value: boolean) => {
    setIsLoading(SettingsPrivacySection.QuickActions);
    try {
      setIsQuickActionsEnabledStorage(value);
    } catch (e) {
      console.debug('onQuickActionsValueChange catch', e);
    }
    setIsLoading(SettingsPrivacySection.None);
  };

  const onWidgetsTotalBalanceValueChange = async (value: boolean) => {
    setIsLoading(SettingsPrivacySection.Widget);
    try {
      await setBalanceDisplayAllowed(value);
      setIsWidgetBalanceDisplayAllowedStorage(value);
    } catch (e) {
      console.debug('onWidgetsTotalBalanceValueChange catch', e);
    }
    setIsLoading(SettingsPrivacySection.None);
  };

  const onTotalBalanceEnabledValueChange = async (value: boolean) => {
    setIsLoading(SettingsPrivacySection.TotalBalance);
    try {
      setIsTotalBalanceEnabledStorage(value);
    } catch (e) {
      console.debug('onTotalBalanceEnabledValueChange catch', e);
    }
    setIsLoading(SettingsPrivacySection.None);
  };

  const onTemporaryScreenshotsValueChange = (value: boolean) => {
    setIsLoading(SettingsPrivacySection.TemporaryScreenshots);
    setIsPrivacyBlurEnabledState(!value);
    setIsLoading(SettingsPrivacySection.None);
  };

  const openApplicationSettings = () => {
    openSettings();
  };

  return (
    <ScrollView style={[styles.root, styleHooks.root]} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
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
          disabled: isLoading === SettingsPrivacySection.All,
          testID: 'ClipboardSwitch',
        }}
      />
      <BlueCard>
        <Pressable accessibilityRole="button">
          <BlueText>{loc.settings.privacy_clipboard_explanation}</BlueText>
        </Pressable>
      </BlueCard>
      <BlueSpacing20 />
      <ListItem
        title={loc.settings.privacy_quickactions}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: onQuickActionsValueChange,
          value: storageIsEncrypted ? false : isQuickActionsEnabled,
          disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
          testID: 'QuickActionsSwitch',
        }}
      />
      <BlueCard>
        <BlueText>{loc.settings.privacy_quickactions_explanation}</BlueText>
        <BlueSpacing20 />
        {storageIsEncrypted && <BlueText>{loc.settings.encrypted_feature_disabled}</BlueText>}
      </BlueCard>
      <ListItem
        title={loc.total_balance_view.title}
        Component={PressableWrapper}
        switch={{
          onValueChange: onTotalBalanceEnabledValueChange,
          value: isTotalBalanceEnabled,
          disabled: isLoading === SettingsPrivacySection.All || wallets.length < 2,
          testID: 'TotalBalanceSwitch',
        }}
      />
      <BlueCard>
        <BlueText>{loc.total_balance_view.explanation}</BlueText>
        <BlueSpacing20 />
      </BlueCard>
      <ListItem
        title={loc.settings.privacy_temporary_screenshots}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: onTemporaryScreenshotsValueChange,
          value: !isPrivacyBlurEnabled,
          disabled: isLoading === SettingsPrivacySection.All,
        }}
      />
      <BlueCard>
        <BlueText>{loc.settings.privacy_temporary_screenshots_instructions}</BlueText>
      </BlueCard>
      <ListItem
        title={loc.settings.privacy_do_not_track}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange: onDoNotTrackValueChange, value: isDoNotTrackEnabled, disabled: isLoading === SettingsPrivacySection.All }}
      />
      <BlueCard>
        <BlueText>{loc.settings.privacy_do_not_track_explanation}</BlueText>
      </BlueCard>
      {Platform.OS === 'ios' && (
        <>
          <BlueSpacing40 />
          <Text adjustsFontSizeToFit style={[styles.widgetsHeader, styleHooks.widgetsHeader]}>
            {loc.settings.widgets}
          </Text>
          <ListItem
            title={loc.settings.total_balance}
            Component={TouchableWithoutFeedback}
            switch={{
              onValueChange: onWidgetsTotalBalanceValueChange,
              value: storageIsEncrypted ? false : isWidgetBalanceDisplayAllowed,
              disabled: isLoading === SettingsPrivacySection.All || storageIsEncrypted,
            }}
          />
          <BlueCard>
            <BlueText>{loc.settings.total_balance_explanation}</BlueText>
            <BlueSpacing20 />
            {storageIsEncrypted && <BlueText>{loc.settings.encrypted_feature_disabled}</BlueText>}
          </BlueCard>
        </>
      )}

      <BlueSpacing20 />
      <ListItem title={loc.settings.privacy_system_settings} chevron onPress={openApplicationSettings} testID="PrivacySystemSettings" />
      <BlueSpacing20 />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  widgetsHeader: {
    fontWeight: 'bold',
    fontSize: 30,
    marginLeft: 17,
  },
  headerContainer: {
    paddingVertical: 16,
  },
});

export default SettingsPrivacy;
