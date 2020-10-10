import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, StyleSheet, Linking } from 'react-native';
import { BlueTextHooks, BlueSpacing20, BlueListItem, BlueNavigationStyle, BlueCard } from '../../BlueComponents';
import { useTheme } from '@react-navigation/native';
import loc from '../../loc';
import AppStateChange from '../../blue_modules/appStateChange';

const SettingsPrivacy = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const [isReadClipboardAllowed, setIsReadClipboardAllowed] = useState(false);

  useEffect(() => {
    AppStateChange.isReadClipboardAllowed()
      .then(setIsReadClipboardAllowed)
      .finally(() => setIsLoading(false));
  }, []);

  const onValueChange = value => {
    AppStateChange.setReadClipboardAllowed(value);
    setIsReadClipboardAllowed(value);
  };

  const stylesWithThemeHook = {
    root: {
      ...styles.root,
      backgroundColor: colors.background,
    },
    scroll: {
      ...styles.scroll,
      backgroundColor: colors.background,
    },
    scrollBody: {
      ...styles.scrollBody,
      backgroundColor: colors.background,
    },
  };

  const openApplicationSettings = () => {
    Linking.openSettings();
  };

  return (
    <ScrollView style={stylesWithThemeHook.scroll}>
      <BlueListItem
        hideChevron
        title={loc.settings.privacy_read_clipboard}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange, value: isReadClipboardAllowed }}
        isLoading={isLoading}
      />
      <BlueCard>
        <BlueTextHooks>{loc.settings.privacy_clipboard_explanation}</BlueTextHooks>
      </BlueCard>
      <BlueSpacing20 />
      <BlueListItem title={loc.settings.privacy_additional_permissions} chevron onPress={openApplicationSettings} />
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
