import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, Platform, Pressable, TouchableOpacity, StyleSheet } from 'react-native';

import navigationStyle from '../../components/navigationStyle';
import { BlueLoading, BlueText, BlueSpacing20, BlueListItem, BlueCard } from '../../BlueComponents';
import { useNavigation, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isURv1Enabled, clearUseURv1, setUseURv1 } from '../../blue_modules/ur';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const GeneralSettings: React.FC = () => {
  const { isAdvancedModeEnabled, setIsAdvancedModeEnabled, wallets, isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage } =
    useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancedModeSwitchEnabled, setIsAdvancedModeSwitchEnabled] = useState(false);
  const [isURv1SwitchEnabled, setIsURv1SwitchEnabled] = useState(false);
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const onAdvancedModeSwitch = async (value: boolean) => {
    await setIsAdvancedModeEnabled(value);
    setIsAdvancedModeSwitchEnabled(value);
  };
  const onLegacyURv1Switch = async (value: boolean) => {
    setIsURv1SwitchEnabled(value);
    return value ? setUseURv1() : clearUseURv1();
  };

  useEffect(() => {
    (async () => {
      setIsAdvancedModeSwitchEnabled(await isAdvancedModeEnabled());
      setIsURv1SwitchEnabled(await isURv1Enabled());
      setIsLoading(false);
    })();
  });

  const navigateToPrivacy = () => {
    // @ts-ignore: Fix later
    navigate('SettingsPrivacy');
  };

  const stylesWithThemeHook = {
    root: {
      backgroundColor: colors.background,
    },
  };

  return isLoading ? (
    <BlueLoading />
  ) : (
    <ScrollView style={[styles.root, stylesWithThemeHook.root]}>
      {wallets.length > 1 && (
        <>
          {/* @ts-ignore: Fix later */}
          <BlueListItem component={TouchableOpacity} onPress={() => navigate('DefaultView')} title={loc.settings.default_title} chevron />
        </>
      )}
      {/* @ts-ignore: Fix later */}
      <BlueListItem title={loc.settings.privacy} onPress={navigateToPrivacy} testID="SettingsPrivacy" chevron />
      {Platform.OS === 'ios' ? (
        <>
          <BlueListItem
            // @ts-ignore: Fix later
            hideChevron
            title={loc.settings.general_continuity}
            Component={Pressable}
            switch={{ onValueChange: setIsHandOffUseEnabledAsyncStorage, value: isHandOffUseEnabled }}
          />
          <BlueCard>
            <BlueText>{loc.settings.general_continuity_e}</BlueText>
          </BlueCard>
          <BlueSpacing20 />
        </>
      ) : null}
      <BlueListItem
        // @ts-ignore: Fix later
        Component={Pressable}
        title={loc.settings.general_adv_mode}
        switch={{ onValueChange: onAdvancedModeSwitch, value: isAdvancedModeSwitchEnabled, testID: 'AdvancedMode' }}
      />
      <BlueCard>
        <BlueText>{loc.settings.general_adv_mode_e}</BlueText>
      </BlueCard>
      <BlueSpacing20 />
      {/* @ts-ignore: Fix later */}
      <BlueListItem
        // @ts-ignore: Fix later
        Component={Pressable}
        title="Legacy URv1 QR"
        switch={{ onValueChange: onLegacyURv1Switch, value: isURv1SwitchEnabled }}
      />
      <BlueSpacing20 />
    </ScrollView>
  );
};

// @ts-ignore: Fix later
GeneralSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.general }));

export default GeneralSettings;
