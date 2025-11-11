import React from 'react';
import ListItem from '../../components/ListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useLocalization } from '../../hooks/useLocalization';

const Settings = () => {
  const { navigate } = useExtendedNavigation();
  useLocalization();

  return (
    <SafeAreaScrollView>
      <ListItem title={loc.settings.general} onPress={() => navigate('GeneralSettings')} testID="GeneralSettings" chevron />
      <ListItem title={loc.settings.currency} onPress={() => navigate('Currency')} testID="Currency" chevron />
      <ListItem title={loc.settings.language} onPress={() => navigate('Language')} testID="Language" chevron />
      <ListItem title={loc.settings.encrypt_title} onPress={() => navigate('EncryptStorage')} testID="SecurityButton" chevron />
      <ListItem title={loc.settings.network} onPress={() => navigate('NetworkSettings')} testID="NetworkSettings" chevron />
      <ListItem title={loc.settings.tools} onPress={() => navigate('ToolsScreen')} testID="Tools" chevron />
      <ListItem title={loc.settings.about} onPress={() => navigate('About')} testID="AboutButton" chevron />
    </SafeAreaScrollView>
  );
};

export default Settings;
