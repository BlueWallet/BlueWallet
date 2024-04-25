import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { openSettings } from 'react-native-permissions';

import navigationStyle from '../../components/navigationStyle';
import { BlueText, BlueSpacing20, BlueCard, BlueHeaderDefaultSub, BlueSpacing40 } from '../../BlueComponents';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
import ListItem from '../../components/ListItem';
import A from '../../blue_modules/analytics';
import { useSettings } from '../../components/Context/SettingsContext';
import { setBalanceDisplayAllowed } from '../../components/WidgetCommunication';

const SettingsPrivacy = () => {
  const { colors } = useTheme();
  const { isStorageEncrypted } = useContext(BlueStorageContext);
  const {
    isDoNotTrackEnabled,
    setDoNotTrackStorage,
    setIsPrivacyBlurEnabledState,
    isWidgetBalanceDisplayAllowed,
    setIsWidgetBalanceDisplayAllowedStorage,
    isClipboardGetContentEnabled,
    setIsClipboardGetContentEnabledStorage,
    isQuickActionsEnabled,
    setIsQuickActionsEnabledStorage,
  } = useSettings();
  const sections = Object.freeze({ ALL: 0, CLIPBOARDREAD: 1, QUICKACTION: 2, WIDGETS: 3 });
  const [isLoading, setIsLoading] = useState(sections.ALL);

  const [storageIsEncrypted, setStorageIsEncrypted] = useState(true);
  const [isPrivacyBlurEnabledTapped, setIsPrivacyBlurEnabledTapped] = useState(0);
  const styleHooks = StyleSheet.create({
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
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDoNotTrackValueChange = async value => {
    setIsLoading(sections.ALL);
    try {
      setDoNotTrackStorage(value);
      A.setOptOut(value);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  const onQuickActionsValueChange = async value => {
    setIsLoading(sections.QUICKACTION);
    try {
      setIsQuickActionsEnabledStorage(value);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  const onWidgetsTotalBalanceValueChange = async value => {
    setIsLoading(sections.WIDGETS);
    try {
      await setBalanceDisplayAllowed(value);
      setIsWidgetBalanceDisplayAllowedStorage(value);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  const stylesWithThemeHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
  });

  const openApplicationSettings = () => {
    openSettings();
  };

  const onDisablePrivacyTapped = () => {
    setIsPrivacyBlurEnabledState(!(isPrivacyBlurEnabledTapped >= 10));
    setIsPrivacyBlurEnabledTapped(prev => prev + 1);
  };

  return (
    <ScrollView style={[styles.root, stylesWithThemeHook.root]} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      {Platform.OS === 'android' ? <BlueHeaderDefaultSub leftText={loc.settings.general} /> : <></>}
      <ListItem
        hideChevron
        title={loc.settings.privacy_read_clipboard}
        Component={TouchableWithoutFeedback}
        switch={{
          onValueChange: setIsClipboardGetContentEnabledStorage,
          value: isClipboardGetContentEnabled,
          disabled: isLoading === sections.ALL,
          testID: 'ClipboardSwitch',
        }}
      />
      <BlueCard>
        <Pressable accessibilityRole="button" onPress={onDisablePrivacyTapped}>
          <BlueText>{loc.settings.privacy_clipboard_explanation}</BlueText>
        </Pressable>
      </BlueCard>
      <BlueSpacing20 />
      {!storageIsEncrypted && (
        <>
          <ListItem
            hideChevron
            title={loc.settings.privacy_quickactions}
            Component={TouchableWithoutFeedback}
            switch={{
              onValueChange: onQuickActionsValueChange,
              value: isQuickActionsEnabled,
              disabled: isLoading === sections.ALL,
              testID: 'QuickActionsSwitch',
            }}
          />
          <BlueCard>
            <BlueText>{loc.settings.privacy_quickactions_explanation}</BlueText>
          </BlueCard>
        </>
      )}
      <ListItem
        hideChevron
        title={loc.settings.privacy_do_not_track}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange: onDoNotTrackValueChange, value: isDoNotTrackEnabled, disabled: isLoading === sections.ALL }}
      />
      <BlueCard>
        <BlueText>{loc.settings.privacy_do_not_track_explanation}</BlueText>
      </BlueCard>
      {Platform.OS === 'ios' && !storageIsEncrypted && (
        <>
          <BlueSpacing40 />
          <Text adjustsFontSizeToFit style={[styles.widgetsHeader, styleHooks.widgetsHeader]}>
            {loc.settings.widgets}
          </Text>
          <ListItem
            hideChevron
            title={loc.settings.total_balance}
            Component={TouchableWithoutFeedback}
            switch={{
              onValueChange: onWidgetsTotalBalanceValueChange,
              value: isWidgetBalanceDisplayAllowed,
              disabled: isLoading === sections.ALL,
            }}
          />
          <BlueCard>
            <BlueText>{loc.settings.total_balance_explanation}</BlueText>
          </BlueCard>
        </>
      )}
      <BlueSpacing20 />

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
});

SettingsPrivacy.navigationOptions = navigationStyle({ headerLargeTitle: true }, opts => ({ ...opts, title: loc.settings.privacy }));

export default SettingsPrivacy;
