import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { openSettings } from 'react-native-permissions';
import { useTheme } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { BlueText, BlueSpacing20, BlueListItem, BlueCard, BlueHeaderDefaultSub, BlueSpacing40 } from '../../BlueComponents';
import loc from '../../loc';
import DeviceQuickActions from '../../class/quick-actions';
import BlueClipboard from '../../blue_modules/clipboard';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import WidgetCommunication from '../../blue_modules/WidgetCommunication';

const A = require('../../blue_modules/analytics');

const SettingsPrivacy = () => {
  const { colors } = useTheme();
  const { isStorageEncrypted, setDoNotTrack, isDoNotTrackEnabled, setIsPrivacyBlurEnabled } = useContext(BlueStorageContext);
  const sections = Object.freeze({ ALL: 0, CLIPBOARDREAD: 1, QUICKACTION: 2, WIDGETS: 3 });
  const [isLoading, setIsLoading] = useState(sections.ALL);
  const [isReadClipboardAllowed, setIsReadClipboardAllowed] = useState(false);
  const [doNotTrackSwitchValue, setDoNotTrackSwitchValue] = useState(false);

  const [isDisplayWidgetBalanceAllowed, setIsDisplayWidgetBalanceAllowed] = useState(false);
  const [isQuickActionsEnabled, setIsQuickActionsEnabled] = useState(false);
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
        setDoNotTrackSwitchValue(await isDoNotTrackEnabled());
        setIsReadClipboardAllowed(await BlueClipboard().isReadClipboardAllowed());
        setStorageIsEncrypted(await isStorageEncrypted());
        setIsQuickActionsEnabled(await DeviceQuickActions.getEnabled());
        setIsDisplayWidgetBalanceAllowed(await WidgetCommunication.isBalanceDisplayAllowed());
      } catch (e) {
        console.log(e);
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onValueChange = async value => {
    setIsLoading(sections.CLIPBOARDREAD);
    try {
      await BlueClipboard().setReadClipboardAllowed(value);
      setIsReadClipboardAllowed(value);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  const onDoNotTrackValueChange = async value => {
    setIsLoading(sections.ALL);
    try {
      setDoNotTrackSwitchValue(value);
      A.setOptOut(value);
      await setDoNotTrack(value);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  const onQuickActionsValueChange = async value => {
    setIsLoading(sections.QUICKACTION);
    try {
      await DeviceQuickActions.setEnabled(value);
      setIsQuickActionsEnabled(value);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  const onWidgetsTotalBalanceValueChange = async value => {
    setIsLoading(sections.WIDGETS);
    try {
      await WidgetCommunication.setBalanceDisplayAllowed(value);
      setIsDisplayWidgetBalanceAllowed(value);
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
    setIsPrivacyBlurEnabled(!(isPrivacyBlurEnabledTapped >= 10));
    setIsPrivacyBlurEnabledTapped(prev => prev + 1);
  };

  return (
    <ScrollView style={[styles.root, stylesWithThemeHook.root]}>
      <Pressable accessibilityRole="button" onPress={onDisablePrivacyTapped}>
        {Platform.OS === 'android' ? <BlueHeaderDefaultSub leftText={loc.settings.general} /> : <></>}
      </Pressable>
      <BlueListItem
        hideChevron
        title={loc.settings.privacy_read_clipboard}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange, value: isReadClipboardAllowed, disabled: isLoading === sections.ALL, testID: 'ClipboardSwitch' }}
      />
      <BlueCard>
        <BlueText>{loc.settings.privacy_clipboard_explanation}</BlueText>
      </BlueCard>
      <BlueSpacing20 />
      {!storageIsEncrypted && (
        <>
          <BlueListItem
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
      <BlueListItem
        hideChevron
        title={loc.settings.privacy_do_not_track}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange: onDoNotTrackValueChange, value: doNotTrackSwitchValue, disabled: isLoading === sections.ALL }}
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
          <BlueListItem
            hideChevron
            title={loc.settings.total_balance}
            Component={TouchableWithoutFeedback}
            switch={{
              onValueChange: onWidgetsTotalBalanceValueChange,
              value: isDisplayWidgetBalanceAllowed,
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
      <BlueListItem title={loc.settings.privacy_system_settings} chevron onPress={openApplicationSettings} testID="PrivacySystemSettings" />
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
