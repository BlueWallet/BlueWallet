import React, { useEffect, useState } from 'react';
import { ScrollView, Platform, TouchableWithoutFeedback, TouchableOpacity, StyleSheet } from 'react-native';
import { BlueLoading, BlueTextHooks, BlueSpacing20, BlueListItemHooks, BlueNavigationStyle, BlueCard } from '../../BlueComponents';
import { AppStorage } from '../../class';
import { useNavigation, useTheme } from '@react-navigation/native';
import HandoffSettings from '../../class/handoff';
const BlueApp: AppStorage = require('../../BlueApp');
const loc = require('../../loc');

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
          <BlueListItemHooks component={TouchableOpacity} onPress={() => navigate('DefaultView')} title="On Launch" chevron />
        </>
      )}
      {Platform.OS === 'ios' ? (
        <>
          <BlueListItemHooks
            hideChevron
            title="Continuity"
            Component={TouchableWithoutFeedback}
            switch={{ onValueChange: onHandOffEnabledSwitch, value: isHandoffUseEnabled }}
          />
          <BlueCard>
            <BlueTextHooks>
              When enabled, you will be able to view selected wallets, and transactions, using your other Apple iCloud connected devices.
            </BlueTextHooks>
          </BlueCard>
          <BlueSpacing20 />
        </>
      ) : null}
      <BlueListItemHooks
        Component={TouchableWithoutFeedback}
        title={loc.settings.enable_advanced_mode}
        switch={{ onValueChange: onAdvancedModeSwitch, value: isAdancedModeEnabled }}
      />
      <BlueCard>
        <BlueTextHooks>
          When enabled, you will see advanced options such as different wallet types, the ability to specify the LNDHub instance you wish to
          connect to and custom entropy during wallet creation.
        </BlueTextHooks>
      </BlueCard>
      <BlueSpacing20 />
    </ScrollView>
  );
};

GeneralSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: 'General',
});

export default GeneralSettings;
