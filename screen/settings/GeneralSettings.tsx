import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { BlueSpacing20 } from '../../BlueComponents';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const GeneralSettings: React.FC = () => {
  const { wallets } = useStorage();
  const { isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage, isLegacyURv1Enabled, setIsLegacyURv1EnabledStorage } = useSettings();
  const { navigate } = useNavigation();
  const { colors } = useTheme();

  const navigateToPrivacy = () => {
    // @ts-ignore: Fix later
    navigate('SettingsPrivacy');
  };

  const onHandOffUseEnabledChange = async (value: boolean) => {
    await setIsHandOffUseEnabledAsyncStorage(value);
  };

  const stylesWithThemeHook = {
    root: {
      backgroundColor: colors.background,
    },
  };

  return (
    <ScrollView style={[styles.root, stylesWithThemeHook.root]} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      {wallets.length > 0 && (
        <>
          {/* @ts-ignore: Fix later */}
          <ListItem onPress={() => navigate('DefaultView')} title={loc.settings.default_title} chevron />
        </>
      )}
      <ListItem title={loc.settings.privacy} onPress={navigateToPrivacy} testID="SettingsPrivacy" chevron />
      {Platform.OS === 'ios' ? (
        <>
          <ListItem
            title={loc.settings.general_continuity}
            Component={PressableWrapper}
            switch={{ onValueChange: onHandOffUseEnabledChange, value: isHandOffUseEnabled }}
            subtitle={loc.settings.general_continuity_e}
          />
        </>
      ) : null}
      <ListItem
        Component={PressableWrapper}
        title="Legacy URv1 QR"
        switch={{ onValueChange: setIsLegacyURv1EnabledStorage, value: isLegacyURv1Enabled }}
      />
      <BlueSpacing20 />
    </ScrollView>
  );
};

export default GeneralSettings;
