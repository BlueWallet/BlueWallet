import React, { useEffect, useState } from 'react';
import { ScrollView, Platform, TouchableWithoutFeedback, TouchableOpacity, StyleSheet } from 'react-native';
import { BlueLoading, BlueTextHooks, BlueSpacing20, BlueListItem, BlueNavigationStyle, BlueCard } from '../../BlueComponents';
import { AppStorage } from '../../class';
import { useNavigation, useTheme } from '@react-navigation/native';
import HandoffSettings from '../../class/handoff';
import loc from '../../loc';
const BlueApp: AppStorage = require('../../BlueApp');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const GeneralSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdancedModeEnabled, setIsAdancedModeEnabled] = useState(false);
  const [isHandoffUseEnabled, setIsHandoffUseEnabled] = useState(false);
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const onAdvancedModeSwitch = async value => {
    await BlueApp.setIsAdancedModeEnabled(value);
    setIsAdancedModeEnabled(value);
  };

  const onHandOffEnabledSwitch = async value => {
    await HandoffSettings.setHandoffUseEnabled(value);
    setIsHandoffUseEnabled(value);
  };

  useEffect(() => {
    (async () => {
      setIsAdancedModeEnabled(await BlueApp.isAdancedModeEnabled());
      setIsHandoffUseEnabled(await HandoffSettings.isHandoffUseEnabled());
      setIsLoading(false);
    })();
  });

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

  return isLoading ? (
    <BlueLoading />
  ) : (
    <ScrollView style={stylesWithThemeHook.scroll}>
      {BlueApp.getWallets().length > 1 && (
        <>
          <BlueListItem component={TouchableOpacity} onPress={() => navigate('DefaultView')} title={loc.settings.default_title} chevron />
        </>
      )}
      {Platform.OS === 'ios' ? (
        <>
          <BlueListItem
            hideChevron
            title={loc.settings.general_continuity}
            Component={TouchableWithoutFeedback}
            switch={{ onValueChange: onHandOffEnabledSwitch, value: isHandoffUseEnabled }}
          />
          <BlueCard>
            <BlueTextHooks>{loc.settings.general_continuity_e}</BlueTextHooks>
          </BlueCard>
          <BlueSpacing20 />
        </>
      ) : null}
      <BlueListItem
        Component={TouchableWithoutFeedback}
        title={loc.settings.general_adv_mode}
        switch={{ onValueChange: onAdvancedModeSwitch, value: isAdancedModeEnabled }}
      />
      <BlueCard>
        <BlueTextHooks>{loc.settings.general_adv_mode_e}</BlueTextHooks>
      </BlueCard>
      <BlueSpacing20 />
    </ScrollView>
  );
};

GeneralSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.general,
});

export default GeneralSettings;
