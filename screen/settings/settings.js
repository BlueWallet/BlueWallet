import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { BlueListItem, BlueHeaderDefaultSubHooks } from '../../BlueComponents';
import { useNavigation } from '@react-navigation/native';
import loc from '../../loc';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Settings = () => {
  const { navigate } = useNavigation();

  return (
    <ScrollView style={styles.root}>
      <StatusBar barStyle="default" />
      <BlueHeaderDefaultSubHooks leftText={loc.settings.header} rightComponent={null} />
      <BlueListItem title={loc.settings.general} component={TouchableOpacity} onPress={() => navigate('GeneralSettings')} chevron />
      <BlueListItem title={loc.settings.currency} component={TouchableOpacity} onPress={() => navigate('Currency')} chevron />
      <BlueListItem title={loc.settings.language} component={TouchableOpacity} onPress={() => navigate('Language')} chevron />
      <BlueListItem
        title={loc.settings.encrypt_title}
        onPress={() => navigate('EncryptStorage')}
        component={TouchableOpacity}
        testID="SecurityButton"
        chevron
      />
      <BlueListItem title={loc.settings.network} component={TouchableOpacity} onPress={() => navigate('NetworkSettings')} chevron />
      <BlueListItem
        title={loc.settings.notifications}
        component={TouchableOpacity}
        onPress={() => navigate('NotificationSettings')}
        chevron
      />
      <BlueListItem title={loc.settings.privacy} component={TouchableOpacity} onPress={() => navigate('SettingsPrivacy')} chevron />
      <BlueListItem
        title={loc.settings.about}
        component={TouchableOpacity}
        onPress={() => navigate('About')}
        testID="AboutButton"
        chevron
      />
    </ScrollView>
  );
};

export default Settings;
