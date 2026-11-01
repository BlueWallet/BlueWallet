import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Image, StyleProp, ViewStyle } from 'react-native';
import loc from '../../loc';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';
import { useSettings } from '../../hooks/context/useSettings';

export type SettingsDestination =
  | 'GeneralSettings'
  | 'Currency'
  | 'Language'
  | 'EncryptStorage'
  | 'NetworkSettings'
  | 'SettingsTools'
  | 'About';

type SettingsContentProps = {
  onNavigate: (destination: SettingsDestination) => void;
  style?: StyleProp<ViewStyle>;
};

export const SettingsContent = ({ onNavigate, style }: SettingsContentProps) => {
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
    <SettingsScrollView testID="SettingsRoot" style={style}>
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
          onPress={() => onNavigate('GeneralSettings')}
          testID="GeneralSettings"
          chevron
        />
        <SettingsListItem
          title={loc.settings.currency}
          iconName="currency"
          onPress={() => onNavigate('Currency')}
          testID="Currency"
          chevron
        />
        <SettingsListItem
          title={loc.settings.language}
          iconName="language"
          onPress={() => onNavigate('Language')}
          testID="Language"
          chevron
        />
        <SettingsListItem
          title={loc.settings.encrypt_title}
          iconName="security"
          onPress={() => onNavigate('EncryptStorage')}
          testID="SecurityButton"
          chevron
        />
        <SettingsListItem
          title={loc.settings.network}
          iconName="network"
          onPress={() => onNavigate('NetworkSettings')}
          testID="NetworkSettings"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.tools}
          iconName="tools"
          onPress={() => onNavigate('SettingsTools')}
          testID="Tools"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.about}
          iconName="about"
          onPress={() => onNavigate('About')}
          testID="AboutButton"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

const Settings = () => {
  const { navigate, setOptions } = useNavigation();
  const { language } = useSettings(); // Subscribe to language changes to trigger re-render

  useLayoutEffect(() => {
    // Only the title needs refreshing on language change; header styling comes from the route options
    setOptions({ title: loc.settings.header });
  }, [setOptions, language]);

  const handleNavigate = useCallback((destination: SettingsDestination) => navigate(destination), [navigate]);

  return <SettingsContent onNavigate={handleNavigate} />;
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
