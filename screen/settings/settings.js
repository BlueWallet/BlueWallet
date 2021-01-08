import React, { useContext } from 'react';
import { ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { BlueListItem, BlueHeaderDefaultSub } from '../../BlueComponents';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Settings = () => {
  const { navigate } = useNavigation();
  // By simply having it here, it'll re-render the UI if language is changed
  // eslint-disable-next-line no-unused-vars
  const { language } = useContext(BlueStorageContext);

  return (
    <ScrollView style={styles.root}>
      <StatusBar barStyle="default" />
      <BlueHeaderDefaultSub leftText={loc.settings.header} />
      <BlueListItem title={loc.settings.general} onPress={() => navigate('GeneralSettings')} chevron />
      <BlueListItem title={loc.settings.currency} onPress={() => navigate('Currency')} chevron />
      <BlueListItem title={loc.settings.language} onPress={() => navigate('Language')} chevron />
      <BlueListItem title={loc.settings.encrypt_title} onPress={() => navigate('EncryptStorage')} testID="SecurityButton" chevron />
      <BlueListItem title={loc.settings.network} onPress={() => navigate('NetworkSettings')} chevron />
      <BlueListItem title={loc.settings.notifications} onPress={() => navigate('NotificationSettings')} chevron />
      <BlueListItem title={loc.settings.privacy} onPress={() => navigate('SettingsPrivacy')} chevron />
      <BlueListItem title={loc.settings.about} onPress={() => navigate('About')} testID="AboutButton" chevron />
    </ScrollView>
  );
};

export default Settings;
Settings.navigationOptions = navigationStyle({
  headerTitle: '',
});
