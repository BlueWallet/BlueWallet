import React, { useMemo, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Image } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { SettingsScrollView, SettingsSection, SettingsListItem, getSettingsHeaderOptions } from '../../components/platform';
import { useSettings } from '../../hooks/context/useSettings';
import { useTheme } from '../../components/themes';

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { language } = useSettings(); // Subscribe to language changes to trigger re-render
  const { colors } = useTheme();
  useLayoutEffect(() => {
    setOptions(getSettingsHeaderOptions(loc.settings.header, colors));
  }, [setOptions, language, colors]); // Include language to trigger re-render when language changes

  const handleDonatePress = useCallback(() => {
    Linking.openURL('https://donate.bluewallet.io/');
  }, []);

  const donateIcon = useMemo(
    () => (
      <View style={styles.donateIconContainer}>
        <Image source={require('../../img/bluebeast.png')} style={styles.donateIconImage} resizeMode="contain" />
      </View>
    ),
    [],
  );

  return (
    <SettingsScrollView testID="SettingsRoot">
      <SettingsSection compact horizontalInset={false}>
        <SettingsListItem
          title={loc.settings.donate}
          subtitle={loc.settings.donate_description}
          leftIcon={donateIcon}
          onPress={handleDonatePress}
          testID="Donate"
          position="single"
        />
      </SettingsSection>

      <SettingsSection horizontalInset={false}>
        <SettingsListItem
          title={loc.settings.general}
          iconName="settings"
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
          position="first"
        />

        <SettingsListItem
          title={loc.settings.currency}
          iconName="currency"
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          position="middle"
        />

        <SettingsListItem
          title={loc.settings.language}
          iconName="language"
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          position="middle"
        />

        <SettingsListItem
          title={loc.settings.encrypt_title}
          iconName="security"
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          position="middle"
        />

        <SettingsListItem
          title={loc.settings.network}
          iconName="network"
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          position="last"
        />
      </SettingsSection>

      <SettingsSection horizontalInset={false}>
        <SettingsListItem
          title={loc.settings.tools}
          iconName="tools"
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          position="single"
        />
      </SettingsSection>

      <SettingsSection horizontalInset={false}>
        <SettingsListItem
          title={loc.settings.about}
          iconName="about"
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          position="single"
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  donateIconContainer: {
    padding: 4,
  },
  donateIconImage: {
    width: 48,
    height: 48,
  },
});
