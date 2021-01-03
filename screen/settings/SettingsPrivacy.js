import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, StyleSheet, Linking, Platform } from 'react-native';
import { BlueText, BlueSpacing20, BlueListItem, BlueNavigationStyle, BlueCard, BlueHeaderDefaultSub } from '../../BlueComponents';
import { useTheme } from '@react-navigation/native';
import loc from '../../loc';
import BlueClipboard from '../../blue_modules/clipboard';
import DeviceQuickActions from '../../class/quick-actions';
import { BlueStorageContext } from '../../blue_modules/storage-context';

import WidgetCommunication from '../../blue_modules/WidgetCommunication';

const SettingsPrivacy = () => {
  const { colors } = useTheme();
  const { isStorageEncrypted } = useContext(BlueStorageContext);
  const sections = Object.freeze({ ALL: 0, CLIPBOARDREAD: 1, QUICKACTION: 2, WIDGETS: 3 });
  const [isLoading, setIsLoading] = useState(sections.ALL);
  const [isReadClipboardAllowed, setIsReadClipboardAllowed] = useState(false);

  const [isDisplayWidgetBalanceAllowed, setIsDisplayWidgetBalanceAllowed] = useState(false);
  const [isQuickActionsEnabled, setIsQuickActionsEnabled] = useState(false);
  const [storageIsEncrypted, setStorageIsEncrypted] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsReadClipboardAllowed(await BlueClipboard.isReadClipboardAllowed());
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
      await BlueClipboard.setReadClipboardAllowed(value);
      setIsReadClipboardAllowed(value);
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
    Linking.openSettings();
  };

  return (
    <ScrollView style={[styles.root, stylesWithThemeHook.root]}>
      <BlueHeaderDefaultSub leftText={loc.settings.general} rightComponent={null} />
      <BlueListItem
        hideChevron
        title={loc.settings.privacy_read_clipboard}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange, value: isReadClipboardAllowed, disabled: isLoading === sections.ALL }}
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
            switch={{ onValueChange: onQuickActionsValueChange, value: isQuickActionsEnabled, disabled: isLoading === sections.ALL }}
          />
          <BlueCard>
            <BlueText>{loc.settings.privacy_quickactions_explanation}</BlueText>
          </BlueCard>
        </>
      )}
      {Platform.OS === 'ios' && !storageIsEncrypted && (
        <>
          <BlueHeaderDefaultSub leftText={loc.settings.widgets} rightComponent={null} />
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
      <BlueListItem title={loc.settings.privacy_system_settings} chevron onPress={openApplicationSettings} />
      <BlueSpacing20 />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

SettingsPrivacy.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.privacy,
});

export default SettingsPrivacy;
