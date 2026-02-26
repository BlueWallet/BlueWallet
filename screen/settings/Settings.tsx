import React, { useMemo, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Image, Platform } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { SettingsScrollView, SettingsSection, SettingsListItem, getSettingsHeaderOptions } from '../../components/platform';
import { useSettings } from '../../hooks/context/useSettings';
import { useTheme } from '../../components/themes';

const Settings = () => {
  const { navigate, setOptions } = useExtendedNavigation();
  const { language } = useSettings(); // Subscribe to language changes to trigger re-render
  const { colors, dark } = useTheme();
  const isIOSLightMode = Platform.OS === 'ios' && !dark;
  const settingsCardColor = colors.lightButton ?? colors.modal ?? colors.elevated ?? colors.background;
  const settingsScreenBackgroundColor = isIOSLightMode ? settingsCardColor : colors.background;
  const settingsListItemBackgroundColor = isIOSLightMode ? colors.background : undefined;
  useLayoutEffect(() => {
    setOptions(getSettingsHeaderOptions(loc.settings.header, { ...colors, background: settingsScreenBackgroundColor }, dark));
  }, [setOptions, language, colors, settingsScreenBackgroundColor, dark]); // Include language to trigger re-render when language changes

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
    <SettingsScrollView testID="SettingsRoot" style={{ backgroundColor: settingsScreenBackgroundColor }}>
      <SettingsSection compact horizontalInset={false}>
        <SettingsListItem
          title={loc.settings.donate}
          subtitle={loc.settings.donate_description}
          leftIcon={donateIcon}
          onPress={handleDonatePress}
          testID="Donate"
          position="single"
          itemBackgroundColor={settingsListItemBackgroundColor}
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
          itemBackgroundColor={settingsListItemBackgroundColor}
        />

        <SettingsListItem
          title={loc.settings.currency}
          iconName="currency"
          onPress={() => navigate('Currency')}
          testID="Currency"
          chevron
          position="middle"
          itemBackgroundColor={settingsListItemBackgroundColor}
        />

        <SettingsListItem
          title={loc.settings.language}
          iconName="language"
          onPress={() => navigate('Language')}
          testID="Language"
          chevron
          position="middle"
          itemBackgroundColor={settingsListItemBackgroundColor}
        />

        <SettingsListItem
          title={loc.settings.encrypt_title}
          iconName="security"
          onPress={() => navigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
          position="middle"
          itemBackgroundColor={settingsListItemBackgroundColor}
        />

        <SettingsListItem
          title={loc.settings.network}
          iconName="network"
          onPress={() => navigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          position="last"
          itemBackgroundColor={settingsListItemBackgroundColor}
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
          itemBackgroundColor={settingsListItemBackgroundColor}
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
          itemBackgroundColor={settingsListItemBackgroundColor}
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
