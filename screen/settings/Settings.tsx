import React, { useMemo, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Image } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';
import { useSettings } from '../../hooks/context/useSettings';

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { language } = useSettings(); // Subscribe to language changes to trigger re-render
  useLayoutEffect(() => {
    // Only the title needs refreshing on language change; header styling comes from the route options
    setOptions({ title: loc.settings.header });
  }, [setOptions, language]);

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
      <SettingsSection>
        <SettingsListItem
          title={loc.settings.donate}
          subtitle={loc.settings.donate_description}
          subtitleNumberOfLines={0}
          leftAvatar={donateIcon}
          onPress={handleDonatePress}
          testID="Donate"
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.general}
          iconName="settings"
          onPress={() => navigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
        />
        <SettingsListItem
          title={loc.settings.currency}
          iconName="currency"
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
        />
        <SettingsListItem
          title={loc.settings.language}
          iconName="language"
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
        />
        <SettingsListItem
          title={loc.settings.encrypt_title}
          iconName="security"
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
        />
        <SettingsListItem
          title={loc.settings.network}
          iconName="network"
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.tools}
          iconName="tools"
          onPress={() => navigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.about}
          iconName="about"
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={false}
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
