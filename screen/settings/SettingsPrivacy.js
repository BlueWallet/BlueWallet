import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, StyleSheet, Linking } from 'react-native';
import { BlueTextHooks, BlueSpacing20, BlueListItem, BlueNavigationStyle, BlueCard } from '../../BlueComponents';
import { useTheme } from '@react-navigation/native';
import loc from '../../loc';
import BlueClipboard from '../../blue_modules/clipboard';
import DeviceQuickActions from '../../class/quick-actions';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const SettingsPrivacy = () => {
  const { colors } = useTheme();
  const { isStorageEncrypted } = useContext(BlueStorageContext);
  const sections = Object.freeze({ ALL: 0, CLIPBOARDREAD: 1, QUICKACTION: 2 });
  const [isLoading, setIsLoading] = useState(sections.ALL);
  const [isReadClipboardAllowed, setIsReadClipboardAllowed] = useState(false);
  const [isQuickActionsEnabled, setIsQuickActionsEnabled] = useState(false);
  const [storageIsEncrypted, setStorageIsEncrypted] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsReadClipboardAllowed(await BlueClipboard.isReadClipboardAllowed());
        setStorageIsEncrypted(await isStorageEncrypted());
        setIsQuickActionsEnabled(await DeviceQuickActions.getEnabled());
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
      <BlueListItem
        hideChevron
        title={loc.settings.privacy_read_clipboard}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange, value: isReadClipboardAllowed, disabled: isLoading === sections.ALL }}
      />
      <BlueCard>
        <BlueTextHooks>{loc.settings.privacy_clipboard_explanation}</BlueTextHooks>
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
            <BlueTextHooks>{loc.settings.privacy_quickactions_explanation}</BlueTextHooks>
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
